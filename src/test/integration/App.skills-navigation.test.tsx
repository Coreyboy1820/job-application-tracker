import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../app/App'
import { SKILL_EXTRACTION_VERSION } from '../../../supabase/functions/analyze-job-posting/analysis-version'

const { mocks } = vi.hoisted(() => ({ mocks: { from: vi.fn(), getSession: vi.fn(), onAuthStateChange: vi.fn(), invoke: vi.fn() } }))
vi.mock('../../shared/lib/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: { auth: { getSession: mocks.getSession, onAuthStateChange: mocks.onAuthStateChange, signOut: vi.fn() }, from: mocks.from, functions: { invoke: mocks.invoke } },
}))
vi.mock('../../features/applications/data/legacyStorage', () => ({ loadApplications: vi.fn().mockResolvedValue([]) }))

function applicationRow(id: string, skillName: string) {
  return {
    id, user_id: 'owner', company: 'Acme', role: 'Engineer', location: 'Remote',
    date_applied: '2026-10-01', status: 'Applied', url: `https://example.com/${id}`,
    notes: '', next_step: '', job_description: '', interviews: [],
    skills: [{ name: skillName, category: 'technical', importance: 'required', evidence: `${skillName} experience`, interviewQuestions: ['Explain it'] }],
    skills_analyzed_at: '2026-10-02T12:00:00Z', skills_source_url: `https://example.com/${id}`,
    interview_questions_version: 1, skill_extraction_version: SKILL_EXTRACTION_VERSION,
  }
}
const rows = [applicationRow('one', 'TypeScript'), applicationRow('two', 'Python')]
function configure(data = rows) {
  mocks.from.mockReturnValue({ select: vi.fn(() => ({ order: vi.fn().mockResolvedValue({ data, error: null }) })) })
}
function navigate(hash: string) {
  act(() => {
    window.history.replaceState(null, '', `/${hash}`)
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  })
}
beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  window.history.replaceState(null, '', '/#/applications')
  mocks.getSession.mockResolvedValue({ data: { session: { user: { id: 'owner', email: 'owner@example.com' } } }, error: null })
  mocks.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } })
  configure()
})

describe('application-scoped Skills navigation', () => {
  it('carries the exact originating application through the detail redirect and can clear it', async () => {
    render(<App />)
    const applications = await screen.findAllByRole('button', { name: /Acme Engineer/ })
    fireEvent.click(applications[0])
    const detail = await screen.findByRole('dialog')
    fireEvent.click(within(detail).getByRole('button', { name: 'View skills' }))
    await waitFor(() => expect(window.location.hash).toBe('#/skills/application/one'))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByRole('status').textContent).toContain('Filtered to Engineer at Acme')
    expect(screen.getByText('TypeScript experience', { exact: false })).toBeTruthy()
    expect(screen.queryByText('Python experience', { exact: false })).toBeNull()
    expect(screen.getByText('1 unique skill')).toBeTruthy()
    const analyzed = screen.getByText('Jobs analyzed').closest('article')
    expect(analyzed?.querySelector('.stat-value')?.textContent).toBe('1')

    fireEvent.click(screen.getByRole('button', { name: 'Show all skills' }))
    await waitFor(() => expect(window.location.hash).toBe('#/skills'))
    expect(screen.getByText('Python experience', { exact: false })).toBeTruthy()
    expect(screen.getByText('Skills and supporting evidence gathered from your job postings.')).toBeTruthy()
  })

  it('restores an application route after remount and follows browser route changes', async () => {
    window.history.replaceState(null, '', '/#/skills/application/two')
    const first = render(<App />)
    await screen.findByText('Python experience', { exact: false })
    expect(screen.queryByText('TypeScript experience', { exact: false })).toBeNull()
    first.unmount()
    render(<App />)
    await screen.findByText('Python experience', { exact: false })
    navigate('#/skills/application/one')
    await screen.findByText('TypeScript experience', { exact: false })
    expect(screen.queryByText('Python experience', { exact: false })).toBeNull()
    navigate('#/skills')
    await screen.findByText('Python experience', { exact: false })
    expect(screen.queryByRole('button', { name: 'Show all skills' })).toBeNull()
  })

  it('explains a missing application and lets the user return to the library', async () => {
    window.history.replaceState(null, '', '/#/skills/application/deleted')
    render(<App />)
    await screen.findByText('This application may have been deleted. Choose Show all skills to return to your library.')
    fireEvent.click(screen.getByRole('button', { name: 'Show all skills' }))
    await screen.findByText('TypeScript experience', { exact: false })
  })

  it('keeps an unanalyzed application scoped and offers the existing analysis action', async () => {
    const row = { ...applicationRow('one', 'TypeScript'), skills: [], skills_analyzed_at: '', skills_source_url: '' }
    configure([row, rows[1]])
    window.history.replaceState(null, '', '/#/skills/application/one')
    render(<App />)
    await screen.findByRole('button', { name: 'Analyze posting' })
    expect(screen.getByText('Open the application to fetch the posting and analyze its skills.')).toBeTruthy()
    expect(screen.queryByText('Python experience', { exact: false })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /^Skills \d+$/ }))
    await waitFor(() => expect(window.location.hash).toBe('#/skills'))
    expect(screen.getByText('Python experience', { exact: false })).toBeTruthy()
  })
})
