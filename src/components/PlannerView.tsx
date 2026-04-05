import type { FC } from 'react'
import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  addMonths,
  endOfMonth,
  format,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
  eachDayOfInterval,
  endOfWeek,
} from 'date-fns'
import { db, getDistrictCalendarById } from '../db'
import type { PlannerGlobalCategory, PlannerGlobalTask } from '../types'
import { getEvalDueInstructional } from '../instructionalDays'
import { useLicense } from '../LicenseContext'

type DayMarks = { evalInitials: string[]; meetingInitials: string[] }

const CORAL = '#E87A5D'
const PURPLE = '#7C3AED'

export const PlannerView: FC = () => {
  const { canEditCaseload } = useLicense()
  const [cursor, setCursor] = useState(() => new Date())
  const [globalText, setGlobalText] = useState('')
  const [globalDue, setGlobalDue] = useState('')
  const [globalCat, setGlobalCat] = useState<PlannerGlobalCategory>('Admin')
  const [showGlobalDone, setShowGlobalDone] = useState(false)

  const monthKey = format(cursor, 'yyyy-MM')

  const dayMarks = useLiveQuery(async () => {
    const map: Record<string, DayMarks> = {}
    const bump = (iso: string, field: 'evalInitials' | 'meetingInitials', ini: string) => {
      if (!map[iso]) map[iso] = { evalInitials: [], meetingInitials: [] }
      const arr = map[iso][field]
      if (!arr.includes(ini)) arr.push(ini)
    }

    const students = await db.students.filter((s) => !s.archived).toArray()
    for (const s of students) {
      if (!s.consentDate || !s.districtCalendarId) continue
      const cal = await getDistrictCalendarById(s.districtCalendarId)
      if (!cal) continue
      try {
        const due = getEvalDueInstructional(s.consentDate.slice(0, 10), cal)
        if (isSameMonth(parseISO(due), cursor)) bump(due, 'evalInitials', s.initials)
      } catch {
        /* ignore */
      }
    }

    const links = await db.plannerMeetingLinks.toArray()
    for (const l of links) {
      const d = l.dueDate.slice(0, 10)
      if (isSameMonth(parseISO(d), cursor)) bump(d, 'meetingInitials', l.initials)
    }

    return map
  }, [monthKey, cursor])

  const plannerTasks = useLiveQuery(() => db.plannerTasks.orderBy('dueDate').toArray(), [])

  const monthStart = startOfMonth(cursor)
  const monthEnd = endOfMonth(cursor)
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 })
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd })

  const addGlobalTask = async () => {
    if (!canEditCaseload || !globalText.trim() || !globalDue) return
    await db.plannerTasks.add({
      text: globalText.trim(),
      dueDate: globalDue,
      category: globalCat,
      completed: false,
      createdAt: Date.now(),
    })
    setGlobalText('')
    setGlobalDue('')
  }

  const toggleGlobal = async (t: PlannerGlobalTask) => {
    if (!canEditCaseload || !t.id) return
    await db.plannerTasks.update(t.id, { completed: !t.completed })
  }

  const activeGlobal = useMemo(
    () => (plannerTasks ?? []).filter((t) => !t.completed),
    [plannerTasks],
  )
  const doneGlobal = useMemo(
    () => (plannerTasks ?? []).filter((t) => t.completed),
    [plannerTasks],
  )

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-navy">Planner</h2>
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded border border-navy/20 px-2 py-1 text-sm text-navy"
            onClick={() => setCursor((d) => addMonths(d, -1))}
          >
            ←
          </button>
          <span className="min-w-[10rem] text-center text-sm font-medium text-navy">
            {format(cursor, 'MMMM yyyy')}
          </span>
          <button
            type="button"
            className="rounded border border-navy/20 px-2 py-1 text-sm text-navy"
            onClick={() => setCursor((d) => addMonths(d, 1))}
          >
            →
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-navy/10 bg-white p-3 shadow-sm">
        <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase text-navy/60">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {days.map((day) => {
            const iso = format(day, 'yyyy-MM-dd')
            const inMonth = isSameMonth(day, cursor)
            const m = dayMarks?.[iso]
            return (
              <div
                key={iso}
                className={`min-h-[4rem] rounded border border-navy/10 p-1 text-xs ${
                  inMonth ? 'bg-white' : 'bg-tli-bg text-navy/40'
                }`}
              >
                <div className="font-medium text-navy">{format(day, 'd')}</div>
                {m && (
                  <div className="mt-0.5 flex flex-col gap-0.5 text-[9px] leading-tight">
                    {m.evalInitials.map((ini) => (
                      <span key={`e-${ini}-${iso}`} className="flex items-center gap-0.5 text-navy/80">
                        <span
                          className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
                          style={{ backgroundColor: CORAL }}
                        />
                        {ini}
                      </span>
                    ))}
                    {m.meetingInitials.map((ini) => (
                      <span key={`m-${ini}-${iso}`} className="flex items-center gap-0.5 text-navy/80">
                        <span
                          className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
                          style={{ backgroundColor: PURPLE }}
                        />
                        {ini}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-navy/80">
          <span>
            <span
              className="mr-1 inline-block h-2 w-2 rounded-full align-middle"
              style={{ backgroundColor: CORAL }}
            />
            Eval due (45th instructional day)
          </span>
          <span>
            <span
              className="mr-1 inline-block h-2 w-2 rounded-full align-middle"
              style={{ backgroundColor: PURPLE }}
            />
            ARD/IEP from to-do
          </span>
        </div>
      </div>

      <section className="rounded-lg border border-navy/10 bg-white p-4 shadow-sm">
        <h3 className="font-semibold text-navy">Global to-do list</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          <input
            className="min-w-[8rem] flex-1 rounded border border-navy/20 px-2 py-1.5 text-sm disabled:opacity-50"
            placeholder="Task"
            value={globalText}
            disabled={!canEditCaseload}
            onChange={(e) => setGlobalText(e.target.value)}
          />
          <input
            type="date"
            className="rounded border border-navy/20 px-2 py-1.5 text-sm disabled:opacity-50"
            value={globalDue}
            disabled={!canEditCaseload}
            onChange={(e) => setGlobalDue(e.target.value)}
          />
          <select
            className="rounded border border-navy/20 px-2 py-1.5 text-sm disabled:opacity-50"
            value={globalCat}
            disabled={!canEditCaseload}
            onChange={(e) => setGlobalCat(e.target.value as PlannerGlobalCategory)}
          >
            <option value="Eval">Eval</option>
            <option value="Admin">Admin</option>
            <option value="Meeting">Meeting</option>
            <option value="Campus Visit">Campus Visit</option>
          </select>
          <button
            type="button"
            className="rounded bg-navy px-3 py-1.5 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50"
            onClick={addGlobalTask}
            disabled={!canEditCaseload}
          >
            Add
          </button>
        </div>
        <ul className="mt-3 space-y-2 text-sm">
          {activeGlobal.map((t) => (
            <li
              key={t.id}
              className="flex flex-wrap items-center gap-2 rounded border border-navy/10 px-2 py-1.5"
            >
              <input
                type="checkbox"
                checked={false}
                disabled={!canEditCaseload}
                onChange={() => toggleGlobal(t)}
              />
              <span className="text-navy">{t.text}</span>
              <span className="text-xs text-navy/60">{t.dueDate}</span>
              <span className="rounded bg-navy/10 px-1.5 text-xs">{t.category}</span>
            </li>
          ))}
        </ul>
        {doneGlobal.length > 0 && (
          <div className="mt-2">
            <button
              type="button"
              className="text-xs text-navy/70 underline"
              onClick={() => setShowGlobalDone(!showGlobalDone)}
            >
              {showGlobalDone ? 'Hide' : 'Show'} completed ({doneGlobal.length})
            </button>
            {showGlobalDone && (
              <ul className="mt-1 space-y-1 text-xs text-navy/50 line-through">
                {doneGlobal.map((t) => (
                  <li key={t.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked
                      disabled={!canEditCaseload}
                      onChange={() => toggleGlobal(t)}
                    />
                    {t.text}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
