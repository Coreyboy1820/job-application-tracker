import { useState } from 'react'
import { ArrowLeft, ChevronDown } from 'lucide-react'
import type { Application, ComfortRating, JobSkill } from '../../../shared/types'
import { NO_STUDY_PRIORITY, comfortRatings, getComfortRatingPriority, getSkillPriority, isComfortRating } from '../skillPriority'

type SkillQuestionGroup = {
  name: string
  category: JobSkill['category']
  priority: number
  roles: Map<string, number>
  questions: Map<string, string>
  applications: Map<string, { id: string; skillName: string }>
}

export default function CompanyInterviewQuestionsPage({ company, applications, onBack, onUpdateSkillComfortRating }: {
  company: string
  applications: Application[]
  onBack: () => void
  onUpdateSkillComfortRating: (applicationId: string, skillName: string, comfortRating: ComfortRating) => Promise<boolean>
}) {
  const groups = collectCompanyInterviewQuestions(applications, company)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [failedUpdate, setFailedUpdate] = useState<{ skillName: string; rating: ComfortRating } | null>(null)

  async function updateKnowledgeLevel(group: SkillQuestionGroup, comfortRating: ComfortRating) {
    if (saving) return
    setSaving(true)
    setError(null)
    setFailedUpdate(null)
    try {
      for (const application of group.applications.values()) {
        if (!await onUpdateSkillComfortRating(application.id, application.skillName, comfortRating)) {
          setError('Could not save the knowledge level for all roles. Please try again.')
          setFailedUpdate({ skillName: group.name, rating: comfortRating })
          break
        }
      }
    } catch {
      setError('Could not save the knowledge level for all roles. Please try again.')
      setFailedUpdate({ skillName: group.name, rating: comfortRating })
    } finally {
      setSaving(false)
    }
  }

  return <>
    <section className="page-heading company-questions-heading">
      <div>
        <button type="button" className="company-questions-back" onClick={onBack}><ArrowLeft size={14} /> Back to Skills</button>
        <div className="eyebrow">INTERVIEW PRACTICE</div>
        <h1>{company}</h1>
        <p className="page-subtitle">Interview questions for skills found across this company's job postings. Lower role-priority numbers sort first; 0 means no study.</p>
      </div>
    </section>

    <section className="list-panel company-questions-panel" aria-label={`${company} interview questions`}>
      <div className="panel-heading"><div><h2>Questions by skill</h2><p>Questions are grouped across this company's analyzed applications.</p></div></div>
      {error && <p className="auth-error" role="alert">{error}
        {failedUpdate && <button type="button" className="text-button" disabled={saving} onClick={() => {
          const group = groups.find((item) => normalizeSkillName(item.name) === normalizeSkillName(failedUpdate.skillName))
          if (group) void updateKnowledgeLevel(group, failedUpdate.rating)
          else {
            setError('This skill is no longer available.')
            setFailedUpdate(null)
          }
        }}>Retry saving</button>}
      </p>}
      {saving && <p className="company-skill-roles" role="status">Saving knowledge level…</p>}
      {groups.length
        ? <div className="company-questions-list">{groups.map((group) => <article className={`company-skill-questions${group.priority === NO_STUDY_PRIORITY ? ' company-skill-no-study' : ''}`} key={normalizeSkillName(group.name)}>
          <div className="company-skill-heading">
            <div><h3>{group.name}</h3><span className="analyzed-skill-meta">{group.category}</span></div>
            <label className="company-skill-knowledge-level" title="Change the knowledge level for all roles with this skill at this company.">
              <span>Knowledge level:</span>
              <select
                className="company-skill-knowledge-select"
                aria-label={`Knowledge level for ${group.name}`}
                value={comfortRatings.find((rating) => getComfortRatingPriority(rating.value) === group.priority)?.value ?? 'low'}
                disabled={saving}
                onChange={(event) => {
                  if (isComfortRating(event.target.value)) void updateKnowledgeLevel(group, event.target.value)
                }}
              >
                {comfortRatings.map((rating) => <option key={rating.value} value={rating.value}>{rating.label}</option>)}
              </select>
              <ChevronDown size={11} aria-hidden="true" />
            </label>
          </div>
          {group.roles.size > 0 && <p className="company-skill-roles">Roles: {[...group.roles].map(([role, priority]) => `${role} (${priority})`).join(', ')}</p>}
          <ol>{[...group.questions.values()].map((question) => <li key={question}>{question}</li>)}</ol>
        </article>)}</div>
        : <div className="company-questions-empty" role="status">
          <h3>No interview questions available yet</h3>
          <p>Analyze a job posting for {company} to generate interview questions for its skills.</p>
        </div>}
    </section>
    <footer className="page-footer">Made for the long game <span>✳</span></footer>
  </>
}

export function collectCompanyInterviewQuestions(applications: Application[], company: string): SkillQuestionGroup[] {
  const companyKey = normalizeSkillName(company)
  const groups = new Map<string, SkillQuestionGroup>()
  for (const application of applications) {
    if (normalizeSkillName(application.company) !== companyKey
      || !application.skillsAnalyzedAt
      || application.skillsSourceUrl !== application.url) continue
    for (const skill of application.skills ?? []) {
      const key = normalizeSkillName(skill.name)
      if (!key) continue
      let group = groups.get(key)
      if (!group) {
        group = { name: skill.name, category: skill.category, priority: NO_STUDY_PRIORITY, roles: new Map(), questions: new Map(), applications: new Map() }
        groups.set(key, group)
      }
      group.applications.set(application.id, {
        id: application.id,
        skillName: skill.name,
      })
      const priority = getSkillPriority(skill)
      group.priority = combinePriorities(group.priority, priority)
      const role = application.role.trim()
      if (role) {
        const previousPriority = group.roles.get(role)
        group.roles.set(role, previousPriority === undefined ? priority : combinePriorities(previousPriority, priority))
      }
      const questions = skill.interviewQuestions ?? []
      for (const question of questions) {
        const text = question.trim()
        const questionKey = normalizeSkillName(text)
        if (text && questionKey && !group.questions.has(questionKey)) group.questions.set(questionKey, text)
      }
    }
  }
  return [...groups.values()].filter((group) => group.questions.size > 0).sort((first, second) => {
    if (first.priority === NO_STUDY_PRIORITY && second.priority !== NO_STUDY_PRIORITY) return 1
    if (second.priority === NO_STUDY_PRIORITY && first.priority !== NO_STUDY_PRIORITY) return -1
    return first.priority - second.priority
      || normalizeSkillName(first.name).localeCompare(normalizeSkillName(second.name))
  })
}

function combinePriorities(first: number, second: number): number {
  if (first === NO_STUDY_PRIORITY) return second === NO_STUDY_PRIORITY ? first : second
  if (second === NO_STUDY_PRIORITY) return first
  return Math.min(first, second)
}

function normalizeSkillName(value: string): string {
  return value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase()
}
