import type { ExtractedSkill } from './skill-extraction.ts'
import { normalizeSkillKey } from './skill-questions.ts'
import { SKILL_EXTRACTION_VERSION } from './analysis-version.ts'

type AnalyzedSkill = ExtractedSkill & {
  interviewQuestions: string[]
  comfortRating?: 'low' | 'medium' | 'high' | 'no-study-needed'
  needsNoStudy?: boolean
  priority?: number
}

export type ApplicationForAnalysis = {
  id: string
  company: string
  role: string
  url: string
  skills_source_url?: string | null
  skills_analyzed_at?: string | null
  interview_questions_version?: number | null
  skill_extraction_version?: number | null
  job_description?: string | null
  skills?: unknown
}

export type AnalysisDependencies = {
  fetchJobDescription: (url: string) => Promise<{ text: string }>
  extractSkills: (text: string, company: string, role: string) => Promise<ExtractedSkill[]>
  addInterviewQuestions: (skills: ExtractedSkill[]) => Promise<Array<ExtractedSkill & { interviewQuestions: string[] }>>
  saveApplication: (id: string, updates: Record<string, unknown>) => Promise<void>
  now?: () => string
}

function savedSkills(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return []
  return value.filter((skill): skill is Record<string, unknown> =>
    !!skill && typeof skill === 'object' && !Array.isArray(skill)
    && typeof skill.name === 'string' && !!skill.name.trim())
}

export async function analyzeApplication(application: ApplicationForAnalysis, deps: AnalysisDependencies) {
  const matchingSource = !!application.skills_analyzed_at && application.skills_source_url === application.url
  if (matchingSource && application.interview_questions_version === 1
    && application.skill_extraction_version === SKILL_EXTRACTION_VERSION) {
    return {
      jobDescription: application.job_description ?? '',
      skills: savedSkills(application.skills),
      analyzedAt: application.skills_analyzed_at,
      sourceUrl: application.url,
      cached: true,
      interviewQuestionsVersion: 1,
      skillExtractionVersion: SKILL_EXTRACTION_VERSION,
    }
  }

  const reuseDescription = matchingSource && typeof application.job_description === 'string'
    && !!application.job_description.trim()
  const text = reuseDescription ? application.job_description!
    : (await deps.fetchJobDescription(application.url)).text
  const extractedSkills = await deps.extractSkills(text, application.company, application.role)
  const withQuestions = await deps.addInterviewQuestions(extractedSkills)
  const previous = new Map(savedSkills(application.skills).map((skill) => [normalizeSkillKey(skill.name as string), skill]))
  const skills: AnalyzedSkill[] = withQuestions.map((skill) => {
    const saved = previous.get(normalizeSkillKey(skill.name))
    const preserved: Pick<AnalyzedSkill, 'comfortRating' | 'needsNoStudy' | 'priority'> = {}
    if (saved) {
      if (saved.comfortRating === 'low' || saved.comfortRating === 'medium'
        || saved.comfortRating === 'high' || saved.comfortRating === 'no-study-needed') preserved.comfortRating = saved.comfortRating
      if (typeof saved.needsNoStudy === 'boolean') preserved.needsNoStudy = saved.needsNoStudy
      if (typeof saved.priority === 'number' && Number.isFinite(saved.priority)) preserved.priority = saved.priority
    }
    return { ...skill, ...preserved }
  })
  const analyzedAt = deps.now?.() ?? new Date().toISOString()
  await deps.saveApplication(application.id, {
    skills,
    job_description: text,
    skills_analyzed_at: analyzedAt,
    skills_source_url: application.url,
    interview_questions_version: 1,
    skill_extraction_version: SKILL_EXTRACTION_VERSION,
  })
  return {
    jobDescription: text, skills, analyzedAt, sourceUrl: application.url,
    cached: !!reuseDescription, interviewQuestionsVersion: 1,
    skillExtractionVersion: SKILL_EXTRACTION_VERSION,
  }
}
