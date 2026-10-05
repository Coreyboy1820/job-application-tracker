import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../app/App'
import { SKILL_EXTRACTION_VERSION } from '../../../supabase/functions/analyze-job-posting/analysis-version'

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  from: vi.fn(),
  invoke: vi.fn(),
}))

vi.mock('../../shared/lib/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: {
    auth: { getSession: mocks.getSession, onAuthStateChange: mocks.onAuthStateChange, signOut: vi.fn() },
    from: mocks.from,
    functions: { invoke: mocks.invoke },
  },
}))

vi.mock('../../features/applications/data/legacyStorage', () => ({ loadApplications: vi.fn().mockResolvedValue([]) }))

const description = 'Experience with debugging tools such as GDB, JTAG, and serial debuggers.'
const skills = ['GDB', 'JTAG', 'serial debugging'].map((name) => ({
  name,
  category: 'tools',
  importance: 'required',
  evidence: description,
  interviewQuestions: [`How would you use ${name} to investigate a failure?`],
}))

function configureApplications(version: number) {
  const acme = {
    id: 'application-acme', user_id: 'user-1', company: 'Acme', role: 'Embedded Engineer',
    location: 'Remote', date_applied: '2026-01-15', status: 'Applied',
    url: 'https://acme.example/jobs/embedded', notes: '', next_step: '', interviews: [],
    job_description: description,
    skills: version === SKILL_EXTRACTION_VERSION ? skills : [{ ...skills[0], name: 'debugging tools' }],
    skills_analyzed_at: '2026-01-16T00:00:00Z',
    skills_source_url: 'https://acme.example/jobs/embedded',
    interview_questions_version: 1, skill_extraction_version: version,
  }
  const other = {
    ...acme, id: 'application-other', company: 'Other Company', role: 'Web Engineer',
    url: 'https://other.example/jobs/web', skills_source_url: 'https://other.example/jobs/web',
    skills: [{ ...skills[0], name: 'TypeScript' }], skill_extraction_version: SKILL_EXTRACTION_VERSION,
  }
  mocks.from.mockReturnValue({ select: vi.fn(() => ({ order: vi.fn().mockResolvedValue({ data: [acme, other], error: null }) })) })
  mocks.invoke.mockResolvedValue({
    data: {
      jobDescription: description, skills, analyzedAt: '2026-01-17T00:00:00Z',
      sourceUrl: acme.url, interviewQuestionsVersion: 1, skillExtractionVersion: SKILL_EXTRACTION_VERSION,
    },
    error: null,
  })
}

async function openAcme() {
  render(<App />)
  const company = await screen.findByRole('link', { name: 'Acme' })
  const article = company.closest('article')!
  fireEvent.click(within(article).getByRole('button', { name: 'Open application' }))
  return screen.findByRole('dialog', { name: 'Acme' })
}

describe('versioned job skill extraction in the application UI', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.location.hash = '#/skills'
    mocks.getSession.mockResolvedValue({ data: { session: { user: { id: 'user-1', email: 'person@example.com' } } }, error: null })
    mocks.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } })
  })

  it('refreshes legacy grouped skills and makes individual skills available for the correct job and interview practice', async () => {
    configureApplications(0)
    const dialog = await openAcme()

    await waitFor(() => expect(mocks.invoke).toHaveBeenCalledWith('analyze-job-posting', { body: { applicationId: 'application-acme' } }))
    for (const name of ['GDB', 'JTAG', 'serial debugging']) expect(await within(dialog).findByText(name)).toBeTruthy()
    expect(within(dialog).queryByText('debugging tools')).toBeNull()
    fireEvent.click(within(dialog).getByRole('button', { name: 'View skills' }))

    const acme = (await screen.findByRole('link', { name: 'Acme' })).closest('article')!
    const other = screen.getByRole('link', { name: 'Other Company' }).closest('article')!
    for (const name of ['GDB', 'JTAG', 'serial debugging']) {
      const practice = within(acme).getByRole('button', { name: new RegExp(`${name}.*Practice interview questions`) })
      fireEvent.click(practice)
      expect(within(acme).getByText(`How would you use ${name} to investigate a failure?`)).toBeTruthy()
      expect(within(other).queryByText(name)).toBeNull()
    }
    expect(within(other).getByText('TypeScript')).toBeTruthy()
    expect(mocks.invoke).toHaveBeenCalledTimes(1)
  })

  it('reuses an analysis with the current extraction version when reopening the application', async () => {
    configureApplications(SKILL_EXTRACTION_VERSION)
    const dialog = await openAcme()

    expect(within(dialog).getByText('3 skills found')).toBeTruthy()
    expect(within(dialog).getByText('GDB')).toBeTruthy()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close application details' }))
    fireEvent.click(screen.getByRole('button', { name: /^Skills/ }))
    const company = (await screen.findByRole('link', { name: 'Acme' })).closest('article')!
    fireEvent.click(within(company).getByRole('button', { name: 'Open application' }))
    expect(await screen.findByRole('dialog', { name: 'Acme' })).toBeTruthy()
    expect(mocks.invoke).not.toHaveBeenCalled()
  })
})
