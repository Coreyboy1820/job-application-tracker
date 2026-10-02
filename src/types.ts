export type Status = 'Interested' | 'Applied' | 'Interviewing' | 'Offer' | 'Rejected'

export type JobSkill = {
  name: string
  category: 'technical' | 'tools' | 'domain' | 'process' | 'other'
  importance: 'required' | 'preferred' | 'mentioned'
  evidence: string
  interviewQuestions?: string[]
}

export type Application = {
  id: string
  company: string
  role: string
  location: string
  dateApplied: string
  status: Status
  url: string
  notes: string
  nextStep: string
  jobDescription?: string
  skills?: JobSkill[]
  skillsAnalyzedAt?: string | null
  skillsSourceUrl?: string
  interviewQuestionsVersion?: number
}
