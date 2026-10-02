import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import SkillsPage from './SkillsPage'
import type { Application, JobSkill } from './types'

const requiredSkill: JobSkill = {
  name: 'TypeScript',
  category: 'technical',
  importance: 'required',
  evidence: 'Build reliable applications.',
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
    render(<SkillsPage applications={[]} loading onOpenApplication={vi.fn()} />)

    expect(screen.getByText('Loading your skills…')).toBeTruthy()
  })

  it('opens the selected application from its action button', () => {
    const onOpenApplication = vi.fn()
    const application = createApplication({
      skills: [requiredSkill],
      skillsAnalyzedAt: '2026-01-16T12:00:00.000Z',
      skillsSourceUrl: 'https://example.com/jobs/1',
    })
    render(<SkillsPage applications={[application]} loading={false} onOpenApplication={onOpenApplication} />)

    fireEvent.click(screen.getByRole('button', { name: 'Open application' }))

    expect(onOpenApplication).toHaveBeenCalledWith('application-1')
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
    render(<SkillsPage applications={[requiredApplication, preferredApplication]} loading={false} onOpenApplication={vi.fn()} />)

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
    render(<SkillsPage applications={[application]} loading={false} onOpenApplication={vi.fn()} />)

    expect(screen.getByText('0 unique skills')).toBeTruthy()
    const jobsAnalyzedStat = screen.getByText('Jobs analyzed').closest('article')
    expect(jobsAnalyzedStat?.querySelector('.stat-value')?.textContent).toBe('0')
    expect(screen.getByRole('button', { name: 'Analyze posting' })).toBeTruthy()
  })
})
