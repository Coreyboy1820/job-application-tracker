import { fireEvent, render, screen, waitFor } from '@testing-library/react'
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

const skill = {
  name: 'TypeScript', category: 'technical', importance: 'required', evidence: 'Use TypeScript',
  interviewQuestions: ['How do you model safe types?'], comfortRating: 'low',
}

const row = {
  id: 'application-1', user_id: 'user-1', company: 'Acme', role: 'Frontend Engineer',
  location: 'Remote', date_applied: '2026-01-15', status: 'Applied', url: 'https://example.com/job',
  notes: '', next_step: '', job_description: '', skills: [skill, { ...skill, name: 'SQL' }],
  skills_analyzed_at: '2026-01-16T12:00:00Z', skills_source_url: 'https://example.com/job', interviews: [],
}

describe('knowledge-level failure and overlapping persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.location.hash = '#/skills/application/application-1'
    supabaseMocks.getSession.mockResolvedValue({ data: { session: { user: { id: 'user-1', email: 'person@example.com' } } }, error: null })
    supabaseMocks.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } })
    const order = vi.fn().mockResolvedValue({ data: [row], error: null })
    supabaseMocks.single.mockImplementation(async () => ({ data: { ...row, skills: supabaseMocks.update.mock.calls[supabaseMocks.update.mock.calls.length - 1]?.[0].skills }, error: null }))
    supabaseMocks.update.mockReturnValue({ eq: vi.fn(() => ({ select: vi.fn(() => ({ single: supabaseMocks.single })) })) })
    supabaseMocks.from.mockReturnValue({ select: vi.fn(() => ({ order })), update: supabaseMocks.update })
  })

  it('keeps the prior knowledge level visible after a failed save and permits retry', async () => {
    supabaseMocks.single.mockResolvedValueOnce({ data: null, error: { message: 'Save rejected' } })
    render(<App />)
    const selector = await screen.findByRole('combobox', { name: 'Knowledge level for TypeScript' })
    fireEvent.change(selector, { target: { value: 'high' } })
    await screen.findByText('Could not update skill comfort level: Save rejected')
    expect((selector as HTMLSelectElement).value).toBe('low')
    fireEvent.change(selector, { target: { value: 'high' } })
    await waitFor(() => expect((selector as HTMLSelectElement).value).toBe('high'))
    expect(supabaseMocks.update).toHaveBeenCalledTimes(2)
  })

  it('blocks overlapping changes to one application until the persisted update returns', async () => {
    let finish!: (result: unknown) => void
    supabaseMocks.single.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve }))
    render(<App />)
    const selector = await screen.findByRole('combobox', { name: 'Knowledge level for TypeScript' })
    fireEvent.change(selector, { target: { value: 'high' } })
    await waitFor(() => expect((selector as HTMLSelectElement).disabled).toBe(true))
    fireEvent.change(selector, { target: { value: 'medium' } })
    expect(supabaseMocks.update).toHaveBeenCalledTimes(1)
    finish({ data: { ...row, skills: [{ ...skill, comfortRating: 'high', priority: 3 }] }, error: null })
    await waitFor(() => expect((selector as HTMLSelectElement).disabled).toBe(false))
    expect((selector as HTMLSelectElement).value).toBe('high')
  })

  it('rejects another skill update after navigation while the application save is pending', async () => {
    let finish!: (result: unknown) => void
    supabaseMocks.single.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve }))
    render(<App />)
    const selector = await screen.findByRole('combobox', { name: 'Knowledge level for TypeScript' })
    fireEvent.change(selector, { target: { value: 'high' } })
    await waitFor(() => expect(supabaseMocks.update).toHaveBeenCalledTimes(1))
    fireEvent.click(screen.getByRole('button', { name: 'View company interview questions' }))
    const sqlSelector = await screen.findByRole('combobox', { name: 'Knowledge level for SQL' })
    fireEvent.change(sqlSelector, { target: { value: 'medium' } })
    await screen.findByText(/Could not save the knowledge level for all roles/)
    expect(supabaseMocks.update).toHaveBeenCalledTimes(1)
    finish({ data: { ...row, skills: [{ ...skill, comfortRating: 'high', priority: 3 }, { ...skill, name: 'SQL' }] }, error: null })
    await waitFor(() => expect((screen.getByRole('combobox', { name: 'Knowledge level for TypeScript' }) as HTMLSelectElement).value).toBe('high'))
    expect((screen.getByRole('combobox', { name: 'Knowledge level for SQL' }) as HTMLSelectElement).value).toBe('low')
  })
})
