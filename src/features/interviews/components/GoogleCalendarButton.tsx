import { useRef, useState } from 'react'
import type { Application, Interview } from '../../../shared/types'
import { googleCalendarUrl } from '../googleCalendar'

type Props = {
  application: Pick<Application, 'id' | 'company' | 'role' | 'location'>
  interview: Interview
  onRecordLaunch: (interviewId: string) => Promise<void>
  disabled?: boolean
}

export default function GoogleCalendarButton({ application, interview, onRecordLaunch, disabled }: Props) {
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [opened, setOpened] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const launching = useRef(false)
  const repeated = opened || !!interview.googleCalendarOpenedAt

  async function openCalendar() {
    if (launching.current || disabled) return
    launching.current = true
    setError('')
    setMessage('')
    let popup: Window | null = null
    try {
      const url = googleCalendarUrl(application, interview)
      popup = window.open('about:blank', '_blank')
      if (!popup) throw new Error('Your browser blocked Calendar. Allow pop-ups for Rolecall and try again.')
      popup.opener = null
      setBusy(true)
      // Persist first, so retries on other devices warn even if Google is closed without saving.
      await onRecordLaunch(interview.id)
      if (popup.closed) throw new Error('The Calendar window was closed. Reopen it and save the event in Google Calendar.')
      popup.location.href = url
      setOpened(true)
      setConfirming(false)
      setMessage('Opened in Google Calendar. Review the details and click Save there; Rolecall cannot confirm whether you saved it.')
    } catch (reason) {
      popup?.close()
      setError(reason instanceof Error ? reason.message : 'Could not open Calendar. Please try again.')
    } finally {
      launching.current = false
      setBusy(false)
    }
  }

  return <div className="calendar-action">
    <button type="button" className="text-button" disabled={disabled || busy} onClick={() => setConfirming(true)}>
      {busy ? 'Opening Calendar…' : repeated ? 'Reopen Google Calendar' : 'Add to Google Calendar'}
    </button>
    {confirming && <div className="calendar-confirmation">
      <p>{repeated
        ? 'This interview was already opened in Google Calendar. Check for an existing event before continuing; saving another draft can create a duplicate.'
        : 'Google will receive the company, role, interview type, date, time, location, meeting link, and notes shown for this interview. Review and save the event in Google Calendar.'}</p>
      <p>No Calendar access is granted to Rolecall. Times use your current device time zone ({Intl.DateTimeFormat().resolvedOptions().timeZone}); interviews without a duration default to 60 minutes. App edits and deletions do not change Calendar events.</p>
      <button type="button" className="text-button" disabled={busy || disabled} onClick={() => void openCalendar()}>{repeated ? 'Open another draft' : 'Continue to Google Calendar'}</button>
      <button type="button" className="text-button" disabled={busy} onClick={() => setConfirming(false)}>Cancel Calendar</button>
    </div>}
    {message && <p role="status">{message}</p>}
    {error && <p role="alert">{error}</p>}
  </div>
}
