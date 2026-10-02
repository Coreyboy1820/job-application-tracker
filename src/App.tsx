import { useEffect, useMemo, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import {
  ArrowDownUp,
  ArrowUpRight,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  ChevronDown,
  CirclePlus,
  Clock3,
  MoreHorizontal,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react'
import { loadApplications, saveApplications } from './storage'
import { extractSkills } from './skills'
import type { Application, Status } from './types'

const statuses: Status[] = ['Interested', 'Applied', 'Interviewing', 'Offer', 'Rejected']

function App() {
  const [applications, setApplications] = useState<Application[]>([])
  const [storageReady, setStorageReady] = useState(false)
  const [storageError, setStorageError] = useState<string | null>(null)
  const [activeStatus, setActiveStatus] = useState<Status | 'All'>('All')
  const [search, setSearch] = useState('')
  const [sortNewest, setSortNewest] = useState(true)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null)

  useEffect(() => {
    let isCurrent = true
    loadApplications()
      .then((savedApplications) => {
        if (isCurrent) {
          setApplications(savedApplications)
          setStorageReady(true)
        }
      })
      .catch(() => {
        if (isCurrent) setStorageError('Could not open the on-device database. Your saved data has not been changed. Close other Rolecall tabs and reload to try again.')
      })

    return () => { isCurrent = false }
  }, [])

  useEffect(() => {
    if (!storageReady || storageError) return
    saveApplications(applications).catch(() => {
      setStorageError('Could not save to the on-device database. Your current changes may not persist; reload after checking browser storage permissions.')
    })
  }, [applications, storageReady, storageError])

  const visibleApplications = useMemo(() => {
    const query = search.trim().toLowerCase()
    return applications
      .filter((application) => activeStatus === 'All' || application.status === activeStatus)
      .filter((application) =>
        !query || `${application.company} ${application.role} ${application.location}`.toLowerCase().includes(query),
      )
      .sort((a, b) => sortNewest
        ? b.dateApplied.localeCompare(a.dateApplied)
        : a.dateApplied.localeCompare(b.dateApplied))
  }, [applications, activeStatus, search, sortNewest])

  const activeCount = applications.filter((item) => ['Applied', 'Interviewing'].includes(item.status)).length
  const interviewCount = applications.filter((item) => item.status === 'Interviewing').length
  const offerCount = applications.filter((item) => item.status === 'Offer').length
  const selectedApplication = applications.find((item) => item.id === selectedApplicationId) ?? null

  function addApplication(application: Omit<Application, 'id'>) {
    setApplications((current) => [{ ...application, id: crypto.randomUUID() }, ...current])
    setIsFormOpen(false)
  }

  function updateStatus(id: string, status: Status) {
    setApplications((current) => current.map((item) => item.id === id ? { ...item, status } : item))
  }

  function deleteApplication(id: string) {
    setApplications((current) => current.filter((item) => item.id !== id))
  }

  function saveApplicationSkills(id: string, jobDescription: string, skills: string[]) {
    setApplications((current) => current.map((item) => item.id === id ? { ...item, jobDescription, skills } : item))
    setSelectedApplicationId(null)
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#top" aria-label="Rolecall home">
          <span className="brand-mark"><BriefcaseBusiness size={18} strokeWidth={2.4} /></span>
          <span>rolecall<span className="brand-period">.</span></span>
        </a>
        <div className="workspace-label">WORKSPACE</div>
        <button className="nav-item nav-item-active"><span className="nav-icon"><BriefcaseBusiness size={17} /></span> Applications <span className="nav-count">{applications.length}</span></button>
        <div className="sidebar-note">
          <div className="note-icon"><CalendarDays size={16} /></div>
          <strong>One step at a time.</strong>
          <p>Your job search is a project. Keep the next step visible and keep moving.</p>
        </div>
        <div className="sidebar-bottom"><span className="avatar">C</span><div><strong>My job search</strong><small>Personal workspace</small></div><MoreHorizontal size={18} className="muted-icon" /></div>
      </aside>

      <main className="main-content" id="top">
        <header className="topbar"><span className="breadcrumb">Workspace <span>/</span> Applications</span><span className="today-label"><CalendarDays size={15} /> Your search, organized</span></header>
        <section className="page-heading">
          <div><div className="eyebrow">JOB SEARCH DASHBOARD</div><h1>Applications</h1><p className="page-subtitle">A little progress every day adds up.</p></div>
          <button className="primary-button" disabled={!storageReady || Boolean(storageError)} onClick={() => setIsFormOpen(true)}><CirclePlus size={17} /> Add application</button>
        </section>

        {storageError && <div className="storage-message storage-error" role="alert">{storageError}</div>}
        {!storageReady && !storageError && <div className="storage-message" role="status">Opening your on-device database…</div>}

        <section className="stats-grid" aria-label="Application summary">
          <StatCard label="Total applications" value={applications.length} icon={<BriefcaseBusiness size={17} />} tone="violet" caption="Roles in your tracker" />
          <StatCard label="In progress" value={activeCount} icon={<Clock3 size={17} />} tone="blue" caption="Applied or interviewing" />
          <StatCard label="Interviews" value={interviewCount} icon={<CalendarDays size={17} />} tone="amber" caption="Conversations underway" />
          <StatCard label="Offers" value={offerCount} icon={<Check size={17} />} tone="green" caption="Reasons to celebrate" />
        </section>

        <section className="list-panel">
          <div className="panel-heading"><div><h2>Your applications</h2><p>Keep every opportunity and next step in one place.</p></div><button className="icon-button" aria-label="Filter options"><SlidersHorizontal size={17} /></button></div>
          <div className="toolbar">
            <div className="tabs" role="tablist" aria-label="Filter by status">
              {(['All', ...statuses] as const).map((status) => <button key={status} role="tab" aria-selected={activeStatus === status} className={`tab ${activeStatus === status ? 'tab-active' : ''}`} onClick={() => setActiveStatus(status)}>{status}<span>{status === 'All' ? applications.length : applications.filter((item) => item.status === status).length}</span></button>)}
            </div>
            <div className="toolbar-actions"><label className="search-box"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search roles..." /></label><button className="sort-button" onClick={() => setSortNewest((value) => !value)}><ArrowDownUp size={15} /> {sortNewest ? 'Newest first' : 'Oldest first'}</button></div>
          </div>
          {visibleApplications.length > 0 ? (
            <div className="table-wrap"><table><thead><tr><th>COMPANY & ROLE</th><th>DATE APPLIED</th><th>STATUS</th><th>NEXT STEP</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>
              {visibleApplications.map((application) => <tr key={application.id}>
                <td><div className="company-cell"><div className="company-logo" aria-hidden="true">{application.company.slice(0, 1).toUpperCase()}</div><button type="button" className="company-info application-link" onClick={() => setSelectedApplicationId(application.id)}><strong>{application.company}</strong><span>{application.role}{application.location ? ` · ${application.location}` : ''}</span>{application.skills?.length ? <span className="skills-count">{application.skills.length} skills saved · View details</span> : <span className="skills-count">View details and skills</span>}</button></div></td>
                <td className="date-cell">{formatDate(application.dateApplied)}</td>
                <td><StatusSelect status={application.status} onChange={(status) => updateStatus(application.id, status)} /></td>
                <td className="next-step-cell">{application.nextStep || <span className="muted-text">Add a reminder</span>}</td>
                <td><button className="row-menu" aria-label={`Delete ${application.role} at ${application.company}`} title="Delete application" onClick={() => deleteApplication(application.id)}><X size={16} /></button></td>
              </tr>)}
            </tbody></table></div>
          ) : <EmptyState hasApplications={applications.length > 0} onAdd={() => setIsFormOpen(true)} disabled={!storageReady || Boolean(storageError)} />}
          <div className="panel-footer"><span>Showing <strong>{visibleApplications.length}</strong> of <strong>{applications.length}</strong> applications</span><span className="privacy-note"><span className="privacy-dot" /> Saved on this device</span></div>
        </section>
        <footer className="page-footer">Made for the long game <span>✳</span></footer>
      </main>

      {isFormOpen && <ApplicationModal onClose={() => setIsFormOpen(false)} onSave={addApplication} />}
      {selectedApplication && <ApplicationDetailView
        key={selectedApplication.id}
        application={selectedApplication}
        onClose={() => setSelectedApplicationId(null)}
        onSave={(jobDescription, skills) => saveApplicationSkills(selectedApplication.id, jobDescription, skills)}
        onStatusChange={(status) => updateStatus(selectedApplication.id, status)}
      />}
    </div>
  )
}

function StatCard({ label, value, icon, tone, caption }: { label: string; value: number; icon: ReactNode; tone: string; caption: string }) {
  return <article className="stat-card"><div className={`stat-icon ${tone}`}>{icon}</div><div className="stat-label">{label}</div><div className="stat-value">{value}</div><div className="stat-caption">{caption}</div></article>
}

function StatusSelect({ status, onChange }: { status: Status; onChange: (status: Status) => void }) {
  return <label className={`status-pill status-${status.toLowerCase()}`}><span className="status-dot" /><select aria-label="Application status" value={status} onChange={(event) => onChange(event.target.value as Status)}>{statuses.map((option) => <option key={option}>{option}</option>)}</select><ChevronDown size={13} /></label>
}

function EmptyState({ hasApplications, onAdd, disabled }: { hasApplications: boolean; onAdd: () => void; disabled: boolean }) {
  return <div className="empty-state"><div className="empty-illustration"><BriefcaseBusiness size={25} /></div><h3>{hasApplications ? 'No matches found' : 'Your next opportunity starts here'}</h3><p>{hasApplications ? 'Try another search or choose a different status.' : 'Add the first role you are considering. We will help you keep track of what happens next.'}</p>{!hasApplications && <button className="secondary-button" onClick={onAdd} disabled={disabled}><CirclePlus size={16} /> Add your first application <ArrowUpRight size={15} /></button>}</div>
}

function ApplicationModal({ onClose, onSave }: { onClose: () => void; onSave: (application: Omit<Application, 'id'>) => void }) {
  const [company, setCompany] = useState('')
  const [role, setRole] = useState('')
  const [location, setLocation] = useState('')
  const [dateApplied, setDateApplied] = useState(new Date().toISOString().slice(0, 10))
  const [status, setStatus] = useState<Status>('Applied')
  const [url, setUrl] = useState('')
  const [nextStep, setNextStep] = useState('')
  const [notes, setNotes] = useState('')
  const canSave = company.trim().length > 0 && role.trim().length > 0

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSave) return
    onSave({ company: company.trim(), role: role.trim(), location: location.trim(), dateApplied, status, url: url.trim(), nextStep: nextStep.trim(), notes: notes.trim() })
  }

  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><header className="modal-header"><div><div className="eyebrow">NEW OPPORTUNITY</div><h2 id="modal-title">Add an application</h2></div><button className="icon-button" aria-label="Close" onClick={onClose}><X size={18} /></button></header><form onSubmit={handleSubmit}>
    <div className="form-grid"><label className="field"><span>Company <i>*</i></span><input autoFocus required value={company} onChange={(event) => setCompany(event.target.value)} placeholder="e.g. Acme Inc." /></label><label className="field"><span>Job title <i>*</i></span><input required value={role} onChange={(event) => setRole(event.target.value)} placeholder="e.g. Software Engineer" /></label><label className="field"><span>Location</span><input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Remote, city, or hybrid" /></label><label className="field"><span>Date applied</span><input type="date" value={dateApplied} onChange={(event) => setDateApplied(event.target.value)} /></label><label className="field"><span>Status</span><select value={status} onChange={(event) => setStatus(event.target.value as Status)}>{statuses.map((option) => <option key={option}>{option}</option>)}</select></label><label className="field"><span>Job posting link</span><input type="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://" /></label><label className="field field-full"><span>Next step or reminder</span><input value={nextStep} onChange={(event) => setNextStep(event.target.value)} placeholder="e.g. Follow up with recruiter Friday" /></label><label className="field field-full"><span>Notes</span><textarea rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Anything you want to remember about this role..." /></label></div>
    <div className="modal-actions"><button type="button" className="text-button" onClick={onClose}>Cancel</button><button className="primary-button" type="submit" disabled={!canSave}><CirclePlus size={16} /> Save application</button></div>
  </form></section></div>
}

