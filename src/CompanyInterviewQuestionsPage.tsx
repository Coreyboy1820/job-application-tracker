import { ArrowLeft } from 'lucide-react'
import type { Application, JobSkill } from './types'

type SkillQuestionGroup = {
  name: string
  category: JobSkill['category']
  needsNoStudy: boolean
  roles: Set<string>
  questions: Map<string, string>
}

export default function CompanyInterviewQuestionsPage({ company, applications, onBack }: {
  company: string
  applications: Application[]
  onBack: () => void
}) {
  const groups = collectCompanyInterviewQuestions(applications, company)

  return <>
    <section className="page-heading company-questions-heading">
      <div>
        <button type="button" className="company-questions-back" onClick={onBack}><ArrowLeft size={14} /> Back to Skills</button>
        <div className="eyebrow">INTERVIEW PRACTICE</div>
        <h1>{company}</h1>
        <p className="page-subtitle">Interview questions for skills found across this company's job postings.</p>
      </div>
    </section>

    <section className="list-panel company-questions-panel" aria-label={`${company} interview questions`}>
      <div className="panel-heading"><div><h2>Questions by skill</h2><p>Questions are grouped across this company's analyzed applications.</p></div></div>
      {groups.length
        ? <div className="company-questions-list">{groups.map((group) => <article className="company-skill-questions" key={normalizeSkillName(group.name)}>
          <div className={`company-skill-heading${group.needsNoStudy ? ' company-skill-no-study' : ''}`}><div><h3>{group.name}</h3><span className="analyzed-skill-meta">{group.category}</span></div></div>
          {group.roles.size > 0 && <p className="company-skill-roles">Roles: {[...group.roles].join(', ')}</p>}
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

export function collectCompanyInterviewQuestions(applications: Application[], company: string): Array<{
  name: string
  category: JobSkill['category']
  needsNoStudy: boolean
  roles: Set<string>
  questions: Map<string, string>
}> {
  const companyKey = normalizeSkillName(company)
  const groups = new Map<string, SkillQuestionGroup>()
  for (const application of applications) {
    if (normalizeSkillName(application.company) !== companyKey
      || !application.skillsAnalyzedAt
      || application.skillsSourceUrl !== application.url) continue
    for (const skill of application.skills ?? []) {
      const questions = skill.interviewQuestions ?? []
      if (!questions.length) continue
      const key = normalizeSkillName(skill.name)
      if (!key) continue
      let group = groups.get(key)
      if (!group) {
        group = { name: skill.name, category: skill.category, needsNoStudy: false, roles: new Set(), questions: new Map() }
        groups.set(key, group)
      }
      group.needsNoStudy ||= Boolean(skill.needsNoStudy)
      if (application.role.trim()) group.roles.add(application.role.trim())
      for (const question of questions) {
        const text = question.trim()
        const questionKey = normalizeSkillName(text)
        if (text && questionKey && !group.questions.has(questionKey)) group.questions.set(questionKey, text)
      }
    }
  }
  return [...groups.values()]
}

function normalizeSkillName(value: string): string {
  return value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase()
}
