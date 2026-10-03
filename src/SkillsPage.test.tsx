import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import SkillsPage from './SkillsPage'
import type { Application, JobSkill } from './types'

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
  it('shows loading feedback while applications are loading', () => {
    render(<SkillsPage applications={[]} loading onOpenApplication={vi.fn()} onOpenCompany={vi.fn()} />)

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
    render(<SkillsPage applications={[firstApplication, secondApplication]} loading={false} onOpenApplication={vi.fn()} onOpenCompany={vi.fn()} />)

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
    render(<SkillsPage applications={[application]} loading={false} onOpenApplication={onOpenApplication} onOpenCompany={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Open application' }))

    expect(onOpenApplication).toHaveBeenCalledWith('application-1')
  })

  it('opens company interview questions from the company name', () => {
    const onOpenCompany = vi.fn()
    render(<SkillsPage applications={[createApplication()]} loading={false} onOpenApplication={vi.fn()} onOpenCompany={onOpenCompany} />)

    fireEvent.click(screen.getByRole('link', { name: 'Acme' }))

    expect(onOpenCompany).toHaveBeenCalledWith('Acme')
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
    render(<SkillsPage applications={[application, anotherApplication]} loading={false} onOpenApplication={vi.fn()} onOpenCompany={vi.fn()} />)

    const [firstSkill] = screen.getAllByRole('button', { name: /TypeScript/ })
    fireEvent.click(firstSkill)

    expect(screen.getByText('How do you use TypeScript to prevent runtime errors?')).toBeTruthy()

    const [, secondSkill] = screen.getAllByRole('button', { name: /TypeScript/ })
    fireEvent.click(secondSkill)

    expect(screen.getByText('How do you use TypeScript to prevent runtime errors?')).toBeTruthy()
  })

  it('explains how to generate interview questions for older saved analyses', () => {
    const application = createApplication({
      skills: [{ ...requiredSkill, interviewQuestions: undefined }],
      skillsAnalyzedAt: '2026-01-16T12:00:00.000Z',
      skillsSourceUrl: 'https://example.com/jobs/1',
    })
    render(<SkillsPage applications={[application]} loading={false} onOpenApplication={vi.fn()} onOpenCompany={vi.fn()} />)

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
    render(<SkillsPage applications={[requiredApplication, preferredApplication]} loading={false} onOpenApplication={vi.fn()} onOpenCompany={vi.fn()} />)

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
    render(<SkillsPage applications={[application]} loading={false} onOpenApplication={vi.fn()} onOpenCompany={vi.fn()} />)

    expect(screen.getByText('0 unique skills')).toBeTruthy()
    const jobsAnalyzedStat = screen.getByText('Jobs analyzed').closest('article')
    expect(jobsAnalyzedStat?.querySelector('.stat-value')?.textContent).toBe('0')
    expect(screen.getByRole('button', { name: 'Analyze posting' })).toBeTruthy()
  })
})
