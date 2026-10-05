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
