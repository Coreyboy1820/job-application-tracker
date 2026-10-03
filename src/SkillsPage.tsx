import { useMemo, useState } from 'react'
import { ArrowUpRight, BriefcaseBusiness, ChevronDown, Search, Sparkles } from 'lucide-react'
import type { Application, ComfortRating, JobSkill } from './types'
import { comfortRatings, getComfortRating, NO_STUDY_PRIORITY, getSkillPriority, isComfortRating } from './skillPriority'

type ImportanceFilter = 'All' | JobSkill['importance']

export default function SkillsPage({ applications, loading, onOpenApplication, onOpenCompany, onOpenApplicationSkills, applicationFilterId, onClearApplicationFilter, onUpdateSkillStudyStatus, onUpdateSkillComfortRating }: {
  applications: Application[]
  loading: boolean
  onOpenApplication: (id: string) => void
  onOpenCompany: (company: string) => void
  onOpenApplicationSkills: (id: string) => void
  applicationFilterId: string | null
  onClearApplicationFilter: () => void
  onUpdateSkillStudyStatus: (applicationId: string, skillName: string, needsNoStudy: boolean) => Promise<boolean>
  onUpdateSkillComfortRating: (applicationId: string, skillName: string, comfortRating: ComfortRating) => Promise<boolean>
}) {
  const [search, setSearch] = useState('')
  const [importance, setImportance] = useState<ImportanceFilter>('All')
  const [collapsedApplications, setCollapsedApplications] = useState<Set<string>>(() => new Set())
  const [selectedSkill, setSelectedSkill] = useState<{ applicationId: string; skillName: string } | null>(null)
  const scopedApplications = applicationFilterId
    ? applications.filter((application) => application.id === applicationFilterId)
    : applications
  const selectedApplication = scopedApplications[0]
  const analyzedApplications = scopedApplications.filter((application) =>
    application.skillsAnalyzedAt && application.skillsSourceUrl === application.url,
  )
  const allSkills = analyzedApplications.flatMap((application) => application.skills ?? [])
  const uniqueSkillCount = new Set(allSkills.map((skill) => skill.name.trim().toLowerCase())).size

  const filteredApplications = useMemo(() => {
    const query = search.trim().toLowerCase()
    return scopedApplications.filter((application) => {
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
    })
  }, [scopedApplications, importance, search])

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

    <section className="list-panel skills-library">
      <div className="panel-heading"><div><h2>Skills by application</h2><p>Each skill includes the job-posting quote that supports it.</p></div>{!applicationFilterId && <span className="cloud-badge">Synced to your account</span>}</div>
      <div className="skills-toolbar">
        <label className="search-box"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search skills and roles…" /></label>
        <div className="skills-filter" role="group" aria-label="Filter by importance">
          {(['All', 'required', 'preferred', 'mentioned'] as const).map((item) => <button key={item} type="button" className={importance === item ? 'skills-filter-active' : ''} aria-pressed={importance === item} onClick={() => setImportance(item)}>{item === 'All' ? item : `${item[0].toUpperCase()}${item.slice(1)}`}</button>)}
        </div>
      </div>

      {loading ? <div className="empty-state"><p>Loading your skills…</p></div> : filteredApplications.length ? <div className="skills-application-list">
        {filteredApplications.map((application) => {
          const isAnalyzed = Boolean(application.skillsAnalyzedAt && application.skillsSourceUrl === application.url)
          const isCollapsed = collapsedApplications.has(application.id)
          const applicationContentId = `skills-application-content-${application.id}`
          const skills = (application.skills ?? []).filter((skill) => importance === 'All' || skill.importance === importance)
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
              {isAnalyzed ? <>
                <SkillStudyTypeahead application={application} onUpdateSkillStudyStatus={onUpdateSkillStudyStatus} />
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
                    <button
                      type="button"
                      className="skill-study-status-button"
                      aria-pressed={needsNoStudy}
                      onClick={() => void onUpdateSkillStudyStatus(application.id, skill.name, !needsNoStudy)}
                    >
                      {needsNoStudy ? 'Mark as needing study' : 'Mark as not needing study'}
                    </button>
                    <label className="skill-comfort-rating">
                      <span>Comfort level</span>
                      <select
                        aria-label={`Comfort level for ${skill.name}`}
                        value={getComfortRating(skill)}
                        onChange={(event) => {
                          if (isComfortRating(event.target.value)) {
                            void onUpdateSkillComfortRating(application.id, skill.name, event.target.value)
                          }
                        }}
                      >
                        <option value="">Choose a comfort level</option>
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
      </div> : <div className="empty-state"><div className="empty-illustration"><Sparkles size={20} /></div><h3>{applications.length ? 'No matching skills' : 'No applications yet'}</h3><p>{applications.length ? 'Try a different search or importance filter.' : 'Add an application with a job posting link to start collecting skills.'}</p></div>}
      <div className="panel-footer"><span>Showing <strong>{filteredApplications.length}</strong> of <strong>{scopedApplications.length}</strong> applications</span><span className="privacy-note"><span className="privacy-dot" /> Stored securely in your account</span></div>
    </section>
    <footer className="page-footer">Made for the long game <span>✳</span></footer>
  </>
}

function SkillStudyTypeahead({ application, onUpdateSkillStudyStatus }: {
  application: Application
  onUpdateSkillStudyStatus: (applicationId: string, skillName: string, needsNoStudy: boolean) => Promise<boolean>
}) {
  const [search, setSearch] = useState('')
  const [activeSuggestion, setActiveSuggestion] = useState(0)
  const [saving, setSaving] = useState(false)
  const skills = application.skills ?? []
  const uniqueSkills = Array.from(new Map(skills.map((skill) => [skill.name.trim().toLowerCase(), skill])).values())
  const query = search.trim().toLowerCase()
  const matches = uniqueSkills.filter((skill) => (
    getSkillPriority(skill) !== NO_STUDY_PRIORITY && skill.name.toLowerCase().includes(query)
  )).slice(0, 8)
  const hasMatch = uniqueSkills.some((skill) => skill.name.toLowerCase().includes(query))
  const listId = `study-skill-suggestions-${application.id}`

  async function selectSkill(skillName: string) {
    setSaving(true)
    const saved = await onUpdateSkillStudyStatus(application.id, skillName, true)
    setSaving(false)
    if (saved) {
      setSearch('')
      setActiveSuggestion(0)
    }
  }

  return <div className="skill-study-typeahead">
    <label className="field">
      <span>Mark a saved skill as not needing study</span>
      <input
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={Boolean(query && matches.length)}
        aria-controls={query && matches.length ? listId : undefined}
        aria-activedescendant={query && matches.length ? `${listId}-${activeSuggestion}` : undefined}
        value={search}
        disabled={saving}
        onChange={(event) => { setSearch(event.target.value); setActiveSuggestion(0) }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            setSearch('')
            setActiveSuggestion(0)
          } else if (query && matches.length && event.key === 'ArrowDown') {
            event.preventDefault()
            setActiveSuggestion((current) => (current + 1) % matches.length)
          } else if (query && matches.length && event.key === 'ArrowUp') {
            event.preventDefault()
            setActiveSuggestion((current) => (current - 1 + matches.length) % matches.length)
          } else if (query && matches.length && event.key === 'Enter') {
            event.preventDefault()
            void selectSkill(matches[activeSuggestion]?.name ?? matches[0].name)
          }
        }}
        placeholder="Type a skill name"
      />
    </label>
    {query && matches.length > 0 && <div className="skill-study-suggestions" id={listId} role="listbox" aria-label="Matching skills">
      {matches.map((skill, index) => <button
        id={`${listId}-${index}`}
        key={skill.name}
        type="button"
        role="option"
        aria-selected={index === activeSuggestion}
        onMouseEnter={() => setActiveSuggestion(index)}
        onClick={() => void selectSkill(skill.name)}
      >{skill.name}</button>)}
    </div>}
    {query && matches.length === 0 && <p className="skill-study-no-match" role="status">{hasMatch ? 'All matching skills are already marked as not needing study.' : 'No matching skills in this application.'}</p>}
  </div>
}

function SkillStat({ label, value, caption }: { label: string; value: number; caption: string }) {
  return <article className="stat-card skills-stat-card"><div className="stat-icon violet"><Sparkles size={16} /></div><div className="stat-label">{label}</div><div className="stat-value">{value}</div><div className="stat-caption">{caption}</div></article>
}

function formatDate(value: string) {
  if (!value) return '—'
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`))
}
