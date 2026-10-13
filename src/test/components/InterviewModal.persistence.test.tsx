import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import InterviewModal from '../../features/interviews/components/InterviewModal'
import type { Application, Interview } from '../../shared/types'

const interview: Interview = { id: 'round', date: '2030-06-12', time: '10:30', notes: 'Saved round', googleCalendarOpenedAt: '2026-01-01T00:00:00Z' }
const application: Application = { id: 'app', company: 'Acme', role: 'Engineer', location: '', dateApplied: '', status: 'Applied', url: '', notes: '', nextStep: '', interviews: [interview] }
function setup(onSave = vi.fn().mockResolvedValue(null)) {
  const onClose = vi.fn()
  const props = { application, onSave, onClose, onRecordLaunch: vi.fn().mockResolvedValue(undefined), calendarLaunchPending: false }
  const result = render(<InterviewModal {...props} />)
  return { ...result, props, onSave, onClose }
}
function draft() {
  fireEvent.change(screen.getByLabelText('Date *'), { target: { value: '2030-06-19' } })
  fireEvent.change(screen.getByLabelText('Start time *'), { target: { value: '11:00' } })
  fireEvent.change(screen.getByLabelText('Notes'), { target: { value: 'New round' } })
}

describe('immediate interview persistence', () => {
  it('adds once, blocks duplicate submissions and closing while pending, and enables Calendar after saving', async () => {
    let resolve!: (result: null) => void
    const { onSave, onClose } = setup(vi.fn(() => new Promise((done) => { resolve = done })))
    draft()
    const submit = screen.getByRole('button', { name: 'Add interview' }).closest('form')!
    fireEvent.submit(submit)
    fireEvent.submit(submit)
    expect(onSave).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('status').textContent).toContain('Saving')
    fireEvent.click(screen.getByRole('button', { name: 'Done' }))
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    fireEvent.mouseDown(screen.getByRole('dialog').parentElement!)
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.queryByText('New round', { selector: 'div' })).toBeNull()
    await act(async () => { resolve(null) })
    expect(screen.getByText('New round')).toBeTruthy()
    expect(screen.getByRole('status').textContent).toBe('Interview added.')
    expect((screen.getByLabelText('Notes') as HTMLTextAreaElement).value).toBe('')
    expect(screen.getByRole('button', { name: 'Add to Google Calendar' }).hasAttribute('disabled')).toBe(false)
    expect(onClose).not.toHaveBeenCalled()
  })

  it.each(['returned error', 'thrown error'])('preserves failed additions for retry (%s)', async (failure) => {
    const onSave = vi.fn()
    if (failure === 'returned error') onSave.mockResolvedValueOnce('Offline. Retry.')
    else onSave.mockRejectedValueOnce(new Error('Offline. Retry.'))
    onSave.mockResolvedValue(null)
    setup(onSave)
    draft()
    fireEvent.click(screen.getByRole('button', { name: 'Add interview' }))
    expect((await screen.findByRole('alert')).textContent).toContain('Offline. Retry.')
    expect((screen.getByLabelText('Notes') as HTMLTextAreaElement).value).toBe('New round')
    expect(screen.queryByText('New round', { selector: 'div' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Add interview' }))
    expect(await screen.findByText('New round')).toBeTruthy()
    expect(onSave).toHaveBeenCalledTimes(2)
  })

  it('keeps persisted details and calendar metadata on a failed update, then persists the retry', async () => {
    const onSave = vi.fn().mockResolvedValueOnce('Try again').mockResolvedValue(null)
    setup(onSave)
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    fireEvent.change(screen.getByLabelText('Notes'), { target: { value: 'Updated round' } })
    fireEvent.click(screen.getByRole('button', { name: 'Update interview' }))
    await screen.findByRole('alert')
    expect(screen.getByText('Saved round')).toBeTruthy()
    expect((screen.getByLabelText('Notes') as HTMLTextAreaElement).value).toBe('Updated round')
    fireEvent.click(screen.getByRole('button', { name: 'Update interview' }))
    expect(await screen.findByText('Updated round')).toBeTruthy()
    expect(onSave).toHaveBeenLastCalledWith('app', [expect.objectContaining({ id: 'round', notes: 'Updated round', googleCalendarOpenedAt: interview.googleCalendarOpenedAt })])
  })

  it('retains a failed deletion and edit draft until deletion succeeds', async () => {
    const onSave = vi.fn().mockResolvedValueOnce('Try again').mockResolvedValue(null)
    setup(onSave)
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    fireEvent.change(screen.getByLabelText('Notes'), { target: { value: 'Draft notes' } })
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    await screen.findByRole('alert')
    expect(screen.getByText('Saved round')).toBeTruthy()
    expect((screen.getByLabelText('Notes') as HTMLTextAreaElement).value).toBe('Draft notes')
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    await waitFor(() => expect(screen.queryByText('Saved round')).toBeNull())
    expect(onSave).toHaveBeenLastCalledWith('app', [])
    expect((screen.getByLabelText('Notes') as HTMLTextAreaElement).value).toBe('')
  })

  it('refreshes committed interviews without overwriting a draft and rejects edits deleted elsewhere', async () => {
    const { rerender, props, onSave } = setup()
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    fireEvent.change(screen.getByLabelText('Notes'), { target: { value: 'My draft' } })
    rerender(<InterviewModal {...props} application={{ ...application, interviews: [] }} />)
    expect((screen.getByLabelText('Notes') as HTMLTextAreaElement).value).toBe('My draft')
    fireEvent.click(screen.getByRole('button', { name: 'Update interview' }))
    expect(screen.getByRole('alert').textContent).toContain('deleted elsewhere')
    expect(onSave).not.toHaveBeenCalled()
  })

  it('closing an unsubmitted edit leaves persisted interviews untouched', () => {
    const { onSave, onClose } = setup()
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    fireEvent.change(screen.getByLabelText('Notes'), { target: { value: 'Unsubmitted draft' } })
    fireEvent.click(screen.getByRole('button', { name: 'Done' }))
    expect(onSave).not.toHaveBeenCalled()
    expect(onClose).toHaveBeenCalledOnce()
  })
})
