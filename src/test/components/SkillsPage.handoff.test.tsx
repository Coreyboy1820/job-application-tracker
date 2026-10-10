import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import SkillsPage from '../../features/skills/pages/SkillsPage'
import type { Application, JobSkill } from '../../shared/types'

function skill(name: string, question: string): JobSkill {
  return { name, category: 'technical', importance: 'required', evidence: `${name} evidence`, interviewQuestions: [question] }
}
function application(id: string, skills: JobSkill[]): Application {
  return { id, company: 'Acme', role: `Role ${id}`, location: '', dateApplied: '2026-01-01', status: 'Applied', url: `https://example.com/${id}`, notes: 'Private notes', nextStep: 'Private next step', jobDescription: 'Private full job posting', skills, skillsAnalyzedAt: '2026-01-02T00:00:00Z', skillsSourceUrl: `https://example.com/${id}` }
}
const onUpdate = vi.fn(async () => true)
function view(applications: Application[], applicationFilterId: string | null = 'first') {
  return <SkillsPage applications={applications} applicationFilterId={applicationFilterId} loading={false} onOpenApplication={vi.fn()} onOpenCompany={vi.fn()} onOpenApplicationSkills={vi.fn()} onClearApplicationFilter={vi.fn()} onUpdateSkillComfortRating={onUpdate} />
}

