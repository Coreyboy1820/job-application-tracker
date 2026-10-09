import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import SkillsPage from '../../features/skills/pages/SkillsPage'
import type { Application, JobSkill } from '../../shared/types'

const skill: JobSkill = { name: 'TypeScript', category: 'technical', importance: 'required', evidence: 'Build typed applications', comfortRating: 'medium', interviewQuestions: ['Explain TypeScript'] }
const application: Application = { id: 'one', company: 'Acme', role: 'Engineer', location: '', dateApplied: '2026-10-01', status: 'Applied', url: 'https://example.com/one', notes: '', nextStep: '', skills: [skill], skillsAnalyzedAt: '2026-10-02', skillsSourceUrl: 'https://example.com/one' }
const defaults = { loading: false, onOpenApplication: vi.fn(), onOpenCompany: vi.fn(), onOpenApplicationSkills: vi.fn(), applicationFilterId: null, onClearApplicationFilter: vi.fn() }

describe('application knowledge flags', () => {
  it('places a separately labeled selector in each skill card for every importance level', () => {
    render(<SkillsPage {...defaults} applications={[{ ...application, skills: [skill, { ...skill, name: 'React', importance: 'preferred', comfortRating: 'high' }, { ...skill, name: 'Git', importance: 'mentioned', comfortRating: undefined, needsNoStudy: true }] }]} onUpdateSkillComfortRating={vi.fn()} />)
    for (const name of ['TypeScript', 'React', 'Git']) {
      const select = screen.getByRole('combobox', { name: `Knowledge level for ${name}` })
      const card = select.closest('article')!
      expect(select.closest('button')).toBeNull()
      expect(within(card).getByText(name === 'TypeScript' ? 'required' : name === 'React' ? 'preferred' : 'mentioned')).toBeTruthy()
      expect(within(select).getAllByRole('option').map((option) => option.textContent)).toEqual(['Low', 'Medium', 'High', 'No study needed'])
      fireEvent.click(select)
      expect(within(card).getByRole('button').getAttribute('aria-expanded')).toBe('false')
    }
    expect((screen.getByRole('combobox', { name: 'Knowledge level for Git' }) as HTMLSelectElement).value).toBe('no-study-needed')
  })

  it('updates only the selected application, disables its controls while saving, and preserves open questions', async () => {
    let finish!: (success: boolean) => void
    const update = vi.fn().mockImplementation(() => new Promise<boolean>((resolve) => { finish = resolve }))
    render(<SkillsPage {...defaults} applications={[application, { ...application, id: 'two', role: 'Designer' }]} onUpdateSkillComfortRating={update} />)
    const [first, second] = screen.getAllByRole('combobox', { name: 'Knowledge level for TypeScript' })
    const card = first.closest('article')!
    fireEvent.click(within(card).getByRole('button'))
    fireEvent.change(first, { target: { value: 'high' } })
    expect(update).toHaveBeenCalledWith('one', 'TypeScript', 'high')
    expect((first as HTMLSelectElement).disabled).toBe(true)
    expect((second as HTMLSelectElement).disabled).toBe(false)
    expect(within(card).getByRole('heading', { name: 'Interview practice for TypeScript' })).toBeTruthy()
    finish(true)
    await waitFor(() => expect((first as HTMLSelectElement).disabled).toBe(false))
    expect(within(card).getByRole('button').getAttribute('aria-expanded')).toBe('true')
  })

  it('keeps the saved value after an error and allows retry without opening questions', async () => {
    const update = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(true)
    render(<SkillsPage {...defaults} applications={[application]} onUpdateSkillComfortRating={update} />)
    const select = screen.getByRole('combobox', { name: 'Knowledge level for TypeScript' })
    fireEvent.change(select, { target: { value: 'low' } })
    await screen.findByText('Could not save the knowledge level. Please retry.')
    expect((select as HTMLSelectElement).value).toBe('medium')
    expect((select as HTMLSelectElement).disabled).toBe(false)
    fireEvent.change(select, { target: { value: 'low' } })
    await waitFor(() => expect(update).toHaveBeenCalledTimes(2))
    expect(within(select.closest('article')!).getByRole('button').getAttribute('aria-expanded')).toBe('false')
  })
})
