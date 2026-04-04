import type { FC } from 'react'
import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, saveDefaultTaskTemplate, getDefaultTaskTemplate } from '../db'
import type { DistrictCalendarRecord, NonInstructionalDay } from '../types'

export const SettingsView: FC = () => {
  const calendars = useLiveQuery(() => db.districtCalendars.orderBy('id').toArray(), [])
  const [tplRows, setTplRows] = useState<{ text: string }[]>([])

  const [newCal, setNewCal] = useState({
    name: '',
    startDate: '',
    endDate: '',
  })
  const [dayForm, setDayForm] = useState<Record<number, { date: string; label: string }>>({})
  const [expandedId, setExpandedId] = useState<number | null>(null)

  useEffect(() => {
    getDefaultTaskTemplate().then((t) => {
      setTplRows(t.tasks.map((x) => ({ text: x.text })))
    })
  }, [])

  const addCalendar = async () => {
    if (!newCal.name.trim() || !newCal.startDate || !newCal.endDate) return
    await db.districtCalendars.add({
      name: newCal.name.trim(),
      startDate: newCal.startDate,
      endDate: newCal.endDate,
      nonInstructionalDays: [],
    })
    setNewCal({ name: '', startDate: '', endDate: '' })
  }

  const addNonInstructional = async (cal: DistrictCalendarRecord) => {
    const id = cal.id!
    const f = dayForm[id] ?? { date: '', label: '' }
    if (!f.date) return
    const next: NonInstructionalDay[] = [
      ...(cal.nonInstructionalDays ?? []),
      { date: f.date.slice(0, 10), label: f.label.trim() || 'Non-instructional' },
    ]
    await db.districtCalendars.update(id, { nonInstructionalDays: next })
    setDayForm((p) => ({ ...p, [id]: { date: '', label: '' } }))
  }

  const removeDay = async (cal: DistrictCalendarRecord, idx: number) => {
    const next = [...(cal.nonInstructionalDays ?? [])]
    next.splice(idx, 1)
    await db.districtCalendars.update(cal.id!, { nonInstructionalDays: next })
  }

  const deleteCalendar = async (id: number) => {
    if (!confirm('Delete this district calendar? Students using it will need a new assignment.'))
      return
    await db.districtCalendars.delete(id)
  }

  const saveTemplate = async () => {
    await saveDefaultTaskTemplate(tplRows.filter((r) => r.text.trim()).map((r) => ({ text: r.text.trim() })))
    alert('Default task template saved. New students only.')
  }

  const moveTpl = (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= tplRows.length) return
    const next = [...tplRows]
    ;[next[i], next[j]] = [next[j], next[i]]
    setTplRows(next)
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-6">
      <section className="rounded-lg border border-navy/10 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-navy">District calendars</h2>
        <p className="mt-1 text-sm text-navy/70">
          Configure one or more calendars. Add non-instructional days one at a time (holidays, breaks).
        </p>

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <input
            className="rounded border border-navy/20 px-2 py-1.5 text-sm"
            placeholder="Calendar name"
            value={newCal.name}
            onChange={(e) => setNewCal((p) => ({ ...p, name: e.target.value }))}
          />
          <input
            type="date"
            className="rounded border border-navy/20 px-2 py-1.5 text-sm"
            value={newCal.startDate}
            onChange={(e) => setNewCal((p) => ({ ...p, startDate: e.target.value }))}
          />
          <input
            type="date"
            className="rounded border border-navy/20 px-2 py-1.5 text-sm"
            value={newCal.endDate}
            onChange={(e) => setNewCal((p) => ({ ...p, endDate: e.target.value }))}
          />
        </div>
        <button
          type="button"
          className="mt-2 rounded-md bg-navy px-3 py-1.5 text-sm font-medium text-white"
          onClick={addCalendar}
        >
          Add calendar
        </button>

        <ul className="mt-6 space-y-3">
          {(calendars ?? []).map((cal) => (
            <li
              key={cal.id}
              className="rounded-md border border-navy/15 bg-tli-bg p-3 text-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  className="text-left font-semibold text-navy"
                  onClick={() =>
                    setExpandedId(expandedId === cal.id ? null : (cal.id as number))
                  }
                >
                  {cal.name}{' '}
                  <span className="font-normal text-navy/60">
                    ({cal.startDate} – {cal.endDate})
                  </span>
                </button>
                <button
                  type="button"
                  className="text-xs text-red-600"
                  onClick={() => deleteCalendar(cal.id!)}
                >
                  Delete
                </button>
              </div>
              {expandedId === cal.id && (
                <div className="mt-3 space-y-2 border-t border-navy/10 pt-3">
                  <div className="flex flex-wrap gap-2">
                    <input
                      type="date"
                      className="rounded border border-navy/20 px-2 py-1 text-xs"
                      value={dayForm[cal.id!]?.date ?? ''}
                      onChange={(e) =>
                        setDayForm((p) => ({
                          ...p,
                          [cal.id!]: {
                            date: e.target.value,
                            label: p[cal.id!]?.label ?? '',
                          },
                        }))
                      }
                    />
                    <input
                      className="min-w-[8rem] flex-1 rounded border border-navy/20 px-2 py-1 text-xs"
                      placeholder="Label (e.g. Labor Day)"
                      value={dayForm[cal.id!]?.label ?? ''}
                      onChange={(e) =>
                        setDayForm((p) => ({
                          ...p,
                          [cal.id!]: {
                            date: p[cal.id!]?.date ?? '',
                            label: e.target.value,
                          },
                        }))
                      }
                    />
                    <button
                      type="button"
                      className="rounded bg-navy px-2 py-1 text-xs text-white"
                      onClick={() => addNonInstructional(cal)}
                    >
                      Add day
                    </button>
                  </div>
                  <ul className="max-h-40 space-y-1 overflow-y-auto text-xs">
                    {(cal.nonInstructionalDays ?? []).map((d, idx) => (
                      <li
                        key={`${d.date}-${idx}`}
                        className="flex justify-between gap-2 rounded bg-white px-2 py-1"
                      >
                        <span>
                          {d.date} — {d.label}
                        </span>
                        <button
                          type="button"
                          className="text-red-600"
                          onClick={() => removeDay(cal, idx)}
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-lg border border-navy/10 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-navy">Default task template</h2>
        <p className="mt-1 text-sm text-navy/70">
          Reorder, edit, or remove tasks. Applies to <strong>new students only</strong>.
        </p>
        <ul className="mt-4 space-y-2">
          {tplRows.map((row, i) => (
            <li key={i} className="flex items-center gap-2">
              <div className="flex flex-col gap-0.5">
                <button
                  type="button"
                  className="text-[10px] text-navy/60"
                  onClick={() => moveTpl(i, -1)}
                  disabled={i === 0}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="text-[10px] text-navy/60"
                  onClick={() => moveTpl(i, 1)}
                  disabled={i === tplRows.length - 1}
                >
                  ↓
                </button>
              </div>
              <input
                className="min-w-0 flex-1 rounded border border-navy/20 px-2 py-1 text-sm"
                value={row.text}
                onChange={(e) =>
                  setTplRows((rows) =>
                    rows.map((r, j) => (j === i ? { text: e.target.value } : r)),
                  )
                }
              />
              <button
                type="button"
                className="text-xs text-red-600"
                onClick={() => setTplRows((rows) => rows.filter((_, j) => j !== i))}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          className="mt-2 text-sm text-navy underline"
          onClick={() => setTplRows((r) => [...r, { text: '' }])}
        >
          + Add task line
        </button>
        <div className="mt-4">
          <button
            type="button"
            className="rounded-md bg-gold px-4 py-2 text-sm font-semibold text-navy"
            onClick={saveTemplate}
          >
            Save template
          </button>
        </div>
      </section>
    </div>
  )
}
