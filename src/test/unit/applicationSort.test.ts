import { describe, expect, it } from 'vitest'
import { nextInterviewTimestamp, sortApplications } from '../../features/applications/applicationSort'
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
