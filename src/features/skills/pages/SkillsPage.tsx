import { useMemo, useRef, useState } from 'react'
import { ArrowUpRight, BriefcaseBusiness, ChevronDown, Search, Sparkles } from 'lucide-react'
import type { Application, ComfortRating, JobSkill } from '../../../shared/types'
import { comfortRatings, getComfortRating, NO_STUDY_PRIORITY, getSkillPriority, isComfortRating, sortSkillsForStudy } from '../skillPriority'

import { sortApplications } from '../../applications/applicationSort'
import type { ApplicationSort } from '../../applications/applicationSort'

type ImportanceFilter = 'All' | JobSkill['importance']

export default function SkillsPage({ applications, loading, now = Date.now(), onOpenApplication, onOpenCompany, onOpenApplicationSkills, applicationFilterId, onClearApplicationFilter, onUpdateSkillComfortRating }: {
  applications: Application[]
  loading: boolean
  now?: number
  onOpenApplication: (id: string) => void
  onOpenCompany: (company: string) => void
  onOpenApplicationSkills: (id: string) => void
  applicationFilterId: string | null
  onClearApplicationFilter: () => void
  onUpdateSkillComfortRating: (applicationId: string, skillName: string, comfortRating: ComfortRating) => Promise<boolean>
}) {
  const savingIds = useRef(new Set<string>())
  const [savingApplications, setSavingApplications] = useState(new Set<string>())
  const [saveError, setSaveError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [applicationSort, setApplicationSort] = useState<ApplicationSort>('saved')
  const [importance, setImportance] = useState<ImportanceFilter>('All')
  const [collapsedApplications, setCollapsedApplications] = useState<Set<string>>(() => new Set())
  const [selectedSkill, setSelectedSkill] = useState<{ applicationId: string; skillName: string } | null>(null)
  const scopedApplications = applicationFilterId
    ? applications.filter((application) => application.id === applicationFilterId)
    : applications
  const selectedApplication = applicationFilterId ? scopedApplications[0] : undefined
  const analyzedApplications = scopedApplications.filter((application) =>
    application.skillsAnalyzedAt && application.skillsSourceUrl === application.url,
  )
  const allSkills = analyzedApplications.flatMap((application) => application.skills ?? [])
  const uniqueSkillCount = new Set(allSkills.map((skill) => skill.name.trim().toLowerCase())).size

  const filteredApplications = useMemo(() => {
    const query = search.trim().toLowerCase()
    return sortApplications(scopedApplications.filter((application) => {
      const skills = application.skills ?? []
      const hasMatchingImportance = importance === 'All'
        || skills.some((skill) => skill.importance === importance)
        || !application.skillsAnalyzedAt
      const searchableText = [
        application.company,
        application.role,
        application.location,
        application.jobDescription,
        ...skills.flatMap((skill) => [skill.name, skill.category, skill.importance, skill.evidence]),
      ].join(' ').toLowerCase()
      return hasMatchingImportance && (!query || searchableText.includes(query))
    }), applicationSort, now)
  }, [scopedApplications, importance, search, applicationSort, now])

  async function updateKnowledge(applicationId: string, skillName: string, rating: ComfortRating) {
    if (savingIds.current.has(applicationId)) return
    savingIds.current.add(applicationId)
    setSavingApplications(new Set(savingIds.current))
    setSaveError(null)
    try {
      await onUpdateSkillComfortRating(applicationId, skillName, rating)
    } catch {
      setSaveError('Could not save the knowledge level. Please retry.')
    } finally {
      savingIds.current.delete(applicationId)
      setSavingApplications(new Set(savingIds.current))
    }
  }

  function toggleApplication(applicationId: string) {
    setCollapsedApplications((current) => {
      const next = new Set(current)
      if (next.has(applicationId)) next.delete(applicationId)
      else next.add(applicationId)
      return next
    })
  }

  return <>
    <section className="page-heading skills-page-heading">
      <div><div className="eyebrow">JOB SEARCH LIBRARY</div><h1>Skills</h1><p className="page-subtitle">{selectedApplication ? `Skills for ${selectedApplication.role} at ${selectedApplication.company}.` : 'Skills and supporting evidence gathered from your job postings.'}</p></div>
      <div className="skills-page-total"><Sparkles size={17} /><span>{uniqueSkillCount} unique skill{uniqueSkillCount === 1 ? '' : 's'}</span></div>
    </section>
    {applicationFilterId && <div className="skills-application-filter" role="status">
      {selectedApplication
        ? <span>Filtered to <strong>{selectedApplication.role}</strong> at <strong>{selectedApplication.company}</strong>.</span>
        : <span>The selected application is no longer available.</span>}
      {selectedApplication && <button type="button" className="skills-company-questions-link" onClick={() => onOpenCompany(selectedApplication.company)}>View company interview questions</button>}
      <button type="button" className="skills-clear-filter" onClick={onClearApplicationFilter}>Show all skills</button>
    </div>}

    <section className="stats-grid skills-stats-grid" aria-label="Skills summary">
      <SkillStat label="Jobs analyzed" value={analyzedApplications.length} caption={`of ${scopedApplications.length} applications`} />
      <SkillStat label="Skill mentions" value={allSkills.length} caption="Across analyzed postings" />
      <SkillStat label="Required skills" value={allSkills.filter((skill) => skill.importance === 'required').length} caption="Marked as required" />
      <SkillStat label="Preferred skills" value={allSkills.filter((skill) => skill.importance === 'preferred').length} caption="Marked as preferred" />
    </section>

    {saveError && <p className="auth-error" role="alert">{saveError}</p>}
    <section className="list-panel skills-library">
      <div className="panel-heading"><div><h2>Skills by application</h2><p>Lowest knowledge levels come first; no-study skills remain visible at the end.</p></div>{!applicationFilterId && <span className="cloud-badge">Synced to your account</span>}</div>
      <div className="skills-toolbar">
        <label className="search-box"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search skills and roles…" /></label>
        <label className="sort-control"><span className="sr-only">Sort skill applications</span><select value={applicationSort} onChange={(event) => setApplicationSort(event.target.value as ApplicationSort)}><option value="saved">Saved order</option><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="next-interview">Next interview</option></select></label>
        <div className="skills-filter" role="group" aria-label="Filter by importance">
          {(['All', 'required', 'preferred', 'mentioned'] as const).map((item) => <button key={item} type="button" className={importance === item ? 'skills-filter-active' : ''} aria-pressed={importance === item} onClick={() => setImportance(item)}>{item === 'All' ? item : `${item[0].toUpperCase()}${item.slice(1)}`}</button>)}
        </div>
      </div>

      {loading ? <div className="empty-state"><p>Loading your skills…</p></div> : filteredApplications.length ? <div className="skills-application-list">
        {filteredApplications.map((application) => {
          const isAnalyzed = Boolean(application.skillsAnalyzedAt && application.skillsSourceUrl === application.url)
          const isCollapsed = collapsedApplications.has(application.id)
          const applicationContentId = `skills-application-content-${application.id}`
          const skills = sortSkillsForStudy((application.skills ?? []).filter((skill) => importance === 'All' || skill.importance === importance))
          return <article className="skills-application" key={application.id}>
            <header className="skills-application-header">
              <div className="skills-company-mark"><BriefcaseBusiness size={16} /></div>
              <div className="skills-application-title"><h3><a className="skills-company-link" href={`#/skills/company/${encodeURIComponent(application.company)}`} onClick={(event) => { event.preventDefault(); onOpenCompany(application.company) }}>{application.company}</a></h3><p>{application.role}{application.location ? ` · ${application.location}` : ''}</p><span className="skills-application-meta">{application.status} · Applied {formatDate(application.dateApplied)}{isAnalyzed && application.skillsAnalyzedAt ? ` · Analyzed ${formatDate(application.skillsAnalyzedAt.slice(0, 10))}` : ''}</span></div>
              <div className="skills-application-actions">
                {application.url && <a className="skills-original-link" href={application.url} target="_blank" rel="noreferrer">Posting <ArrowUpRight size={13} /></a>}
                <button type="button" className="skills-application-skills-link" onClick={() => onOpenApplicationSkills(application.id)}>View skills</button>
                <button type="button" className="secondary-button" onClick={() => onOpenApplication(application.id)}>{isAnalyzed ? 'Open application' : 'Analyze posting'}</button>
                <button
                  type="button"
                  className="skills-collapse-button"
                  aria-label={`${isCollapsed ? 'Expand' : 'Collapse'} ${application.company} skills`}
                  aria-expanded={!isCollapsed}
                  aria-controls={applicationContentId}
                  onClick={() => toggleApplication(application.id)}
                >
                  <ChevronDown size={15} />
                </button>
              </div>
            </header>
            <div id={applicationContentId} hidden={isCollapsed}>
              {savingApplications.has(application.id) && <p className="company-skill-roles" role="status">Saving knowledge level…</p>}
              {isAnalyzed ? <>
                {skills.length ? <div className="skills-library-grid">{skills.map((skill, index) => {
                  const isSelected = selectedSkill?.applicationId === application.id && selectedSkill.skillName === skill.name
                  const questionsId = `skill-questions-${application.id}-${index}`
                  const questions = skill.interviewQuestions ?? []
                  const needsNoStudy = getSkillPriority(skill) === NO_STUDY_PRIORITY
                  return <article className={`analyzed-skill${needsNoStudy ? ' analyzed-skill-no-study' : ''}`} key={`${skill.name}-${skill.evidence}`}>
                    <button
                      type="button"
                      className="skill-practice-toggle"
                      aria-expanded={isSelected}
                      aria-controls={questionsId}
                      onClick={() => setSelectedSkill(isSelected ? null : { applicationId: application.id, skillName: skill.name })}
                    >
                      <span className="analyzed-skill-heading"><strong>{skill.name}</strong><span className={`importance importance-${skill.importance}`}>{skill.importance}</span></span>
                      <span className="analyzed-skill-meta">{skill.category}</span>
                      <span className="skill-practice-hint">{isSelected ? 'Hide interview questions' : 'Practice interview questions'}</span>
                    </button>
                    <blockquote>“{skill.evidence}”</blockquote>
                    <label className="skill-comfort-rating">
                      <span>Knowledge level</span>
                      <select
                        aria-label={`Knowledge level for ${skill.name}`}
                        value={getComfortRating(skill)}
                        disabled={savingApplications.has(application.id)}
                        onChange={(event) => {
                          if (isComfortRating(event.target.value)) {
                            void updateKnowledge(application.id, skill.name, event.target.value)
                          }
                        }}
                      >
                        {comfortRatings.map((rating) => <option key={rating.value} value={rating.value}>{rating.label}</option>)}
                      </select>
                    </label>
                    {isSelected && <div className="skill-practice-questions" id={questionsId}>
                      <h4>Interview practice for {skill.name}</h4>
                      {questions.length
                        ? <ol>{questions.map((question, questionIndex) => <li key={`${questionIndex}-${question}`}>{question}</li>)}</ol>
                        : <p>Interview questions are not available for this saved analysis yet. Open the application to generate them.</p>}
                    </div>}
                  </article>
                })}</div> : <div className="no-skills-found">{application.skills?.length ? `No ${importance.toLowerCase()} skills in this posting.` : 'No specific skills were found in the saved job posting.'}</div>}
                {application.jobDescription && <details className="saved-job-description"><summary>View fetched job description</summary><pre>{application.jobDescription}</pre></details>}
              </> : <div className="skills-not-analyzed">{application.url ? 'Open the application to fetch the posting and analyze its skills.' : 'Add a job posting link to analyze this application.'}</div>}
            </div>
          </article>
        })}
      </div> : <div className="empty-state"><div className="empty-illustration"><Sparkles size={20} /></div><h3>{applicationFilterId && !selectedApplication ? 'Application unavailable' : applications.length ? 'No matching skills' : 'No applications yet'}</h3><p>{applicationFilterId && !selectedApplication ? 'This application may have been deleted. Choose Show all skills to return to your library.' : applications.length ? 'Try a different search or importance filter.' : 'Add an application with a job posting link to start collecting skills.'}</p></div>}
      <div className="panel-footer"><span>Showing <strong>{filteredApplications.length}</strong> of <strong>{scopedApplications.length}</strong> applications</span><span className="privacy-note"><span className="privacy-dot" /> Stored securely in your account</span></div>
    </section>
    <footer className="page-footer">Made for the long game <span>✳</span></footer>
  </>
}

function SkillStat({ label, value, caption }: { label: string; value: number; caption: string }) {
  return <article className="stat-card skills-stat-card"><div className="stat-icon violet"><Sparkles size={16} /></div><div className="stat-label">{label}</div><div className="stat-value">{value}</div><div className="stat-caption">{caption}</div></article>
}

function formatDate(value: string) {
  if (!value) return '—'
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`))
}
