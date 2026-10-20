import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import InterviewModal from '../../features/interviews/components/InterviewModal'
import type { Application } from '../../shared/types'

const application: Application = { id: 'app', company: 'Company', role: 'Engineer', location: '', dateApplied: '', status: 'Applied', url: '', notes: '', nextStep: '' }
function renderModal(type?: string) {
  const onSave = vi.fn().mockResolvedValue(null)
  render(<InterviewModal application={{ ...application, interviews: [{ id: 'interview', date: '2030-01-01', time: '09:00', notes: '', type }] }} onClose={vi.fn()} onSave={onSave} onRecordLaunch={vi.fn()} calendarLaunchPending={false} />)
  return onSave
}
describe('Interview type selection', () => {
  it('preserves custom legacy types when editing', () => {
    const onSave = renderModal('Portfolio review')
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    expect((screen.getByLabelText('Interview type') as HTMLSelectElement).value).toBe('Other')
    expect((screen.getByLabelText('Custom interview type') as HTMLInputElement).value).toBe('Portfolio review')
    fireEvent.click(screen.getByRole('button', { name: 'Update interview' }))
    expect(onSave.mock.calls[0][1][0].type).toBe('Portfolio review')
  })
  it('keeps an untyped legacy interview optional and can select a predefined type', () => {
    const onSave = renderModal()
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    expect((screen.getByLabelText('Interview type') as HTMLSelectElement).value).toBe('')
    fireEvent.change(screen.getByLabelText('Interview type'), { target: { value: 'Technical' } })
    fireEvent.click(screen.getByRole('button', { name: 'Update interview' }))
    expect(onSave.mock.calls[0][1][0].type).toBe('Technical')
  })
})
