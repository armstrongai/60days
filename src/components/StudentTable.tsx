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

function daysColor(days: number | null | undefined) {
  if (days == null) return 'bg-slate-100 text-slate-800'
  if (days <= 7) return 'bg-red-100 text-red-900'
  if (days <= 14) return 'bg-orange-100 text-orange-900'
  if (days <= 30) return 'bg-yellow-100 text-yellow-900'
  return 'bg-emerald-100 text-emerald-900'
}

export const StudentTable: FC<Props> = ({ students, onEdit, onArchive }) => {
  if (!students.length) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
        <div className="text-base font-semibold text-slate-900">
          No students on your caseload yet.
        </div>
        <div className="mt-1 text-sm text-slate-600">
          When you add students, you&apos;ll see urgency colors, stages, and days
          remaining here.
        </div>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <th className="px-4 py-3">Student</th>
            <th className="px-3 py-3">Eval type</th>
            <th className="px-3 py-3">Disability areas</th>
            <th className="px-3 py-3">Timeline</th>
            <th className="px-3 py-3">Stage</th>
            <th className="px-3 py-3">Days remaining</th>
            <th className="px-3 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-sm">
          {students.map((s) => {
            const days =
              (s as any).daysRemaining ?? calculateDaysRemaining(s.deadlineDate)
            return (
              <tr key={s.id} className="hover:bg-slate-50/80">
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-900">
                    {s.fullName?.trim() || s.initials}
                  </div>
                  <div className="text-xs text-slate-600">
                    {s.studentId ? `ID ${s.studentId} · ` : ''}
                    {s.grade}
                    {s.schoolName?.trim() && ` · ${s.schoolName}`}
                  </div>
                </td>
                <td className="px-3 py-3">
                  <span className="inline-flex rounded-full bg-slate-900/90 px-2 py-0.5 text-xs font-medium text-white">
                    {s.evaluationType}
                  </span>
                </td>
                <td className="px-3 py-3">
                  <div className="flex flex-wrap gap-1">
                    {s.disabilityAreas.map((d) => (
                      <span
                        key={d}
                        className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-800"
                      >
                        {getDisabilityLabel(d)}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-3 py-3">
                  <div className="mb-1">
                    <StagePipeline stage={s.stage} />
                  </div>
                  <div className="text-xs text-slate-600">
                    FIIE due {formatDisplayDate(s.deadlineDate)}
                  </div>
                  {s.ardDueDate && (
                    <div className="text-xs text-slate-500">
                      ARD due {formatDisplayDate(s.ardDueDate)}
                    </div>
                  )}
                </td>
                <td className="px-3 py-3">
                  <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-800">
                    {s.stage}
                  </span>
                </td>
                <td className="px-3 py-3">
                  <span
                    className={clsx(
                      'inline-flex min-w-[4.25rem] items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold',
                      daysColor(days),
                    )}
                  >
                    {days != null ? `${days} days` : '—'}
                  </span>
                </td>
                <td className="px-3 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-800 hover:bg-slate-50"
                      onClick={() => s.id && onEdit(s)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-800 hover:bg-slate-50"
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

