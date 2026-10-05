import type { ReactNode } from 'react'

export default function StatCard({ label, value, icon, tone, caption }: { label: string; value: number; icon: ReactNode; tone: string; caption: string }) {
  return <article className="stat-card"><div className={`stat-icon ${tone}`}>{icon}</div><div className="stat-label">{label}</div><div className="stat-value">{value}</div><div className="stat-caption">{caption}</div></article>
}
