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

const skill = {
  name: 'TypeScript', category: 'technical', importance: 'required', evidence: 'Use TypeScript',
  interviewQuestions: ['How do you model safe types?'], comfortRating: 'low',
}

const row = {
  id: 'application-1', user_id: 'user-1', company: 'Acme', role: 'Frontend Engineer',
  location: 'Remote', date_applied: '2026-01-15', status: 'Applied', url: 'https://example.com/job',
  notes: '', next_step: '', job_description: '', skills: [skill],
  skills_analyzed_at: '2026-01-16T12:00:00Z', skills_source_url: 'https://example.com/job', interviews: [],
}

describe('company knowledge-level persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.location.hash = '#/skills/company/Acme'
    supabaseMocks.getSession.mockResolvedValue({ data: { session: { user: { id: 'user-1', email: 'person@example.com' } } }, error: null })
    supabaseMocks.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } })
    const order = vi.fn().mockResolvedValue({ data: [row], error: null })
    supabaseMocks.single.mockImplementation(async () => ({ data: { ...row, skills: supabaseMocks.update.mock.calls[supabaseMocks.update.mock.calls.length - 1]?.[0].skills }, error: null }))
    supabaseMocks.update.mockReturnValue({ eq: vi.fn(() => ({ select: vi.fn(() => ({ single: supabaseMocks.single })) })) })
    supabaseMocks.from.mockReturnValue({ select: vi.fn(() => ({ order })), update: supabaseMocks.update })
  })

  it('persists a company-view change and displays the returned knowledge level', async () => {
    render(<App />)
    const selector = await screen.findByRole('combobox', { name: 'Knowledge level for TypeScript' })
    fireEvent.change(selector, { target: { value: 'no-study-needed' } })

    await waitFor(() => expect(supabaseMocks.update).toHaveBeenCalledWith({ skills: [{ ...skill, comfortRating: 'no-study-needed', needsNoStudy: true, priority: 0 }] }))
    await waitFor(() => expect((selector as HTMLSelectElement).value).toBe('no-study-needed'))
    expect(screen.getByText('Knowledge level:')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'TypeScript' }).closest('article')?.classList.contains('company-skill-no-study')).toBe(true)
    expect(window.location.hash).toBe('#/skills/company/Acme')
  })
})
