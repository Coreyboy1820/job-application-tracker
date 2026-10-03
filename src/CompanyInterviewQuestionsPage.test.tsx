import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import CompanyInterviewQuestionsPage from './CompanyInterviewQuestionsPage'
import type { Application, JobSkill } from './types'

const typeScript: JobSkill = {
  name: 'TypeScript',
  category: 'technical',
  importance: 'required',
  evidence: 'Use TypeScript.',
  interviewQuestions: ['How do you model safe types?', 'How do you narrow unknown values?', 'How do you structure shared types?'],
}

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
    skills: [typeScript],
    skillsAnalyzedAt: '2026-01-16T12:00:00.000Z',
    skillsSourceUrl: 'https://example.com/jobs/1',
    ...overrides,
  }
}

describe('CompanyInterviewQuestionsPage', () => {
  it('groups questions by skill across company applications without including other companies', () => {
    const secondJob = createApplication({
      id: 'application-2',
      role: 'Platform Engineer',
      url: 'https://example.com/jobs/2',
      skillsSourceUrl: 'https://example.com/jobs/2',
      skills: [
        { ...typeScript, name: ' typescript ', interviewQuestions: ['How do you model safe types?', 'How do you test type boundaries?'] },
        { ...typeScript, name: 'React', interviewQuestions: ['How do you manage component state?', 'How do you test components?', 'How do you optimize rendering?'] },
      ],
    })
    const unrelatedJob = createApplication({
      id: 'application-3',
      company: 'Globex',
      skills: [{ ...typeScript, name: 'Kubernetes', interviewQuestions: ['Unrelated question 1', 'Unrelated question 2', 'Unrelated question 3'] }],
    })
    const staleJob = createApplication({
      id: 'application-4',
      skills: [{ ...typeScript, name: 'Stale skill', interviewQuestions: ['Stale question 1', 'Stale question 2', 'Stale question 3'] }],
      skillsSourceUrl: 'https://example.com/jobs/old',
    })
    render(<CompanyInterviewQuestionsPage company="Acme" applications={[createApplication(), secondJob, unrelatedJob, staleJob]} onBack={vi.fn()} />)

    const typescriptSection = screen.getByRole('heading', { name: 'TypeScript' }).closest('article')
    expect(typescriptSection).not.toBeNull()
    expect(within(typescriptSection as HTMLElement).getAllByRole('listitem')).toHaveLength(4)
    expect(within(typescriptSection as HTMLElement).getByText('Roles: Frontend Engineer (1), Platform Engineer (1)')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'React' })).toBeTruthy()
    expect(screen.queryByText('Kubernetes')).toBeNull()
    expect(screen.queryByText(/Unrelated question/)).toBeNull()
    expect(screen.queryByText('Stale skill')).toBeNull()
    expect(screen.queryByText(/Stale question/)).toBeNull()
  })

  it('shows an empty state when the company has no questions', () => {
    const application = createApplication({
      skills: [{ ...typeScript, interviewQuestions: [] }],
    })
    render(<CompanyInterviewQuestionsPage company="Acme" applications={[application]} onBack={vi.fn()} />)

    expect(screen.getByRole('status').textContent).toContain('No interview questions available yet')
  })

  it('crosses out the whole skill card and sorts it after skills still needing study', () => {
    const application = createApplication({
      role: 'No-study Engineer',
      skills: [
        { ...typeScript, needsNoStudy: true },
        { ...typeScript, name: 'React', priority: 3 },
        { ...typeScript, name: 'Angular', priority: 1 },
        { ...typeScript, name: 'Go', priority: 2 },
      ],
    })
    render(<CompanyInterviewQuestionsPage company="Acme" applications={[application]} onBack={vi.fn()} />)

    const skillCards = screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.closest('article'))
    expect(skillCards.map((card) => card?.querySelector('h3')?.textContent)).toEqual(['Angular', 'Go', 'React', 'TypeScript'])
    expect(skillCards[1]?.classList.contains('company-skill-no-study')).toBe(false)
    expect(skillCards[3]?.classList.contains('company-skill-no-study')).toBe(true)
    expect(skillCards[3]?.textContent).toContain('No-study Engineer (0)')
  })

  it('keeps a grouped skill active when another role still needs to study it', () => {
    const noStudyApplication = createApplication({
      role: 'No-study Engineer',
      skills: [{ ...typeScript, interviewQuestions: [], needsNoStudy: true, priority: 0 }],
    })
    const activeApplication = createApplication({
      id: 'application-2',
      role: 'Frontend Engineer',
      skills: [{ ...typeScript, priority: 2 }],
    })
    render(<CompanyInterviewQuestionsPage company="Acme" applications={[noStudyApplication, activeApplication]} onBack={vi.fn()} />)

    const skillCard = screen.getByRole('heading', { name: 'TypeScript' }).closest('article')
    expect(skillCard?.classList.contains('company-skill-no-study')).toBe(false)
    expect(within(skillCard as HTMLElement).getByText('Roles: No-study Engineer (0), Frontend Engineer (2)')).toBeTruthy()
  })

  it('returns to the Skills view from the back button', () => {
    const onBack = vi.fn()
    render(<CompanyInterviewQuestionsPage company="Acme" applications={[]} onBack={onBack} />)

    fireEvent.click(screen.getByRole('button', { name: 'Back to Skills' }))

    expect(onBack).toHaveBeenCalledOnce()
  })
})
