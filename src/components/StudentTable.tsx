import type { FC } from 'react'
import type { StudentRecord } from '../types'
import { StagePipeline } from './StagePipeline'
import { calculateDaysRemaining, formatDisplayDate } from '../dateUtils'
import { getDisabilityLabel } from '../useStudents'
import clsx from 'clsx'

interface Props {
  students: (StudentRecord & { daysRemaining?: number | null })[]
  onEdit: (student: StudentRecord) => void
  onArchive: (student: StudentRecord) => void
}

function getInitials(s: StudentRecord): string {
  if (s.fullName?.trim()) {
    const parts = s.fullName.trim().split(/\s+/)
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }
    return s.fullName.slice(0, 2).toUpperCase()
  }
  return (s.initials || '?').slice(0, 2).toUpperCase()
}

function daysColor(days: number | null | undefined) {
  if (days == null) return 'bg-gray-200 text-navy/80'
  if (days <= 7) return 'bg-red-500/15 text-red-800 border-red-500/50'
  if (days <= 14) return 'bg-orange-500/15 text-orange-800 border-orange-500/50'
  if (days <= 30) return 'bg-amber-500/15 text-amber-800 border-amber-500/50'
  return 'bg-emerald-500/15 text-emerald-800 border-emerald-500/50'
}

export const StudentTable: FC<Props> = ({ students, onEdit, onArchive }) => {
  if (!students.length) {
    return (
      <div className="rounded-lg border border-dashed border-navy/20 bg-white px-6 py-10 text-center">
        <div className="text-base font-semibold text-navy">
          No students on your caseload yet.
        </div>
        <div className="mt-1 text-sm text-navy/70">
          When you add students, you&apos;ll see urgency colors, stages, and days
          remaining here.
        </div>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border border-navy/10 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-navy/10">
        <thead className="bg-navy/5">
          <tr className="text-left text-xs font-semibold uppercase tracking-wide text-navy/80">
            <th className="px-4 py-3">Student</th>
            <th className="px-3 py-3">Eval type</th>
            <th className="px-3 py-3">Disability areas</th>
            <th className="px-3 py-3">Pipeline</th>
            <th className="px-3 py-3">Stage</th>
            <th className="px-3 py-3">Deadline countdown</th>
            <th className="px-3 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-navy/5 text-sm">
          {students.map((s) => {
            const days =
              (s as any).daysRemaining ?? calculateDaysRemaining(s.deadlineDate)
            const initials = getInitials(s)
            return (
              <tr key={s.id} className="hover:bg-navy/[0.02]">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-navy/20 bg-navy/10 text-sm font-bold text-navy">
                      {initials}
                    </div>
                    <div>
                      <div className="font-semibold text-navy">
                        {s.fullName?.trim() || s.initials}
                      </div>
                      <div className="text-xs text-navy/70">
                        {s.studentId ? `ID ${s.studentId} · ` : ''}
                        {s.grade}
                        {s.schoolName?.trim() && ` · ${s.schoolName}`}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3">
                  <span className="inline-flex rounded-full bg-navy px-2 py-0.5 text-xs font-medium text-white">
                    {s.evaluationType}
                  </span>
                </td>
                <td className="px-3 py-3">
                  <div className="flex flex-wrap gap-1">
                    {s.disabilityAreas.map((d) => (
                      <span
                        key={d}
                        className="inline-flex rounded-full bg-navy/10 px-2 py-0.5 text-[11px] font-medium text-navy"
                      >
                        {getDisabilityLabel(d)}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-3 py-3">
                  <StagePipeline stage={s.stage} />
                  <div className="mt-1 text-xs text-navy/60">
                    FIIE due {formatDisplayDate(s.deadlineDate)}
                    {s.ardDueDate && (
                      <> · ARD due {formatDisplayDate(s.ardDueDate)}</>
                    )}
                  </div>
                </td>
                <td className="px-3 py-3">
                  <span className="inline-flex rounded-full bg-navy/10 px-2 py-0.5 text-xs font-medium text-navy">
                    {s.stage}
                  </span>
                </td>
                <td className="px-3 py-3">
                  <span
                    className={clsx(
                      'inline-flex min-w-[5rem] items-center justify-center rounded-lg border-2 px-2.5 py-1 text-xs font-bold',
                      daysColor(days),
                    )}
                  >
                    {days != null ? `${days} Days Left` : '—'}
                  </span>
                </td>
                <td className="px-3 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      className="rounded-md border border-navy/20 px-2 py-1 text-xs font-medium text-navy hover:bg-navy/5"
                      onClick={() => s.id && onEdit(s)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="rounded-md border border-navy/20 px-2 py-1 text-xs font-medium text-navy hover:bg-navy/5"
                      onClick={() => s.id && onArchive(s)}
                    >
                      Archive
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
