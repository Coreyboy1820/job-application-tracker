import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { X } from 'lucide-react'
import type { Application, Interview } from '../../../shared/types'
import { interviewTypes, getInterviewTypeGroup } from '../interviewTypes'
import GoogleCalendarButton from './GoogleCalendarButton'
import { formatInterviewDateTime, getInterviewTimestamp, isValidInterviewDateTime } from '../interviewDates'

export default function InterviewModal({ application, onClose, onSave, onRecordLaunch, calendarLaunchPending }: {
  application: Application
  onClose: () => void
  onSave: (applicationId: string, interviews: Interview[]) => Promise<string | null>
  onRecordLaunch: (interviewId: string) => Promise<void>
  calendarLaunchPending: boolean
}) {
  const [interviews, setInterviews] = useState<Interview[]>(application.interviews ?? [])
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [notes, setNotes] = useState('')
  const [type, setType] = useState('')
  const [customType, setCustomType] = useState('')
  const [location, setLocation] = useState('')
  const [meetingLink, setMeetingLink] = useState('')
  const [durationMinutes, setDurationMinutes] = useState('60')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [scheduleSaving, setScheduleSaving] = useState(false)
  const [calendarSaving, setCalendarSaving] = useState(false)
  const saving = scheduleSaving || calendarSaving || calendarLaunchPending

  useEffect(() => {
    setInterviews((current) => current.map((interview) => {
      const persisted = application.interviews?.find((item) => item.id === interview.id)
      return persisted?.googleCalendarOpenedAt ? { ...interview, googleCalendarOpenedAt: persisted.googleCalendarOpenedAt } : interview
    }))
  }, [application.interviews])

  function resetForm() {
    setDate('')
    setTime('')
    setNotes('')
    setType('')
    setCustomType('')
    setLocation('')
    setMeetingLink('')
    setDurationMinutes('60')
    setEditingId(null)
    setError(null)
  }

  function submitInterview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!isValidInterviewDateTime(date, time)) {
      setError('Please choose a valid interview date and start time.')
      return
    }

    const duration = Number(durationMinutes)
    if (!Number.isInteger(duration) || duration < 15 || duration > 480) {
      setError('Choose a duration between 15 and 480 whole minutes.')
      return
    }
    if (meetingLink.trim()) {
      try {
        const link = new URL(meetingLink.trim())
        if (!['http:', 'https:'].includes(link.protocol)) throw new Error('Unsupported URL')
      } catch {
        setError('Enter a valid meeting link starting with http:// or https://.')
        return
      }
    }
    const interview: Interview = {
      ...interviews.find((item) => item.id === editingId),
      type: type === 'Other' ? customType.trim() || 'Other' : type.trim(), location: location.trim(), meetingLink: meetingLink.trim(), durationMinutes: duration,
      id: editingId ?? crypto.randomUUID(),
      date,
      time,
      notes: notes.trim(),
    }
    setInterviews((current) => editingId
      ? current.map((item) => item.id === editingId ? interview : item)
      : [...current, interview])
    resetForm()
  }

  function editInterview(interview: Interview) {
    setEditingId(interview.id)
    setDate(interview.date)
    setTime(interview.time)
    setNotes(interview.notes)
    const group = getInterviewTypeGroup(interview.type)
    setType(group === 'Not specified' ? '' : group === 'Other' ? 'Other' : interview.type ?? '')
    setCustomType(group === 'Other' ? interview.type ?? '' : '')
    setLocation(interview.location ?? '')
    setMeetingLink(interview.meetingLink ?? '')
    setDurationMinutes(String(interview.durationMinutes ?? 60))
    setError(null)
  }

  async function saveSchedule() {
    if (editingId || date || time || notes.trim() || type.trim() || location.trim() || meetingLink.trim() || durationMinutes !== '60') {
      setError('Add or update the interview draft before saving the schedule.')
      return
    }

    setScheduleSaving(true)
    setError(null)
    const saveError = await onSave(application.id, interviews)
    setScheduleSaving(false)
    if (saveError) setError(`Could not save interview schedule: ${saveError}`)
    else onClose()
  }

  const sortedInterviews = [...interviews].sort((a, b) => getInterviewTimestamp(a) - getInterviewTimestamp(b))

  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) onClose() }}>
    <section className="modal" role="dialog" aria-modal="true" aria-labelledby="interview-modal-title">
      <header className="modal-header">
        <div><div className="eyebrow">INTERVIEW SCHEDULE</div><h2 id="interview-modal-title">{application.company} — {application.role}</h2></div>
        <button className="icon-button" aria-label="Close" onClick={onClose} disabled={saving}><X size={18} /></button>
      </header>

      <div style={{ display: 'grid', gap: '16px' }}>
        <p className="muted-text" style={{ margin: 0 }}>Save interview changes before adding them to Google Calendar. Edits and deletions here do not update Google Calendar; manage existing events there.</p>
        <div style={{ display: 'grid', gap: '8px' }}>
          {sortedInterviews.length === 0
            ? <p className="muted-text" style={{ margin: 0 }}>No interviews scheduled yet.</p>
            : sortedInterviews.map((interview) => (
              <div key={interview.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px', background: '#faf9ff', border: '1px solid #e8e5f8', borderRadius: '8px', padding: '10px 12px' }}>
                <div>
                  <strong>{formatInterviewDateTime(interview.date, interview.time)}</strong>
                  <div className="muted-text">{[interview.type, `${interview.durationMinutes ?? 60} minutes`, interview.location].filter(Boolean).join(' · ')}</div>
                  {interview.meetingLink && <div className="muted-text" style={{ overflowWrap: 'anywhere' }}>{interview.meetingLink}</div>}
                  {interview.notes && <div style={{ fontSize: '11px', color: '#6e7082', marginTop: '3px' }}>{interview.notes}</div>}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxWidth: '100%' }}>
                  <GoogleCalendarButton application={application} interview={interview} disabled={saving || editingId === interview.id || JSON.stringify({ ...interview, googleCalendarOpenedAt: undefined }) !== JSON.stringify({ ...application.interviews?.find((item) => item.id === interview.id), googleCalendarOpenedAt: undefined })} onRecordLaunch={async (id) => {
                    setCalendarSaving(true)
                    try {
                      await onRecordLaunch(id)
                      setInterviews((current) => current.map((item) => item.id === id ? { ...item, googleCalendarOpenedAt: new Date().toISOString() } : item))
                    } finally {
                      setCalendarSaving(false)
                    }
                  }} />
                  <button type="button" className="text-button" onClick={() => editInterview(interview)} disabled={saving}>Edit</button>
                  <button type="button" className="text-button danger" onClick={() => {
                    setInterviews((current) => current.filter((item) => item.id !== interview.id))
                    if (editingId === interview.id) resetForm()
                  }} disabled={saving}>Delete</button>
                </div>
              </div>
            ))}
        </div>

        <form onSubmit={submitInterview} style={{ display: 'grid', gap: '12px' }}>
          {error && <div className="storage-message storage-error" role="alert">{error}</div>}
          <div className="form-grid">
            <label className="field"><span>Date <i>*</i></span><input type="date" required value={date} onChange={(event) => setDate(event.target.value)} disabled={saving} /></label>
            <label className="field"><span>Start time <i>*</i></span><input type="time" required value={time} onChange={(event) => setTime(event.target.value)} disabled={saving} /></label>
            <label className="field"><span>Interview type</span><select value={type} onChange={(event) => {
              setType(event.target.value)
              setCustomType('')
            }} disabled={saving}>
              <option value="">Not specified</option>
              {interviewTypes.map((option) => <option key={option} value={option}>{option}</option>)}
              {type && type !== 'Other' && !interviewTypes.some((option) => option === type) && <option value={type}>{type}</option>}
              <option value="Other">Other</option>
            </select></label>
            {type === 'Other' && <label className="field"><span>Custom interview type</span><input value={customType} onChange={(event) => setCustomType(event.target.value)} placeholder="Optional custom type" disabled={saving} /></label>}
            <label className="field"><span>Duration (minutes)</span><input type="number" min={15} max={480} step={1} required value={durationMinutes} onChange={(event) => setDurationMinutes(event.target.value)} disabled={saving} /></label>
            <label className="field field-full"><span>Interview location</span><input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Optional office or room" disabled={saving} /></label>
            <label className="field field-full"><span>Meeting link</span><input value={meetingLink} onChange={(event) => setMeetingLink(event.target.value)} placeholder="https://…" disabled={saving} /></label>
            <label className="field field-full"><span>Notes</span><textarea rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional context for this round" disabled={saving} /></label>
          </div>
          <div className="modal-actions">
            <button type="button" className="text-button" onClick={resetForm} disabled={saving || (!date && !time && !notes && !type && !location && !meetingLink && durationMinutes === '60' && !editingId)}>Clear</button>
            <button className="primary-button" type="submit" disabled={saving}>{editingId ? 'Update interview' : 'Add interview'}</button>
          </div>
        </form>
      </div>

      <div className="modal-actions" style={{ marginTop: '18px' }}>
        <button type="button" className="text-button" onClick={onClose} disabled={saving}>Cancel</button>
        <button className="primary-button" type="button" onClick={() => void saveSchedule()} disabled={saving}>{saving ? 'Saving…' : 'Save schedule'}</button>
      </div>
    </section>
  </div>
}
