import { ChevronDown } from 'lucide-react'
import type { Status } from '../../../shared/types'
import { statuses } from '../statuses'

export default function StatusSelect({ status, onChange }: { status: Status; onChange: (status: Status) => void }) {
  return <label className={`status-pill status-${status.toLowerCase()}`}><span className="status-dot" /><select aria-label="Application status" value={status} onChange={(event) => onChange(event.target.value as Status)}>{statuses.map((option) => <option key={option}>{option}</option>)}</select><ChevronDown size={13} /></label>
}
