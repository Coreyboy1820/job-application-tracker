import { useState } from 'react'
import type { FormEvent } from 'react'
import { Check, CirclePlus, X } from 'lucide-react'
import type { Application, Status } from '../../../shared/types'
import { statuses } from '../statuses'

export default function ApplicationModal({ application, onClose, onSave }: { application: Application | null; onClose: () => void; onSave: (application: Omit<Application, 'id'>) => Promise<boolean> }) {
  const [company, setCompany] = useState(application?.company ?? '')
  const [role, setRole] = useState(application?.role ?? '')
  const [location, setLocation] = useState(application?.location ?? '')
  const [dateApplied, setDateApplied] = useState(application?.dateApplied ?? new Date().toISOString().slice(0, 10))
  const [status, setStatus] = useState<Status>(application?.status ?? 'Applied')
  const [url, setUrl] = useState(application?.url ?? '')
  const [nextStep, setNextStep] = useState(application?.nextStep ?? '')
  const [notes, setNotes] = useState(application?.notes ?? '')
  const [saving, setSaving] = useState(false)
  const canSave = company.trim().length > 0 && role.trim().length > 0

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSave) return
    setSaving(true)
    const saved = await onSave({ company: company.trim(), role: role.trim(), location: location.trim(), dateApplied, status, url: url.trim(), nextStep: nextStep.trim(), notes: notes.trim() })
    setSaving(false)
    if (saved) onClose()
  }

  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><header className="modal-header"><div><div className="eyebrow">{application ? 'UPDATE OPPORTUNITY' : 'NEW OPPORTUNITY'}</div><h2 id="modal-title">{application ? 'Edit application' : 'Add an application'}</h2></div><button className="icon-button" aria-label="Close" onClick={onClose}><X size={18} /></button></header><form onSubmit={(event) => void handleSubmit(event)}>
    <div className="form-grid"><label className="field"><span>Company <i>*</i></span><input autoFocus required value={company} onChange={(event) => setCompany(event.target.value)} placeholder="e.g. Acme Inc." /></label><label className="field"><span>Job title <i>*</i></span><input required value={role} onChange={(event) => setRole(event.target.value)} placeholder="e.g. Software Engineer" /></label><label className="field"><span>Location</span><input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Remote, city, or hybrid" /></label><label className="field"><span>Date applied</span><input type="date" value={dateApplied} onChange={(event) => setDateApplied(event.target.value)} /></label><label className="field"><span>Status</span><select value={status} onChange={(event) => setStatus(event.target.value as Status)}>{statuses.map((option) => <option key={option}>{option}</option>)}</select></label><label className="field"><span>Job posting link</span><input type="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://" /></label><label className="field field-full"><span>Next step or reminder</span><input value={nextStep} onChange={(event) => setNextStep(event.target.value)} placeholder="e.g. Follow up with recruiter Friday" /></label><label className="field field-full"><span>Notes</span><textarea rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Anything you want to remember about this role..." /></label></div>
    <div className="modal-actions"><button type="button" className="text-button" onClick={onClose}>Cancel</button><button className="primary-button" type="submit" disabled={!canSave || saving}>{application ? <Check size={16} /> : <CirclePlus size={16} />} {saving ? 'Saving…' : application ? 'Save changes' : 'Save application'}</button></div>
  </form></section></div>
}
