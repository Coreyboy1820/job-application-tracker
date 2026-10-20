import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../app/App'

const { supabaseMocks } = vi.hoisted(() => ({
  supabaseMocks: {
    getSession: vi.fn(),
    onAuthStateChange: vi.fn(),
    from: vi.fn(),
    invoke: vi.fn(),
    update: vi.fn(),
    single: vi.fn(),
  },
}))

vi.mock('../../shared/lib/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: {
    auth: {
      getSession: supabaseMocks.getSession,
      onAuthStateChange: supabaseMocks.onAuthStateChange,
      signOut: vi.fn(),
    },
    from: supabaseMocks.from,
    functions: { invoke: supabaseMocks.invoke },
  },
}))

vi.mock('../../features/applications/data/legacyStorage', () => ({
  loadApplications: vi.fn().mockResolvedValue([]),
}))

const applicationRow = {
  id: 'application-1',
  user_id: 'user-1',
  company: 'Acme',
  role: 'Frontend Engineer',
  location: 'Remote',
  date_applied: '2026-01-15',
  status: 'Applied',
  url: '',
  notes: '',
  next_step: '',
  job_description: '',
  skills: [],
  skills_analyzed_at: null,
  skills_source_url: '',
  interviews: [] as { id: string; date: string; time: string; notes: string }[],
}

function configureSupabase(interviews: typeof applicationRow.interviews = []) {
  const row = { ...applicationRow, interviews }
  const order = vi.fn().mockResolvedValue({ data: [row], error: null })
  const select = vi.fn(() => ({ order, eq: vi.fn(() => ({ single: supabaseMocks.single })) }))

  supabaseMocks.single.mockImplementation(async () => {
    const updates = supabaseMocks.update.mock.calls
    const lastUpdate = updates[updates.length - 1]?.[0] as { interviews?: typeof interviews } | undefined
    return {
      data: { ...row, interviews: lastUpdate?.interviews ?? interviews },
      error: null,
    }
  })
  const query = { eq: vi.fn(), select: vi.fn(() => ({ single: supabaseMocks.single })) }
  query.eq.mockReturnValue(query)
  supabaseMocks.update.mockReturnValue(query)

  supabaseMocks.from.mockReturnValue({ select, update: supabaseMocks.update })
}

async function openInterviewSchedule() {
  render(<App />)
  const manageButton = await screen.findByRole('button', {
    name: 'Manage interviews for Frontend Engineer at Acme',
  })
  fireEvent.click(manageButton)
  return screen.findByRole('dialog', { name: 'Acme — Frontend Engineer' })
}

function enterInterviewDraft(date: string, time: string, notes = '') {
  fireEvent.change(screen.getByLabelText('Date *'), { target: { value: date } })
  fireEvent.change(screen.getByLabelText('Start time *'), { target: { value: time } })
  if (notes) fireEvent.change(screen.getByLabelText('Notes'), { target: { value: notes } })
}

