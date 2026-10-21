import { useEffect, useRef, useState } from 'react'
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
  const operationPending = useRef(false)
  const [savedMessage, setSavedMessage] = useState('')
  const saving = scheduleSaving || calendarSaving || calendarLaunchPending

  useEffect(() => {
    setInterviews(application.interviews ?? [])
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

  async function submitInterview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (operationPending.current || saving) return
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
    if (editingId && !interviews.some((item) => item.id === editingId)) {
      setError('This interview was deleted elsewhere. Copy your draft or clear it to add a new interview.')
      return
    }
    const interview: Interview = {
      ...interviews.find((item) => item.id === editingId),
      type: type === 'Other' ? customType.trim() || 'Other' : type.trim(), location: location.trim(), meetingLink: meetingLink.trim(), durationMinutes: duration,
      id: editingId ?? crypto.randomUUID(),
      date,
      time,
      notes: notes.trim(),
    }
    const next = editingId
      ? interviews.map((item) => item.id === editingId ? interview : item)
      : [...interviews, interview]
    if (await persistInterviews(next, editingId ? 'Interview updated.' : 'Interview added.')) resetForm()
  }

  async function persistInterviews(next: Interview[], message: string): Promise<boolean> {
    if (operationPending.current || saving) return false
    operationPending.current = true
    setScheduleSaving(true)
    setSavedMessage('')
    setError(null)
    try {
      const saveError = await onSave(application.id, next)
      if (saveError) throw new Error(saveError)
      setInterviews(next)
      setSavedMessage(message)
      return true
    } catch (reason) {
      setError(`Could not save interview changes: ${reason instanceof Error ? reason.message : 'Please try again.'}`)
      return false
    } finally {
      operationPending.current = false
      setScheduleSaving(false)
    }
  }

  async function deleteInterview(id: string) {
    if (await persistInterviews(interviews.filter((item) => item.id !== id), 'Interview deleted.')) {
      if (editingId === id) resetForm()
    }
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

  function closeEditor() {
    if (!operationPending.current && !saving) onClose()
  }

  const sortedInterviews = [...interviews].sort((a, b) => getInterviewTimestamp(a) - getInterviewTimestamp(b))

  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) closeEditor() }}>
    <section className="modal" role="dialog" aria-modal="true" aria-labelledby="interview-modal-title">
      <header className="modal-header">
        <div><div className="eyebrow">INTERVIEW SCHEDULE</div><h2 id="interview-modal-title">{application.company} — {application.role}</h2></div>
        <button className="icon-button" aria-label="Close" onClick={closeEditor} disabled={saving}><X size={18} /></button>
      </header>

      <div className="interview-editor-content" style={{ display: 'grid', gap: '16px' }}>
        <p className="muted-text" style={{ margin: 0 }}>Adding, updating, or deleting an interview saves it immediately. Edits and deletions here do not update Google Calendar; manage existing events there.</p>
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
                  <GoogleCalendarButton application={application} interview={interview} disabled={saving || editingId === interview.id} onRecordLaunch={async (id) => {
                    if (operationPending.current || saving) throw new Error('Wait for the interview changes to finish saving.')
                    operationPending.current = true
                    setCalendarSaving(true)
                    try {
                      await onRecordLaunch(id)
                    } finally {
                      operationPending.current = false
                      setCalendarSaving(false)
                    }
                  }} />
                  <button type="button" className="text-button" onClick={() => editInterview(interview)} disabled={saving}>Edit</button>
                  <button type="button" className="text-button danger" onClick={() => void deleteInterview(interview.id)} disabled={saving}>Delete</button>
                </div>
              </div>
            ))}
        </div>

        <form onSubmit={submitInterview} style={{ display: 'grid', gap: '12px' }}>
          {scheduleSaving && <p role="status" className="muted-text">Saving interview changes…</p>}
          {savedMessage && !saving && <p role="status" className="muted-text">{savedMessage}</p>}
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
            <button className="primary-button" type="submit" disabled={saving}>{scheduleSaving ? 'Saving…' : editingId ? 'Update interview' : 'Add interview'}</button>
          </div>
        </form>
      </div>

      <div className="modal-actions interview-editor-footer">
        <button type="button" className="text-button" onClick={closeEditor} disabled={saving}>Done</button>
      </div>
    </section>
  </div>
}
