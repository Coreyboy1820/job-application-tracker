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
  LogOut,
  MoreHorizontal,
  Pencil,
  Search,
  Sparkles,
  X,
} from 'lucide-react'
import type { Session } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import { loadApplications as loadLocalApplications } from './storage'
import type { Application, JobSkill, Status } from './types'
import SkillsPage from './SkillsPage'
import './cloud.css'

type ApplicationRow = {
  id: string
  user_id: string
  company: string
  role: string
  location: string
  date_applied: string
  status: Status
  url: string
  notes: string
  next_step: string
  job_description: string
  skills: JobSkill[]
  skills_analyzed_at: string | null
  skills_source_url: string
}

const statuses: Status[] = ['Interested', 'Applied', 'Interviewing', 'Offer', 'Rejected']
const applicationColumns = 'id, user_id, company, role, location, date_applied, status, url, notes, next_step, job_description, skills, skills_analyzed_at, skills_source_url'

function fromRow(row: ApplicationRow): Application {
  return {
    id: row.id,
    company: row.company,
    role: row.role,
    location: row.location,
    dateApplied: row.date_applied,
    status: row.status,
    url: row.url,
    notes: row.notes,
    nextStep: row.next_step,
    jobDescription: row.job_description,
    skills: row.skills ?? [],
    skillsAnalyzedAt: row.skills_analyzed_at,
    skillsSourceUrl: row.skills_source_url,
  }
}

function toRow(application: Application, userId: string) {
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
  }
}

// Keep the previous browser-only entries available so the user can copy them
// into their new account after the database is set up.
async function readLegacyApplications(): Promise<Application[]> {
  try {
    // loadApplications includes records already migrated from localStorage into IndexedDB.
    const saved = await loadLocalApplications()
    return saved.flatMap((value): Application[] => {
      if (!value || typeof value !== 'object') return []
      const item = value as Partial<Application>
      if (typeof item.company !== 'string' || !item.company.trim()) return []
      if (typeof item.role !== 'string' || !item.role.trim()) return []
      const status = statuses.includes(item.status as Status) ? item.status as Status : 'Applied'
      const id = typeof item.id === 'string' && /^[0-9a-f-]{36}$/i.test(item.id) ? item.id : crypto.randomUUID()
      return [{
        id,
        company: item.company.trim(),
        role: item.role.trim(),
        location: typeof item.location === 'string' ? item.location : '',
        dateApplied: typeof item.dateApplied === 'string' ? item.dateApplied : new Date().toISOString().slice(0, 10),
        status,
        url: typeof item.url === 'string' ? item.url : '',
        notes: typeof item.notes === 'string' ? item.notes : '',
        nextStep: typeof item.nextStep === 'string' ? item.nextStep : '',
      }]
    })
  } catch {
    return []
  }
}

