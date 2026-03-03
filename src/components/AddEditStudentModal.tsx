import type { FC, FormEvent } from 'react'
import { useEffect, useMemo, useState } from 'react'
import type { DisabilityArea, Grade, Stage, StudentRecord } from '../types'
import { allDisabilityAreas, addStudent, updateStudent } from '../useStudents'
import { calculateDeadlineDate, calculateDaysRemaining } from '../dateUtils'

interface Props {
  open: boolean
  onClose: () => void
  initialStudent?: StudentRecord | null
}

const grades: Grade[] = [
  'PK',
  'K',
  '1st',
  '2nd',
  '3rd',
  '4th',
  '5th',
  '6th',
  '7th',
  '8th',
  '9th',
  '10th',
  '11th',
  '12th',
]

const stages: Stage[] = [
  'Referral',
  'Consent',
  'Testing',
  'Report Writing',
  'ARD Pending',
  'Complete',
]

export const AddEditStudentModal: FC<Props> = ({ open, onClose, initialStudent }) => {
  const [initials, setInitials] = useState('')
  const [studentId, setStudentId] = useState('')
  const [grade, setGrade] = useState<Grade>('K')
  const [evaluationType, setEvaluationType] = useState<'Initial' | 'Re-eval'>(
    'Initial',
  )
  const [referralDate, setReferralDate] = useState('')
  const [consentDate, setConsentDate] = useState('')
  const [evaluationDate, setEvaluationDate] = useState('')
  const [stage, setStage] = useState<Stage>('Referral')
  const [disabilityAreas, setDisabilityAreas] = useState<DisabilityArea[]>([])
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (open) {
      if (initialStudent) {
        setInitials(initialStudent.initials ?? '')
        setStudentId(initialStudent.studentId ?? '')
        setGrade(initialStudent.grade)
        setEvaluationType(initialStudent.evaluationType)
        setReferralDate(initialStudent.referralDate ?? '')
        setConsentDate(initialStudent.consentDate ?? '')
        setEvaluationDate(initialStudent.evaluationDate ?? '')
        setStage(initialStudent.stage)
        setDisabilityAreas(initialStudent.disabilityAreas ?? [])
        setNotes(initialStudent.notes ?? '')
      } else {
        setInitials('')
        setStudentId('')
        setGrade('K')
        setEvaluationType('Initial')
        setReferralDate('')
        setConsentDate('')
        setEvaluationDate('')
        setStage('Referral')
        setDisabilityAreas([])
        setNotes('')
      }
    }
  }, [open, initialStudent])

  const deadlineDate = useMemo(
    () => calculateDeadlineDate(referralDate),
    [referralDate],
  )
  const daysRemaining = useMemo(
    () => calculateDaysRemaining(deadlineDate),
    [deadlineDate],
  )

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!referralDate || !initials.trim()) return

    const payload = {
      initials: initials.trim(),
      studentId: studentId.trim() || undefined,
      grade,
      evaluationType,
      referralDate,
      consentDate: consentDate || undefined,
      evaluationDate: evaluationDate || undefined,
      stage,
      disabilityAreas,
      notes: notes.trim() || undefined,
    }

    if (initialStudent?.id) {
      await updateStudent(initialStudent.id, payload)
    } else {
      await addStudent(payload)
    }

    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-slate-900/30 px-4 py-8">
      <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white shadow-xl">
        <form onSubmit={onSubmit} className="flex max-h-[80vh] flex-col">
          <div className="flex items-start justify-between border-b border-slate-200 px-5 py-3.5">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                {initialStudent ? 'Edit student' : 'Add student'}
              </h2>
              <p className="mt-0.5 text-xs text-slate-600">
                Student privacy first: use initials only, no full names.
              </p>
            </div>
            <button
              type="button"
              className="rounded-md px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-50"
              onClick={onClose}
            >
              Close
            </button>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="flex items-center justify-between text-xs font-medium text-slate-700">
                  <span>Student initials</span>
                  <span className="text-[11px] font-normal text-slate-500">
                    e.g. &quot;M.T.&quot;
                  </span>
                </label>
                <input
                  type="text"
                  value={initials}
                  onChange={(e) => setInitials(e.target.value.toUpperCase())}
                  className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700">
                  Local ID (optional)
                </label>
                <input
                  type="text"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="text-xs font-medium text-slate-700">Grade</label>
                <select
                  value={grade}
                  onChange={(e) => setGrade(e.target.value as Grade)}
                  className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                >
                  {grades.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700">
                  Evaluation type
                </label>
                <select
                  value={evaluationType}
                  onChange={(e) =>
                    setEvaluationType(e.target.value as 'Initial' | 'Re-eval')
                  }
                  className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                >
                  <option value="Initial">Initial</option>
                  <option value="Re-eval">Re-eval</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700">
                  Current stage
                </label>
                <select
                  value={stage}
                  onChange={(e) => setStage(e.target.value as Stage)}
                  className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                >
                  {stages.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="text-xs font-medium text-slate-700">
                  Referral date
                </label>
                <input
                  type="date"
                  value={referralDate}
                  onChange={(e) => setReferralDate(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700">
                  Consent date (optional)
                </label>
                <input
                  type="date"
                  value={consentDate}
                  onChange={(e) => setConsentDate(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700">
                  Evaluation date (optional)
                </label>
                <input
                  type="date"
                  value={evaluationDate}
                  onChange={(e) => setEvaluationDate(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                />
              </div>
            </div>

            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
              <div className="font-medium">
                60-day deadline:{' '}
                {deadlineDate ? (
                  <span className="font-semibold">
                    {deadlineDate} {daysRemaining != null && `· ${daysRemaining} days remaining`}
                  </span>
                ) : (
                  <span className="font-normal text-slate-500">
                    Choose a referral date to see the deadline.
                  </span>
                )}
              </div>
            </div>

            <div>
              <div className="text-xs font-medium text-slate-700">
                Disability areas
              </div>
              <div className="mt-1 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
                {allDisabilityAreas.map((area) => {
                  const checked = disabilityAreas.includes(area)
                  return (
                    <label
                      key={area}
                      className="flex cursor-pointer items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 py-1.5 hover:bg-slate-50"
                    >
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900"
                        checked={checked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setDisabilityAreas([...disabilityAreas, area])
                          } else {
                            setDisabilityAreas(
                              disabilityAreas.filter((d) => d !== area),
                            )
                          }
                        }}
                      />
                      <span>{area}</span>
                    </label>
                  )
                })}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-700">
                Notes (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                placeholder="Short context, key dates, or reminders."
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-3">
            <button
              type="button"
              className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

