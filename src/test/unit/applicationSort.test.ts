import { describe, expect, it } from 'vitest'
import { getApplicationSortState, nextInterviewTimestamp, sortApplications, toggleApplicationSort, toggleApplicationSortStack } from '../../features/applications/applicationSort'
import type { ApplicationSort, ApplicationSortColumn } from '../../features/applications/applicationSort'
import type { Application, Interview } from '../../shared/types'

const now = new Date('2026-10-05T12:00').getTime()
function application(id: string, dateApplied: string, interviews: Interview[] = []): Application {
  return { id, company: id, role: 'Engineer', location: '', dateApplied, status: 'Applied', url: '', notes: '', nextStep: '', interviews }
}
const interview = (id: string, date: string, time: string): Interview => ({ id, date, time, notes: '' })
const rows = [
  application('none', '2026-10-05'),
  application('later', '2026-10-04', [interview('1', '2026-10-07', '09:00'), interview('2', '2026-10-06', '14:00')]),
  application('past', '2026-10-03', [interview('3', '2026-10-04', '09:00')]),
  application('soon', '2026-10-02', [interview('4', '2026-10-05', '13:00')]),
]
describe('application next-interview sorting', () => {
  it('sorts by status priority, retaining input order for ties without mutating records', () => {
    const input: Application[] = [
      { ...rows[0], status: 'Offer' },
      { ...rows[1], status: 'Applied' },
      { ...rows[2], status: 'Rejected' },
      { ...rows[3], status: 'Interviewing' },
      { ...rows[0], id: 'applied-tie', status: 'Applied' },
    ]
    const original = [...input]
    expect(sortApplications(input, 'status', now).map((row) => row.id)).toEqual(['past', 'later', 'applied-tie', 'soon', 'none'])
    expect(input).toEqual(original)
  })

  it('uses the soonest valid future interview and puts applications without one last', () => {
    expect(sortApplications(rows, 'next-interview', now).map((row) => row.id)).toEqual(['soon', 'later', 'none', 'past'])
    expect(rows.map((row) => row.id)).toEqual(['none', 'later', 'past', 'soon'])
  })
  it('ignores invalid dates and times and includes an interview starting now', () => {
    const row = application('invalid', '', [interview('1', '2026-02-30', '09:00'), interview('2', '2026-10-05', '25:00')])
    expect(nextInterviewTimestamp(row, now)).toBe(Number.POSITIVE_INFINITY)
    row.interviews!.push(interview('3', '2026-10-05', '12:00'))
    expect(nextInterviewTimestamp(row, now)).toBe(now)
  })
  it('retains saved order for tied interview times and missing interviews', () => {
    const tie = application('tie', '', [interview('tie', '2026-10-05', '13:00')])
    expect(sortApplications([rows[3], tie, rows[0], rows[2]], 'next-interview', now).map((row) => row.id)).toEqual(['soon', 'tie', 'none', 'past'])
  })
  it('retains date sort modes and the original Skills order', () => {
    expect(sortApplications(rows, 'oldest', now).map((row) => row.id)).toEqual(['soon', 'past', 'later', 'none'])
    expect(sortApplications(rows, 'newest', now).map((row) => row.id)).toEqual(['none', 'later', 'past', 'soon'])
    expect(sortApplications(rows, 'saved', now)).toEqual(rows)
  })
  it('moves a finished interview behind applications that still have future interviews', () => {
    const afterFirst = new Date('2026-10-05T13:01').getTime()
    expect(sortApplications(rows, 'next-interview', afterFirst).map((row) => row.id)).toEqual(['later', 'none', 'past', 'soon'])
  })
})


