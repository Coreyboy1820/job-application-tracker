import type { Application, Interview, JobSkill, Status } from '../../../shared/types'

export type ApplicationRow = {
  id: string
  user_id: string
  company: string
  role: string
  location: string
  date_applied: string
  status: Status | 'Interested'
  url: string
  notes: string
  next_step: string
  job_description: string
  skills: JobSkill[]
  skills_analyzed_at: string | null
  skills_source_url: string
  skill_extraction_version: number
  interview_questions_version: number
  interviews: Interview[]
}
export const applicationColumns = 'id, user_id, company, role, location, date_applied, status, url, notes, next_step, job_description, skills, skills_analyzed_at, skills_source_url, interview_questions_version, skill_extraction_version, interviews'
export function fromRow(row: ApplicationRow): Application {
  return {
    id: row.id,
    company: row.company,
    role: row.role,
    location: row.location,
    dateApplied: row.date_applied,
    status: row.status === 'Interested' ? 'Applied' : row.status,
    url: row.url,
    notes: row.notes,
    nextStep: row.next_step,
    jobDescription: row.job_description,
    skills: row.skills ?? [],
    skillsAnalyzedAt: row.skills_analyzed_at,
    skillsSourceUrl: row.skills_source_url,
    interviewQuestionsVersion: row.interview_questions_version,
    skillExtractionVersion: row.skill_extraction_version,
    interviews: row.interviews ?? [],
  }
}

export function toRow(application: Application, userId: string) {
  return {
    id: application.id,
    user_id: userId,
    company: application.company,
    role: application.role,
    location: application.location,
    date_applied: application.dateApplied || new Date().toISOString().slice(0, 10),
    status: application.status,
    url: application.url,
    notes: application.notes,
    next_step: application.nextStep,
    job_description: application.jobDescription ?? '',
    skills: application.skills ?? [],
    skills_analyzed_at: application.skillsAnalyzedAt ?? null,
    skills_source_url: application.skillsSourceUrl ?? '',
    interview_questions_version: application.interviewQuestionsVersion ?? 0,
    skill_extraction_version: application.skillExtractionVersion ?? 0,
    interviews: application.interviews ?? [],
  }
}
