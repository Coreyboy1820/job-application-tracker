import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../app/App'
const mocks = vi.hoisted(() => ({ from: vi.fn(), getSession: vi.fn(), onAuthStateChange: vi.fn() }))
vi.mock('../../shared/lib/supabase', () => ({ isSupabaseConfigured: true, supabase: { auth: { getSession: mocks.getSession, onAuthStateChange: mocks.onAuthStateChange, signOut: vi.fn() }, from: mocks.from, functions: { invoke: vi.fn() } } }))
vi.mock('../../features/applications/data/legacyStorage', () => ({ loadApplications: vi.fn().mockResolvedValue([]) }))
const base = { user_id: 'owner', role: 'Engineer', location: '', status: 'Applied', url: '', notes: '', next_step: '', skills: [] }
const rows = [
  { ...base, id: 'none', company: 'No interview', date_applied: '2026-01-03', interviews: [] },
  { ...base, id: 'later', company: 'Later interview', date_applied: '2026-01-02', interviews: [{ id: 'l', date: '2099-02-02', time: '10:00', notes: '' }, { id: 'l2', date: '2099-02-01', time: '10:00', notes: '' }] },
  { ...base, id: 'soon', company: 'Soon interview', date_applied: '2026-01-01', interviews: [{ id: 's', date: '2099-01-01', time: '10:00', notes: '' }] },
]
beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  window.history.replaceState(null, '', '/#/applications')
  mocks.getSession.mockResolvedValue({ data: { session: { user: { id: 'owner', email: 'owner@example.com' } } }, error: null })
  mocks.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } })
  mocks.from.mockReturnValue({ select: () => ({ order: vi.fn().mockResolvedValue({ data: rows, error: null }) }) })
})
const visibleCompanies = () => screen.getAllByRole('button').filter((button) => button.classList.contains('application-open-button')).map((button) => button.querySelector('strong')?.textContent)
describe('application sorting controls', () => {
  it('sorts each text/date/status column in both directions and synchronizes the dropdown', async () => {
    const sortableRows = [
      { ...rows[0], company: 'Zeta', role: 'Analyst', status: 'Offer', next_step: 'Zebra' },
      { ...rows[1], company: 'alpha', role: 'Designer', status: 'Rejected', next_step: 'Apple' },
      { ...rows[2], company: 'Beta', role: 'Engineer', status: 'Applied', next_step: 'Middle' },
    ]
    mocks.from.mockReturnValue({ select: () => ({ order: vi.fn().mockResolvedValue({ data: sortableRows, error: null }) }) })
    render(<App />)
    await screen.findByRole('button', { name: 'Edit Analyst at Zeta' })
    const cases = [
      { header: 'Company', asc: ['alpha', 'Beta', 'Zeta'], desc: ['Zeta', 'Beta', 'alpha'], option: 'company-desc' },
      { header: 'Role', asc: ['Zeta', 'alpha', 'Beta'], desc: ['Beta', 'alpha', 'Zeta'], option: 'role-desc' },
      { header: 'Date applied', asc: ['Beta', 'alpha', 'Zeta'], desc: ['Zeta', 'alpha', 'Beta'], option: 'newest' },
      { header: 'Status', asc: ['alpha', 'Beta', 'Zeta'], desc: ['Zeta', 'Beta', 'alpha'], option: 'status-desc' },
      { header: 'Next step', asc: ['alpha', 'Beta', 'Zeta'], desc: ['Zeta', 'Beta', 'alpha'], option: 'next-step-desc' },
    ]
    for (const { header, asc, desc, option } of cases) {
      fireEvent.click(screen.getByRole('button', { name: 'Clear sorts' }))
      const button = screen.getByRole('button', { name: header })
      fireEvent.click(button)
      expect(visibleCompanies()).toEqual(asc)
      expect(button.closest('th')?.getAttribute('aria-sort')).toBe('ascending')
      fireEvent.click(button)
      expect(visibleCompanies()).toEqual(desc)
      expect(button.closest('th')?.getAttribute('aria-sort')).toBe('descending')
      expect((screen.getByRole('combobox', { name: 'Sort applications' }) as HTMLSelectElement).value).toBe(option)
      expect(screen.getAllByRole('columnheader').filter((header) => header.hasAttribute('aria-sort'))).toHaveLength(1)
    }
    fireEvent.change(screen.getByRole('combobox', { name: 'Sort applications' }), { target: { value: 'company' } })
    expect(screen.getByRole('columnheader', { name: 'Company' }).getAttribute('aria-sort')).toBe('ascending')
    expect(visibleCompanies()).toEqual(['alpha', 'Beta', 'Zeta'])
    fireEvent.change(screen.getByPlaceholderText('Search roles...'), { target: { value: 'Beta' } })
    expect(visibleCompanies()).toEqual(['Beta'])
    fireEvent.change(screen.getByPlaceholderText('Search roles...'), { target: { value: '' } })
    fireEvent.click(screen.getByRole('tab', { name: /Applied/ }))
    expect(visibleCompanies()).toEqual(['Beta'])
  })

  it('stacks headers in first-click priority, toggles in place, and supports removing and clearing sorts', async () => {
    const groupedRows = [
      { ...rows[1], id: 'a', company: 'Atlas', status: 'Applied' },
      { ...rows[2], id: 'b', company: 'Beacon', status: 'Interviewing' },
      { ...rows[2], id: 'c', company: 'Cedar', status: 'Applied' },
      { ...rows[0], id: 'd', company: 'Delta', status: 'Interviewing' },
    ]
    mocks.from.mockReturnValue({ select: () => ({ order: vi.fn().mockResolvedValue({ data: groupedRows, error: null }) }) })
    render(<App />)
    await screen.findByRole('button', { name: 'Edit Engineer at Atlas' })
    fireEvent.click(screen.getByRole('button', { name: 'Status' }))
    fireEvent.click(screen.getByRole('button', { name: 'Next interview' }))
    expect(visibleCompanies()).toEqual(['Cedar', 'Atlas', 'Beacon', 'Delta'])
    const priorities = () => within(screen.getByRole('list', { name: 'Sort priority' })).getAllByRole('listitem').map((item) => item.textContent)
    expect(priorities()).toEqual(['1. Status (ascending)', '2. Next interview (ascending)'])
    expect((screen.getByRole('combobox', { name: 'Sort applications' }) as HTMLSelectElement).value).toBe('stacked')
    expect(screen.getByRole('columnheader', { name: 'Status' }).getAttribute('aria-sort')).toBe('ascending')
    expect(screen.getByRole('columnheader', { name: 'Next interview' }).hasAttribute('aria-sort')).toBe(false)
    expect(screen.getByRole('button', { name: 'Next interview' }).getAttribute('aria-describedby')).toBe('sort-description-next-interview')
    fireEvent.click(screen.getByRole('button', { name: 'Next interview' }))
    expect(priorities()).toEqual(['1. Status (ascending)', '2. Next interview (descending)'])
    expect(visibleCompanies()).toEqual(['Atlas', 'Cedar', 'Beacon', 'Delta'])
    fireEvent.click(screen.getByRole('button', { name: 'Status' }))
    expect(priorities()).toEqual(['1. Status (descending)', '2. Next interview (descending)'])
    expect(visibleCompanies()).toEqual(['Beacon', 'Delta', 'Atlas', 'Cedar'])
    fireEvent.click(screen.getByRole('button', { name: 'Remove Status sort' }))
    expect(priorities()).toEqual(['1. Next interview (descending)'])
    expect(visibleCompanies()).toEqual(['Atlas', 'Beacon', 'Cedar', 'Delta'])
    expect(screen.getByRole('columnheader', { name: 'Next interview' }).getAttribute('aria-sort')).toBe('descending')
    fireEvent.click(screen.getByRole('button', { name: 'Clear sorts' }))
    expect(screen.queryByRole('list', { name: 'Sort priority' })).toBeNull()
    expect(visibleCompanies()).toEqual(['Atlas', 'Cedar', 'Beacon', 'Delta'])
    expect((screen.getByRole('button', { name: 'Clear sorts' }) as HTMLButtonElement).disabled).toBe(true)
    // The default status order does not become an invisible primary criterion.
    fireEvent.click(screen.getByRole('button', { name: 'Next interview' }))
    fireEvent.click(screen.getByRole('button', { name: 'Status' }))
    expect(priorities()).toEqual(['1. Next interview (ascending)', '2. Status (ascending)'])
    expect(visibleCompanies()).toEqual(['Cedar', 'Beacon', 'Atlas', 'Delta'])
    fireEvent.change(screen.getByRole('combobox', { name: 'Sort applications' }), { target: { value: 'next-interview' } })
    expect(priorities()).toEqual(['1. Next interview (ascending)'])
    expect(visibleCompanies()).toEqual(['Beacon', 'Cedar', 'Atlas', 'Delta'])
    fireEvent.change(screen.getByRole('combobox', { name: 'Sort applications' }), { target: { value: 'company-desc' } })
    expect(priorities()).toEqual(['1. Company (descending)'])
    expect(visibleCompanies()).toEqual(['Delta', 'Cedar', 'Beacon', 'Atlas'])
  })

  it('shows the earliest upcoming interview and keeps unscheduled applications last in either direction', async () => {
    render(<App />)
    await screen.findByRole('button', { name: /Edit Engineer at Soon interview/ })
    const later = screen.getByRole('button', { name: 'Later interview Engineer' }).closest('tr')!
    expect(later.querySelector('time')?.dateTime).toBe(new Date('2099-02-01T10:00').toISOString())
    expect(later.querySelector('time')?.textContent).toContain('2099')
    const none = screen.getByRole('button', { name: 'No interview Engineer' }).closest('tr')!
    expect(within(none).getByRole('cell', { name: 'Not scheduled' })).toBeTruthy()
    const header = screen.getByRole('button', { name: 'Next interview' })
    fireEvent.click(header)
    expect(visibleCompanies()).toEqual(['Soon interview', 'Later interview', 'No interview'])
    fireEvent.click(header)
    expect(visibleCompanies()).toEqual(['Later interview', 'Soon interview', 'No interview'])
    expect(header.closest('th')?.getAttribute('aria-sort')).toBe('descending')
  })

  it('defaults to status priority and removes Interested from filters and selectors', async () => {
    const statusRows = [
      { ...rows[0], status: 'Offer' },
      { ...rows[1], status: 'Rejected' },
      { ...rows[2], status: 'Interviewing' },
      { ...rows[0], id: 'legacy', company: 'Legacy interested', status: 'Interested' },
    ]
    mocks.from.mockReturnValue({ select: () => ({ order: vi.fn().mockResolvedValue({ data: statusRows, error: null }) }) })
    render(<App />)
    await screen.findByRole('button', { name: /Edit Engineer at Soon interview/ })
    expect((screen.getByRole('combobox', { name: 'Sort applications' }) as HTMLSelectElement).value).toBe('status')
    expect(visibleCompanies()).toEqual(['Later interview', 'Legacy interested', 'Soon interview', 'No interview'])
    expect(screen.queryByRole('tab', { name: /Interested/ })).toBeNull()
    expect(screen.queryByRole('option', { name: 'Interested' })).toBeNull()
    fireEvent.click(screen.getByRole('tab', { name: /Applied/ }))
    expect(visibleCompanies()).toEqual(['Legacy interested'])
    fireEvent.click(screen.getByRole('button', { name: /Add application/i }))
    expect(screen.queryByRole('option', { name: 'Interested' })).toBeNull()
  })

  it('sorts Applications by next interview, retains date modes, and combines with search', async () => {
    render(<App />)
    await screen.findByRole('button', { name: /Edit Engineer at Soon interview/ })
    fireEvent.change(screen.getByRole('combobox', { name: 'Sort applications' }), { target: { value: 'next-interview' } })
    expect(visibleCompanies()).toEqual(['Soon interview', 'Later interview', 'No interview'])
    fireEvent.change(screen.getByRole('combobox', { name: 'Sort applications' }), { target: { value: 'newest' } })
    expect(visibleCompanies()).toEqual(['No interview', 'Later interview', 'Soon interview'])
    fireEvent.change(screen.getByRole('combobox', { name: 'Sort applications' }), { target: { value: 'next-interview' } })
    fireEvent.change(screen.getByPlaceholderText('Search roles...'), { target: { value: 'Soon' } })
    expect(visibleCompanies()).toEqual(['Soon interview'])
  })
  it('offers next-interview ordering on Skills without removing unscheduled applications', async () => {
    window.history.replaceState(null, '', '/#/skills')
    render(<App />)
    await screen.findByRole('heading', { name: 'Soon interview' })
    const names = () => screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)
    expect(names()).toEqual(['No interview', 'Later interview', 'Soon interview'])
    fireEvent.change(screen.getByRole('combobox', { name: 'Sort skill applications' }), { target: { value: 'next-interview' } })
    await waitFor(() => expect(names()).toEqual(['Soon interview', 'Later interview', 'No interview']))
    fireEvent.change(screen.getByRole('combobox', { name: 'Sort skill applications' }), { target: { value: 'saved' } })
    expect(names()).toEqual(['No interview', 'Later interview', 'Soon interview'])
  })
})
