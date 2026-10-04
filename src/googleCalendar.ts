import type { Application, Interview } from './types'

export function googleCalendarUrl(application: Pick<Application, 'id' | 'company' | 'role' | 'location'>, interview: Interview): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(interview.date) || !/^\d{2}:\d{2}$/.test(interview.time)) {
    throw new Error('Set a valid interview date and start time before adding it to Calendar.')
  }
  const start = new Date(`${interview.date}T${interview.time}:00`)
  const localDate = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`
  const localTime = `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`
  if (!Number.isFinite(start.getTime()) || localDate !== interview.date || localTime !== interview.time) {
    throw new Error('This interview time is invalid in your current time zone. Update the schedule first.')
  }
  const duration = interview.durationMinutes ?? 60
  if (!Number.isInteger(duration) || duration < 15 || duration > 480) throw new Error('Choose a duration between 15 and 480 minutes.')
  if (interview.meetingLink) {
    let link: URL
    try { link = new URL(interview.meetingLink) } catch { throw new Error('Use a complete HTTPS or HTTP meeting link.') }
    if (!['https:', 'http:'].includes(link.protocol)) throw new Error('Use a complete HTTPS or HTTP meeting link.')
  }
  const stamp = (date: Date) => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
  const details = [
    `Company: ${application.company}`, `Role: ${application.role}`,
    interview.type && `Interview type: ${interview.type}`,
    interview.meetingLink && `Meeting link: ${interview.meetingLink}`,
    interview.notes && `Notes: ${interview.notes}`,
    `Rolecall reference: ${application.id}/${interview.id}`,
    'Edits and deletions in Rolecall do not update this event. Manage the event in Google Calendar.',
  ].filter(Boolean).join('\n')
  const url = new URL('https://calendar.google.com/calendar/r/eventedit')
  url.search = new URLSearchParams({
    action: 'TEMPLATE',
    text: `${application.company} — ${application.role}: ${interview.type || 'Interview'}`,
    dates: `${stamp(start)}/${stamp(new Date(start.getTime() + duration * 60_000))}`,
    details,
    location: interview.location || interview.meetingLink || application.location,
  }).toString()
  return url.toString()
}
