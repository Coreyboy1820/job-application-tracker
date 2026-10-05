import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import GoogleCalendarButton from './GoogleCalendarButton'
import type { Interview } from './types'

const application = { id: 'job-1', company: 'Acme', role: 'Engineer', location: 'Remote' }
const interview: Interview = { id: 'interview-1', date: '2026-06-15', time: '14:30', notes: 'Prepare examples' }
function mockPopup() {
  const popup = { opener: {}, closed: false, location: { href: 'about:blank' }, close: vi.fn() }
  const open = vi.spyOn(window, 'open').mockReturnValue(popup as unknown as Window)
  return { popup, open }
}
function disclose() { fireEvent.click(screen.getByRole('button', { name: /Add to Google Calendar|Reopen Google Calendar/ })) }
function continueToGoogle() { fireEvent.click(screen.getByRole('button', { name: 'Continue to Google Calendar' })) }
afterEach(() => vi.restoreAllMocks())

describe('Google Calendar button', () => {
  it('discloses sharing and limitations before opening, and lets users cancel', () => {
    const { open } = mockPopup()
    const save = vi.fn().mockResolvedValue(undefined)
    render(<GoogleCalendarButton application={application} interview={interview} onRecordLaunch={save} />)
    disclose()
    expect(screen.getByText(/Google will receive the company/)).toBeTruthy()
    expect(screen.getByText(/No Calendar access is granted/).textContent).toContain('App edits and deletions do not change Calendar events')
    expect(open).not.toHaveBeenCalled()
    expect(save).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel Calendar' }))
    expect(screen.queryByRole('button', { name: 'Continue to Google Calendar' })).toBeNull()
  })

  it('persists the launch before navigating and warns on another draft in the same session', async () => {
    const { popup } = mockPopup()
    let finish!: () => void
    const save = vi.fn(() => new Promise<void>((resolve) => { finish = resolve }))
    render(<GoogleCalendarButton application={application} interview={interview} onRecordLaunch={save} />)
    disclose()
    continueToGoogle()
    expect(save).toHaveBeenCalledWith('interview-1')
    expect(popup.opener).toBeNull()
    expect(popup.location.href).toBe('about:blank')
    expect((screen.getByRole('button', { name: 'Opening Calendar…' }) as HTMLButtonElement).disabled).toBe(true)
    finish()
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('cannot confirm whether you saved it'))
    expect(popup.location.href).toContain('calendar.google.com')
    disclose()
    expect(screen.getByText(/already opened in Google Calendar/)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Open another draft' })).toBeTruthy()
  })

  it('warns after refresh using the persisted marker before explicitly opening another draft', async () => {
    const { open } = mockPopup()
    const save = vi.fn().mockResolvedValue(undefined)
    render(<GoogleCalendarButton application={application} interview={{ ...interview, googleCalendarOpenedAt: '2026-06-01T12:00:00Z' }} onRecordLaunch={save} />)
    disclose()
    expect(screen.getByText(/saving another draft can create a duplicate/)).toBeTruthy()
    expect(open).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Open another draft' }))
    await waitFor(() => expect(save).toHaveBeenCalledOnce())
  })

  it('reports blocked popups without recording a launch', async () => {
    vi.spyOn(window, 'open').mockReturnValue(null)
    const save = vi.fn()
    render(<GoogleCalendarButton application={application} interview={interview} onRecordLaunch={save} />)
    disclose()
    continueToGoogle()
    expect((await screen.findByRole('alert')).textContent).toContain('Allow pop-ups')
    expect(save).not.toHaveBeenCalled()
  })

  it('closes the blank window when saving fails and presents an actionable error', async () => {
    const { popup } = mockPopup()
    render(<GoogleCalendarButton application={application} interview={interview} onRecordLaunch={vi.fn().mockRejectedValue(new Error('Could not save Calendar tracking. Please retry.'))} />)
    disclose()
    continueToGoogle()
    expect((await screen.findByRole('alert')).textContent).toContain('Please retry')
    expect(popup.close).toHaveBeenCalledOnce()
    expect(popup.location.href).toBe('about:blank')
    expect(screen.getByRole('button', { name: 'Continue to Google Calendar' })).toBeTruthy()
  })

  it('validates the date and time before sharing or persisting anything', async () => {
    const { open } = mockPopup()
    const save = vi.fn()
    render(<GoogleCalendarButton application={application} interview={{ ...interview, time: '' }} onRecordLaunch={save} />)
    disclose()
    continueToGoogle()
    expect((await screen.findByRole('alert')).textContent).toContain('valid interview date and start time')
    expect(open).not.toHaveBeenCalled()
    expect(save).not.toHaveBeenCalled()
  })

  it('explains how to retry when the user closes the blank window during persistence', async () => {
    const { popup } = mockPopup()
    const save = vi.fn(async () => { popup.closed = true })
    render(<GoogleCalendarButton application={application} interview={interview} onRecordLaunch={save} />)
    disclose()
    continueToGoogle()
    expect((await screen.findByRole('alert')).textContent).toContain('Reopen it and save the event')
    expect(popup.location.href).toBe('about:blank')
  })

  it('disables launching while its interview is unavailable', () => {
    const { open } = mockPopup()
    const save = vi.fn()
    render(<GoogleCalendarButton application={application} interview={interview} onRecordLaunch={save} disabled />)
    const button = screen.getByRole('button', { name: 'Add to Google Calendar' }) as HTMLButtonElement
    expect(button.disabled).toBe(true)
    fireEvent.click(button)
    expect(screen.queryByRole('button', { name: 'Continue to Google Calendar' })).toBeNull()
    expect(open).not.toHaveBeenCalled()
  })
})