describe('application column sorting', () => {
  const columnModes: [ApplicationSortColumn, ApplicationSort, ApplicationSort][] = [
    ['company', 'company', 'company-desc'],
    ['role', 'role', 'role-desc'],
    ['date-applied', 'oldest', 'newest'],
    ['status', 'status', 'status-desc'],
    ['next-interview', 'next-interview', 'next-interview-desc'],
    ['next-step', 'next-step', 'next-step-desc'],
  ]

  it.each(columnModes)('toggles %s in both directions and starts a new column ascending', (column, ascending, descending) => {
    expect(toggleApplicationSort('saved', column)).toBe(ascending)
    expect(toggleApplicationSort(ascending, column)).toBe(descending)
    expect(toggleApplicationSort(descending, column)).toBe(ascending)
    expect(getApplicationSortState(ascending)).toEqual({ column, direction: 'ascending' })
    expect(getApplicationSortState(descending)).toEqual({ column, direction: 'descending' })
    const otherMode = column === 'company' ? 'role-desc' : 'company-desc'
    expect(toggleApplicationSort(otherMode, column)).toBe(ascending)
  })

  it('leaves saved order without an active column', () => {
    expect(getApplicationSortState('saved')).toBeNull()
    expect(sortApplications(rows, 'saved', now)).not.toBe(rows)
  })

  const textRows: Application[] = [
    { ...rows[0], id: 'zebra', company: 'Zebra', role: 'Analyst' },
    { ...rows[0], id: 'beta', company: 'acme', role: 'Developer' },
    { ...rows[0], id: 'alpha', company: 'ACME', role: 'analyst' },
    { ...rows[0], id: 'tie', company: 'Acme', role: 'Analyst' },
  ]

  it('sorts company ignoring case, breaks ties by role, and preserves equal records', () => {
    expect(sortApplications(textRows, 'company', now).map((row) => row.id)).toEqual(['alpha', 'tie', 'beta', 'zebra'])
    expect(sortApplications(textRows, 'company-desc', now).map((row) => row.id)).toEqual(['zebra', 'beta', 'alpha', 'tie'])
    expect(textRows.map((row) => row.id)).toEqual(['zebra', 'beta', 'alpha', 'tie'])
  })

  it('sorts role independently, breaking ties by company in both directions', () => {
    expect(sortApplications(textRows, 'role', now).map((row) => row.id)).toEqual(['alpha', 'tie', 'zebra', 'beta'])
    expect(sortApplications(textRows, 'role-desc', now).map((row) => row.id)).toEqual(['beta', 'zebra', 'alpha', 'tie'])
  })

  it('reverses status priority while retaining equal-status order', () => {
    const input: Application[] = [
      { ...rows[0], status: 'Applied' },
      { ...rows[1], status: 'Offer' },
      { ...rows[2], status: 'Rejected' },
      { ...rows[3], status: 'Applied' },
    ]
    expect(sortApplications(input, 'status-desc', now).map((row) => row.id)).toEqual(['later', 'none', 'soon', 'past'])
  })

  it('sorts latest upcoming interviews first without promoting missing or invalid dates', () => {
    const invalid = application('invalid', '', [interview('invalid', '2026-02-30', '10:00')])
    const tie = application('tie', '', [interview('tie', '2026-10-05', '13:00')])
    const input = [...rows, invalid, tie]
    expect(sortApplications(input, 'next-interview-desc', now).map((row) => row.id)).toEqual(['later', 'soon', 'tie', 'none', 'past', 'invalid'])
    expect(sortApplications(input, 'next-interview', now).map((row) => row.id)).toEqual(['soon', 'tie', 'later', 'none', 'past', 'invalid'])
  })

  it('sorts next steps ignoring case with blank values last in both directions', () => {
    const input = [
      { ...rows[0], id: 'blank', nextStep: '' },
      { ...rows[0], id: 'zebra', nextStep: 'Write follow-up' },
      { ...rows[0], id: 'alpha', nextStep: '  Call recruiter  ' },
      { ...rows[0], id: 'space', nextStep: '  ' },
      { ...rows[0], id: 'tie', nextStep: 'call recruiter' },
    ]
    expect(sortApplications(input, 'next-step', now).map((row) => row.id)).toEqual(['alpha', 'tie', 'zebra', 'blank', 'space'])
    expect(sortApplications(input, 'next-step-desc', now).map((row) => row.id)).toEqual(['zebra', 'alpha', 'tie', 'blank', 'space'])
    expect(input[2].nextStep).toBe('  Call recruiter  ')
  })
})


