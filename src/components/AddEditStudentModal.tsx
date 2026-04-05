import type { FC, FormEvent } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import type { DisabilityArea, Grade, Stage, StudentRecord } from '../types'
import {
  allDisabilityAreas,
  addStudent,
  updateStudent,
  normalizeDisabilityArea,
  saveStudentStickyNote,
} from '../useStudents'
import {
  calculateFiiieDueDate,
  calculateArdDueDate,
  calculateDaysRemaining,
} from '../dateUtils'
import { getDaysRemaining } from '../instructionalDays'
import { db, getDistrictCalendarById } from '../db'
import { StudentTasksPanel } from './StudentTasksPanel'
import { useLicense } from '../LicenseContext'

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

function nonSchoolIsoList(cal: Awaited<ReturnType<typeof getDistrictCalendarById>>): string[] {
  if (!cal?.nonInstructionalDays?.length) return []
  return cal.nonInstructionalDays.map((d) => d.date.slice(0, 10))
}

export const AddEditStudentModal: FC<Props> = ({
  open,
  onClose,
  initialStudent,
}) => {
  const { canEditCaseload } = useLicense()
  const calendars = useLiveQuery(() => db.districtCalendars.orderBy('id').toArray(), [])

  const [initials, setInitials] = useState('')
  const [schoolName, setSchoolName] = useState('')
  const [studentId, setStudentId] = useState('')
  const [districtCalendarId, setDistrictCalendarId] = useState<number | ''>('')
  const [grade, setGrade] = useState<Grade>('K')
  const [evaluationType, setEvaluationType] = useState<'Initial' | 'Re-eval'>(
    'Initial',
  )
  const [referralDate, setReferralDate] = useState('')
  const [customDueDate, setCustomDueDate] = useState('')
  const [absenceDays, setAbsenceDays] = useState<number>(0)
  const [consentDate, setConsentDate] = useState('')
  const [evaluationDate, setEvaluationDate] = useState('')
  const [stage, setStage] = useState<Stage>('Referral')
  const [disabilityAreas, setDisabilityAreas] = useState<DisabilityArea[]>([])
  const [notes, setNotes] = useState('')
  const [stickyNote, setStickyNote] = useState('')
  const [selectedCalRecord, setSelectedCalRecord] = useState<Awaited<
    ReturnType<typeof getDistrictCalendarById>
  >>(undefined)

  useEffect(() => {
    if (!open || !districtCalendarId) {
      setSelectedCalRecord(undefined)
      return
    }
    getDistrictCalendarById(Number(districtCalendarId)).then(setSelectedCalRecord)
  }, [open, districtCalendarId])

  useEffect(() => {
    if (open) {
      const firstId = calendars?.[0]?.id
      if (initialStudent) {
        setInitials(initialStudent.initials ?? '')
        setSchoolName(initialStudent.schoolName ?? '')
        setStudentId(initialStudent.studentId ?? '')
        setDistrictCalendarId(
          initialStudent.districtCalendarId ?? firstId ?? '',
        )
        setGrade(initialStudent.grade)
        setEvaluationType(initialStudent.evaluationType)
        setReferralDate(initialStudent.referralDate ?? '')
        setCustomDueDate(initialStudent.customDueDate ?? '')
        setAbsenceDays(initialStudent.absenceDays ?? 0)
        setConsentDate(initialStudent.consentDate ?? '')
        setEvaluationDate(initialStudent.evaluationDate ?? '')
        setStage(initialStudent.stage)
        setDisabilityAreas(
          (initialStudent.disabilityAreas ?? []).map(normalizeDisabilityArea),
        )
        setNotes(initialStudent.notes ?? '')
        setStickyNote(initialStudent.stickyNote ?? '')
      } else {
        setInitials('')
        setSchoolName('')
        setStudentId('')
        setDistrictCalendarId(firstId ?? '')
        setGrade('K')
        setEvaluationType('Initial')
        setReferralDate('')
        setCustomDueDate('')
        setAbsenceDays(0)
        setConsentDate('')
        setEvaluationDate('')
        setStage('Referral')
        setDisabilityAreas([])
        setNotes('')
        setStickyNote('')
      }
    }
  }, [open, initialStudent, calendars])

  const flat = nonSchoolIsoList(selectedCalRecord)

  const { fiiieDue, ardDue, daysRemaining } = useMemo(() => {
    if (evaluationType === 'Re-eval' && customDueDate) {
      const ard = calculateArdDueDate(customDueDate)
      return {
        fiiieDue: customDueDate,
        ardDue: ard,
        daysRemaining: calculateDaysRemaining(customDueDate),
      }
    }
    if (referralDate) {
      const fiiie = calculateFiiieDueDate(
        referralDate,
        flat,
        absenceDays || 0,
      )
      const ard = calculateArdDueDate(fiiie)
      return {
        fiiieDue: fiiie,
        ardDue: ard,
        daysRemaining: calculateDaysRemaining(fiiie),
      }
    }
    return { fiiieDue: '', ardDue: '', daysRemaining: null as number | null }
  }, [evaluationType, referralDate, customDueDate, flat, absenceDays])

  const instPreview = useMemo(
    () => getDaysRemaining(consentDate || undefined, selectedCalRecord ?? null),
    [consentDate, selectedCalRecord],
  )

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!canEditCaseload) return
    if (!initials.trim()) return
    if (evaluationType === 'Initial' && !referralDate) return
    if (evaluationType === 'Re-eval' && !referralDate && !customDueDate) return
    const calId =
      districtCalendarId === '' ? undefined : Number(districtCalendarId)

    const payload = {
      initials: initials.trim(),
      schoolName: schoolName.trim() || undefined,
      studentId: studentId.trim() || undefined,
      grade,
      evaluationType,
      referralDate: referralDate || undefined,
      customDueDate: customDueDate || undefined,
      absenceDays: absenceDays || undefined,
      consentDate: consentDate || undefined,
      evaluationDate: evaluationDate || undefined,
      stage,
      disabilityAreas,
      notes: notes.trim() || undefined,
      districtCalendarId: calId,
      stickyNote: stickyNote.trim() || undefined,
    }

    if (initialStudent?.id) {
      await updateStudent(initialStudent.id, payload)
    } else {
      await addStudent(payload)
    }

    onClose()
  }

  const onStickyBlur = async () => {
    if (!canEditCaseload || !initialStudent?.id) return
    await saveStudentStickyNote(initialStudent.id, stickyNote.trim())
  }

  if (!open) return null

  const showCustomDue = evaluationType === 'Re-eval'
  const referralRequired = evaluationType === 'Initial'

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-navy/30 px-4 py-8">
      <div className="w-full max-w-2xl rounded-xl border border-navy/10 bg-white shadow-xl">
        <form onSubmit={onSubmit} className="flex max-h-[85vh] flex-col">
          <div className="flex items-start justify-between border-b border-navy/10 px-5 py-3.5">
            <div>
              <h2 className="text-base font-semibold text-navy">
                {initialStudent ? 'Edit student' : 'Add student'}
              </h2>
              <p className="mt-0.5 text-xs text-navy/70">
                Initials only in this app (FERPA). Data stays on this device.
              </p>
            </div>
            <button
              type="button"
              className="rounded-md px-2 py-1 text-xs font-medium text-navy/60 hover:bg-navy/5"
              onClick={onClose}
            >
              Close
            </button>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="flex items-center justify-between text-xs font-medium text-navy">
                  <span>Initials</span>
                  <span className="text-[11px] font-normal text-navy/50">
                    e.g. M.T.
                  </span>
                </label>
                <input
                  type="text"
                  value={initials}
                  onChange={(e) => setInitials(e.target.value.toUpperCase())}
                  className="mt-1 w-full rounded-md border border-navy/20 px-2 py-1.5 text-sm disabled:opacity-50"
                  disabled={!canEditCaseload}
                  required
                />
              </div>
              <div>
                <label className="text-xs font-medium text-navy">
                  District calendar
                </label>
                <select
                  value={districtCalendarId === '' ? '' : String(districtCalendarId)}
                  onChange={(e) =>
                    setDistrictCalendarId(
                      e.target.value ? Number(e.target.value) : '',
                    )
                  }
                  className="mt-1 w-full rounded-md border border-navy/20 px-2 py-1.5 text-sm disabled:opacity-50"
                  disabled={!canEditCaseload}
                  required
                >
                  {(calendars ?? []).length === 0 && (
                    <option value="">Add a calendar in Settings</option>
                  )}
                  {(calendars ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-navy">
                  School name (optional)
                </label>
                <input
                  type="text"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  className="mt-1 w-full rounded-md border border-navy/20 px-2 py-1.5 text-sm disabled:opacity-50"
                  disabled={!canEditCaseload}
                  placeholder="e.g. Lincoln Elementary"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-navy">
                  Local ID (optional)
                </label>
                <input
                  type="text"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  className="mt-1 w-full rounded-md border border-navy/20 px-2 py-1.5 text-sm disabled:opacity-50"
                  disabled={!canEditCaseload}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-navy">Sticky note</label>
              <textarea
                value={stickyNote}
                onChange={(e) => setStickyNote(e.target.value)}
                onBlur={onStickyBlur}
                rows={2}
                className="mt-1 w-full rounded-md border border-navy/20 px-2 py-1.5 text-sm disabled:opacity-50"
                disabled={!canEditCaseload}
                placeholder={
                  initialStudent?.id
                    ? 'Saves automatically when you leave this field.'
                    : 'Saved when you click Save below.'
                }
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="text-xs font-medium text-navy">Grade</label>
                <select
                  value={grade}
                  onChange={(e) => setGrade(e.target.value as Grade)}
                  className="mt-1 w-full rounded-md border border-navy/20 px-2 py-1.5 text-sm disabled:opacity-50"
                  disabled={!canEditCaseload}
                >
                  {grades.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-navy">
                  Evaluation type
                </label>
                <select
                  value={evaluationType}
                  onChange={(e) =>
                    setEvaluationType(e.target.value as 'Initial' | 'Re-eval')
                  }
                  className="mt-1 w-full rounded-md border border-navy/20 px-2 py-1.5 text-sm disabled:opacity-50"
                  disabled={!canEditCaseload}
                >
                  <option value="Initial">Initial</option>
                  <option value="Re-eval">Re-eval</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-navy">
                  Current stage
                </label>
                <select
                  value={stage}
                  onChange={(e) => setStage(e.target.value as Stage)}
                  className="mt-1 w-full rounded-md border border-navy/20 px-2 py-1.5 text-sm disabled:opacity-50"
                  disabled={!canEditCaseload}
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
                <label className="text-xs font-medium text-navy">
                  Referral date{' '}
                  {referralRequired ? '(required for Initial)' : '(optional for Re-eval)'}
                </label>
                <input
                  type="date"
                  value={referralDate}
                  onChange={(e) => setReferralDate(e.target.value)}
                  className="mt-1 w-full rounded-md border border-navy/20 px-2 py-1.5 text-sm disabled:opacity-50"
                  disabled={!canEditCaseload}
                  required={referralRequired}
                />
              </div>
              {showCustomDue && (
                <div>
                  <label className="text-xs font-medium text-navy">
                    Re-eval due date (optional)
                  </label>
                  <input
                    type="date"
                    value={customDueDate}
                    onChange={(e) => setCustomDueDate(e.target.value)}
                    className="mt-1 w-full rounded-md border border-navy/20 px-2 py-1.5 text-sm disabled:opacity-50"
                    disabled={!canEditCaseload}
                  />
                </div>
              )}
              <div>
                <label className="text-xs font-medium text-navy">
                  Absence days to add
                </label>
                <input
                  type="number"
                  min={0}
                  value={absenceDays || ''}
                  onChange={(e) =>
                    setAbsenceDays(Math.max(0, parseInt(e.target.value, 10) || 0))
                  }
                  className="mt-1 w-full rounded-md border border-navy/20 px-2 py-1.5 text-sm disabled:opacity-50"
                  disabled={!canEditCaseload}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-navy">
                  Consent date (drives 45 instructional-day countdown)
                </label>
                <input
                  type="date"
                  value={consentDate}
                  onChange={(e) => setConsentDate(e.target.value)}
                  className="mt-1 w-full rounded-md border border-navy/20 px-2 py-1.5 text-sm disabled:opacity-50"
                  disabled={!canEditCaseload}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-navy">
                  Evaluation date (optional)
                </label>
                <input
                  type="date"
                  value={evaluationDate}
                  onChange={(e) => setEvaluationDate(e.target.value)}
                  className="mt-1 w-full rounded-md border border-navy/20 px-2 py-1.5 text-sm disabled:opacity-50"
                  disabled={!canEditCaseload}
                />
              </div>
            </div>

            <div className="rounded-md border border-navy/15 bg-tli-bg px-3 py-2 text-xs text-navy">
              <div className="font-medium">
                45 instructional days (FIIE due from referral):{' '}
                {fiiieDue ? (
                  <span className="font-semibold">
                    {fiiieDue}
                    {daysRemaining != null && ` · ${daysRemaining} cal. days to FIIE`}
                  </span>
                ) : (
                  <span className="font-normal text-navy/50">
                    Enter referral date (or Re-eval due date).
                  </span>
                )}
              </div>
              <div className="mt-1 font-medium">
                ARD due (30 calendar days after FIIE):{' '}
                {ardDue ? (
                  <span className="font-semibold">{ardDue}</span>
                ) : (
                  <span className="font-normal text-navy/50">—</span>
                )}
              </div>
              <div className="mt-2 border-t border-navy/10 pt-2 font-medium">
                45-day countdown from consent:{' '}
                {instPreview.tier === 'no_calendar' && (
                  <span className="text-amber-700">Select a district calendar.</span>
                )}
                {instPreview.tier === 'no_consent' && (
                  <span className="text-navy/50">Add consent date.</span>
                )}
                {(instPreview.tier === 'ok' ||
                  instPreview.tier === 'warning' ||
                  instPreview.tier === 'urgent') && (
                  <span>
                    {instPreview.remaining} instructional days left (
                    {instPreview.tier})
                  </span>
                )}
              </div>
            </div>

            <div>
              <div className="text-xs font-medium text-navy">Disability areas</div>
              <div className="mt-1 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
                {allDisabilityAreas.map((area) => {
                  const checked = disabilityAreas.includes(area)
                  return (
                    <label
                      key={area}
                      className={`flex items-center gap-1.5 rounded-md border border-navy/15 bg-white px-2 py-1.5 ${
                        canEditCaseload ? 'cursor-pointer hover:bg-tli-bg' : 'cursor-not-allowed opacity-60'
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5 rounded border-navy/30 text-navy"
                        checked={checked}
                        disabled={!canEditCaseload}
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
              <label className="text-xs font-medium text-navy">Notes (optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-md border border-navy/20 px-2 py-1.5 text-sm disabled:opacity-50"
                disabled={!canEditCaseload}
                placeholder="Short context, key dates, or reminders."
              />
            </div>

            {initialStudent?.id && (
              <StudentTasksPanel
                studentId={initialStudent.id}
                initials={initialStudent.initials}
                canEdit={canEditCaseload}
              />
            )}
          </div>

          <div className="flex justify-end gap-2 border-t border-navy/10 px-5 py-3">
            <button
              type="button"
              className="rounded-md border border-navy/20 px-3 py-1.5 text-xs font-medium text-navy hover:bg-navy/5"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md bg-navy px-3 py-1.5 text-xs font-semibold text-white hover:bg-navy-light disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!canEditCaseload}
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
