import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import SkillsPage from './SkillsPage'
import type { Application, ComfortRating, JobSkill } from './types'

const requiredSkill: JobSkill = {
  name: 'TypeScript',
  category: 'technical',
  importance: 'required',
  evidence: 'Build reliable applications.',
  interviewQuestions: [
    'How do you use TypeScript to prevent runtime errors?',
    'How would you model a complex API response?',
    'What trade-offs do strict compiler options introduce?',
  ],
}

const preferredSkill: JobSkill = {
  name: 'React',
  category: 'technical',
  importance: 'preferred',
  evidence: 'Experience with React is preferred.',
}

const noop = vi.fn()

function createApplication(overrides: Partial<Application> = {}): Application {
  return {
    id: 'application-1',
    company: 'Acme',
    role: 'Frontend Engineer',
    location: 'Remote',
    dateApplied: '2026-01-15',
    status: 'Applied',
    url: 'https://example.com/jobs/1',
    notes: '',
    nextStep: '',
    ...overrides,
  }
}

describe('SkillsPage', () => {
  function renderSkillsPage(applications: Application[], options: {
    loading?: boolean
    applicationFilterId?: string | null
    onOpenApplication?: (id: string) => void
    onOpenCompany?: (company: string) => void
    onOpenApplicationSkills?: (id: string) => void
    onClearApplicationFilter?: () => void
    onUpdateSkillComfortRating?: (applicationId: string, skillName: string, comfortRating: ComfortRating) => Promise<boolean>
  } = {}) {
    return render(<SkillsPage
      applications={applications}
      loading={options.loading ?? false}
      onOpenApplication={options.onOpenApplication ?? noop}
      onOpenCompany={options.onOpenCompany ?? noop}
      onOpenApplicationSkills={options.onOpenApplicationSkills ?? noop}
      applicationFilterId={options.applicationFilterId ?? null}
      onClearApplicationFilter={options.onClearApplicationFilter ?? noop}
      onUpdateSkillComfortRating={options.onUpdateSkillComfortRating ?? (async () => true)}
    />)
  }

  it('shows loading feedback while applications are loading', () => {
    renderSkillsPage([], { loading: true })

    expect(screen.getByText('Loading your skills…')).toBeTruthy()
  })

  it('collapses a job section independently and keeps its identity visible', () => {
    const firstApplication = createApplication({
      skills: [requiredSkill],
      skillsAnalyzedAt: '2026-01-16T12:00:00.000Z',
      skillsSourceUrl: 'https://example.com/jobs/1',
    })
    const secondApplication = createApplication({
      id: 'application-2',
      company: 'Globex',
      url: 'https://example.com/jobs/2',
      skills: [preferredSkill],
      skillsAnalyzedAt: '2026-01-17T12:00:00.000Z',
      skillsSourceUrl: 'https://example.com/jobs/2',
    })
    renderSkillsPage([firstApplication, secondApplication])

    fireEvent.click(screen.getByRole('button', { name: 'Collapse Acme skills' }))

    expect(screen.getByRole('button', { name: 'Expand Acme skills' }).getAttribute('aria-expanded')).toBe('false')
    expect(screen.getByRole('heading', { name: 'Acme' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /TypeScript/ })).toBeNull()
    expect(screen.getByRole('button', { name: 'Collapse Globex skills' }).getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByText('React')).toBeTruthy()
  })

  it('opens the selected application from its action button', () => {
    const onOpenApplication = vi.fn()
    const application = createApplication({
      skills: [requiredSkill],
      skillsAnalyzedAt: '2026-01-16T12:00:00.000Z',
      skillsSourceUrl: 'https://example.com/jobs/1',
    })
    renderSkillsPage([application], { onOpenApplication })

    fireEvent.click(screen.getByRole('button', { name: 'Open application' }))

    expect(onOpenApplication).toHaveBeenCalledWith('application-1')
  })

  it('opens company interview questions from the company name and keeps application skills accessible', () => {
    const onOpenCompany = vi.fn()
    const onOpenApplicationSkills = vi.fn()
    renderSkillsPage([createApplication()], { onOpenCompany, onOpenApplicationSkills })

    const companyLink = screen.getByRole('link', { name: 'Acme' })
    expect(companyLink.getAttribute('href')).toBe('#/skills/company/Acme')
    fireEvent.click(companyLink)

    expect(onOpenCompany).toHaveBeenCalledWith('Acme')
    fireEvent.click(screen.getByRole('button', { name: 'View skills' }))
    expect(onOpenApplicationSkills).toHaveBeenCalledWith('application-1')
  })

  it('shows the saved interview questions for a repeated skill across applications', () => {
    const application = createApplication({
      skills: [requiredSkill],
      skillsAnalyzedAt: '2026-01-16T12:00:00.000Z',
      skillsSourceUrl: 'https://example.com/jobs/1',
    })
    const anotherApplication = createApplication({
      id: 'application-2',
      company: 'Globex',
      role: 'Platform Engineer',
      url: 'https://example.com/jobs/2',
      skills: [{ ...requiredSkill }],
      skillsAnalyzedAt: '2026-01-17T12:00:00.000Z',
      skillsSourceUrl: 'https://example.com/jobs/2',
    })
    renderSkillsPage([application, anotherApplication])

    const [firstSkill] = screen.getAllByRole('button', { name: /TypeScript/ })
    fireEvent.click(firstSkill)

    expect(screen.getByText('How do you use TypeScript to prevent runtime errors?')).toBeTruthy()

    const [, secondSkill] = screen.getAllByRole('button', { name: /TypeScript/ })
    fireEvent.click(secondSkill)

    expect(screen.getByText('How do you use TypeScript to prevent runtime errors?')).toBeTruthy()
  })

  it('shows and updates the comfort rating for the selected application skill', () => {
    const onUpdateSkillComfortRating = vi.fn(async () => true)
    const application = createApplication({
      skills: [{ ...requiredSkill, comfortRating: 'medium' }],
      skillsAnalyzedAt: '2026-01-16T12:00:00.000Z',
      skillsSourceUrl: 'https://example.com/jobs/1',
    })
    const anotherApplication = createApplication({
      id: 'application-2',
      company: 'Globex',
      role: 'Platform Engineer',
      url: 'https://example.com/jobs/2',
      skills: [{ ...requiredSkill }],
      skillsAnalyzedAt: '2026-01-17T12:00:00.000Z',
      skillsSourceUrl: 'https://example.com/jobs/2',
    })
    renderSkillsPage([application, anotherApplication], { onUpdateSkillComfortRating })

    const firstRating = screen.getAllByRole('combobox', { name: 'Knowledge level for TypeScript' })[0]
    expect((firstRating as HTMLSelectElement).value).toBe('medium')
    expect(Array.from((firstRating as HTMLSelectElement).options).map((option) => option.textContent)).toEqual([
      'Low',
      'Medium',
      'High',
      'No study needed',
    ])
    fireEvent.change(firstRating, { target: { value: 'low' } })

    expect(onUpdateSkillComfortRating).toHaveBeenCalledWith('application-1', 'TypeScript', 'low')
  })

  it('shows legacy no-study flags as No study needed and updates the same rating control', () => {
    const onUpdateSkillComfortRating = vi.fn(async () => true)
    const application = createApplication({
      skills: [{ ...requiredSkill, needsNoStudy: true }],
      skillsAnalyzedAt: '2026-01-16T12:00:00.000Z',
      skillsSourceUrl: 'https://example.com/jobs/1',
    })
    renderSkillsPage([application], { onUpdateSkillComfortRating })

    const skillCard = screen.getByRole('button', { name: /TypeScript/ }).closest('.analyzed-skill')
    expect(skillCard?.classList.contains('analyzed-skill-no-study')).toBe(true)
    const studyLevel = screen.getByRole('combobox', { name: 'Knowledge level for TypeScript' })
    expect((studyLevel as HTMLSelectElement).value).toBe('no-study-needed')
    fireEvent.change(studyLevel, { target: { value: 'high' } })
    expect(onUpdateSkillComfortRating).toHaveBeenCalledWith('application-1', 'TypeScript', 'high')
    expect(screen.queryByRole('button', { name: /Mark as .*needing study/ })).toBeNull()
    expect(screen.queryByRole('combobox', { name: 'Mark a saved skill as not needing study' })).toBeNull()
  })

  it('defaults unrated skills to Low', () => {
    const application = createApplication({
      skills: [requiredSkill],
      skillsAnalyzedAt: '2026-01-16T12:00:00.000Z',
      skillsSourceUrl: 'https://example.com/jobs/1',
    })
    renderSkillsPage([application])

    expect((screen.getByRole('combobox', { name: 'Knowledge level for TypeScript' }) as HTMLSelectElement).value).toBe('low')
  })

  it('explains how to generate interview questions for older saved analyses', () => {
    const application = createApplication({
      skills: [{ ...requiredSkill, interviewQuestions: undefined }],
      skillsAnalyzedAt: '2026-01-16T12:00:00.000Z',
      skillsSourceUrl: 'https://example.com/jobs/1',
    })
    renderSkillsPage([application])

    fireEvent.click(screen.getByRole('button', { name: /TypeScript/ }))

    expect(screen.getByText('Interview questions are not available for this saved analysis yet. Open the application to generate them.')).toBeTruthy()
  })

  it('filters analyzed applications by skill importance', () => {
    const requiredApplication = createApplication({
      id: 'required-application',
      company: 'Acme',
      skills: [requiredSkill],
      skillsAnalyzedAt: '2026-01-16T12:00:00.000Z',
      skillsSourceUrl: 'https://example.com/jobs/1',
    })
    const preferredApplication = createApplication({
      id: 'preferred-application',
      company: 'Globex',
      skills: [preferredSkill],
      skillsAnalyzedAt: '2026-01-17T12:00:00.000Z',
      skillsSourceUrl: 'https://example.com/jobs/1',
    })
    renderSkillsPage([requiredApplication, preferredApplication])

    fireEvent.click(screen.getByRole('button', { name: 'Required' }))

    expect(screen.getByRole('heading', { name: 'Acme' })).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'Globex' })).toBeNull()
  })

  it('does not count skills when the saved analysis is for an old posting URL', () => {
    const application = createApplication({
      skills: [requiredSkill],
      skillsAnalyzedAt: '2026-01-16T12:00:00.000Z',
      skillsSourceUrl: 'https://example.com/jobs/old',
    })
    renderSkillsPage([application])

    expect(screen.getByText('0 unique skills')).toBeTruthy()
    const jobsAnalyzedStat = screen.getByText('Jobs analyzed').closest('article')
    expect(jobsAnalyzedStat?.querySelector('.stat-value')?.textContent).toBe('0')
    expect(screen.getByRole('button', { name: 'Analyze posting' })).toBeTruthy()
  })

  it('filters to one application and provides a way to show all skills again', () => {
    const onClearApplicationFilter = vi.fn()
    const requiredApplication = createApplication({
      skills: [requiredSkill],
      skillsAnalyzedAt: '2026-01-16T12:00:00.000Z',
      skillsSourceUrl: 'https://example.com/jobs/1',
    })
    const otherApplication = createApplication({
      id: 'application-2',
      company: 'Globex',
      skills: [preferredSkill],
      skillsAnalyzedAt: '2026-01-17T12:00:00.000Z',
      skillsSourceUrl: 'https://example.com/jobs/1',
    })
    renderSkillsPage([requiredApplication, otherApplication], {
      applicationFilterId: 'application-1',
      onClearApplicationFilter,
    })

    expect(screen.getByRole('status').textContent).toContain('Filtered to Frontend Engineer at Acme')
    expect(screen.getByRole('heading', { name: 'Acme' })).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'Globex' })).toBeNull()
    expect(screen.getByText((_, element) => element?.classList.contains('panel-footer') ?? false).textContent).toContain('Showing 1 of 1 applications')

    fireEvent.click(screen.getByRole('button', { name: 'Show all skills' }))
    expect(onClearApplicationFilter).toHaveBeenCalledOnce()
  })
})
