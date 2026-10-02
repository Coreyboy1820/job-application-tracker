export type Status = 'Interested' | 'Applied' | 'Interviewing' | 'Offer' | 'Rejected'

export type Application = {
  id: string
  company: string
  role: string
  location: string
  dateApplied: string
  status: Status
  url: string
  notes: string
  nextStep: string
}
