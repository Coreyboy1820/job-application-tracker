import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readLegacyApplications } from '../../features/applications/data/legacyApplications'

const { loadApplications } = vi.hoisted(() => ({ loadApplications: vi.fn() }))
vi.mock('../../features/applications/data/legacyStorage', () => ({ loadApplications }))

beforeEach(() => loadApplications.mockReset())
afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('legacy application compatibility', () => {
  it('rejects missing names and normalizes invalid identifiers, statuses, and optional fields', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-06T00:30:00Z'))
    const replacementId = '12345678-1234-1234-1234-123456789abc'
    vi.spyOn(crypto, 'randomUUID').mockReturnValue(replacementId)
    loadApplications.mockResolvedValue([
      null, 'invalid', {}, { company: ' ', role: 'Engineer' }, { company: 'Example', role: 1 },
      { id: 'invalid', company: ' Example ', role: ' Engineer ', status: 'Unknown', location: 1, dateApplied: 1, url: null, notes: false, nextStep: {} },
    ])
    expect(await readLegacyApplications()).toEqual([{
      id: replacementId, company: 'Example', role: 'Engineer', status: 'Applied',
      location: '', dateApplied: '2026-10-06', url: '', notes: '', nextStep: '', interviews: [],
    }])
  })

  it('preserves valid saved data and interview metadata while discarding invalid interview schedules', async () => {
    const interview = {
      id: 'interview-1', date: '2026-10-06', time: '10:30', notes: 'Prepare', type: 'Technical',
      location: 'Remote', meetingLink: 'https://example.com/meeting', durationMinutes: 45,
      googleCalendarOpenedAt: '2026-10-05T12:00:00Z',
    }
    const saved = {
      id: '12345678-1234-1234-1234-123456789abc', company: 'Example', role: 'Engineer',
      status: 'Interviewing', location: 'Remote', dateApplied: '2026-10-01',
      url: 'https://example.com/jobs/1', notes: 'Saved notes', nextStep: 'Interview',
      interviews: [interview, null, { ...interview, date: '2026-02-30' }, { ...interview, time: '25:30' }, { ...interview, notes: undefined }],
    }
    loadApplications.mockResolvedValue([saved])
    expect(await readLegacyApplications()).toEqual([{ ...saved, interviews: [interview] }])
  })

  it('returns no legacy applications when local storage cannot be read', async () => {
    loadApplications.mockRejectedValue(new Error('Local database unavailable'))
    expect(await readLegacyApplications()).toEqual([])
  })
})