describe('ordered application sort stacks', () => {
  const input: Application[] = [
    { ...application('offer-none', '2026-10-01'), status: 'Offer' },
    { ...application('applied-later', '2026-10-03', [interview('1', '2026-10-07', '09:00')]), company: 'Zulu' },
    { ...application('applied-none', '2026-10-02') },
    { ...application('offer-soon', '2026-10-04', [interview('2', '2026-10-05', '13:00')]), status: 'Offer' },
    { ...application('applied-soon', '2026-10-05', [interview('3', '2026-10-05', '13:00')]), company: 'Beta' },
    { ...application('applied-tie', '2026-10-06', [interview('4', '2026-10-05', '13:00')]), company: 'Alpha' },
  ]
  const ids = (sort: readonly ApplicationSort[]) => sortApplications(input, sort, now).map((row) => row.id)

  it('appends new columns and toggles existing columns without changing their priority or input', () => {
    const initial: readonly ApplicationSort[] = ['status', 'next-interview']
    expect(toggleApplicationSortStack([], 'status')).toEqual(['status'])
    expect(toggleApplicationSortStack(initial, 'company')).toEqual(['status', 'next-interview', 'company'])
    expect(toggleApplicationSortStack(initial, 'status')).toEqual(['status-desc', 'next-interview'])
    expect(toggleApplicationSortStack(initial, 'next-interview')).toEqual(['status', 'next-interview-desc'])
    expect(toggleApplicationSortStack(['status-desc', 'next-interview-desc'], 'status')).toEqual(['status', 'next-interview-desc'])
    expect(initial).toEqual(['status', 'next-interview'])
  })

  it('keeps status primary and sorts upcoming interviews inside each status', () => {
    expect(ids(['status', 'next-interview'])).toEqual(['applied-soon', 'applied-tie', 'applied-later', 'applied-none', 'offer-soon', 'offer-none'])
  })

  it('reverses the primary key without reversing secondary interview order', () => {
    expect(ids(['status-desc', 'next-interview'])).toEqual(['offer-soon', 'offer-none', 'applied-soon', 'applied-tie', 'applied-later', 'applied-none'])
  })

  it('reverses the secondary key while leaving missing interviews last within each status', () => {
    expect(ids(['status', 'next-interview-desc'])).toEqual(['applied-later', 'applied-soon', 'applied-tie', 'applied-none', 'offer-soon', 'offer-none'])
  })

  it('uses a tertiary key only when both earlier keys tie', () => {
    expect(ids(['status', 'next-interview', 'company'])).toEqual(['applied-tie', 'applied-soon', 'applied-later', 'applied-none', 'offer-soon', 'offer-none'])
  })

  it('gives the first clicked column priority rather than imposing status priority', () => {
    const stack = toggleApplicationSortStack(toggleApplicationSortStack([], 'next-interview'), 'status')
    expect(stack).toEqual(['next-interview', 'status'])
    expect(ids(stack)).toEqual(['applied-soon', 'applied-tie', 'offer-soon', 'applied-later', 'applied-none', 'offer-none'])
  })

  it('uses explicit date criteria before any implicit role or company tie-breaker', () => {
    const companyRows = [
      { ...application('earlier-z', '2026-10-01'), company: 'Acme', role: 'Zebra' },
      { ...application('later-a', '2026-10-02'), company: 'ACME', role: 'Analyst' },
    ]
    expect(sortApplications(companyRows, ['company', 'oldest'], now).map((row) => row.id)).toEqual(['earlier-z', 'later-a'])
    const roleRows = companyRows.map((row, index) => ({ ...row, company: index === 0 ? 'Zulu' : 'Alpha', role: 'Engineer' }))
    expect(sortApplications(roleRows, ['role', 'oldest'], now).map((row) => row.id)).toEqual(['earlier-z', 'later-a'])
  })

  it('retains saved order when all explicit keys tie, including an empty stack', () => {
    const tied = [
      { ...application('first', '2026-10-01'), company: 'Acme', role: 'Zulu' },
      { ...application('second', '2026-10-01'), company: 'ACME', role: 'Alpha' },
    ]
    expect(sortApplications(tied, ['company', 'status'], now).map((row) => row.id)).toEqual(['first', 'second'])
    expect(sortApplications(input, [], now)).toEqual(input)
    expect(sortApplications(input, [], now)).not.toBe(input)
  })

  it('keeps blank next steps last within earlier-key groups in either direction', () => {
    const stepRows: Application[] = [
      { ...application('offer-blank', ''), status: 'Offer' },
      { ...application('applied-blank', ''), nextStep: ' ' },
      { ...application('offer-step', ''), status: 'Offer', nextStep: 'Call' },
      { ...application('applied-step', ''), nextStep: 'Write' },
    ]
    for (const step of ['next-step', 'next-step-desc'] as const) {
      expect(sortApplications(stepRows, ['status', step], now).map((row) => row.id)).toEqual(['applied-step', 'applied-blank', 'offer-step', 'offer-blank'])
    }
  })
})
