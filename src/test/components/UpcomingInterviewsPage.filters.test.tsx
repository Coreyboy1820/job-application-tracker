import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import UpcomingInterviewsPage from '../../features/interviews/pages/UpcomingInterviewsPage'
import type { UpcomingInterview } from '../../features/interviews/interviewDates'

const interviews: UpcomingInterview[] = ['technical', 'Recruiter', undefined, 'Portfolio review'].map((type, index) => ({
  id: String(index), applicationId: String(index), company: `Company ${index}`, role: 'Engineer', location: '',
  date: '2030-01-01', time: '09:00', notes: '', type, timestamp: index,
}))
function renderAgenda() {
  render(<UpcomingInterviewsPage interviews={interviews} loading={false} onOpenApplicationSkills={vi.fn()} onRecordLaunch={vi.fn()} calendarLaunchPending={false} />)
}
describe('Interview type filters', () => {
  it('shows all types initially, combines selections and restores all on clear', () => {
    renderAgenda()
    expect(screen.getAllByRole('button', { name: /View skills/ })).toHaveLength(4)
    fireEvent.click(screen.getByRole('checkbox', { name: 'Technical' }))
    expect(screen.getAllByRole('button', { name: /View skills/ })).toHaveLength(1)
    fireEvent.click(screen.getByRole('checkbox', { name: 'Other' }))
    expect(screen.getAllByRole('button', { name: /View skills/ }).map((button) => button.getAttribute('aria-label'))).toEqual([
      'View skills for Engineer at Company 0', 'View skills for Engineer at Company 3',
    ])
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(screen.getAllByRole('button', { name: /View skills/ })).toHaveLength(4)
  })
  it('includes legacy untyped records and explains empty filtered results', () => {
    renderAgenda()
    fireEvent.click(screen.getByRole('checkbox', { name: 'Not specified' }))
    expect(screen.getByRole('button', { name: /View skills/ }).getAttribute('aria-label')).toContain('Company 2')
    fireEvent.click(screen.getByRole('checkbox', { name: 'Not specified' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Onsite' }))
    expect(screen.getByText('No interviews match the selected types.')).toBeTruthy()
  })
})
