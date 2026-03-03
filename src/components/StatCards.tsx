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
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
        <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Total caseload
        </div>
        <div className="mt-2 text-2xl font-semibold text-slate-900">{total}</div>
      </div>
      <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3">
        <div className="text-xs font-medium uppercase tracking-wide text-red-700">
          Critical (≤ 7 days)
        </div>
        <div className="mt-2 text-2xl font-semibold text-red-800">{critical}</div>
      </div>
      <div className="rounded-lg border border-orange-100 bg-orange-50 px-4 py-3">
        <div className="text-xs font-medium uppercase tracking-wide text-orange-800">
          At risk (8–14 days)
        </div>
        <div className="mt-2 text-2xl font-semibold text-orange-900">{atRisk}</div>
      </div>
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
        <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Average days remaining
        </div>
        <div className="mt-2 text-2xl font-semibold text-slate-900">
          {avgDaysRemaining ?? '—'}
        </div>
      </div>
    </div>
  )
}

