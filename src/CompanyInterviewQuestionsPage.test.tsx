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
    expect(within(typescriptSection as HTMLElement).getByText('Roles: Frontend Engineer, Platform Engineer')).toBeTruthy()
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

  it('returns to the Skills view from the back button', () => {
    const onBack = vi.fn()
    render(<CompanyInterviewQuestionsPage company="Acme" applications={[]} onBack={onBack} />)

    fireEvent.click(screen.getByRole('button', { name: 'Back to Skills' }))

    expect(onBack).toHaveBeenCalledOnce()
  })
})
