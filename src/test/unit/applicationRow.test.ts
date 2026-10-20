import { afterEach, describe, expect, it, vi } from 'vitest'
import { fromRow, toRow } from '../../features/applications/data/applicationRow'
import type { Application } from '../../shared/types'

const application: Application = {
  id: 'application-1',
  company: 'Example',
  role: 'Engineer',
  location: 'Remote',
  dateApplied: '2026-10-05',
  status: 'Applied',
  url: 'https://example.com/jobs/1',
  notes: 'Follow up soon',
  nextStep: 'Recruiter call',
}

afterEach(() => vi.useRealTimers())

describe('application persistence mapping', () => {
  it('maps old Interested records to Applied while preserving their data', () => {
    const row = { ...toRow(application, 'owner-1'), status: 'Interested' as const }
    expect(fromRow(row)).toEqual(fromRow({ ...row, status: 'Applied' }))
    expect(toRow(fromRow(row), 'owner-1').status).toBe('Applied')
  })

  it('round trips analysis, skills, and interviews through database fields', () => {
    const complete: Application = {
      ...application,
      jobDescription: 'Build products',
      skills: [{ name: 'React', category: 'technical', importance: 'required', evidence: 'React experience', comfortRating: 'medium', interviewQuestions: ['Explain hooks'] }],
      skillsAnalyzedAt: '2026-10-05T12:00:00Z',
      skillsSourceUrl: 'https://example.com/jobs/1',
      skillExtractionVersion: 2,
      interviewQuestionsVersion: 3,
      interviews: [{ id: 'interview-1', date: '2026-10-06', time: '10:00', notes: 'Prepare', durationMinutes: 45, googleCalendarOpenedAt: '2026-10-05T12:00:00Z' }],
    }
    const row = toRow(complete, 'owner-1')
    expect(row.user_id).toBe('owner-1')
    expect(row.date_applied).toBe(complete.dateApplied)
    expect(row.next_step).toBe(complete.nextStep)
    expect(fromRow(row)).toEqual(complete)
  })

  it('supplies database defaults for legacy applications without optional fields', () => {
    const row = toRow(application, 'owner-1')
    expect(row).toMatchObject({
      skills: [], interviews: [], job_description: '', skills_analyzed_at: null,
      skills_source_url: '', interview_questions_version: 0, skill_extraction_version: 0,
    })
    expect(fromRow(row)).toMatchObject({ ...application, skills: [], interviews: [] })
  })

  it('uses the current UTC date when an application has no applied date', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-06T00:30:00Z'))
    expect(toRow({ ...application, dateApplied: '' }, 'owner-1').date_applied).toBe('2026-10-06')
  })
})
