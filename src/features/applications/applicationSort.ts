import type { Application } from '../../shared/types'
import { getInterviewTimestamp, isValidInterviewDateTime } from '../interviews/interviewDates'

import { statusPriority } from './statuses'

export type ApplicationSort = 'status' | 'saved' | 'newest' | 'oldest' | 'next-interview'

export function nextInterviewTimestamp(application: Application, now: number): number {
  return (application.interviews ?? []).reduce((soonest, interview) => {
    if (!isValidInterviewDateTime(interview.date, interview.time)) return soonest
    const timestamp = getInterviewTimestamp(interview)
    return timestamp >= now ? Math.min(soonest, timestamp) : soonest
  }, Number.POSITIVE_INFINITY)
}

export function sortApplications(applications: readonly Application[], sort: ApplicationSort, now: number): Application[] {
  if (sort === 'status') return [...applications].sort((a, b) => statusPriority[a.status] - statusPriority[b.status])
  if (sort === 'saved') return [...applications]
  if (sort === 'next-interview') {
    const nextTimes = new Map(applications.map((application) => [application.id, nextInterviewTimestamp(application, now)]))
    return [...applications].sort((a, b) => nextTimes.get(a.id)! - nextTimes.get(b.id)!)
  }
  return [...applications].sort((a, b) => sort === 'newest'
    ? b.dateApplied.localeCompare(a.dateApplied)
    : a.dateApplied.localeCompare(b.dateApplied))
}