function App() {
  const client = supabase
  const [activePage, setActivePage] = useState<'applications' | 'skills'>(() => window.location.hash === '#/skills' ? 'skills' : 'applications')
  const [session, setSession] = useState<Session | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [applications, setApplications] = useState<Application[]>([])
  const [dataLoading, setDataLoading] = useState(false)
  const [activeStatus, setActiveStatus] = useState<Status | 'All'>('All')
  const [search, setSearch] = useState('')
  const [sortNewest, setSortNewest] = useState(true)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingApplication, setEditingApplication] = useState<Application | null>(null)
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState<{ id: string; state: 'loading' | 'error'; message?: string } | null>(null)
  const [analysisAttempt, setAnalysisAttempt] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [legacyApplications, setLegacyApplications] = useState<Application[]>([])
  const [importing, setImporting] = useState(false)

  useEffect(() => {
    function syncPageFromHash() {
      setActivePage(window.location.hash === '#/skills' ? 'skills' : 'applications')
    }
    window.addEventListener('hashchange', syncPageFromHash)
    return () => window.removeEventListener('hashchange', syncPageFromHash)
  }, [])

  function navigateTo(page: 'applications' | 'skills') {
    const nextHash = page === 'skills' ? '#/skills' : '#/applications'
    if (window.location.hash !== nextHash) window.location.hash = nextHash
    setActivePage(page)
  }

  function openApplication(id: string) {
    navigateTo('applications')
    setSelectedApplicationId(id)
  }

  useEffect(() => {
    if (!client) {
      setAuthLoading(false)
      return
    }

    let active = true
    client.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active) return
      if (sessionError) setError(sessionError.message)
      setSession(data.session)
      setAuthLoading(false)
    })

    const { data: { subscription } } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setAuthLoading(false)
      setError(null)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [client])

  useEffect(() => {
    if (!client || !session?.user.id) {
      setApplications([])
      setLegacyApplications([])
      setDataLoading(false)
      return
    }

    const database = client
    const activeUserId = session.user.id
    let active = true
    setDataLoading(true)
    setError(null)

    async function loadApplications() {
      const { data, error: queryError } = await database
        .from('applications')
        .select(applicationColumns)
        .order('date_applied', { ascending: false })

      if (!active) return
      if (queryError) {
        setError(`Could not load applications: ${queryError.message}`)
        setApplications([])
      } else {
        setApplications((data ?? []).map((row) => fromRow(row as ApplicationRow)))
        const importedKey = `rolecall-imported-v1:${activeUserId}`
        setLegacyApplications(localStorage.getItem(importedKey) ? [] : await readLegacyApplications())
      }
      setDataLoading(false)
    }

    void loadApplications()
    return () => { active = false }
  }, [client, session?.user.id])

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
  const userId = session?.user.id
  const selectedApplication = applications.find((item) => item.id === selectedApplicationId) ?? null

  useEffect(() => {
    if (!selectedApplication || !client) return
    const application = selectedApplication
    if (!application.url) {
      setAnalysis({ id: application.id, state: 'error', message: 'Add a job posting link to analyze this role.' })
      return
    }
    if (application.skillsAnalyzedAt && application.skillsSourceUrl === application.url) {
      setAnalysis(null)
      return
    }

    let active = true
    setAnalysis({ id: application.id, state: 'loading' })
    void client.functions.invoke('analyze-job-posting', { body: { applicationId: application.id } }).then(async ({ data, error: invokeError }) => {
      if (!active) return
      if (invokeError) {
        let message = invokeError.message
        const context = (invokeError as { context?: unknown }).context
        if (context instanceof Response) {
          try {
            const body = await context.json() as { error?: string }
            if (body.error) message = body.error
          } catch { /* Use the SDK's summary when the response has no JSON body. */ }
        }
        setAnalysis({ id: application.id, state: 'error', message })
        return
      }
      const result = data as { jobDescription: string; skills: JobSkill[]; analyzedAt: string; sourceUrl: string }
      setApplications((current) => current.map((item) => item.id === application.id ? {
        ...item,
        jobDescription: result.jobDescription,
        skills: result.skills,
        skillsAnalyzedAt: result.analyzedAt,
        skillsSourceUrl: result.sourceUrl,
      } : item))
      setAnalysis(null)
    }).catch((reason: unknown) => {
      if (active) setAnalysis({ id: application.id, state: 'error', message: reason instanceof Error ? reason.message : 'Could not analyze this posting.' })
    })
    return () => { active = false }
  }, [client, selectedApplicationId, selectedApplication?.id, selectedApplication?.url, selectedApplication?.skillsAnalyzedAt, selectedApplication?.skillsSourceUrl, analysisAttempt])

  async function addApplication(application: Omit<Application, 'id'>): Promise<boolean> {
    if (!client || !userId) return false
    setError(null)
    const newApplication: Application = { ...application, id: crypto.randomUUID() }
    const { data, error: insertError } = await client
      .from('applications')
      .insert(toRow(newApplication, userId))
      .select(applicationColumns)
      .single()

    if (insertError) {
      setError(`Could not save this application: ${insertError.message}`)
      return false
    }
    setApplications((current) => [fromRow(data as ApplicationRow), ...current])
    setIsFormOpen(false)
    return true
  }

  async function updateStatus(id: string, status: Status) {
    if (!client) return
    setError(null)
    const { data, error: updateError } = await client
      .from('applications')
      .update({ status })
      .eq('id', id)
      .select(applicationColumns)
      .single()

    if (updateError) {
      setError(`Could not update status: ${updateError.message}`)
      return
    }
    const updated = fromRow(data as ApplicationRow)
    setApplications((current) => current.map((item) => item.id === id ? updated : item))
  }

  async function updateApplication(id: string, application: Omit<Application, 'id'>): Promise<boolean> {
    if (!client) return false
    setError(null)
    const current = applications.find((item) => item.id === id)
    const postingChanged = current !== undefined && current.url !== application.url
    const { data, error: updateError } = await client
      .from('applications')
      .update({
        company: application.company,
        role: application.role,
        location: application.location,
        date_applied: application.dateApplied || new Date().toISOString().slice(0, 10),
        status: application.status,
        url: application.url,
        notes: application.notes,
        next_step: application.nextStep,
        ...(postingChanged ? {
          job_description: '',
          skills: [],
          skills_analyzed_at: null,
          skills_source_url: '',
        } : {}),
      })
      .eq('id', id)
      .select(applicationColumns)
      .single()

    if (updateError) {
      setError(`Could not update this application: ${updateError.message}`)
      return false
    }
    const updated = fromRow(data as ApplicationRow)
    setApplications((current) => current.map((item) => item.id === id ? updated : item))
    return true
  }

  async function updateApplicationUrl(id: string, url: string): Promise<boolean> {
    if (!client) return false
    setError(null)
    const { error: updateError } = await client.from('applications').update({
      url,
      job_description: '',
      skills: [],
      skills_analyzed_at: null,
      skills_source_url: '',
    }).eq('id', id)
    if (updateError) {
      setError(`Could not save the job posting link: ${updateError.message}`)
      return false
    }
    setApplications((current) => current.map((item) => item.id === id ? {
      ...item, url, jobDescription: '', skills: [], skillsAnalyzedAt: null, skillsSourceUrl: '',
    } : item))
    return true
  }

  async function deleteApplication(id: string) {
    if (!client) return
    setError(null)
    const { error: deleteError } = await client.from('applications').delete().eq('id', id)
    if (deleteError) {
      setError(`Could not delete this application: ${deleteError.message}`)
      return
    }
    setApplications((current) => current.filter((item) => item.id !== id))
  }

  async function importLegacyApplications() {
    if (!client || !userId || legacyApplications.length === 0) return
    setImporting(true)
    setError(null)
    const rows = legacyApplications.map((application) => toRow(application, userId))
    const { error: importError } = await client
      .from('applications')
      .upsert(rows, { onConflict: 'id', ignoreDuplicates: true })

    if (importError) {
      setError(`Could not import your browser-saved applications: ${importError.message}`)
      setImporting(false)
      return
    }

    localStorage.setItem(`rolecall-imported-v1:${userId}`, new Date().toISOString())
    setLegacyApplications([])
    setNotice('Your browser-saved applications were copied to your account. The original browser copy is still there.')
    setImporting(false)

    const { data, error: reloadError } = await client
      .from('applications')
      .select(applicationColumns)
      .order('date_applied', { ascending: false })
    if (reloadError) setError(`Imported, but could not refresh the list: ${reloadError.message}`)
    else setApplications((data ?? []).map((row) => fromRow(row as ApplicationRow)))
  }

  async function signOut() {
    if (!client) return
    const { error: signOutError } = await client.auth.signOut()
    if (signOutError) setError(signOutError.message)
  }

  if (!isSupabaseConfigured || !client) return <SetupRequired />
  if (authLoading) return <div className="auth-screen"><div className="auth-card auth-loading">Checking your session…</div></div>
  if (!session) return <AuthPanel />

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#/applications" onClick={() => navigateTo('applications')} aria-label="Rolecall home">
          <span className="brand-mark"><BriefcaseBusiness size={18} strokeWidth={2.4} /></span>
          <span>rolecall<span className="brand-period">.</span></span>
        </a>
        <div className="workspace-label">WORKSPACE</div>
        <button type="button" className={`nav-item ${activePage === 'applications' ? 'nav-item-active' : ''}`} aria-current={activePage === 'applications' ? 'page' : undefined} onClick={() => navigateTo('applications')}><span className="nav-icon"><BriefcaseBusiness size={17} /></span> Applications <span className="nav-count">{applications.length}</span></button>
        <button type="button" className={`nav-item ${activePage === 'skills' ? 'nav-item-active' : ''}`} aria-current={activePage === 'skills' ? 'page' : undefined} onClick={() => navigateTo('skills')}><span className="nav-icon"><Sparkles size={17} /></span> Skills <span className="nav-count">{applications.reduce((count, item) => count + (item.skillsAnalyzedAt && item.skillsSourceUrl === item.url ? item.skills?.length ?? 0 : 0), 0)}</span></button>
        <div className="sidebar-note">
          <div className="note-icon"><CalendarDays size={16} /></div>
          <strong>One step at a time.</strong>
          <p>Your job search is a project. Keep the next step visible and keep moving.</p>
        </div>
        <div className="sidebar-bottom"><span className="avatar">{session.user.email?.slice(0, 1).toUpperCase() ?? 'C'}</span><div><strong>My job search</strong><small>{session.user.email}</small></div><MoreHorizontal size={18} className="muted-icon" /></div>
      </aside>

      <main className="main-content" id="top">
        <header className="topbar"><span className="breadcrumb">Workspace <span>/</span> {activePage === 'skills' ? 'Skills' : 'Applications'}</span><button className="sign-out-button" onClick={() => void signOut()}><LogOut size={14} /> Sign out</button></header>
        {error && <div className="storage-message storage-error" role="alert">{error}</div>}
        {notice && <div className="storage-message storage-notice" role="status"><span>{notice}</span><button aria-label="Dismiss notice" onClick={() => setNotice(null)}><X size={15} /></button></div>}
        {activePage === 'skills' ? <SkillsPage applications={applications} loading={dataLoading} onOpenApplication={openApplication} /> : <>
        <section className="page-heading">
          <div><div className="eyebrow">JOB SEARCH DASHBOARD</div><h1>Applications</h1><p className="page-subtitle">A little progress every day adds up.</p></div>
          <button className="primary-button" onClick={() => setIsFormOpen(true)}><CirclePlus size={17} /> Add application</button>
        </section>

        {legacyApplications.length > 0 && <div className="migration-banner"><div><strong>Bring over your browser-saved applications</strong><p>We found {legacyApplications.length} application{legacyApplications.length === 1 ? '' : 's'} saved on this device. Copy them into your account to use them on other devices. The browser copy will be kept.</p></div><button className="secondary-button" disabled={importing} onClick={() => void importLegacyApplications()}>{importing ? 'Importing…' : 'Import applications'} <ArrowUpRight size={15} /></button></div>}

        <section className="stats-grid" aria-label="Application summary">
          <StatCard label="Total applications" value={applications.length} icon={<BriefcaseBusiness size={17} />} tone="violet" caption="Roles in your tracker" />
          <StatCard label="In progress" value={activeCount} icon={<Clock3 size={17} />} tone="blue" caption="Applied or interviewing" />
          <StatCard label="Interviews" value={interviewCount} icon={<CalendarDays size={17} />} tone="amber" caption="Conversations underway" />
          <StatCard label="Offers" value={offerCount} icon={<Check size={17} />} tone="green" caption="Reasons to celebrate" />
        </section>

        <section className="list-panel">
          <div className="panel-heading"><div><h2>Your applications</h2><p>Keep every opportunity and next step in one place.</p></div><span className="cloud-badge">Synced to your account</span></div>
          <div className="toolbar">
            <div className="tabs" role="tablist" aria-label="Filter by status">
              {(['All', ...statuses] as const).map((status) => <button key={status} role="tab" aria-selected={activeStatus === status} className={`tab ${activeStatus === status ? 'tab-active' : ''}`} onClick={() => setActiveStatus(status)}>{status}<span>{status === 'All' ? applications.length : applications.filter((item) => item.status === status).length}</span></button>)}
            </div>
            <div className="toolbar-actions"><label className="search-box"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search roles..." /></label><button className="sort-button" onClick={() => setSortNewest((value) => !value)}><ArrowDownUp size={15} /> {sortNewest ? 'Newest first' : 'Oldest first'}</button></div>
          </div>
          {dataLoading ? <div className="empty-state"><p>Loading your applications…</p></div> : visibleApplications.length > 0 ? (
            <div className="table-wrap"><table><thead><tr><th>COMPANY & ROLE</th><th>DATE APPLIED</th><th>STATUS</th><th>NEXT STEP</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>
              {visibleApplications.map((application) => <tr key={application.id}>
                <td><div className="company-cell"><div className="company-logo" aria-hidden="true">{application.company.slice(0, 1).toUpperCase()}</div><button type="button" className="company-info application-open-button" onClick={() => setSelectedApplicationId(application.id)}><strong>{application.company}</strong><span>{application.role}{application.location ? ` · ${application.location}` : ''}</span>{application.skillsAnalyzedAt && application.skillsSourceUrl === application.url && <span className="analysis-status">{application.skills?.length ?? 0} skills analyzed</span>}</button></div></td>
                <td className="date-cell">{formatDate(application.dateApplied)}</td>
                <td><StatusSelect status={application.status} onChange={(status) => void updateStatus(application.id, status)} /></td>
                <td className="next-step-cell">{application.nextStep || <span className="muted-text">Add a reminder</span>}</td>
                <td className="application-actions">
                  <button className="row-menu edit-application-button" aria-label={`Edit ${application.role} at ${application.company}`} title="Edit application" onClick={() => { setEditingApplication(application); setIsFormOpen(true) }}><Pencil size={15} /></button>
                  <button className="row-menu" aria-label={`Delete ${application.role} at ${application.company}`} title="Delete application" onClick={() => void deleteApplication(application.id)}><X size={16} /></button>
                </td>
              </tr>)}
            </tbody></table></div>
          ) : <EmptyState hasApplications={applications.length > 0} onAdd={() => setIsFormOpen(true)} />}
          <div className="panel-footer"><span>Showing <strong>{visibleApplications.length}</strong> of <strong>{applications.length}</strong> applications</span><span className="privacy-note"><span className="privacy-dot" /> Stored securely in your account</span></div>
        </section>
        <footer className="page-footer">Made for the long game <span>✳</span></footer>
        </>}
      </main>

      {isFormOpen && <ApplicationModal key={editingApplication?.id ?? 'new'} application={editingApplication} onClose={() => { setIsFormOpen(false); setEditingApplication(null) }} onSave={(application) => editingApplication ? updateApplication(editingApplication.id, application) : addApplication(application)} />}
      {selectedApplication && <ApplicationDetailView
        key={selectedApplication.id}
        application={selectedApplication}
        analysis={analysis?.id === selectedApplication.id ? analysis : null}
        onClose={() => { setSelectedApplicationId(null); setAnalysis(null) }}
        onRetry={() => setAnalysisAttempt((attempt) => attempt + 1)}
        onUpdateUrl={updateApplicationUrl}
        onViewSkills={() => { setSelectedApplicationId(null); setAnalysis(null); navigateTo('skills') }}
      />}
    </div>
  )
}

