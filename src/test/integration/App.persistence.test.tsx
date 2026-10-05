import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../app/App'

const mocks = vi.hoisted(() => ({ getSession: vi.fn(), onAuthStateChange: vi.fn(), signOut: vi.fn(), signInWithPassword: vi.fn(), from: vi.fn(), load: vi.fn(), insert: vi.fn(), update: vi.fn(), remove: vi.fn(), saved: vi.fn(), legacy: vi.fn(), upsert: vi.fn() }))
vi.mock('../../shared/lib/supabase', () => ({ isSupabaseConfigured: true, supabase: { auth: { getSession: mocks.getSession, onAuthStateChange: mocks.onAuthStateChange, signOut: mocks.signOut, signInWithPassword: mocks.signInWithPassword }, from: mocks.from, functions: { invoke: vi.fn() } } }))
vi.mock('../../features/applications/data/legacyStorage', () => ({ loadApplications: mocks.legacy }))
const row = { id: 'application-1', user_id: 'user-1', company: 'Acme', role: 'Engineer', location: 'Remote', date_applied: '2026-01-15', status: 'Applied', url: '', notes: '', next_step: '', skills: [], interviews: [] }
const session = { user: { id: 'user-1', email: 'person@example.com' } }
let authChanged: (event: string, next: typeof session | null) => void