describe('SkillsPage ChatGPT handoff', () => {
  it('aggregates selected questions across skills while isolating same-company applications and excluding private fields', () => {
    onUpdate.mockClear()
    render(view([
      application('first', [skill('React', 'First React question?'), skill('TypeScript', 'First types question?')]),
      application('second', [skill('React', 'Second application question?')]),
    ]))
    fireEvent.click(screen.getByRole('button', { name: /React.*Practice interview questions/ }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'First React question?' }))
    fireEvent.click(screen.getByRole('button', { name: /TypeScript.*Practice interview questions/ }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'First types question?' }))
    expect(screen.queryByText('Second application question?')).toBeNull()
    expect(screen.getByText('2 questions selected for ChatGPT')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Prepare ChatGPT prompt' }))
    const preview = screen.getByRole('textbox', { name: 'Prompt preview' }) as HTMLTextAreaElement
    expect(preview.value).toContain('First React question?')
    expect(preview.value).toContain('First types question?')
    expect(preview.value).not.toContain('Second application question?')
    for (const privateText of ['Private notes', 'Private next step', 'Private full job posting', 'https://example.com/', 'Role first']) expect(preview.value).not.toContain(privateText)
    expect(onUpdate).not.toHaveBeenCalled()
  })

  it('combines jobs in one bar with independent duplicate selections and accurate optional context', () => {
    const first = application('first', [skill('React', 'Shared question?')])
    const second = { ...application('second', [skill('TypeScript', 'Shared question?')]), company: 'Other company' }
    render(view([first, second], null))
    expect(screen.getAllByRole('button', { name: 'Prepare ChatGPT prompt' })).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: /React.*Practice interview questions/ }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Shared question?' }))
    fireEvent.click(screen.getByRole('button', { name: /TypeScript.*Practice interview questions/ }))
    expect((screen.getByRole('checkbox', { name: 'Shared question?' }) as HTMLInputElement).checked).toBe(false)
    fireEvent.click(screen.getByRole('checkbox', { name: 'Shared question?' }))
    expect(screen.getByText('2 questions selected for ChatGPT')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Prepare ChatGPT prompt' }))
    let preview = screen.getByRole('textbox', { name: 'Prompt preview' }) as HTMLTextAreaElement
    expect(preview.value).not.toContain('Other company')
    expect(preview.value).not.toContain('Role first')
    fireEvent.click(screen.getByRole('checkbox', { name: /Include companies/ }))
    fireEvent.click(screen.getByRole('checkbox', { name: /Include roles/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Update preview' }))
    preview = screen.getByRole('textbox', { name: 'Prompt preview' }) as HTMLTextAreaElement
    expect(preview.value).toContain('Application: Company: Acme · Role: Role first')
    expect(preview.value).toContain('Application: Company: Other company · Role: Role second')
    expect(preview.value.match(/Question text:/g)).toHaveLength(1)
    expect(preview.value).toContain('- React\n- TypeScript')
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    fireEvent.click(screen.getByRole('button', { name: 'Clear selection' }))
    expect((screen.getByRole('button', { name: 'Prepare ChatGPT prompt' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('retains filtered selections explicitly, preserves saves and collapse, and resets application scope', () => {
    const first = application('first', [skill('React', 'First question?')])
    const second = { ...application('second', [skill('TypeScript', 'Second question?')]), company: 'Other company' }
    const { rerender } = render(view([first, second], null))
    fireEvent.click(screen.getByRole('button', { name: /React.*Practice interview questions/ }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'First question?' }))
    fireEvent.change(screen.getByPlaceholderText('Search skills and roles…'), { target: { value: 'Other company' } })
    expect(screen.getByText(/1 selected question is hidden/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Prepare ChatGPT prompt' }))
    expect((screen.getByRole('textbox', { name: 'Prompt preview' }) as HTMLTextAreaElement).value).toContain('First question?')
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    fireEvent.change(screen.getByPlaceholderText('Search skills and roles…'), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'Preferred' }))
    expect(screen.getByText(/1 selected question is hidden/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'All' }))
    rerender(view([{ ...first, skills: [{ ...first.skills![0], comfortRating: 'high' }] }, second], null))
    expect(screen.getByText('1 question selected for ChatGPT')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Collapse Acme skills' }))
    expect(screen.getByText('1 question selected for ChatGPT')).toBeTruthy()
    rerender(view([first, second], 'second'))
    expect(screen.getByText('0 questions selected for ChatGPT')).toBeTruthy()
  })

  it('discloses retained selections when another skill is opened and restores their checkboxes', () => {
    render(view([application('first', [skill('React', 'React question?'), skill('TypeScript', 'Types question?')])], null))
    fireEvent.click(screen.getByRole('button', { name: /React.*Practice interview questions/ }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'React question?' }))
    expect(screen.queryByText(/selected question is hidden/)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /TypeScript.*Practice interview questions/ }))
    expect(screen.getByText('1 selected question is hidden in this view and included in the prompt.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Prepare ChatGPT prompt' }))
    expect((screen.getByRole('textbox', { name: 'Prompt preview' }) as HTMLTextAreaElement).value).toContain('React question?')
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    fireEvent.click(screen.getByRole('button', { name: /React.*Practice interview questions/ }))
    expect((screen.getByRole('checkbox', { name: 'React question?' }) as HTMLInputElement).checked).toBe(true)
    expect(screen.queryByText(/selected question is hidden/)).toBeNull()
  })

  it('does not resurrect selections after a removed job is re-added', () => {
    const first = application('first', [skill('React', 'First question?')])
    const { rerender } = render(view([first], null))
    fireEvent.click(screen.getByRole('button', { name: /React.*Practice interview questions/ }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'First question?' }))
    rerender(view([], null))
    rerender(view([first], null))
    expect(screen.getByText('0 questions selected for ChatGPT')).toBeTruthy()
  })

  it('removes a selected question and its modal when analysis is replaced or invalidated', () => {
    const first = application('first', [skill('React', 'Old question?')])
    const { rerender } = render(view([first]))
    fireEvent.click(screen.getByRole('button', { name: /React.*Practice interview questions/ }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Old question?' }))
    fireEvent.click(screen.getByRole('button', { name: 'Prepare ChatGPT prompt' }))
    rerender(view([{ ...first, skills: [skill('React', 'New question?')] }]))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.queryByRole('checkbox', { name: 'Old question?' })).toBeNull()
    expect((screen.getByRole('checkbox', { name: 'New question?' }) as HTMLInputElement).checked).toBe(false)
    expect((screen.getByRole('button', { name: 'Prepare ChatGPT prompt' }) as HTMLButtonElement).disabled).toBe(true)
    rerender(view([{ ...first, skillsSourceUrl: 'https://example.com/old' }]))
    expect(screen.queryByRole('button', { name: 'Prepare ChatGPT prompt' })).toBeNull()
  })
})
