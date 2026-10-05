import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

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

vi.mock('./lib/supabase', () => ({
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

vi.mock('./storage', () => ({
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
  const select = vi.fn(() => ({ order }))

  supabaseMocks.single.mockImplementation(async () => {
    const updates = supabaseMocks.update.mock.calls
    const lastUpdate = updates[updates.length - 1]?.[0] as { interviews?: typeof interviews } | undefined
    return {
      data: { ...row, interviews: lastUpdate?.interviews ?? interviews },
      error: null,
    }
  })
  supabaseMocks.update.mockImplementation(() => ({
    eq: vi.fn(() => ({
      select: vi.fn(() => ({ single: supabaseMocks.single })),
    })),
  }))
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

    fireEvent.click(screen.getByRole('button', { name: 'Save schedule' }))

    await waitFor(() => expect(supabaseMocks.update).toHaveBeenCalledWith({
      interviews: [
        expect.objectContaining({ id: expect.any(String), date: '2030-06-12', time: '10:30', notes: 'First round', durationMinutes: 60 }),
        expect.objectContaining({ id: expect.any(String), date: '2030-06-19', time: '13:00', notes: 'Second round', durationMinutes: 60 }),
      ],
    }))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Acme — Frontend Engineer' })).toBeNull())
  })

  it('keeps an incomplete new interview draft open instead of silently discarding it', async () => {
    await openInterviewSchedule()

    enterInterviewDraft('2030-06-12', '')
    fireEvent.click(screen.getByRole('button', { name: 'Save schedule' }))

    expect((await screen.findByRole('alert')).textContent).toContain('Add or update the interview draft before saving the schedule.')
    expect(screen.getByRole('dialog', { name: 'Acme — Frontend Engineer' })).toBeTruthy()
    expect(supabaseMocks.update).not.toHaveBeenCalled()
  })

  it('keeps edits to an existing interview draft until the user updates or clears it', async () => {
    configureSupabase([{ id: 'interview-1', date: '2030-06-12', time: '10:30', notes: 'First round' }])
    await openInterviewSchedule()

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    fireEvent.change(screen.getByLabelText('Start time *'), { target: { value: '11:30' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save schedule' }))

    expect((await screen.findByRole('alert')).textContent).toContain('Add or update the interview draft before saving the schedule.')
    expect(screen.getByRole('dialog', { name: 'Acme — Frontend Engineer' })).toBeTruthy()
    expect(supabaseMocks.update).not.toHaveBeenCalled()
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
