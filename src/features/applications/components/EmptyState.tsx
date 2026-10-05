import { ArrowUpRight, BriefcaseBusiness, CirclePlus } from 'lucide-react'

export default function EmptyState({ hasApplications, onAdd }: { hasApplications: boolean; onAdd: () => void }) {
  return <div className="empty-state"><div className="empty-illustration"><BriefcaseBusiness size={25} /></div><h3>{hasApplications ? 'No matches found' : 'Your next opportunity starts here'}</h3><p>{hasApplications ? 'Try another search or choose a different status.' : 'Add the first role you are considering. We will help you keep track of what happens next.'}</p>{!hasApplications && <button className="secondary-button" onClick={onAdd}><CirclePlus size={16} /> Add your first application <ArrowUpRight size={15} /></button>}</div>
}
