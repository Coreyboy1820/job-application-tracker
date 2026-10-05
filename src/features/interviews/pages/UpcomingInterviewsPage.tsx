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
  return <>
    <section className="page-heading">
      <div><div className="eyebrow">YOUR SCHEDULE</div><h1>Upcoming interviews</h1><p className="page-subtitle">Your next conversations, in date and time order.</p></div>
    </section>
    <section className="list-panel upcoming-interviews-panel">
      <div className="panel-heading"><div><h2>Interview agenda</h2><p>Open an interview to view skills for its application.</p></div><span className="cloud-badge">{interviews.length} upcoming</span></div>
      {loading ? <div className="empty-state"><p>Loading your interviews…</p></div> : interviews.length > 0 ? (
        <div className="upcoming-interview-list">
          {interviews.map((interview) => (
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
      ) : <div className="empty-state"><p>{loading ? 'Loading your interviews…' : 'No upcoming interviews. Schedule one from an application to see it here.'}</p></div>}
    </section>
  </>
}