function SetupRequired() {
  return <div className="auth-screen"><section className="auth-card setup-card"><a className="brand" href="#top"><span className="brand-mark"><BriefcaseBusiness size={18} /></span><span>rolecall<span className="brand-period">.</span></span></a><div className="eyebrow">DATABASE SETUP</div><h1>Connect your Supabase project</h1><p>Rolecall now stores application data in a shared, protected database. Add your project URL and publishable key to a local <code>.env.local</code> file to continue.</p><ol><li>Create a Supabase project.</li><li>Copy <code>.env.example</code> to <code>.env.local</code> and fill in the project URL and publishable key.</li><li>Apply the migration in <code>supabase/migrations</code>, then restart the app.</li></ol><p className="helper-text">The publishable key is meant for browser use. Never put a service-role or secret key in this file.</p></section></div>
}

function AuthPanel() {
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase) return
    setPending(true)
    setError(null)
    setNotice(null)

    const result = mode === 'sign-up'
      ? await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } })
      : await supabase.auth.signInWithPassword({ email, password })

    if (result.error) {
      setError(result.error.message)
    } else if (mode === 'sign-up' && !result.data.session) {
      setNotice('Check your email for a confirmation link, then return here to sign in.')
    }
    setPending(false)
  }

  return <div className="auth-screen"><section className="auth-card"><a className="brand" href="#top"><span className="brand-mark"><BriefcaseBusiness size={18} /></span><span>rolecall<span className="brand-period">.</span></span></a><div className="eyebrow">YOUR JOB SEARCH</div><h1>{mode === 'sign-in' ? 'Welcome back' : 'Create your account'}</h1><p className="auth-subtitle">Sign in to keep your applications in sync across devices.</p>{error && <div className="auth-error" role="alert">{error}</div>}{notice && <div className="storage-message storage-notice" role="status">{notice}</div>}<form onSubmit={(event) => void handleSubmit(event)}><label className="field"><span>Email</span><input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></label><label className="field"><span>Password</span><input type="password" autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'} minLength={6} required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 6 characters" /></label><button className="primary-button auth-submit" type="submit" disabled={pending}>{pending ? 'Please wait…' : mode === 'sign-in' ? 'Sign in' : 'Create account'}</button></form><p className="auth-switch">{mode === 'sign-in' ? 'New to Rolecall?' : 'Already have an account?'} <button onClick={() => { setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in'); setError(null); setNotice(null) }}>{mode === 'sign-in' ? 'Create an account' : 'Sign in'}</button></p></section></div>
}

