import type { FC } from 'react'

interface Props {
  total: number
  critical: number
  atRisk: number
  avgDaysRemaining: number | null
}

export const StatCards: FC<Props> = ({
  total,
  critical,
  atRisk,
  avgDaysRemaining,
}) => {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-lg border-2 border-navy/20 bg-white px-4 py-3 shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-wide text-navy/70">
          Total caseload
        </div>
        <div className="mt-2 text-2xl font-bold text-navy">{total}</div>
      </div>
      <div className="rounded-lg border-2 border-red-500 bg-red-500/10 px-4 py-3 shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-wide text-red-700">
          Critical: 0–7 days
        </div>
        <div className="mt-2 text-2xl font-bold text-red-700">{critical}</div>
      </div>
      <div className="rounded-lg border-2 border-orange-500 bg-orange-500/10 px-4 py-3 shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-wide text-orange-700">
          At risk: 8–14 days
        </div>
        <div className="mt-2 text-2xl font-bold text-orange-700">{atRisk}</div>
      </div>
      <div className="rounded-lg border-2 border-navy/20 bg-white px-4 py-3 shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-wide text-navy/70">
          Average days remaining
        </div>
        <div className="mt-2 text-2xl font-bold text-navy">
          {avgDaysRemaining ?? '—'}
        </div>
      </div>
    </div>
  )
}
