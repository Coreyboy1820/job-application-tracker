import type { Application, Interview, Status } from '../../../shared/types'
import { isValidInterviewDateTime } from '../../interviews/interviewDates'
import { statuses } from '../statuses'
import { loadApplications as loadLocalApplications } from './legacyStorage'

function isInterview(value: unknown): value is Interview {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<Interview>
  return typeof candidate.id === 'string'
    && typeof candidate.date === 'string'
    && typeof candidate.time === 'string'
    && typeof candidate.notes === 'string'
    && isValidInterviewDateTime(candidate.date, candidate.time)
}

// Keep the previous browser-only entries available so the user can copy them
// into their new account after the database is set up.
export async function readLegacyApplications(): Promise<Application[]> {
  try {
    // loadApplications includes records already migrated from localStorage into IndexedDB.
    const saved = await loadLocalApplications()
    return saved.flatMap((value): Application[] => {
      if (!value || typeof value !== 'object') return []
      const item = value as Partial<Application>
      if (typeof item.company !== 'string' || !item.company.trim()) return []
      if (typeof item.role !== 'string' || !item.role.trim()) return []
      const status = statuses.includes(item.status as Status) ? item.status as Status : 'Applied'
      const id = typeof item.id === 'string' && /^[0-9a-f-]{36}$/i.test(item.id) ? item.id : crypto.randomUUID()
      return [{
        id,
        company: item.company.trim(),
        role: item.role.trim(),
        location: typeof item.location === 'string' ? item.location : '',
        dateApplied: typeof item.dateApplied === 'string' ? item.dateApplied : new Date().toISOString().slice(0, 10),
        status,
        url: typeof item.url === 'string' ? item.url : '',
        notes: typeof item.notes === 'string' ? item.notes : '',
        nextStep: typeof item.nextStep === 'string' ? item.nextStep : '',
        interviews: Array.isArray(item.interviews) ? item.interviews.filter(isInterview) : [],
      }]
    })
  } catch {
    return []
  }
}