function StatCard({ label, value, icon, tone, caption }: { label: string; value: number; icon: ReactNode; tone: string; caption: string }) {
  return <article className="stat-card"><div className={`stat-icon ${tone}`}>{icon}</div><div className="stat-label">{label}</div><div className="stat-value">{value}</div><div className="stat-caption">{caption}</div></article>
}

function StatusSelect({ status, onChange }: { status: Status; onChange: (status: Status) => void }) {
  return <label className={`status-pill status-${status.toLowerCase()}`}><span className="status-dot" /><select aria-label="Application status" value={status} onChange={(event) => onChange(event.target.value as Status)}>{statuses.map((option) => <option key={option}>{option}</option>)}</select><ChevronDown size={13} /></label>
}

function EmptyState({ hasApplications, onAdd }: { hasApplications: boolean; onAdd: () => void }) {
  return <div className="empty-state"><div className="empty-illustration"><BriefcaseBusiness size={25} /></div><h3>{hasApplications ? 'No matches found' : 'Your next opportunity starts here'}</h3><p>{hasApplications ? 'Try another search or choose a different status.' : 'Add the first role you are considering. We will help you keep track of what happens next.'}</p>{!hasApplications && <button className="secondary-button" onClick={onAdd}><CirclePlus size={16} /> Add your first application <ArrowUpRight size={15} /></button>}</div>
}

