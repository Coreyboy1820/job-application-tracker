import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../app/App'
import type { Application, Interview } from '../../shared/types'

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

vi.mock('../../features/interviews/components/GoogleCalendarButton', () => ({ default: ({ interview, disabled, onRecordLaunch }: { application: Application; interview: Interview; disabled?: boolean; onRecordLaunch: (id: string) => Promise<void> }) => <button disabled={disabled} onClick={() => void onRecordLaunch(interview.id).catch(() => {})}>Calendar {interview.id}</button> }))

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
  interviews: [] as Interview[],
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

describe('interview calendar integration', () => {
  const interview: Interview = { id: 'round-1', date: '2030-06-12', time: '10:30', notes: 'Bring examples', type: 'Technical', durationMinutes: 90, meetingLink: 'https://meet.example.com/room', googleCalendarOpenedAt: '2026-01-01T00:00:00.000Z' }
  beforeEach(() => {
    vi.clearAllMocks()
    window.location.hash = '#/applications'
    supabaseMocks.getSession.mockResolvedValue({ data: { session: { user: { id: 'user-1', email: 'person@example.com' } } }, error: null })
    supabaseMocks.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } })
    configureSupabase([interview])
  })

  it('persists calendar tracking without closing the editor', async () => {
    await openInterviewSchedule()
    fireEvent.click(screen.getByRole('button', { name: 'Calendar round-1' }))
    await waitFor(() => expect(supabaseMocks.update).toHaveBeenCalledWith({ interviews: [expect.objectContaining({ id: 'round-1', googleCalendarOpenedAt: expect.any(String), meetingLink: interview.meetingLink })] }))
    expect(screen.getByRole('dialog')).toBeTruthy()
  })

  it('blocks schedule mutations while calendar tracking is being saved', async () => {
    let complete!: (result: { data: typeof applicationRow; error: null }) => void
    supabaseMocks.single.mockImplementationOnce(() => new Promise((resolve) => { complete = resolve }))
    await openInterviewSchedule()
    fireEvent.click(screen.getByRole('button', { name: 'Calendar round-1' }))
    await waitFor(() => expect((screen.getByRole('button', { name: 'Edit' }) as HTMLButtonElement).disabled).toBe(true))
    expect((screen.getByRole('button', { name: 'Delete' }) as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByRole('button', { name: 'Add interview' }) as HTMLButtonElement).disabled).toBe(true)
    complete({ data: { ...applicationRow, interviews: [{ ...interview, googleCalendarOpenedAt: '2026-10-04T01:00:00.000Z' }] }, error: null })
    await waitFor(() => expect((screen.getByRole('button', { name: 'Edit' }) as HTMLButtonElement).disabled).toBe(false))
  })

  it('disables calendar export for unsaved edits and preserves the marker when saved', async () => {
    await openInterviewSchedule()
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    expect((screen.getByRole('button', { name: 'Calendar round-1' }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.change(screen.getByLabelText('Interview type'), { target: { value: 'Onsite' } })
    fireEvent.change(screen.getByLabelText('Interview location'), { target: { value: 'Room 4' } })
    fireEvent.click(screen.getByRole('button', { name: 'Update interview' }))
    expect((screen.getByRole('button', { name: 'Calendar round-1' }) as HTMLButtonElement).disabled).toBe(true)
    await waitFor(() => expect(supabaseMocks.update).toHaveBeenCalledWith({ interviews: [expect.objectContaining({ type: 'Onsite', location: 'Room 4', durationMinutes: 90, meetingLink: interview.meetingLink, googleCalendarOpenedAt: interview.googleCalendarOpenedAt })] }))
  })

  it('rejects unsafe meeting links before adding a draft', async () => {
    await openInterviewSchedule()
    enterInterviewDraft('2030-06-12', '11:30')
    fireEvent.change(screen.getByLabelText('Meeting link'), { target: { value: 'javascript:alert(1)' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add interview' }))
    expect(screen.getByRole('alert').textContent).toContain('Enter a valid meeting link')
    expect(supabaseMocks.update).not.toHaveBeenCalled()
  })

  it('blocks other calendar exports while saving an agenda marker', async () => {
    configureSupabase([interview, { ...interview, id: 'round-2', time: '14:00' }])
    let complete!: (result: { data: typeof applicationRow; error: null }) => void
    supabaseMocks.single.mockImplementationOnce(() => new Promise((resolve) => { complete = resolve }))
    window.location.hash = '#/interviews'
    render(<App />)
    fireEvent.click(await screen.findByRole('button', { name: 'Calendar round-1' }))
    await waitFor(() => expect((screen.getByRole('button', { name: 'Calendar round-2' }) as HTMLButtonElement).disabled).toBe(true))
    fireEvent.click(screen.getByRole('button', { name: 'Calendar round-2' }))
    expect(supabaseMocks.update).toHaveBeenCalledTimes(1)
    complete({ data: { ...applicationRow, interviews: [interview, { ...interview, id: 'round-2', time: '14:00' }] }, error: null })
    await waitFor(() => expect((screen.getByRole('button', { name: 'Calendar round-2' }) as HTMLButtonElement).disabled).toBe(false))
  })

  it('blocks schedule editing after navigating during a pending agenda export', async () => {
    let complete!: (result: { data: typeof applicationRow; error: null }) => void
    supabaseMocks.single.mockImplementationOnce(() => new Promise((resolve) => { complete = resolve }))
    window.location.hash = '#/interviews'
    render(<App />)
    fireEvent.click(await screen.findByRole('button', { name: 'Calendar round-1' }))
    fireEvent.click(screen.getByRole('button', { name: /^Applications/ }))
    fireEvent.click(await screen.findByRole('button', { name: 'Manage interviews for Frontend Engineer at Acme' }))
    expect((screen.getByRole('button', { name: 'Edit' }) as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByRole('button', { name: 'Add interview' }) as HTMLButtonElement).disabled).toBe(true)
    expect(supabaseMocks.update).toHaveBeenCalledTimes(1)
    complete({ data: { ...applicationRow, interviews: [{ ...interview, googleCalendarOpenedAt: '2026-10-04T01:00:00.000Z' }] }, error: null })
    await waitFor(() => expect((screen.getByRole('button', { name: 'Edit' }) as HTMLButtonElement).disabled).toBe(false))
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    fireEvent.change(screen.getByLabelText('Notes'), { target: { value: 'Updated after calendar' } })
    fireEvent.click(screen.getByRole('button', { name: 'Update interview' }))
    await waitFor(() => expect(supabaseMocks.update).toHaveBeenLastCalledWith({ interviews: [expect.objectContaining({ googleCalendarOpenedAt: '2026-10-04T01:00:00.000Z' })] }))
  })

  it('refreshes an externally changed schedule before retrying calendar tracking', async () => {
    await openInterviewSchedule()
    const external = { ...interview, notes: 'Changed on another device' }
    supabaseMocks.single.mockResolvedValueOnce({ data: null, error: { code: 'PGRST116', message: 'No matching row' } })
    supabaseMocks.single.mockResolvedValueOnce({ data: { ...applicationRow, interviews: [external] }, error: null })
    fireEvent.click(screen.getByRole('button', { name: 'Calendar round-1' }))
    await screen.findByText('Changed on another device')
    await waitFor(() => expect(screen.getByRole('button', { name: 'Calendar round-1' }).hasAttribute('disabled')).toBe(false))
    const query = supabaseMocks.update.mock.results[0].value
    expect(query.eq).toHaveBeenCalledWith('interviews', JSON.stringify([interview]))
    fireEvent.click(screen.getByRole('button', { name: 'Calendar round-1' }))
    await waitFor(() => expect(supabaseMocks.update).toHaveBeenLastCalledWith({ interviews: [expect.objectContaining({ notes: external.notes, googleCalendarOpenedAt: expect.any(String) })] }))
    expect(query.eq).toHaveBeenLastCalledWith('interviews', JSON.stringify([external]))
  })

  it('shows the calendar action alongside the agenda navigation button', async () => {
    window.location.hash = '#/interviews'
    render(<App />)
    const calendarButton = await screen.findByRole('button', { name: 'Calendar round-1' })
    expect(calendarButton.parentElement?.closest('button')).toBeNull()
    fireEvent.click(calendarButton)
    await waitFor(() => expect(supabaseMocks.update).toHaveBeenCalled())
    expect(screen.getByRole('heading', { name: 'Upcoming interviews' })).toBeTruthy()
  })
})
