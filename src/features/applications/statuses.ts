import type { Status } from '../../shared/types'

export const statuses: Status[] = ['Rejected', 'Applied', 'Interviewing', 'Offer']

export const statusPriority: Record<Status, number> = { Rejected: 0, Applied: 1, Interviewing: 2, Offer: 3 }