describe('application interview scheduling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.location.hash = '#/applications'
    supabaseMocks.getSession.mockResolvedValue({
      data: { session: { user: { id: 'user-1', email: 'person@example.com' } } },
      error: null,
    })
    supabaseMocks.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    })
    supabaseMocks.invoke.mockResolvedValue({ data: null, error: null })
    configureSupabase()
  })

  it('adds multiple interview rounds and saves them with the application', async () => {
    await openInterviewSchedule()

    enterInterviewDraft('2030-06-12', '10:30', 'First round')
    fireEvent.click(screen.getByRole('button', { name: 'Add interview' }))
    expect(await screen.findByText('First round')).toBeTruthy()

    enterInterviewDraft('2030-06-19', '13:00', 'Second round')
    fireEvent.click(screen.getByRole('button', { name: 'Add interview' }))
    expect(await screen.findByText('Second round')).toBeTruthy()

    await waitFor(() => expect(supabaseMocks.update).toHaveBeenCalledWith({
      interviews: [
        expect.objectContaining({ id: expect.any(String), date: '2030-06-12', time: '10:30', notes: 'First round', durationMinutes: 60 }),
        expect.objectContaining({ id: expect.any(String), date: '2030-06-19', time: '13:00', notes: 'Second round', durationMinutes: 60 }),
      ],
    }))
    expect(screen.getByRole('dialog', { name: 'Acme — Frontend Engineer' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Save schedule' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Done' }))
    fireEvent.click(screen.getByRole('button', { name: 'Manage interviews for Frontend Engineer at Acme' }))
    expect(screen.getByText('Second round')).toBeTruthy()
  })

  it('keeps an incomplete new interview draft open instead of silently discarding it', async () => {
    await openInterviewSchedule()

    enterInterviewDraft('2030-06-12', '')

    expect((screen.getByLabelText('Date *') as HTMLInputElement).value).toBe('2030-06-12')
    expect(screen.getByRole('dialog', { name: 'Acme — Frontend Engineer' })).toBeTruthy()
    expect(supabaseMocks.update).not.toHaveBeenCalled()
  })

  it('keeps edits to an existing interview draft until the user updates or clears it', async () => {
    configureSupabase([{ id: 'interview-1', date: '2030-06-12', time: '10:30', notes: 'First round' }])
    await openInterviewSchedule()

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    fireEvent.change(screen.getByLabelText('Start time *'), { target: { value: '11:30' } })

    expect((screen.getByLabelText('Start time *') as HTMLInputElement).value).toBe('11:30')
    expect(screen.getByRole('dialog', { name: 'Acme — Frontend Engineer' })).toBeTruthy()
    expect(supabaseMocks.update).not.toHaveBeenCalled()
  })

  it('persists edits and deletion, retaining the saved change after a fresh load', async () => {
    configureSupabase([{ id: 'round', date: '2030-06-12', time: '10:30', notes: 'Original' }])
    await openInterviewSchedule()
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    fireEvent.change(screen.getByLabelText('Notes'), { target: { value: 'Persisted edit' } })
    fireEvent.click(screen.getByRole('button', { name: 'Update interview' }))
    await screen.findByText('Persisted edit')
    const saved = supabaseMocks.update.mock.calls[0][0].interviews
    cleanup()
    configureSupabase(saved)
    await openInterviewSchedule()
    expect(screen.getByText('Persisted edit')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    await waitFor(() => expect(screen.queryByText('Persisted edit')).toBeNull())
    expect(supabaseMocks.update).toHaveBeenLastCalledWith({ interviews: [] })
    fireEvent.click(screen.getByRole('button', { name: 'Done' }))
    fireEvent.click(screen.getByRole('button', { name: 'Manage interviews for Frontend Engineer at Acme' }))
    expect(screen.getByText('No interviews scheduled yet.')).toBeTruthy()
  })

  it('rejects a stale schedule write, refreshes committed interviews, and retries without losing either round', async () => {
    await openInterviewSchedule()
    const external = { id: 'external', date: '2030-06-20', time: '12:00', notes: 'Other device round' }
    // Simulate the JSONB compare failing after another device adds an interview.
    supabaseMocks.single.mockResolvedValueOnce({ data: null, error: { code: 'PGRST116', message: 'No matching row' } })
    supabaseMocks.single.mockResolvedValueOnce({ data: { ...applicationRow, interviews: [external] }, error: null })
    enterInterviewDraft('2030-06-12', '10:30', 'My round')
    fireEvent.click(screen.getByRole('button', { name: 'Add interview' }))
    await screen.findByText('Other device round')
    expect(screen.getAllByRole('alert').some((alert) => alert.textContent?.includes('changed elsewhere'))).toBe(true)
    expect((screen.getByLabelText('Notes') as HTMLTextAreaElement).value).toBe('My round')
    const updateQuery = supabaseMocks.update.mock.results[0].value
    expect(updateQuery.eq).toHaveBeenCalledWith('interviews', '[]')
    fireEvent.click(screen.getByRole('button', { name: 'Add interview' }))
    await screen.findByText('My round')
    expect(supabaseMocks.update).toHaveBeenLastCalledWith({ interviews: [external, expect.objectContaining({ notes: 'My round' })] })
    expect(updateQuery.eq).toHaveBeenLastCalledWith('interviews', JSON.stringify([external]))
  })

  it('shows only future interviews in chronological order and opens the associated application skills', async () => {
    configureSupabase([
      { id: 'later', date: '2099-04-03', time: '10:30', notes: 'Later round' },
      { id: 'past', date: '2000-04-03', time: '10:30', notes: 'Past round' },
      { id: 'earlier', date: '2099-04-02', time: '13:00', notes: 'Earlier round' },
    ])
    render(<App />)

    fireEvent.click(await screen.findByRole('button', { name: /Interviews/ }))

    const agendaItems = await screen.findAllByRole('button', { name: 'View skills for Frontend Engineer at Acme' })
    expect(agendaItems).toHaveLength(2)
    expect(agendaItems[0].textContent).toContain('Earlier round')
    expect(agendaItems[1].textContent).toContain('Later round')
    expect(screen.queryByText('Past round')).toBeNull()

    fireEvent.click(agendaItems[0])

    const applicationFilter = await screen.findByRole('status')
    expect(applicationFilter.textContent).toContain('Filtered to Frontend Engineer at Acme')
    expect(window.location.hash).toBe('#/skills/application/application-1')
  })
})
