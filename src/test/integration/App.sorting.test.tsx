import { fireEvent, render, screen, waitFor } from '@testing-library/react'
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
const visibleCompanies = () => screen.getAllByRole('button', { name: /Engineer/ }).filter((button) => button.classList.contains('application-open-button')).map((button) => button.querySelector('strong')?.textContent)
describe('next-interview sorting controls', () => {
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
