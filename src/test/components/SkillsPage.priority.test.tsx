import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import SkillsPage from '../../features/skills/pages/SkillsPage'
import type { Application, ComfortRating, JobSkill } from '../../shared/types'
import { withComfortRating } from '../../features/skills/skillPriority'

const skill = (name: string, comfortRating?: ComfortRating): JobSkill => ({ name, comfortRating, category: 'technical', importance: 'required', evidence: name, interviewQuestions: [`Explain ${name}`] })
const application: Application = {
  id: 'one', company: 'Acme', role: 'Engineer', location: '', dateApplied: '2026-10-01', status: 'Applied',
  url: 'https://example.com/one', notes: '', nextStep: '', skillsAnalyzedAt: '2026-10-02', skillsSourceUrl: 'https://example.com/one',
  skills: [skill('Known', 'no-study-needed'), skill('High', 'high'), skill('Medium', 'medium'), skill('Low', 'low'), skill('Unrated'), { ...skill('Legacy'), needsNoStudy: true }],
}
const defaults = { loading: false, onOpenApplication: vi.fn(), onOpenCompany: vi.fn(), onOpenApplicationSkills: vi.fn(), applicationFilterId: null, onClearApplicationFilter: vi.fn(), onUpdateSkillComfortRating: vi.fn().mockResolvedValue(true) }
function visibleSkills() {
  return screen.getAllByRole('button', { name: /Practice interview questions|Hide interview questions/ }).map((button) => button.querySelector('strong')?.textContent)
}
describe('application skill study priority', () => {
  it('orders lowest comfort first with stable ties and no-study skills last without mutating saved data', () => {
    const saved = application.skills!.map((item) => item.name)
    render(<SkillsPage {...defaults} applications={[application]} />)
    expect(visibleSkills()).toEqual(['Low', 'Unrated', 'Medium', 'High', 'Known', 'Legacy'])
    expect(application.skills!.map((item) => item.name)).toEqual(saved)
    for (const name of ['Known', 'Legacy']) {
      expect(screen.getByRole('button', { name: new RegExp(name + '.*Practice') }).closest('article')?.classList.contains('analyzed-skill-no-study')).toBe(true)
    }
  })

  it('reorders after a persisted rating change while preserving question selection', () => {
    const update = vi.fn().mockResolvedValue(true)
    const { rerender } = render(<SkillsPage {...defaults} onUpdateSkillComfortRating={update} applications={[application]} />)
    fireEvent.click(screen.getByRole('button', { name: /High.*Practice/ }))
    fireEvent.change(screen.getByRole('combobox', { name: 'Knowledge level for High' }), { target: { value: 'low' } })
    expect(update).toHaveBeenCalledWith('one', 'High', 'low')
    const saved = { ...application, skills: application.skills!.map((item) => item.name === 'High' ? withComfortRating(item, 'low') : item) }
    rerender(<SkillsPage {...defaults} onUpdateSkillComfortRating={update} applications={[saved]} />)
    expect(visibleSkills()).toEqual(['High', 'Low', 'Unrated', 'Medium', 'Known', 'Legacy'])
    expect(screen.getByRole('heading', { name: 'Interview practice for High' })).toBeTruthy()
    expect(within(screen.getByRole('button', { name: /High.*Hide/ }).closest('article')!).getByText('Explain High')).toBeTruthy()
  })
})
