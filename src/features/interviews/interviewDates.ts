import type { Application, Interview } from '../../shared/types'

export type UpcomingInterview = Interview & {
  applicationId: string
  company: string
  role: string
  location: string
  timestamp: number
}
export function getInterviewTimestamp(interview: Pick<Interview, 'date' | 'time'>) {
  return new Date(`${interview.date}T${interview.time}`).getTime()
}

export function getUpcomingInterviews(applications: Application[], now: number): UpcomingInterview[] {
  return applications.flatMap((application) => (application.interviews ?? [])
    .map((interview) => ({
      ...interview,
      applicationId: application.id,
      company: application.company,
      role: application.role,
      location: interview.location || application.location,
      timestamp: getInterviewTimestamp(interview),
    }))
    .filter((interview) => isValidInterviewDateTime(interview.date, interview.time) && interview.timestamp >= now))
    .sort((a, b) => a.timestamp - b.timestamp)
}

export function isValidInterviewDateTime(date: string, time: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(time)
  if (!match || !timeMatch) return false
  const parsedDate = new Date(`${date}T${time}`)
  return Number.isFinite(parsedDate.getTime())
    && parsedDate.getFullYear() === Number(match[1])
    && parsedDate.getMonth() + 1 === Number(match[2])
    && parsedDate.getDate() === Number(match[3])
    && parsedDate.getHours() === Number(timeMatch[1])
    && parsedDate.getMinutes() === Number(timeMatch[2])
}

export function formatInterviewDateTime(date: string, time: string) {
  const timestamp = getInterviewTimestamp({ date, time })
  if (!Number.isFinite(timestamp)) return 'Invalid date'
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(timestamp))
}
