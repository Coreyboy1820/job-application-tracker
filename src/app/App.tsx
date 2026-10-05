import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowUpRight, BriefcaseBusiness, CalendarDays, Check,
  CirclePlus, Clock3, LogOut, MoreHorizontal, Pencil, Search, Sparkles, X,
} from 'lucide-react'
import type { Session } from '@supabase/supabase-js'
import { SKILL_EXTRACTION_VERSION } from '../../supabase/functions/analyze-job-posting/analysis-version'
import { isSupabaseConfigured, supabase } from '../shared/lib/supabase'
import type { Application, ComfortRating, Interview, JobSkill, Status } from '../shared/types'
import { applicationColumns, fromRow, toRow } from '../features/applications/data/applicationRow'
import type { ApplicationRow } from '../features/applications/data/applicationRow'
import { readLegacyApplications } from '../features/applications/data/legacyApplications'
import { statuses } from '../features/applications/statuses'
import { sortApplications } from '../features/applications/applicationSort'
import type { ApplicationSort } from '../features/applications/applicationSort'
import ApplicationModal from '../features/applications/components/ApplicationModal'
import ApplicationDetailView from '../features/applications/components/ApplicationDetailView'
import StatusSelect from '../features/applications/components/StatusSelect'
import EmptyState from '../features/applications/components/EmptyState'
import AuthPanel from '../features/auth/components/AuthPanel'
import SetupRequired from '../features/auth/components/SetupRequired'
import InterviewModal from '../features/interviews/components/InterviewModal'
import UpcomingInterviewsPage from '../features/interviews/pages/UpcomingInterviewsPage'
import { getUpcomingInterviews } from '../features/interviews/interviewDates'
import { getSkillPriority, NO_STUDY_PRIORITY, withComfortRating } from '../features/skills/skillPriority'
import SkillsPage from '../features/skills/pages/SkillsPage'
import CompanyInterviewQuestionsPage from '../features/skills/pages/CompanyInterviewQuestionsPage'
import StatCard from '../shared/components/StatCard'
import { formatDate } from '../shared/utils/formatDate'
import { useAppRoute } from './useAppRoute'
import '../styles/cloud.css'
import '../features/applications/applicationSort.css'