function ApplicationModal({ application, onClose, onSave }: { application: Application | null; onClose: () => void; onSave: (application: Omit<Application, 'id'>) => Promise<boolean> }) {
  const [company, setCompany] = useState(application?.company ?? '')
  const [role, setRole] = useState(application?.role ?? '')
  const [location, setLocation] = useState(application?.location ?? '')
  const [dateApplied, setDateApplied] = useState(application?.dateApplied ?? new Date().toISOString().slice(0, 10))
  const [status, setStatus] = useState<Status>(application?.status ?? 'Applied')
  const [url, setUrl] = useState(application?.url ?? '')
  const [nextStep, setNextStep] = useState(application?.nextStep ?? '')
  const [notes, setNotes] = useState(application?.notes ?? '')
  const [saving, setSaving] = useState(false)
  const canSave = company.trim().length > 0 && role.trim().length > 0

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSave) return
    setSaving(true)
    const saved = await onSave({ company: company.trim(), role: role.trim(), location: location.trim(), dateApplied, status, url: url.trim(), nextStep: nextStep.trim(), notes: notes.trim() })
    setSaving(false)
    if (saved) onClose()
  }

  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><header className="modal-header"><div><div className="eyebrow">{application ? 'UPDATE OPPORTUNITY' : 'NEW OPPORTUNITY'}</div><h2 id="modal-title">{application ? 'Edit application' : 'Add an application'}</h2></div><button className="icon-button" aria-label="Close" onClick={onClose}><X size={18} /></button></header><form onSubmit={(event) => void handleSubmit(event)}>
    <div className="form-grid"><label className="field"><span>Company <i>*</i></span><input autoFocus required value={company} onChange={(event) => setCompany(event.target.value)} placeholder="e.g. Acme Inc." /></label><label className="field"><span>Job title <i>*</i></span><input required value={role} onChange={(event) => setRole(event.target.value)} placeholder="e.g. Software Engineer" /></label><label className="field"><span>Location</span><input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Remote, city, or hybrid" /></label><label className="field"><span>Date applied</span><input type="date" value={dateApplied} onChange={(event) => setDateApplied(event.target.value)} /></label><label className="field"><span>Status</span><select value={status} onChange={(event) => setStatus(event.target.value as Status)}>{statuses.map((option) => <option key={option}>{option}</option>)}</select></label><label className="field"><span>Job posting link</span><input type="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://" /></label><label className="field field-full"><span>Next step or reminder</span><input value={nextStep} onChange={(event) => setNextStep(event.target.value)} placeholder="e.g. Follow up with recruiter Friday" /></label><label className="field field-full"><span>Notes</span><textarea rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Anything you want to remember about this role..." /></label></div>
    <div className="modal-actions"><button type="button" className="text-button" onClick={onClose}>Cancel</button><button className="primary-button" type="submit" disabled={!canSave || saving}>{application ? <Check size={16} /> : <CirclePlus size={16} />} {saving ? 'Saving…' : application ? 'Save changes' : 'Save application'}</button></div>
  </form></section></div>
}

function ApplicationDetailView({ application, analysis, onClose, onRetry, onUpdateUrl, onViewSkills }: {
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

function formatDate(value: string) {
  if (!value) return '—'
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`))
}

export default App
