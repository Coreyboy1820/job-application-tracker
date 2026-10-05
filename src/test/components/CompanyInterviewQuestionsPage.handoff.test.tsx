import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import CompanyInterviewQuestionsPage from '../../features/skills/pages/CompanyInterviewQuestionsPage'
import type { Application } from '../../shared/types'

function application(id: string, company: string, name: string, text: string): Application {
  return { id, company, role: `Role ${id}`, location: '', dateApplied: '2026-01-01', status: 'Applied', url: `https://example.com/${id}`, notes: '', nextStep: '', skills: [{ name, category: 'technical', importance: 'required', evidence: 'Private evidence', interviewQuestions: [text] }], skillsAnalyzedAt: '2026-01-02T00:00:00Z', skillsSourceUrl: `https://example.com/${id}` }
}

describe('Company question ChatGPT handoff', () => {
  it('offers optional role context only from the selected questions', () => {
    render(<CompanyInterviewQuestionsPage company="Acme" applications={[
      application('A', 'Acme', 'React', 'React question?'),
      application('B', 'Acme', 'TypeScript', 'TypeScript question?'),
    ]} onBack={vi.fn()} onUpdateSkillComfortRating={vi.fn(async () => true)} />)
    fireEvent.click(screen.getByRole('checkbox', { name: 'React question?' }))
    fireEvent.click(screen.getByRole('button', { name: 'Prepare ChatGPT prompt' }))
    const preview = screen.getByRole('textbox', { name: 'Prompt preview' }) as HTMLTextAreaElement
    expect(preview.value).not.toContain('Role A')
    fireEvent.click(screen.getByRole('checkbox', { name: 'Include role: Role A' }))
    expect(screen.queryByRole('checkbox', { name: /Include role.*Role B/ })).toBeNull()
    expect(preview.value).not.toContain('Role A')
    fireEvent.click(screen.getByRole('button', { name: 'Update preview' }))
    expect(preview.value).toContain('Roles: Role A')
    expect(preview.value).not.toContain('Role B')
    expect(preview.value).not.toContain('TypeScript question?')
  })

  it('selects across company skills and roles, preserves exact question text, and excludes other companies', () => {
    const onUpdate = vi.fn(async () => true)
    const exactText = '  Explain REACT?  '
    render(<CompanyInterviewQuestionsPage company="Acme" applications={[
      application('one', 'Acme', 'React', exactText),
      application('two', ' acme ', 'TypeScript', 'Explain types?'),
      application('other', 'Other', 'Other skill', 'Other company question?'),
    ]} onBack={vi.fn()} onUpdateSkillComfortRating={onUpdate} />)
    fireEvent.click(screen.getByRole('checkbox', { name: 'Explain REACT?' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Explain types?' }))
    expect(screen.queryByText('Other company question?')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Prepare ChatGPT prompt' }))
    const preview = screen.getByRole('textbox', { name: 'Prompt preview' }) as HTMLTextAreaElement
    expect(preview.value).toContain(exactText)
    expect(preview.value).toContain('Explain types?')
    expect(preview.value).not.toContain('Other company question?')
    expect(preview.value).not.toContain('Private evidence')
    expect(preview.value).not.toContain('Role one')
    expect(screen.getByRole('checkbox', { name: 'Include roles: Role one, Role two' })).toBeTruthy()
    expect(onUpdate).not.toHaveBeenCalled()
  })
})
