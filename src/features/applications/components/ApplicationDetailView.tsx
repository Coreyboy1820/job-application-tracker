import { useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowUpRight, Sparkles, X } from 'lucide-react'
import type { Application } from '../../../shared/types'
import { formatDate } from '../../../shared/utils/formatDate'

export default function ApplicationDetailView({ application, analysis, onClose, onRetry, onUpdateUrl, onViewSkills }: {
  application: Application
  analysis: { state: 'loading' | 'error'; message?: string } | null
  onClose: () => void
  onRetry: () => void
  onUpdateUrl: (id: string, url: string) => Promise<boolean>
  onViewSkills: () => void
}) {
  const [url, setUrl] = useState(application.url)
  const [savingUrl, setSavingUrl] = useState(false)
  const isAnalyzed = Boolean(application.skillsAnalyzedAt && application.skillsSourceUrl === application.url)
  const hasUrlChanged = url.trim() !== application.url

  async function saveUrl(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSavingUrl(true)
    if (await onUpdateUrl(application.id, url.trim())) setUrl(url.trim())
    setSavingUrl(false)
  }

  return <div className="application-detail-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <section className="application-detail" role="dialog" aria-modal="true" aria-labelledby="application-detail-title">
      <header className="application-detail-header"><div><div className="eyebrow">APPLICATION</div><h2 id="application-detail-title">{application.company}</h2><p>{application.role}{application.location ? ` · ${application.location}` : ''}</p></div><button className="icon-button" aria-label="Close application details" onClick={onClose}><X size={18} /></button></header>
      <div className="application-detail-content">
        <div className="application-detail-meta"><span className={`status-pill status-${application.status.toLowerCase()}`}><span className="status-dot" />{application.status}</span><span>Applied {formatDate(application.dateApplied)}</span></div>
        <button type="button" className="secondary-button" onClick={onViewSkills}><Sparkles size={14} /> View skills</button>
        {application.url && <a className="open-job-posting-link" href={application.url} target="_blank" rel="noreferrer">Open original posting <ArrowUpRight size={13} /></a>}
        <form className="posting-url-form" onSubmit={(event) => void saveUrl(event)}><label className="field"><span>Job posting link</span><input type="url" required value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://company.com/careers/role" /></label>{hasUrlChanged && <button className="secondary-button" type="submit" disabled={savingUrl}>{savingUrl ? 'Saving link…' : 'Save new link and analyze'}</button>}</form>
        <p className="analysis-privacy-note">Rolecall reads the public posting, sends its text for skill analysis, and saves the results to your account.</p>
        {analysis?.state === 'loading' && <div className="analysis-loading" role="status"><span className="analysis-spinner" /><div><strong>Reading the posting and finding skills</strong><p>This usually takes a few seconds. We’ll save the results to this application.</p></div></div>}
        {analysis?.state === 'error' && <div className="analysis-error" role="alert"><div><strong>We couldn’t analyze this posting</strong><p>{analysis.message}</p></div>{application.url && <button type="button" className="secondary-button" onClick={onRetry}>Retry</button>}</div>}
        {isAnalyzed && <>
          <div className="skills-summary"><div><Sparkles size={16} /><strong>{application.skills?.length ?? 0} skills found</strong></div><span>Analyzed {formatDate(application.skillsAnalyzedAt!.slice(0, 10))}</span></div>
          {application.skills?.length ? <div className="analyzed-skills">{application.skills.map((skill) => <article className="analyzed-skill" key={`${skill.name}-${skill.evidence}`}><div className="analyzed-skill-heading"><strong>{skill.name}</strong><span className={`importance importance-${skill.importance}`}>{skill.importance}</span></div><div className="analyzed-skill-meta">{skill.category}</div><blockquote>“{skill.evidence}”</blockquote></article>)}</div> : <div className="no-skills-found">No specific skills were found in the saved job posting.</div>}
          {application.jobDescription && <details className="saved-job-description"><summary>View fetched job description</summary><pre>{application.jobDescription}</pre></details>}
        </>}
      </div>
    </section>
  </div>
}