function App() {
  const client = supabase
  const activeUserId = useRef<string | null>(null)
  const accountEpoch = useRef(0)
  const skillUpdateLocks = useRef(new Set<string>())
  const { activePage, activeCompany, activeSkillApplicationId, navigateTo, openApplicationSkills } = useAppRoute()
  const [session, setSession] = useState<Session | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [applications, setApplications] = useState<Application[]>([])
  const calendarLaunchLock = useRef(false)
  const [calendarLaunchPending, setCalendarLaunchPending] = useState(false)
  const [agendaNow, setAgendaNow] = useState(() => Date.now())
  const [dataLoading, setDataLoading] = useState(false)
  const [activeStatus, setActiveStatus] = useState<Status | 'All'>('All')
  const [search, setSearch] = useState('')
  const [applicationSort, setApplicationSort] = useState<ApplicationSort>('newest')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [interviewEditorApplicationId, setInterviewEditorApplicationId] = useState<string | null>(null)
  const [editingApplication, setEditingApplication] = useState<Application | null>(null)
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState<{ id: string; state: 'loading' | 'error'; message?: string } | null>(null)
  const [analysisAttempt, setAnalysisAttempt] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [legacyApplications, setLegacyApplications] = useState<Application[]>([])
  const [importing, setImporting] = useState(false)

  function openCompanyQuestions(company: string) {
    navigateTo('company-questions', company)
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
    let authEventReceived = false
    function applySession(nextSession: Session | null) {
      const nextUserId = nextSession?.user.id ?? null
      if (activeUserId.current !== nextUserId) {
        activeUserId.current = nextUserId
        accountEpoch.current += 1
        setApplications([])
        setLegacyApplications([])
        setSelectedApplicationId(null)
        setInterviewEditorApplicationId(null)
        setEditingApplication(null)
        setIsFormOpen(false)
        setAnalysis(null)
        setNotice(null)
        setImporting(false)
      }
      setSession(nextSession)
      setAuthLoading(false)
    }
    client.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active || authEventReceived) return
      if (sessionError) setError(sessionError.message)
      applySession(data.session)
    }).catch((reason: unknown) => {
      if (!active || authEventReceived) return
      setError(reason instanceof Error ? reason.message : 'Could not restore your session.')
      applySession(null)
    })

    const { data: { subscription } } = client.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return
      authEventReceived = true
      applySession(nextSession)
      setError(null)
    })

    return () => {
      active = false
      accountEpoch.current += 1
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
    const loadingUserId = session.user.id
    const loadEpoch = accountEpoch.current
    let active = true
    setDataLoading(true)
    setError(null)

    async function loadApplications() {
      try {
        const { data, error: queryError } = await database
          .from('applications')
          .select(applicationColumns)
          .order('date_applied', { ascending: false })

        if (!active || loadEpoch !== accountEpoch.current) return
        if (queryError) {
          setError(`Could not load applications: ${queryError.message}`)
          setApplications([])
        } else {
          setApplications((data ?? []).map((row) => fromRow(row as ApplicationRow)))
          const importedKey = `rolecall-imported-v1:${loadingUserId}`
          const legacy = localStorage.getItem(importedKey) ? [] : await readLegacyApplications()
          if (!active || loadEpoch !== accountEpoch.current) return
          setLegacyApplications(legacy)
        }
      } catch (reason) {
        if (!active || loadEpoch !== accountEpoch.current) return
        setError(`Could not load applications: ${reason instanceof Error ? reason.message : 'An unexpected error occurred.'}`)
        setApplications([])
     } finally {
        if (active && loadEpoch === accountEpoch.current) setDataLoading(false)
      }
    }

    void loadApplications()
    return () => { active = false }
  }, [client, session?.user.id])

  useEffect(() => {
    const refreshNow = () => setAgendaNow(Date.now())
    const interval = window.setInterval(refreshNow, 30_000)
    window.addEventListener('focus', refreshNow)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener('focus', refreshNow)
    }
  }, [])

  const visibleApplications = useMemo(() => {
    const query = search.trim().toLowerCase()
    return sortApplications(applications
      .filter((application) => activeStatus === 'All' || application.status === activeStatus)
      .filter((application) =>
        !query || `${application.company} ${application.role} ${application.location}`.toLowerCase().includes(query),
      ), applicationSort, agendaNow)
  }, [applications, activeStatus, search, applicationSort, agendaNow])

  const activeCount = applications.filter((item) => ['Applied', 'Interviewing'].includes(item.status)).length
  const interviewCount = applications.filter((item) => item.status === 'Interviewing').length
  const offerCount = applications.filter((item) => item.status === 'Offer').length
  const upcomingInterviews = useMemo(() => getUpcomingInterviews(applications, agendaNow), [applications, agendaNow])
  const userId = session?.user.id
  const selectedApplication = applications.find((item) => item.id === selectedApplicationId) ?? null
  const interviewEditorApplication = applications.find((item) => item.id === interviewEditorApplicationId) ?? null

  useEffect(() => {
    const nextInterview = upcomingInterviews[0]
    if (!nextInterview) return

    const timeout = window.setTimeout(
      () => setAgendaNow(Date.now()),
      Math.min(2_147_483_647, Math.max(0, nextInterview.timestamp - Date.now())),
    )
    return () => window.clearTimeout(timeout)
  }, [upcomingInterviews])

  useEffect(() => {
    if (!selectedApplication || !client) return
    const application = selectedApplication
    if (!application.url) {
      setAnalysis({ id: application.id, state: 'error', message: 'Add a job posting link to analyze this role.' })
      return
    }
    if (application.skillsAnalyzedAt && application.skillsSourceUrl === application.url && application.interviewQuestionsVersion === 1 && application.skillExtractionVersion === SKILL_EXTRACTION_VERSION) {
      setAnalysis(null)
      return
    }

    let active = true
    const analysisEpoch = accountEpoch.current
    setAnalysis({ id: application.id, state: 'loading' })
    void client.functions.invoke('analyze-job-posting', { body: { applicationId: application.id } }).then(async ({ data, error: invokeError }) => {
      if (!active || analysisEpoch !== accountEpoch.current) return
      if (invokeError) {
        let message = invokeError.message
        const context = (invokeError as { context?: unknown }).context
        if (context instanceof Response) {
          try {
            const body = await context.json() as { error?: string }
            if (body.error) message = body.error
          } catch { /* Use the SDK's summary when the response has no JSON body. */ }
        }
        if (!active || analysisEpoch !== accountEpoch.current) return
        setAnalysis({ id: application.id, state: 'error', message })
        return
      }
      const result = data as { jobDescription: string; skills: JobSkill[]; analyzedAt: string; sourceUrl: string; interviewQuestionsVersion: number; skillExtractionVersion: number }
      setApplications((current) => current.map((item) => item.id === application.id ? {
        ...item,
        jobDescription: result.jobDescription,
        skills: result.skills.map((skill) => {
          const savedSkill = application.skills?.find((item) =>
            item.name.trim().toLowerCase() === skill.name.trim().toLowerCase(),
          )
          if (!savedSkill || (!savedSkill.needsNoStudy && savedSkill.priority === undefined && savedSkill.comfortRating === undefined)) return skill
          const priority = getSkillPriority(savedSkill)
          return {
            ...skill,
            comfortRating: savedSkill.comfortRating,
            needsNoStudy: priority === NO_STUDY_PRIORITY,
            priority,
          }
        }),
        skillsAnalyzedAt: result.analyzedAt,
        skillsSourceUrl: result.sourceUrl,
        interviewQuestionsVersion: result.interviewQuestionsVersion,
        skillExtractionVersion: result.skillExtractionVersion,
      } : item))
      setAnalysis(null)
    }).catch((reason: unknown) => {
      if (active && analysisEpoch === accountEpoch.current) setAnalysis({ id: application.id, state: 'error', message: reason instanceof Error ? reason.message : 'Could not analyze this posting.' })
    })
    return () => { active = false }
  }, [client, selectedApplicationId, selectedApplication?.id, selectedApplication?.url, selectedApplication?.skillsAnalyzedAt, selectedApplication?.skillsSourceUrl, selectedApplication?.interviewQuestionsVersion, selectedApplication?.skillExtractionVersion, analysisAttempt])

  function isCurrentAccount(epoch: number) {
    return epoch === accountEpoch.current && activeUserId.current === userId
  }

  async function addApplication(application: Omit<Application, 'id'>): Promise<boolean> {
    const requestEpoch = accountEpoch.current
    try {
      if (!client || !userId) return false
      if (!isCurrentAccount(requestEpoch)) return false
      setError(null)
      const newApplication: Application = { ...application, id: crypto.randomUUID() }
      const { data, error: insertError } = await client
        .from('applications')
        .insert(toRow(newApplication, userId))
        .select(applicationColumns)
        .single()

      if (!isCurrentAccount(requestEpoch)) return false
      if (insertError) {
        setError(`Could not save this application: ${insertError.message}`)
        return false
      }
      setApplications((current) => [fromRow(data as ApplicationRow), ...current])
      setIsFormOpen(false)
      return true
    } catch (reason) {
      if (!isCurrentAccount(requestEpoch)) return false
      const message = reason instanceof Error ? reason.message : 'An unexpected error occurred.'
      setError(`Could not save this application: ${message}`)
      return false
    }
  }

  async function updateStatus(id: string, status: Status) {
    const requestEpoch = accountEpoch.current
    try {
      if (!client) return
      if (!isCurrentAccount(requestEpoch)) return
      setError(null)
      const { data, error: updateError } = await client
        .from('applications')
        .update({ status })
        .eq('id', id)
        .select(applicationColumns)
        .single()

      if (!isCurrentAccount(requestEpoch)) return
      if (updateError) {
        setError(`Could not update status: ${updateError.message}`)
        return
      }
      const updated = fromRow(data as ApplicationRow)
      setApplications((current) => current.map((item) => item.id === id ? updated : item))
    } catch (reason) {
      if (!isCurrentAccount(requestEpoch)) return
      const message = reason instanceof Error ? reason.message : 'An unexpected error occurred.'
      setError(`Could not update status: ${message}`)
      return
    }
  }

  async function updateInterviews(id: string, interviews: Interview[]): Promise<string | null> {
    const requestEpoch = accountEpoch.current
    try {
      if (calendarLaunchLock.current) return 'Wait for the calendar tracking update to finish before saving this schedule.'
      if (!client) return 'Interview schedule cannot be saved because the database is unavailable.'
      if (!isCurrentAccount(requestEpoch)) return 'Your account changed. Please reopen the interview schedule.'
      setError(null)
      const { data, error: updateError } = await client
        .from('applications')
        .update({ interviews })
        .eq('id', id)
        .select(applicationColumns)
        .single()

      if (!isCurrentAccount(requestEpoch)) return 'Your account changed. Please reopen the interview schedule.'
      if (updateError) {
        setError(`Could not save interview schedule: ${updateError.message}`)
        return updateError.message
      }

      const updated = fromRow(data as ApplicationRow)
      setApplications((current) => current.map((item) => item.id === id ? updated : item))
      setInterviewEditorApplicationId(null)
      return null
    } catch (reason) {
      if (!isCurrentAccount(requestEpoch)) return 'Your account changed. Please reopen the interview schedule.'
      const message = reason instanceof Error ? reason.message : 'An unexpected error occurred.'
      setError(`Could not save interview schedule: ${message}`)
      return message
    }
  }

  async function recordCalendarLaunch(applicationId: string, interviewId: string): Promise<void> {
    const requestEpoch = accountEpoch.current
    if (calendarLaunchLock.current) throw new Error('Another calendar action is being saved. Please wait and retry.')
    calendarLaunchLock.current = true
    setCalendarLaunchPending(true)
    try {
      if (!client) throw new Error('The database is unavailable. Please retry.')
      if (!isCurrentAccount(requestEpoch)) throw new Error('Your account changed. Please retry.')
      const application = applications.find((item) => item.id === applicationId)
      if (!application?.interviews?.some((item) => item.id === interviewId)) throw new Error('Save this interview before opening Google Calendar.')
      const interviews = application.interviews.map((item) => item.id === interviewId
        ? { ...item, googleCalendarOpenedAt: new Date().toISOString() } : item)
      const { data, error: saveError } = await client.from('applications').update({ interviews }).eq('id', applicationId).select(applicationColumns).single()
      if (!isCurrentAccount(requestEpoch)) throw new Error('Your account changed. Please retry.')
      if (saveError || !data) throw new Error(saveError?.message ?? 'Could not save the calendar tracking status. Please retry.')
      const updated = fromRow(data as ApplicationRow)
      setApplications((current) => current.map((item) => item.id === applicationId ? updated : item))
    } finally {
      calendarLaunchLock.current = false
      setCalendarLaunchPending(false)
    }
  }

  async function updateApplication(id: string, application: Omit<Application, 'id'>): Promise<boolean> {
    const requestEpoch = accountEpoch.current
    try {
      if (!client) return false
      if (!isCurrentAccount(requestEpoch)) return false
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
            interview_questions_version: 0,
            skill_extraction_version: 0,
          } : {}),
        })
        .eq('id', id)
        .select(applicationColumns)
        .single()

      if (!isCurrentAccount(requestEpoch)) return false
      if (updateError) {
        setError(`Could not update this application: ${updateError.message}`)
        return false
      }
      const updated = fromRow(data as ApplicationRow)
      setApplications((current) => current.map((item) => item.id === id ? updated : item))
      return true
    } catch (reason) {
      if (!isCurrentAccount(requestEpoch)) return false
      const message = reason instanceof Error ? reason.message : 'An unexpected error occurred.'
      setError(`Could not update this application: ${message}`)
      return false
    }
  }

  async function updateApplicationUrl(id: string, url: string): Promise<boolean> {
    const requestEpoch = accountEpoch.current
    try {
      if (!client) return false
      if (!isCurrentAccount(requestEpoch)) return false
      setError(null)
      const { error: updateError } = await client.from('applications').update({
        url,
        job_description: '',
        skills: [],
        skills_analyzed_at: null,
        skills_source_url: '',
        interview_questions_version: 0,
        skill_extraction_version: 0,
      }).eq('id', id)
      if (!isCurrentAccount(requestEpoch)) return false
      if (updateError) {
        setError(`Could not save the job posting link: ${updateError.message}`)
        return false
      }
      setApplications((current) => current.map((item) => item.id === id ? {
        ...item, url, jobDescription: '', skills: [], skillsAnalyzedAt: null, skillsSourceUrl: '', interviewQuestionsVersion: 0, skillExtractionVersion: 0,
      } : item))
      return true
    } catch (reason) {
      if (!isCurrentAccount(requestEpoch)) return false
      const message = reason instanceof Error ? reason.message : 'An unexpected error occurred.'
      setError(`Could not save the job posting link: ${message}`)
      return false
    }
  }

  async function updateSkillComfortRating(id: string, skillName: string, comfortRating: ComfortRating): Promise<boolean> {
    return updateSkill(id, skillName, (skill) => withComfortRating(skill, comfortRating), 'Could not update skill comfort level')
  }

  async function updateSkill(id: string, skillName: string, updateSkill: (skill: JobSkill) => JobSkill, errorContext: string): Promise<boolean> {
    const requestEpoch = accountEpoch.current
    if (!client) return false
    const lockKey = `${requestEpoch}:${id}`
    if (skillUpdateLocks.current.has(lockKey)) {
      setError('A knowledge level update is already being saved for this application. Please wait and retry.')
      return false
    }
    const application = applications.find((item) => item.id === id)
    if (!application) return false
    const normalizedName = skillName.trim().toLowerCase()
    const skills = (application.skills ?? []).map((skill) => (
      skill.name.trim().toLowerCase() === normalizedName
        ? updateSkill(skill)
        : skill
    ))
    if (!skills.some((skill) => skill.name.trim().toLowerCase() === normalizedName)) return false

    if (!isCurrentAccount(requestEpoch)) return false
    setError(null)
    skillUpdateLocks.current.add(lockKey)
    try {
      const { data, error: updateError } = await client.from('applications')
        .update({ skills })
        .eq('id', id)
        .select(applicationColumns)
        .single()
      if (!isCurrentAccount(requestEpoch)) return false
      if (updateError) {
        setError(`${errorContext}: ${updateError.message}`)
        return false
      }

      const updated = fromRow(data as ApplicationRow)
      setApplications((current) => current.map((item) => item.id === id ? updated : item))
      return true
    } catch (reason) {
      if (!isCurrentAccount(requestEpoch)) return false
      setError(`${errorContext}: ${reason instanceof Error ? reason.message : 'An unexpected error occurred.'}`)
      return false
    } finally {
      skillUpdateLocks.current.delete(lockKey)
    }
  }

  async function deleteApplication(id: string) {
    const requestEpoch = accountEpoch.current
    try {
      if (!client) return
      if (!isCurrentAccount(requestEpoch)) return
      setError(null)
      const { error: deleteError } = await client.from('applications').delete().eq('id', id)
      if (!isCurrentAccount(requestEpoch)) return
      if (deleteError) {
        setError(`Could not delete this application: ${deleteError.message}`)
        return
      }
      setApplications((current) => current.filter((item) => item.id !== id))
    } catch (reason) {
      if (!isCurrentAccount(requestEpoch)) return
      const message = reason instanceof Error ? reason.message : 'An unexpected error occurred.'
      setError(`Could not delete this application: ${message}`)
      return
    }
  }

  async function importLegacyApplications() {
    const requestEpoch = accountEpoch.current
    try {
      if (!client || !userId || legacyApplications.length === 0) return
      setImporting(true)
      if (!isCurrentAccount(requestEpoch)) return
      setError(null)
      const rows = legacyApplications.map((application) => toRow(application, userId))
      const { error: importError } = await client
        .from('applications')
        .upsert(rows, { onConflict: 'id', ignoreDuplicates: true })

      if (!isCurrentAccount(requestEpoch)) return
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
      if (!isCurrentAccount(requestEpoch)) return
      if (reloadError) setError(`Imported, but could not refresh the list: ${reloadError.message}`)
      else setApplications((data ?? []).map((row) => fromRow(row as ApplicationRow)))
    } catch (reason) {
      if (!isCurrentAccount(requestEpoch)) return
      const message = reason instanceof Error ? reason.message : 'An unexpected error occurred.'
      setError(`Could not import your browser-saved applications: ${message}`)
      setImporting(false)
      return
    }
  }

  async function signOut() {
    const requestEpoch = accountEpoch.current
    if (!client) return
    const { error: signOutError } = await client.auth.signOut()
    if (!isCurrentAccount(requestEpoch)) return
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
        <button type="button" className={`nav-item ${activePage === 'interviews' ? 'nav-item-active' : ''}`} aria-current={activePage === 'interviews' ? 'page' : undefined} onClick={() => navigateTo('interviews')}><span className="nav-icon"><CalendarDays size={17} /></span> Interviews <span className="nav-count">{upcomingInterviews.length}</span></button>
        <button type="button" className={`nav-item ${activePage === 'skills' || activePage === 'company-questions' ? 'nav-item-active' : ''}`} aria-current={activePage === 'skills' || activePage === 'company-questions' ? 'page' : undefined} onClick={() => navigateTo('skills')}><span className="nav-icon"><Sparkles size={17} /></span> Skills <span className="nav-count">{applications.reduce((count, item) => count + (item.skillsAnalyzedAt && item.skillsSourceUrl === item.url ? item.skills?.length ?? 0 : 0), 0)}</span></button>
        <div className="sidebar-note">
          <div className="note-icon"><CalendarDays size={16} /></div>
          <strong>One step at a time.</strong>
          <p>Your job search is a project. Keep the next step visible and keep moving.</p>
        </div>
        <div className="sidebar-bottom"><span className="avatar">{session.user.email?.slice(0, 1).toUpperCase() ?? 'C'}</span><div><strong>My job search</strong><small>{session.user.email}</small></div><MoreHorizontal size={18} className="muted-icon" /></div>
      </aside>

      <main className="main-content" id="top">
        <header className="topbar"><span className="breadcrumb">Workspace <span>/</span> {activePage === 'applications' ? 'Applications' : activePage === 'interviews' ? 'Interviews' : activePage === 'company-questions' ? <>Skills <span>/</span> {activeCompany}</> : 'Skills'}</span><button className="sign-out-button" onClick={() => void signOut()}><LogOut size={14} /> Sign out</button></header>
        {error && <div className="storage-message storage-error" role="alert">{error}</div>}
        {notice && <div className="storage-message storage-notice" role="status"><span>{notice}</span><button aria-label="Dismiss notice" onClick={() => setNotice(null)}><X size={15} /></button></div>}
        {activePage === 'interviews' ? <UpcomingInterviewsPage interviews={upcomingInterviews} loading={dataLoading} onOpenApplicationSkills={openApplicationSkills} onRecordLaunch={recordCalendarLaunch} calendarLaunchPending={calendarLaunchPending} />
          : activePage === 'skills' ? <SkillsPage applications={applications} loading={dataLoading} now={agendaNow} onOpenApplication={openApplication} onOpenCompany={openCompanyQuestions} onOpenApplicationSkills={openApplicationSkills} applicationFilterId={activeSkillApplicationId} onClearApplicationFilter={() => navigateTo('skills')} onUpdateSkillComfortRating={updateSkillComfortRating} />
          : activePage === 'company-questions' && activeCompany
            ? <CompanyInterviewQuestionsPage company={activeCompany} applications={applications} onBack={() => navigateTo('skills')} onUpdateSkillComfortRating={updateSkillComfortRating} />
            : <>
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
            <div className="toolbar-actions"><label className="search-box"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search roles..." /></label><label className="sort-control"><span className="sr-only">Sort applications</span><select value={applicationSort} onChange={(event) => setApplicationSort(event.target.value as ApplicationSort)}><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="next-interview">Next interview</option></select></label></div>
          </div>
          {dataLoading ? <div className="empty-state"><p>Loading your applications…</p></div> : visibleApplications.length > 0 ? (
            <div className="table-wrap"><table><thead><tr><th>COMPANY & ROLE</th><th>DATE APPLIED</th><th>STATUS</th><th>NEXT STEP</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>
              {visibleApplications.map((application) => <tr key={application.id}>
                <td><div className="company-cell"><div className="company-logo" aria-hidden="true">{application.company.slice(0, 1).toUpperCase()}</div><button type="button" className="company-info application-open-button" onClick={() => setSelectedApplicationId(application.id)}><strong>{application.company}</strong><span>{application.role}{application.location ? ` · ${application.location}` : ''}</span>{application.skillsAnalyzedAt && application.skillsSourceUrl === application.url && <span className="analysis-status">{application.skills?.length ?? 0} skills analyzed</span>}</button></div></td>
                <td className="date-cell">{formatDate(application.dateApplied)}</td>
                <td><StatusSelect status={application.status} onChange={(status) => void updateStatus(application.id, status)} /></td>
                <td className="next-step-cell">{application.nextStep || <span className="muted-text">Add a reminder</span>}</td>
                <td className="application-actions">
                  <button className="row-menu" aria-label={`Manage interviews for ${application.role} at ${application.company}`} title="Manage interviews" onClick={() => setInterviewEditorApplicationId(application.id)}><CalendarDays size={15} /></button>
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
      {interviewEditorApplication && <InterviewModal
        key={interviewEditorApplication.id}
        application={interviewEditorApplication}
        onClose={() => setInterviewEditorApplicationId(null)}
        onSave={updateInterviews}
        calendarLaunchPending={calendarLaunchPending}
        onRecordLaunch={(interviewId) => recordCalendarLaunch(interviewEditorApplication.id, interviewId)}
      />}
      {selectedApplication && <ApplicationDetailView
        key={selectedApplication.id}
        application={selectedApplication}
        analysis={analysis?.id === selectedApplication.id ? analysis : null}
        onClose={() => { setSelectedApplicationId(null); setAnalysis(null) }}
        onRetry={() => setAnalysisAttempt((attempt) => attempt + 1)}
        onUpdateUrl={updateApplicationUrl}
        onViewSkills={() => { setSelectedApplicationId(null); setAnalysis(null); openApplicationSkills(selectedApplication.id) }}
      />}
    </div>
  )
}

export default App