beforeEach(() => {
  vi.clearAllMocks()
  window.location.hash = '#/applications'
  localStorage.clear()
  mocks.legacy.mockResolvedValue([])
  mocks.upsert.mockResolvedValue({ error: null })
  mocks.getSession.mockResolvedValue({ data: { session }, error: null })
  mocks.onAuthStateChange.mockImplementation((callback) => { authChanged = callback; return { data: { subscription: { unsubscribe: vi.fn() } } } })
  mocks.load.mockResolvedValue({ data: [row], error: null })
  mocks.saved.mockResolvedValue({ data: row, error: null })
  mocks.remove.mockResolvedValue({ error: null })
  mocks.signOut.mockResolvedValue({ error: null })
  mocks.signInWithPassword.mockResolvedValue({ data: { session }, error: null })
  const select = () => ({ single: mocks.saved })
  mocks.insert.mockImplementation(() => ({ select }))
  mocks.update.mockImplementation(() => ({ eq: vi.fn(() => ({ select })) }))
  mocks.from.mockReturnValue({ select: () => ({ order: mocks.load }), insert: mocks.insert, update: mocks.update, delete: () => ({ eq: mocks.remove }), upsert: mocks.upsert })
})
async function loaded() { render(<App />); await screen.findByRole('button', { name: 'Edit Engineer at Acme' }) }
async function addDraft() {
  await loaded()
  fireEvent.click(screen.getByRole('button', { name: 'Add application' }))
  const dialog = screen.getByRole('dialog')
  fireEvent.change(within(dialog).getByLabelText(/Company/), { target: { value: '  New Co  ' } })
  fireEvent.change(within(dialog).getByLabelText(/Job title/), { target: { value: '  Developer  ' } })
  fireEvent.click(within(dialog).getByRole('button', { name: 'Save application' }))
}
describe('application persistence', () => {
  it('creates an owned application, trims names, and displays the persisted record', async () => {
    mocks.saved.mockResolvedValue({ data: { ...row, id: 'new-id', company: 'New Co', role: 'Developer' }, error: null })
    await addDraft()
    await screen.findByRole('button', { name: 'Edit Developer at New Co' })
    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({ user_id: 'user-1', company: 'New Co', role: 'Developer', id: expect.any(String) }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })
  it('preserves an unsaved draft on insert failure and permits retry', async () => {
    mocks.saved.mockResolvedValueOnce({ data: null, error: { message: 'Permission denied' } })
    await addDraft()
    await screen.findByText('Could not save this application: Permission denied')
    expect((screen.getByLabelText(/Company/) as HTMLInputElement).value).toBe('  New Co  ')
    mocks.saved.mockResolvedValueOnce({ data: { ...row, id: 'new-id', company: 'New Co', role: 'Developer' }, error: null })
    fireEvent.click(screen.getByRole('button', { name: 'Save application' }))
    await screen.findByRole('button', { name: 'Edit Developer at New Co' })
  })
  it('keeps the original application after an edit fails', async () => {
    mocks.saved.mockResolvedValue({ data: null, error: { message: 'Offline' } })
    await loaded()
    fireEvent.click(screen.getByRole('button', { name: 'Edit Engineer at Acme' }))
    fireEvent.change(screen.getByLabelText(/Job title/), { target: { value: 'Updated' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    await screen.findByText('Could not update this application: Offline')
    expect(screen.getByRole('button', { name: 'Edit Engineer at Acme' })).toBeTruthy()
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ role: 'Updated' }))
  })
  it('retains a record on delete failure and removes it only after a successful retry', async () => {
    mocks.remove.mockResolvedValueOnce({ error: { message: 'Offline' } })
    await loaded()
    fireEvent.click(screen.getByRole('button', { name: 'Delete Engineer at Acme' }))
    await screen.findByText('Could not delete this application: Offline')
    expect(screen.getByRole('button', { name: 'Edit Engineer at Acme' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Delete Engineer at Acme' }))
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Edit Engineer at Acme' })).toBeNull())
    expect(mocks.remove).toHaveBeenCalledWith('id', 'application-1')
  })
  it('updates status from the persisted row and retains it when a later update fails', async () => {
    await loaded()
    mocks.saved.mockResolvedValueOnce({ data: { ...row, status: 'Interviewing' }, error: null })
    fireEvent.change(screen.getByLabelText('Application status'), { target: { value: 'Interviewing' } })
    await waitFor(() => expect((screen.getByLabelText('Application status') as HTMLSelectElement).value).toBe('Interviewing'))
    expect(mocks.update).toHaveBeenCalledWith({ status: 'Interviewing' })
    mocks.saved.mockResolvedValueOnce({ data: null, error: { message: 'Status rejected' } })
    fireEvent.change(screen.getByLabelText('Application status'), { target: { value: 'Offer' } })
    await screen.findByText('Could not update status: Status rejected')
    expect((screen.getByLabelText('Application status') as HTMLSelectElement).value).toBe('Interviewing')
  })
  it('clears outdated analysis when an edited posting URL is saved', async () => {
    await loaded()
    mocks.saved.mockResolvedValueOnce({ data: { ...row, url: 'https://example.com/new-role', role: 'Updated role' }, error: null })
    fireEvent.click(screen.getByRole('button', { name: 'Edit Engineer at Acme' }))
    fireEvent.change(screen.getByLabelText('Job posting link'), { target: { value: 'https://example.com/new-role' } })
    fireEvent.change(screen.getByLabelText(/Job title/), { target: { value: 'Updated role' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    await screen.findByRole('button', { name: 'Edit Updated role at Acme' })
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ url: 'https://example.com/new-role', skills: [], job_description: '', skills_analyzed_at: null, skill_extraction_version: 0, interview_questions_version: 0 }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })
  it('reports a failed initial query without displaying applications', async () => {
    mocks.load.mockResolvedValue({ data: null, error: { message: 'Database unavailable' } })
    render(<App />)
    await screen.findByText('Could not load applications: Database unavailable')
    expect(screen.queryByRole('button', { name: 'Edit Engineer at Acme' })).toBeNull()
  })
})
describe('session lifecycle', () => {
  it('submits sign-in credentials and loads data when the auth event arrives', async () => {
    mocks.getSession.mockResolvedValue({ data: { session: null }, error: null })
    render(<App />)
    await screen.findByRole('heading', { name: 'Welcome back' })
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'person@example.com' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    await waitFor(() => expect(mocks.signInWithPassword).toHaveBeenCalledWith({ email: 'person@example.com', password: 'secret123' }))
    act(() => authChanged('SIGNED_IN', session))
    await screen.findByRole('button', { name: 'Edit Engineer at Acme' })
  })
  it('returns to sign-in on session expiry and discards the previous account view', async () => {
    await loaded()
    act(() => authChanged('SIGNED_OUT', null))
    await screen.findByRole('heading', { name: 'Welcome back' })
    expect(screen.queryByText('Acme')).toBeNull()
  })
  it('keeps the signed-in view and reports a sign-out failure', async () => {
    mocks.signOut.mockResolvedValue({ error: { message: 'Could not reach authentication service' } })
    await loaded()
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }))
    await screen.findByText('Could not reach authentication service')
    expect(screen.getByRole('button', { name: 'Edit Engineer at Acme' })).toBeTruthy()
  })
  it('does not restore an expired session when the initial session lookup finishes late', async () => {
    let finish!: (value: unknown) => void
    mocks.getSession.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve }))
    render(<App />)
    await waitFor(() => expect(mocks.onAuthStateChange).toHaveBeenCalled())
    act(() => authChanged('SIGNED_OUT', null))
    await screen.findByRole('heading', { name: 'Welcome back' })
    await act(async () => finish({ data: { session }, error: null }))
    expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeTruthy()
    expect(mocks.load).not.toHaveBeenCalled()
  })
  it('ignores a create result from an earlier session after signing back into the same account', async () => {
    let finish!: (value: unknown) => void
    mocks.saved.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve }))
    await addDraft()
    act(() => authChanged('SIGNED_OUT', null))
    await screen.findByRole('heading', { name: 'Welcome back' })
    act(() => authChanged('SIGNED_IN', session))
    await screen.findByRole('button', { name: 'Edit Engineer at Acme' })
    await act(async () => finish({ data: { ...row, id: 'late-id', company: 'Old draft', role: 'Developer' }, error: null }))
    expect(screen.queryByRole('button', { name: 'Edit Developer at Old draft' })).toBeNull()
  })
  it('hides the earlier account while the replacement query is pending', async () => {
    await loaded()
    let finish!: (value: unknown) => void
    mocks.load.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve }))
    act(() => authChanged('SIGNED_IN', { user: { id: 'user-2', email: 'second@example.com' } }))
    expect(screen.queryByRole('button', { name: 'Edit Engineer at Acme' })).toBeNull()
    await act(async () => finish({ data: [], error: null }))
  })
  it('ignores an earlier account query that resolves after an account switch', async () => {
    let finish!: (value: unknown) => void
    mocks.load.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve }))
    mocks.load.mockResolvedValueOnce({ data: [{ ...row, company: 'Second account', user_id: 'user-2' }], error: null })
    render(<App />)
    await waitFor(() => expect(mocks.load).toHaveBeenCalledTimes(1))
    act(() => authChanged('SIGNED_IN', { user: { id: 'user-2', email: 'second@example.com' } }))
    await screen.findByRole('button', { name: 'Edit Engineer at Second account' })
    await act(async () => finish({ data: [row], error: null }))
    expect(screen.queryByRole('button', { name: 'Edit Engineer at Acme' })).toBeNull()
  })
})

