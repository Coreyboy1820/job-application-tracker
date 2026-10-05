import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
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
    render(<CompanyInterviewQuestionsPage company="Acme" applications={[createApplication(), secondJob, unrelatedJob, staleJob]} onBack={vi.fn()} onUpdateSkillComfortRating={vi.fn().mockResolvedValue(true)} />)

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
    render(<CompanyInterviewQuestionsPage company="Acme" applications={[application]} onBack={vi.fn()} onUpdateSkillComfortRating={vi.fn().mockResolvedValue(true)} />)

    expect(screen.getByRole('status').textContent).toContain('No interview questions available yet')
  })

  it('marks no-study skills and sorts them after skills still needing study', () => {
    const application = createApplication({
      role: 'No-study Engineer',
      skills: [
        { ...typeScript, needsNoStudy: true },
        { ...typeScript, name: 'React', comfortRating: 'high' },
        { ...typeScript, name: 'Angular', comfortRating: 'low' },
        { ...typeScript, name: 'Go', comfortRating: 'medium' },
      ],
    })
    render(<CompanyInterviewQuestionsPage company="Acme" applications={[application]} onBack={vi.fn()} onUpdateSkillComfortRating={vi.fn().mockResolvedValue(true)} />)

    const skillCards = screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.closest('article'))
    expect(skillCards.map((card) => card?.querySelector('h3')?.textContent)).toEqual(['Angular', 'Go', 'React', 'TypeScript'])
    expect(skillCards[1]?.classList.contains('company-skill-no-study')).toBe(false)
    expect(skillCards[3]?.classList.contains('company-skill-no-study')).toBe(true)
    expect(skillCards[3]?.textContent).toContain('No-study Engineer (0)')
    expect(skillCards.map((card) => (card?.querySelector('select') as HTMLSelectElement)?.value)).toEqual([
      'low', 'medium', 'high', 'no-study-needed',
    ])
  })

  it('orders company practice questions by comfort rating and keeps no-study skills last', () => {
    const application = createApplication({
      skills: [
        { ...typeScript, name: 'No study', comfortRating: 'no-study-needed' },
        { ...typeScript, name: 'High', comfortRating: 'high' },
        { ...typeScript, name: 'Medium', comfortRating: 'medium' },
        { ...typeScript, name: 'Low', comfortRating: 'low' },
      ],
    })
    render(<CompanyInterviewQuestionsPage company="Acme" applications={[application]} onBack={vi.fn()} onUpdateSkillComfortRating={vi.fn().mockResolvedValue(true)} />)

    const skillNames = screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)
    expect(skillNames).toEqual(['Low', 'Medium', 'High', 'No study'])
  })

  it('keeps a grouped skill active when another role still needs study', () => {
    const noStudyApplication = createApplication({
      role: 'No-study Engineer',
      skills: [{ ...typeScript, interviewQuestions: [], needsNoStudy: true, priority: 0 }],
    })
    const activeApplication = createApplication({
      id: 'application-2',
      role: 'Frontend Engineer',
      skills: [{ ...typeScript, comfortRating: 'medium' }],
    })
    render(<CompanyInterviewQuestionsPage company="Acme" applications={[noStudyApplication, activeApplication]} onBack={vi.fn()} onUpdateSkillComfortRating={vi.fn().mockResolvedValue(true)} />)

    const skillCard = screen.getByRole('heading', { name: 'TypeScript' }).closest('article')
    expect(skillCard?.classList.contains('company-skill-no-study')).toBe(false)
    expect(within(skillCard as HTMLElement).getByText('Roles: No-study Engineer (0), Frontend Engineer (2)')).toBeTruthy()
    expect((within(skillCard as HTMLElement).getByRole('combobox') as HTMLSelectElement).value).toBe('medium')
  })

  it('offers all knowledge levels in the flag and saves every eligible application', async () => {
    const save = vi.fn().mockResolvedValue(true)
    const second = createApplication({ id: 'application-2', role: 'Platform Engineer', skills: [{ ...typeScript, name: ' typescript ', comfortRating: 'high' }] })
    const unrelated = createApplication({ id: 'application-3', company: 'Globex', role: 'Unrelated Engineer' })
    const stale = createApplication({ id: 'application-4', role: 'Stale Engineer', skillsSourceUrl: 'old-url' })
    render(<CompanyInterviewQuestionsPage company="Acme" applications={[createApplication(), second, unrelated, stale]} onBack={vi.fn()} onUpdateSkillComfortRating={save} />)

    expect(screen.getAllByRole('combobox')).toHaveLength(1)
    const selector = screen.getByRole('combobox', { name: 'Knowledge level for TypeScript' })
    expect(within(selector).getAllByRole('option').map((option) => option.textContent)).toEqual(['Low', 'Medium', 'High', 'No study needed'])
    for (const rating of ['low', 'medium', 'high', 'no-study-needed']) {
      fireEvent.change(selector, { target: { value: rating } })
      await waitFor(() => expect((selector as HTMLSelectElement).disabled).toBe(false))
      expect(save).toHaveBeenNthCalledWith(save.mock.calls.length - 1, 'application-1', 'TypeScript', rating)
      expect(save).toHaveBeenLastCalledWith('application-2', ' typescript ', rating)
    }
    expect(save).toHaveBeenCalledTimes(8)
    expect((selector as HTMLSelectElement).value).toBe('low')
  })

  it('uses one flag for applications with the same role and updates both', async () => {
    const save = vi.fn().mockResolvedValue(true)
    render(<CompanyInterviewQuestionsPage company="Acme" applications={[createApplication(), createApplication({ id: 'application-2' })]} onBack={vi.fn()} onUpdateSkillComfortRating={save} />)
    const selector = screen.getByRole('combobox', { name: 'Knowledge level for TypeScript' })
    expect(screen.getAllByRole('combobox')).toHaveLength(1)
    fireEvent.change(selector, { target: { value: 'high' } })
    await waitFor(() => expect((selector as HTMLSelectElement).disabled).toBe(false))
    expect(save.mock.calls).toEqual([['application-1', 'TypeScript', 'high'], ['application-2', 'TypeScript', 'high']])
  })

  it.each(['false', 'rejection'])('preserves saved values and permits retry after a %s result', async (failure) => {
    const save = vi.fn()
    if (failure === 'false') save.mockResolvedValueOnce(false)
    else save.mockRejectedValueOnce(new Error('Network error'))
    save.mockResolvedValueOnce(true)
    render(<CompanyInterviewQuestionsPage company="Acme" applications={[createApplication()]} onBack={vi.fn()} onUpdateSkillComfortRating={save} />)
    const selector = screen.getByRole('combobox')

    fireEvent.change(selector, { target: { value: 'high' } })
    expect((await screen.findByRole('alert')).textContent).toContain('Could not save the knowledge level for all roles. Please try again.')
    expect((selector as HTMLSelectElement).value).toBe('low')
    expect((selector as HTMLSelectElement).disabled).toBe(false)
    fireEvent.change(selector, { target: { value: 'medium' } })
    await waitFor(() => expect((selector as HTMLSelectElement).disabled).toBe(false))
    expect(screen.queryByRole('alert')).toBeNull()
    expect(save).toHaveBeenLastCalledWith('application-1', 'TypeScript', 'medium')
    expect(save).toHaveBeenCalledTimes(2)
  })

  it('reflects actual saved group priority after a partial failure and retries remaining roles', async () => {
    const first = createApplication({ skills: [{ ...typeScript, comfortRating: 'low' }] })
    const second = createApplication({ id: 'application-2', role: 'Platform Engineer', skills: [{ ...typeScript, comfortRating: 'medium' }] })
    const third = createApplication({ id: 'application-3', role: 'API Engineer', skills: [{ ...typeScript, comfortRating: 'high' }] })
    const save = vi.fn().mockResolvedValueOnce(true).mockResolvedValueOnce(false).mockResolvedValue(true)
    const props = { company: 'Acme', applications: [first, second, third], onBack: vi.fn(), onUpdateSkillComfortRating: save }
    const { rerender } = render(<CompanyInterviewQuestionsPage {...props} />)
    const selector = screen.getByRole('combobox') as HTMLSelectElement
    fireEvent.change(selector, { target: { value: 'no-study-needed' } })
    await screen.findByRole('alert')
    expect(save).toHaveBeenCalledTimes(2)
    rerender(<CompanyInterviewQuestionsPage {...props} applications={[{ ...first, skills: [{ ...typeScript, comfortRating: 'no-study-needed' }] }, second, third]} />)
    expect(selector.value).toBe('medium')
    expect(screen.getByRole('heading', { name: 'TypeScript' }).closest('article')?.classList.contains('company-skill-no-study')).toBe(false)
    fireEvent.change(selector, { target: { value: 'no-study-needed' } })
    await waitFor(() => expect(selector.disabled).toBe(false))
    expect(save.mock.calls.slice(2)).toEqual([
      ['application-1', 'TypeScript', 'no-study-needed'],
      ['application-2', 'TypeScript', 'no-study-needed'],
      ['application-3', 'TypeScript', 'no-study-needed'],
    ])
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('retries a partial save when the aggregate already equals the requested level', async () => {
    const first = createApplication({ skills: [{ ...typeScript, comfortRating: 'high' }] })
    const second = createApplication({ id: 'application-2', role: 'Platform Engineer', skills: [{ ...typeScript, comfortRating: 'high' }] })
    const save = vi.fn().mockResolvedValueOnce(true).mockResolvedValueOnce(false).mockResolvedValue(true)
    const props = { company: 'Acme', applications: [first, second], onBack: vi.fn(), onUpdateSkillComfortRating: save }
    const { rerender } = render(<CompanyInterviewQuestionsPage {...props} />)
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'low' } })
    await screen.findByRole('alert')
    rerender(<CompanyInterviewQuestionsPage {...props} applications={[{ ...first, skills: [{ ...typeScript, comfortRating: 'low' }] }, second]} />)
    expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('low')
    fireEvent.click(screen.getByRole('button', { name: 'Retry saving' }))
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull())
    expect(save.mock.calls.slice(2)).toEqual([['application-1', 'TypeScript', 'low'], ['application-2', 'TypeScript', 'low']])
  })

  it('disables every selector while saving and reflects persisted levels, ordering, and study status', async () => {
    let resolveSave!: (value: boolean) => void
    const save = vi.fn(() => new Promise<boolean>((resolve) => { resolveSave = resolve }))
    const application = createApplication({ skills: [{ ...typeScript, comfortRating: 'low' }, { ...typeScript, name: 'React', comfortRating: 'medium' }] })
    const props = { company: 'Acme', applications: [application], onBack: vi.fn(), onUpdateSkillComfortRating: save }
    const { rerender } = render(<CompanyInterviewQuestionsPage {...props} />)

    fireEvent.change(screen.getByRole('combobox', { name: 'Knowledge level for TypeScript' }), { target: { value: 'no-study-needed' } })
    expect(screen.getByRole('status').textContent).toContain('Saving knowledge level')
    for (const selector of screen.getAllByRole('combobox')) expect((selector as HTMLSelectElement).disabled).toBe(true)
    await act(async () => resolveSave(true))
    rerender(<CompanyInterviewQuestionsPage {...props} applications={[{ ...application, skills: [{ ...typeScript, comfortRating: 'no-study-needed' }, { ...typeScript, name: 'React', comfortRating: 'medium' }] }]} />)

    expect(screen.queryByRole('status')).toBeNull()
    expect(screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)).toEqual(['React', 'TypeScript'])
    const card = screen.getByRole('heading', { name: 'TypeScript' }).closest('article')!
    expect(card.classList.contains('company-skill-no-study')).toBe(true)
    expect(within(card).getByText('Knowledge level:')).toBeTruthy()
    expect(within(card).getByText('Roles: Frontend Engineer (0)')).toBeTruthy()
    expect((within(card).getByRole('combobox') as HTMLSelectElement).value).toBe('no-study-needed')
    for (const selector of screen.getAllByRole('combobox')) expect((selector as HTMLSelectElement).disabled).toBe(false)
  })

  it('returns to the Skills view from the back button', () => {
    const onBack = vi.fn()
    render(<CompanyInterviewQuestionsPage company="Acme" applications={[]} onBack={onBack} onUpdateSkillComfortRating={vi.fn().mockResolvedValue(true)} />)

    fireEvent.click(screen.getByRole('button', { name: 'Back to Skills' }))

    expect(onBack).toHaveBeenCalledOnce()
  })
})
