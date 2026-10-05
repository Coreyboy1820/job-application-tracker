import { describe, expect, it } from 'vitest'
import { googleCalendarUrl } from './googleCalendar'
import type { Interview } from './types'

const application = { id: 'job-1', company: 'Acme & Co', role: 'Engineer / Lead', location: 'Remote' }
const interview: Interview = { id: 'interview-1', date: '2026-06-15', time: '14:30', notes: 'Discuss C++ & salary', type: 'Technical', location: 'Office, Room 2', meetingLink: 'https://meet.example.com/a?x=1&y=2', durationMinutes: 90 }
const stamp = (date: Date) => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')

describe('Google Calendar event draft', () => {
  it('encodes every available detail and converts device-local time to UTC', () => {
    const url = new URL(googleCalendarUrl(application, interview))
    expect(url.origin + url.pathname).toBe('https://calendar.google.com/calendar/r/eventedit')
    expect(url.searchParams.get('text')).toBe('Acme & Co — Engineer / Lead: Technical')
    expect(url.searchParams.get('location')).toBe('Office, Room 2')
    const start = new Date('2026-06-15T14:30:00')
    expect(url.searchParams.get('dates')).toBe(`${stamp(start)}/${stamp(new Date(start.getTime() + 90 * 60_000))}`)
    const details = url.searchParams.get('details')!
    for (const value of ['Acme & Co', 'Engineer / Lead', 'Technical', interview.meetingLink!, interview.notes, 'job-1/interview-1', 'Edits and deletions']) expect(details).toContain(value)
  })

  it('defaults legacy interviews to an hour and handles midnight and year rollover', () => {
    const legacy = { id: 'old', date: '2026-12-31', time: '23:30', notes: '' }
    const url = new URL(googleCalendarUrl(application, legacy))
    const start = new Date('2026-12-31T23:30:00')
    const end = new Date(start.getTime() + 60 * 60_000)
    expect(end.getFullYear()).toBe(2027)
    expect(url.searchParams.get('dates')).toBe(`${stamp(start)}/${stamp(end)}`)
    expect(url.searchParams.get('location')).toBe('Remote')
    expect(url.searchParams.get('text')).toContain(': Interview')
  })

  it('uses a meeting link as the location when no interview location is provided', () => {
    expect(new URL(googleCalendarUrl(application, { ...interview, location: '' })).searchParams.get('location')).toBe(interview.meetingLink)
  })

  it.skipIf(Intl.DateTimeFormat().resolvedOptions().timeZone !== 'America/Los_Angeles')('rejects a nonexistent local time during the spring daylight-saving transition', () => {
    expect(() => googleCalendarUrl(application, { ...interview, date: '2026-03-08', time: '02:30' })).toThrow('invalid in your current time zone')
  })

  it.skipIf(Intl.DateTimeFormat().resolvedOptions().timeZone !== 'America/Los_Angeles')('uses elapsed duration when an interview crosses a daylight-saving transition', () => {
    const url = new URL(googleCalendarUrl(application, { ...interview, date: '2026-03-08', time: '01:30', durationMinutes: 60 }))
    expect(url.searchParams.get('dates')).toBe('20260308T093000Z/20260308T103000Z')
  })

  it.each([{ date: '2026-02-30' }, { date: '2026-13-01' }, { date: '' }, { time: '24:30' }, { time: '9:00' }, { time: '' }, { durationMinutes: 0 }, { durationMinutes: 481 }, { durationMinutes: 30.5 }, { meetingLink: 'javascript:alert(1)' }, { meetingLink: 'meet.example.com' }])('rejects invalid schedule or unsafe meeting URL: %j', (override) => {
    expect(() => googleCalendarUrl(application, { ...interview, ...override })).toThrow()
  })
})