describe('legacy account import', () => {
  const legacy = { id: '12345678-1234-1234-1234-123456789abc', company: 'Browser company', role: 'Engineer', location: '', dateApplied: '2026-01-01', status: 'Applied', url: '', notes: '', nextStep: '' }
  it('imports browser records under the signed-in owner and marks success only after persistence', async () => {
    mocks.legacy.mockResolvedValue([legacy])
    await loaded()
    fireEvent.click(await screen.findByRole('button', { name: /Import applications/ }))
    await waitFor(() => expect(mocks.upsert).toHaveBeenCalledWith([expect.objectContaining({ id: legacy.id, user_id: 'user-1', company: legacy.company })], { onConflict: 'id', ignoreDuplicates: true }))
    await waitFor(() => expect(localStorage.getItem('rolecall-imported-v1:user-1')).not.toBeNull())
    expect(screen.queryByRole('button', { name: /Import applications/ })).toBeNull()
  })
  it('keeps the import retry available and does not mark failed imports as complete', async () => {
    mocks.legacy.mockResolvedValue([legacy])
    mocks.upsert.mockResolvedValueOnce({ error: { message: 'Import denied' } })
    await loaded()
    fireEvent.click(await screen.findByRole('button', { name: /Import applications/ }))
    await screen.findByText('Could not import your browser-saved applications: Import denied')
    expect(localStorage.getItem('rolecall-imported-v1:user-1')).toBeNull()
    expect((screen.getByRole('button', { name: /Import applications/ }) as HTMLButtonElement).disabled).toBe(false)
  })
  it('does not propose another import for an account already marked as imported', async () => {
    localStorage.setItem('rolecall-imported-v1:user-1', '2026-01-01')
    mocks.legacy.mockResolvedValue([legacy])
    await loaded()
    expect(screen.queryByRole('button', { name: /Import applications/ })).toBeNull()
    expect(mocks.legacy).not.toHaveBeenCalled()
  })
  it('does not show a late legacy result from an earlier account', async () => {
    let finish!: (value: unknown) => void
    mocks.legacy.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve }))
    await loaded()
    act(() => authChanged('SIGNED_IN', { user: { id: 'user-2', email: 'second@example.com' } }))
    await waitFor(() => expect(mocks.legacy).toHaveBeenCalledTimes(2))
    await act(async () => finish([legacy]))
    expect(screen.queryByRole('button', { name: /Import applications/ })).toBeNull()
  })
})
