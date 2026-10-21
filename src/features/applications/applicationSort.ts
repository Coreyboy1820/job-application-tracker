import type { Application } from '../../shared/types'
import { getInterviewTimestamp, isValidInterviewDateTime } from '../interviews/interviewDates'

import { statusPriority } from './statuses'

export type ApplicationSort = 'status' | 'status-desc' | 'saved' | 'newest' | 'oldest'
  | 'next-interview' | 'next-interview-desc' | 'company' | 'company-desc'
  | 'role' | 'role-desc' | 'next-step' | 'next-step-desc'

export type ApplicationSortColumn = 'company' | 'role' | 'date-applied' | 'status' | 'next-interview' | 'next-step'

type SortDirection = 'ascending' | 'descending'

const columnSorts: Record<ApplicationSortColumn, readonly [ApplicationSort, ApplicationSort]> = {
  company: ['company', 'company-desc'],
  role: ['role', 'role-desc'],
  'date-applied': ['oldest', 'newest'],
  status: ['status', 'status-desc'],
  'next-interview': ['next-interview', 'next-interview-desc'],
  'next-step': ['next-step', 'next-step-desc'],
}

export function getApplicationSortState(sort: ApplicationSort): { column: ApplicationSortColumn, direction: SortDirection } | null {
  for (const column of Object.keys(columnSorts) as ApplicationSortColumn[]) {
    const [ascending, descending] = columnSorts[column]
    if (sort === ascending) return { column, direction: 'ascending' }
    if (sort === descending) return { column, direction: 'descending' }
  }
  return null
}

export function toggleApplicationSort(current: ApplicationSort, column: ApplicationSortColumn): ApplicationSort {
  const [ascending, descending] = columnSorts[column]
  return current === ascending ? descending : ascending
}

function compareText(a: string, b: string): number {
  return a.localeCompare(b, undefined, { sensitivity: 'base' })
}

export function nextInterviewTimestamp(application: Application, now: number): number {
  return (application.interviews ?? []).reduce((soonest, interview) => {
    if (!isValidInterviewDateTime(interview.date, interview.time)) return soonest
    const timestamp = getInterviewTimestamp(interview)
    return timestamp >= now ? Math.min(soonest, timestamp) : soonest
  }, Number.POSITIVE_INFINITY)
}

export function sortApplications(applications: readonly Application[], sort: ApplicationSort, now: number): Application[] {
  const state = getApplicationSortState(sort)
  if (!state) return [...applications]
  const direction = state.direction === 'ascending' ? 1 : -1
  const nextTimes = state.column === 'next-interview'
    ? new Map(applications.map((application) => [application, nextInterviewTimestamp(application, now)]))
    : null

  return [...applications].sort((a, b) => {
    switch (state.column) {
      case 'company':
        return direction * (compareText(a.company, b.company) || compareText(a.role, b.role))
      case 'role':
        return direction * (compareText(a.role, b.role) || compareText(a.company, b.company))
      case 'date-applied':
        return direction * a.dateApplied.localeCompare(b.dateApplied)
      case 'status':
        return direction * (statusPriority[a.status] - statusPriority[b.status])
      case 'next-interview': {
        const aTime = nextTimes!.get(a)!
        const bTime = nextTimes!.get(b)!
        if (aTime === bTime) return 0
        if (aTime === Number.POSITIVE_INFINITY) return 1
        if (bTime === Number.POSITIVE_INFINITY) return -1
        return direction * (aTime - bTime)
      }
      case 'next-step': {
        const aStep = a.nextStep.trim()
        const bStep = b.nextStep.trim()
        if (!aStep && !bStep) return 0
        if (!aStep) return 1
        if (!bStep) return -1
        return direction * compareText(aStep, bStep)
      }
    }
  })
}