function ApplicationDetailView({ application, onClose, onSave, onStatusChange }: {
  application: Application
  onClose: () => void
  onSave: (jobDescription: string, skills: string[]) => void
  onStatusChange: (status: Status) => void
}) {
  const [jobDescription, setJobDescription] = useState(application.jobDescription ?? '')
  const [skills, setSkills] = useState(application.skills ?? [])
  const [newSkill, setNewSkill] = useState('')

  function addSkill(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const skill = newSkill.trim()
    if (skill && !skills.some((existing) => existing.toLowerCase() === skill.toLowerCase())) {
      setSkills((current) => [...current, skill])
    }
    setNewSkill('')
  }

  return <div className="detail-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <aside className="detail-panel" role="dialog" aria-modal="true" aria-labelledby="detail-title">
      <header className="detail-header">
        <div><div className="eyebrow">APPLICATION DETAILS</div><h2 id="detail-title">{application.company}</h2><p>{application.role}{application.location ? ` · ${application.location}` : ''}</p></div>
        <button className="icon-button" aria-label="Close application details" onClick={onClose}><X size={18} /></button>
      </header>
      <div className="detail-body">
        <div className="detail-meta"><div><span className="detail-label">STATUS</span><StatusSelect status={application.status} onChange={onStatusChange} /></div><div><span className="detail-label">DATE APPLIED</span><strong>{formatDate(application.dateApplied)}</strong></div></div>
        {application.url && <a className="posting-link" href={application.url} target="_blank" rel="noreferrer">Open job posting <ArrowUpRight size={15} /></a>}
        {application.nextStep && <section className="detail-section"><h3>Next step</h3><p>{application.nextStep}</p></section>}
        {application.notes && <section className="detail-section"><h3>Notes</h3><p className="detail-notes">{application.notes}</p></section>}

        <section className="detail-section skills-section">
          <div className="section-title-row"><div><h3>Skills from the job description</h3><p>Review and keep the skills that matter for this role.</p></div><span className="skill-total">{skills.length}</span></div>
          {skills.length ? <div className="skill-tags">{skills.map((skill) => <span className="skill-tag" key={skill}>{skill}<button type="button" aria-label={`Remove ${skill}`} onClick={() => setSkills((current) => current.filter((item) => item !== skill))}><X size={12} /></button></span>)}</div> : <div className="skills-empty">No skills saved yet. Add the job description below to find matching skills.</div>}
          <form className="add-skill-form" onSubmit={addSkill}><input value={newSkill} onChange={(event) => setNewSkill(event.target.value)} placeholder="Add a skill manually" aria-label="Add a skill manually" /><button className="secondary-button" type="submit" disabled={!newSkill.trim()}><CirclePlus size={15} /> Add</button></form>
        </section>

        <section className="detail-section description-section"><label className="field"><span>Job description</span><textarea rows={8} value={jobDescription} onChange={(event) => setJobDescription(event.target.value)} placeholder="Paste the job description here to extract skills…" /></label><button className="extract-button" type="button" disabled={!jobDescription.trim()} onClick={() => setSkills(extractSkills(jobDescription))}><SlidersHorizontal size={15} /> Find skills in description</button></section>
      </div>
      <footer className="detail-footer"><button className="text-button" onClick={onClose}>Cancel</button><button className="primary-button" onClick={() => onSave(jobDescription, skills)}>Save details</button></footer>
    </aside>
  </div>
}

function formatDate(value: string) {
  if (!value) return '—'
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`))
}

export default App

