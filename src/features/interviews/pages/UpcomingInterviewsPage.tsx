import { useState } from 'react'
import '../interviews.css'
import { getInterviewTypeGroup, interviewTypes } from '../interviewTypes'
import { ArrowRight, CalendarDays } from 'lucide-react'
import GoogleCalendarButton from '../components/GoogleCalendarButton'
import { formatInterviewDateTime } from '../interviewDates'
import type { UpcomingInterview } from '../interviewDates'

export default function UpcomingInterviewsPage({
  interviews,
  loading,
  onOpenApplicationSkills,
  onRecordLaunch,
  calendarLaunchPending,
}: {
  interviews: UpcomingInterview[]
  loading: boolean
  onOpenApplicationSkills: (id: string) => void
  onRecordLaunch: (applicationId: string, interviewId: string) => Promise<void>
  calendarLaunchPending: boolean
}) {
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const filteredInterviews = selectedTypes.length === 0 ? interviews : interviews.filter((interview) => selectedTypes.includes(getInterviewTypeGroup(interview.type)))

  return <>
    <section className="page-heading">
      <div><div className="eyebrow">YOUR SCHEDULE</div><h1>Upcoming interviews</h1><p className="page-subtitle">Your next conversations, in date and time order.</p></div>
    </section>
    <section className="list-panel upcoming-interviews-panel">
      <div className="panel-heading"><div><h2>Interview agenda</h2><p>Open an interview to view skills for its application.</p></div><span className="cloud-badge">{filteredInterviews.length} upcoming</span></div>
      <fieldset className="interview-type-filters">
        <legend>Filter by interview type</legend>
        <div className="interview-type-filter-options">
          {[...interviewTypes, 'Other', 'Not specified'].map((type) => <label key={type} className="interview-type-filter-option">
            <input type="checkbox" checked={selectedTypes.includes(type)} onChange={(event) => setSelectedTypes((current) => event.target.checked ? [...current, type] : current.filter((item) => item !== type))} /> {type}
          </label>)}
          <button type="button" className="text-button interview-type-filter-clear" disabled={selectedTypes.length === 0} onClick={() => setSelectedTypes([])}>Clear filters</button>
        </div>
      </fieldset>
      {loading ? <div className="empty-state"><p>Loading your interviews…</p></div> : filteredInterviews.length > 0 ? (
        <div className="upcoming-interview-list">
          {filteredInterviews.map((interview) => (
            <div key={`${interview.applicationId}-${interview.id}`} className="calendar-agenda-row">
            <button
              type="button"
              className="upcoming-interview"
              onClick={() => onOpenApplicationSkills(interview.applicationId)}
              aria-label={`View skills for ${interview.role} at ${interview.company}`}
            >
              <span className="upcoming-interview-date"><CalendarDays size={17} /><time dateTime={`${interview.date}T${interview.time}`}>{formatInterviewDateTime(interview.date, interview.time)}</time></span>
              <span className="upcoming-interview-details">
                <strong>{interview.company}</strong>
                <span>{interview.role}{interview.location ? ` · ${interview.location}` : ''}</span>
                <span>{[interview.type, `${interview.durationMinutes ?? 60} minutes`].filter(Boolean).join(' · ')}</span>
                {interview.meetingLink && <span className="upcoming-interview-notes" style={{ overflowWrap: 'anywhere' }}>{interview.meetingLink}</span>}
                {interview.notes && <span className="upcoming-interview-notes">{interview.notes}</span>}
              </span>
              <ArrowRight size={16} className="upcoming-interview-arrow" />
            </button>
            <GoogleCalendarButton disabled={calendarLaunchPending} application={{ id: interview.applicationId, company: interview.company, role: interview.role, location: interview.location }} interview={interview} onRecordLaunch={(id) => onRecordLaunch(interview.applicationId, id)} />
            </div>
          ))}
        </div>
      ) : <div className="empty-state"><p>{interviews.length > 0 ? 'No interviews match the selected types.' : 'No upcoming interviews. Schedule one from an application to see it here.'}</p></div>}
    </section>
  </>
}
