import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AuthPanel from '../../features/auth/components/AuthPanel'

const auth = vi.hoisted(() => ({ signInWithPassword: vi.fn(), signUp: vi.fn() }))
vi.mock('../../shared/lib/supabase', () => ({ supabase: { auth } }))
beforeEach(() => {
  vi.clearAllMocks()
  auth.signInWithPassword.mockResolvedValue({ data: { session: {} }, error: null })
  auth.signUp.mockResolvedValue({ data: { session: null }, error: null })
})
function fillCredentials() {
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'person@example.com' } })
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret123' } })
}
describe('authentication form', () => {
  it('shows sign-in errors and permits another attempt', async () => {
    auth.signInWithPassword.mockResolvedValueOnce({ data: { session: null }, error: { message: 'Invalid credentials' } })
    render(<AuthPanel />)
    fillCredentials()
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect((await screen.findByRole('alert')).textContent).toBe('Invalid credentials')
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    await waitFor(() => expect(auth.signInWithPassword).toHaveBeenCalledTimes(2))
    expect(screen.queryByRole('alert')).toBeNull()
  })
  it('disables duplicate submissions until sign-in settles', async () => {
    let finish!: (value: unknown) => void
    auth.signInWithPassword.mockImplementation(() => new Promise((resolve) => { finish = resolve }))
    render(<AuthPanel />)
    fillCredentials()
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    const pending = screen.getByRole('button', { name: 'Please wait…' }) as HTMLButtonElement
    expect(pending.disabled).toBe(true)
    fireEvent.click(pending)
    expect(auth.signInWithPassword).toHaveBeenCalledTimes(1)
    finish({ data: { session: {} }, error: null })
    await screen.findByRole('button', { name: 'Sign in' })
  })
  it('uses the browser origin for signup confirmation and explains email confirmation', async () => {
    render(<AuthPanel />)
    fireEvent.click(screen.getByRole('button', { name: 'Create an account' }))
    fillCredentials()
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }))
    expect((await screen.findByRole('status')).textContent).toContain('Check your email')
    expect(auth.signUp).toHaveBeenCalledWith({ email: 'person@example.com', password: 'secret123', options: { emailRedirectTo: window.location.origin } })
  })
  it('reports signup rejection and clears it when switching to sign-in', async () => {
    auth.signUp.mockResolvedValue({ data: { session: null }, error: { message: 'Signup unavailable' } })
    render(<AuthPanel />)
    fireEvent.click(screen.getByRole('button', { name: 'Create an account' }))
    fillCredentials()
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }))
    expect((await screen.findByRole('alert')).textContent).toBe('Signup unavailable')
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeTruthy()
  })
  it('does not prompt for email confirmation when signup already returns a session', async () => {
    auth.signUp.mockResolvedValue({ data: { session: {} }, error: null })
    render(<AuthPanel />)
    fireEvent.click(screen.getByRole('button', { name: 'Create an account' }))
    fillCredentials()
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }))
    await waitFor(() => expect(auth.signUp).toHaveBeenCalledTimes(1))
    expect(screen.queryByRole('status')).toBeNull()
  })
})
