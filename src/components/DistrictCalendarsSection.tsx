import type { FC } from 'react'
import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import type { DistrictCalendarRecord, NonInstructionalDay } from '../types'
import {
  groupNonInstructionalDays,
  buildBreakDayEntries,
  removeBreakGroup,
  removeSingleDay,
} from '../calendarGrouping'
import { formatDisplayDate } from '../dateUtils'

function CheckRow({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold ${
          done
            ? 'border-emerald-600 bg-emerald-600 text-white'
            : 'border-navy/25 text-transparent'
        }`}
        aria-hidden
      >
        ✓
      </span>
      <span className={done ? 'text-navy' : 'text-navy/60'}>{label}</span>
    </div>
  )
}

interface Props {
  canEdit: boolean
}

export const DistrictCalendarsSection: FC<Props> = ({ canEdit }) => {
  const calendars = useLiveQuery(() => db.districtCalendars.orderBy('id').toArray(), [])

  const [newCal, setNewCal] = useState({
    name: '',
    startDate: '',
    endDate: '',
  })

  const [dayForm, setDayForm] = useState<Record<number, { date: string; label: string }>>({})
  const [breakForm, setBreakForm] = useState<
    Record<number, { start: string; end: string; label: string }>
  >({})
  const [editForm, setEditForm] = useState<
    Record<number, { name: string; startDate: string; endDate: string }>
  >({})
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [breakError, setBreakError] = useState<Record<number, string>>({})

  const addCalendar = async () => {
    if (!canEdit) return
    if (!newCal.name.trim() || !newCal.startDate || !newCal.endDate) return
    await db.districtCalendars.add({
      name: newCal.name.trim(),
      startDate: newCal.startDate,
      endDate: newCal.endDate,
      nonInstructionalDays: [],
    })
    setNewCal({ name: '', startDate: '', endDate: '' })
  }

  const saveCalendarMeta = async (cal: DistrictCalendarRecord) => {
    if (!canEdit || !cal.id) return
    const f = editForm[cal.id] ?? {
      name: cal.name,
      startDate: cal.startDate,
      endDate: cal.endDate,
    }
    if (!f.name.trim() || !f.startDate || !f.endDate) return
    await db.districtCalendars.update(cal.id, {
      name: f.name.trim(),
      startDate: f.startDate,
      endDate: f.endDate,
    })
  }

  const addNonInstructional = async (cal: DistrictCalendarRecord) => {
    if (!canEdit) return
    const id = cal.id!
    const f = dayForm[id] ?? { date: '', label: '' }
    if (!f.date) return
    const next: NonInstructionalDay[] = [
      ...(cal.nonInstructionalDays ?? []),
      { date: f.date.slice(0, 10), label: f.label.trim() || 'Day off' },
    ]
    await db.districtCalendars.update(id, { nonInstructionalDays: next })
    setDayForm((p) => ({ ...p, [id]: { date: '', label: '' } }))
  }

  const addBreak = async (cal: DistrictCalendarRecord) => {
    if (!canEdit) return
    const id = cal.id!
    const f = breakForm[id] ?? { start: '', end: '', label: '' }
    const start = f.start?.trim()
    const end = f.end?.trim()
    const label = f.label?.trim()

    setBreakError((p) => ({ ...p, [id]: '' }))

    if (!start || !end || !label) {
      setBreakError((p) => ({
        ...p,
        [id]: 'Please fill in all three fields before adding a break.',
      }))
      return
    }
    if (start > end) {
      setBreakError((p) => ({
        ...p,
        [id]: 'Please pick a first day that comes before the last day of the break.',
      }))
      return
    }

    const entries = buildBreakDayEntries(start, end, label)
    if (!entries.length) return
    const next = [...(cal.nonInstructionalDays ?? []), ...entries]
    await db.districtCalendars.update(id, { nonInstructionalDays: next })
    setBreakForm((p) => ({ ...p, [id]: { start: '', end: '', label: '' } }))
  }

  const deleteCalendar = async (calId: number) => {
    if (!canEdit) return
    if (
      !confirm(
        'Delete this district calendar? Students assigned to it will need a new calendar.',
      )
    )
      return
    await db.districtCalendars.delete(calId)
  }

  const ensureEditForm = (cal: DistrictCalendarRecord) => {
    if (!cal.id || editForm[cal.id]) return
    setEditForm((p) => ({
      ...p,
      [cal.id!]: {
        name: cal.name,
        startDate: cal.startDate,
        endDate: cal.endDate,
      },
    }))
  }

  return (
    <section className="rounded-lg border border-navy/10 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-navy">District calendars</h2>
      <p className="mt-1 text-sm text-navy/70">
        Tell the app when school is in session and when it isn&apos;t. That way the
        45-day countdown only counts real instructional days.
      </p>

      <div className="mt-6 rounded-lg border border-navy/15 bg-tli-bg p-4">
        <h3 className="text-sm font-semibold text-navy">Create a new calendar</h3>
        <p className="mt-1 text-xs text-navy/65">
          Follow the steps in order. You can create more than one calendar if you work
          with more than one district.
        </p>

        <ol className="mt-4 space-y-4 text-sm">
          <li>
            <span className="font-semibold text-navy">Step 1: Give your calendar a name</span>
            <p className="mt-0.5 text-xs text-navy/65">
              Example: &quot;HISD 2025-2026&quot;. Use your district name and school year so
              you can tell calendars apart if you serve multiple districts.
            </p>
            <input
              className="mt-2 w-full max-w-md rounded border border-navy/20 px-2 py-1.5 text-sm disabled:opacity-50"
              placeholder="e.g. HISD 2025-2026"
              value={newCal.name}
              disabled={!canEdit}
              onChange={(e) => setNewCal((p) => ({ ...p, name: e.target.value }))}
            />
          </li>
          <li>
            <span className="font-semibold text-navy">
              Step 2: Set your first day of school and last day of school
            </span>
            <p className="mt-0.5 text-xs text-navy/65">
              These are the first and last days students are in school — check your
              district&apos;s official calendar if you are not sure.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <div>
                <label className="block text-[11px] font-medium text-navy/70">
                  First day of school
                </label>
                <input
                  type="date"
                  className="rounded border border-navy/20 px-2 py-1.5 text-sm disabled:opacity-50"
                  value={newCal.startDate}
                  disabled={!canEdit}
                  onChange={(e) => setNewCal((p) => ({ ...p, startDate: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-navy/70">
                  Last day of school
                </label>
                <input
                  type="date"
                  className="rounded border border-navy/20 px-2 py-1.5 text-sm disabled:opacity-50"
                  value={newCal.endDate}
                  disabled={!canEdit}
                  onChange={(e) => setNewCal((p) => ({ ...p, endDate: e.target.value }))}
                />
              </div>
            </div>
          </li>
          <li>
            <span className="font-semibold text-navy">
              Step 3: Add days school is closed (after you save)
            </span>
            <p className="mt-0.5 text-xs text-navy/65">
              After your calendar is saved, open it below to add holidays, breaks, and
              staff development days one at a time or as a date range.
            </p>
          </li>
          <li>
            <span className="font-semibold text-navy">Step 4: Save your calendar</span>
            <div className="mt-2">
              <button
                type="button"
                disabled={!canEdit}
                className="rounded-md bg-navy px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                onClick={addCalendar}
              >
                Save calendar
              </button>
            </div>
          </li>
        </ol>
      </div>

      <ul className="mt-8 space-y-4">
        {(calendars ?? []).map((cal) => {
          const days = cal.nonInstructionalDays ?? []
          const { singles, breaks } = groupNonInstructionalDays(days)
          const hasYear = !!(cal.startDate && cal.endDate)
          const hasClosed = days.length > 0
          const ready = hasYear && hasClosed
          const isOpen = expandedId === cal.id

          return (
            <li
              key={cal.id}
              className="rounded-lg border border-navy/15 bg-tli-bg p-4 text-sm"
            >
              {!isOpen && (
                <p className="text-sm leading-relaxed text-navy/80">
                  Your calendar has been created. Now add every day school is closed. Click
                  the calendar name below to expand it and start adding days.
                </p>
              )}

              <div className={`flex flex-wrap items-stretch gap-2 sm:items-start ${!isOpen ? 'mt-3' : ''}`}>
                <button
                  type="button"
                  className="flex min-h-[48px] min-w-0 flex-1 items-start gap-2 rounded-lg border-2 border-navy/25 bg-white px-3 py-2.5 text-left shadow-sm ring-navy/10 transition hover:border-navy/45 hover:bg-white focus:outline-none focus-visible:ring-2"
                  onClick={() => {
                    setExpandedId(isOpen ? null : (cal.id as number))
                    ensureEditForm(cal)
                  }}
                  aria-expanded={isOpen}
                >
                  <span
                    className="mt-0.5 shrink-0 select-none text-base font-bold text-navy"
                    aria-hidden
                  >
                    {isOpen ? '▲' : '▼'}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-navy underline decoration-navy/30 decoration-2 underline-offset-2">
                      {cal.name}
                    </span>
                    <span className="mt-0.5 block text-sm text-navy/70">
                      School year {formatDisplayDate(cal.startDate)} –{' '}
                      {formatDisplayDate(cal.endDate)}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  disabled={!canEdit}
                  className="shrink-0 self-center rounded-md border border-navy/15 bg-white px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 sm:self-start"
                  onClick={() => deleteCalendar(cal.id!)}
                >
                  Delete calendar
                </button>
              </div>

              {isOpen && (
                <div className="mt-4 space-y-5 border-t border-navy/10 pt-4">
                  {!ready && (
                    <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
                      Finish setting up this calendar before adding students so their
                      countdowns are accurate.
                    </p>
                  )}

                  <div className="space-y-2 rounded-md border border-navy/10 bg-white p-3">
                    <CheckRow done={hasYear} label="School year dates set" />
                    <CheckRow
                      done={hasClosed}
                      label="Non-instructional days added"
                    />
                    <CheckRow
                      done={ready}
                      label={
                        ready
                          ? 'This calendar is ready. You can now add students.'
                          : 'Ready to use'
                      }
                    />
                  </div>

                  <p className="rounded-md border border-navy/10 bg-white px-3 py-2.5 text-sm text-navy/85">
                    <span className="font-semibold text-navy">Tip:</span> Add holidays one
                    at a time, or use the date range option below to add an entire break
                    like Winter Break or Spring Break all at once.
                  </p>

                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-navy/80">
                      Calendar name &amp; school year
                    </h4>
                    <input
                      className="mt-1 w-full max-w-md rounded border border-navy/20 px-2 py-1.5 text-sm disabled:opacity-50"
                      value={editForm[cal.id!]?.name ?? cal.name}
                      disabled={!canEdit}
                      onChange={(e) =>
                        setEditForm((p) => ({
                          ...p,
                          [cal.id!]: {
                            ...(p[cal.id!] ?? {
                              name: cal.name,
                              startDate: cal.startDate,
                              endDate: cal.endDate,
                            }),
                            name: e.target.value,
                          },
                        }))
                      }
                    />
                    <p className="mt-1 text-[11px] text-navy/60">
                      Use your district name and school year so you can tell calendars
                      apart if you serve multiple districts.
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <div>
                        <label className="block text-[11px] font-medium text-navy/70">
                          First day of school
                        </label>
                        <input
                          type="date"
                          className="rounded border border-navy/20 px-2 py-1 text-sm disabled:opacity-50"
                          value={editForm[cal.id!]?.startDate ?? cal.startDate}
                          disabled={!canEdit}
                          onChange={(e) =>
                            setEditForm((p) => ({
                              ...p,
                              [cal.id!]: {
                                ...(p[cal.id!] ?? {
                                  name: cal.name,
                                  startDate: cal.startDate,
                                  endDate: cal.endDate,
                                }),
                                startDate: e.target.value,
                              },
                            }))
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-navy/70">
                          Last day of school
                        </label>
                        <input
                          type="date"
                          className="rounded border border-navy/20 px-2 py-1 text-sm disabled:opacity-50"
                          value={editForm[cal.id!]?.endDate ?? cal.endDate}
                          disabled={!canEdit}
                          onChange={(e) =>
                            setEditForm((p) => ({
                              ...p,
                              [cal.id!]: {
                                ...(p[cal.id!] ?? {
                                  name: cal.name,
                                  startDate: cal.startDate,
                                  endDate: cal.endDate,
                                }),
                                endDate: e.target.value,
                              },
                            }))
                          }
                        />
                      </div>
                    </div>
                    <p className="mt-1 text-[11px] text-navy/60">
                      These are the first and last days students are in school — check your
                      district&apos;s official calendar if you are not sure.
                    </p>
                    <button
                      type="button"
                      disabled={!canEdit}
                      className="mt-2 rounded-md bg-navy px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                      onClick={() => saveCalendarMeta(cal)}
                    >
                      Save name &amp; dates
                    </button>
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold text-navy">
                      Days school is closed
                    </h4>
                    <p className="mt-1 text-xs text-navy/70">
                      Add every day students are <strong>not</strong> in school. This
                      includes holidays, winter break, spring break, Thanksgiving, staff
                      development days, and any other non-instructional days. The app uses
                      this to count only real school days toward the 45-day deadline.
                    </p>

                    <p className="mt-3 text-sm font-medium text-navy">
                      Add a single closed day
                    </p>
                    <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
                      <input
                        type="date"
                        className="min-h-[44px] rounded border border-navy/20 px-2 py-2 text-sm disabled:opacity-50 sm:min-h-0 sm:py-1 sm:text-xs"
                        value={dayForm[cal.id!]?.date ?? ''}
                        disabled={!canEdit}
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
                        className="min-h-[44px] min-w-0 flex-1 rounded border border-navy/20 px-2 py-2 text-sm disabled:opacity-50 sm:min-h-0 sm:py-1 sm:text-xs"
                        placeholder='Label (e.g. "Labor Day")'
                        value={dayForm[cal.id!]?.label ?? ''}
                        disabled={!canEdit}
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
                        disabled={!canEdit}
                        className="min-h-[44px] rounded-md bg-navy px-4 py-2 text-sm font-medium text-white disabled:opacity-50 sm:min-h-0 sm:px-3 sm:py-1 sm:text-xs"
                        onClick={() => addNonInstructional(cal)}
                      >
                        Add day
                      </button>
                    </div>

                    <div className="mt-6 border-t border-navy/15 pt-5">
                      <h5 className="text-sm font-semibold text-navy">
                        Add a break (multiple days at once)
                      </h5>
                      <p className="mt-1 text-xs text-navy/65">
                        Use this when school is closed for several days in a row.
                      </p>
                      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
                        <div className="w-full sm:w-auto">
                          <label className="block text-xs font-medium text-navy">
                            First day of break
                          </label>
                          <input
                            type="date"
                            className="mt-1 min-h-[44px] w-full rounded border border-navy/20 px-2 py-2 text-sm disabled:opacity-50 sm:min-h-0 sm:w-auto sm:py-1 sm:text-xs"
                            value={breakForm[cal.id!]?.start ?? ''}
                            disabled={!canEdit}
                            onChange={(e) => {
                              setBreakError((p) => ({ ...p, [cal.id!]: '' }))
                              setBreakForm((p) => ({
                                ...p,
                                [cal.id!]: {
                                  start: e.target.value,
                                  end: p[cal.id!]?.end ?? '',
                                  label: p[cal.id!]?.label ?? '',
                                },
                              }))
                            }}
                          />
                        </div>
                        <div className="w-full sm:w-auto">
                          <label className="block text-xs font-medium text-navy">
                            Last day of break
                          </label>
                          <input
                            type="date"
                            className="mt-1 min-h-[44px] w-full rounded border border-navy/20 px-2 py-2 text-sm disabled:opacity-50 sm:min-h-0 sm:w-auto sm:py-1 sm:text-xs"
                            value={breakForm[cal.id!]?.end ?? ''}
                            disabled={!canEdit}
                            onChange={(e) => {
                              setBreakError((p) => ({ ...p, [cal.id!]: '' }))
                              setBreakForm((p) => ({
                                ...p,
                                [cal.id!]: {
                                  start: p[cal.id!]?.start ?? '',
                                  end: e.target.value,
                                  label: p[cal.id!]?.label ?? '',
                                },
                              }))
                            }}
                          />
                        </div>
                        <div className="min-w-0 flex-1 sm:min-w-[12rem]">
                          <label className="block text-xs font-medium text-navy">
                            What is this break called?
                          </label>
                          <input
                            className="mt-1 min-h-[44px] w-full rounded border border-navy/20 px-2 py-2 text-sm disabled:opacity-50 sm:min-h-0 sm:py-1 sm:text-xs"
                            placeholder="Example: Winter Break, Spring Break, Thanksgiving Break"
                            value={breakForm[cal.id!]?.label ?? ''}
                            disabled={!canEdit}
                            onChange={(e) => {
                              setBreakError((p) => ({ ...p, [cal.id!]: '' }))
                              setBreakForm((p) => ({
                                ...p,
                                [cal.id!]: {
                                  start: p[cal.id!]?.start ?? '',
                                  end: p[cal.id!]?.end ?? '',
                                  label: e.target.value,
                                },
                              }))
                            }}
                          />
                        </div>
                        <button
                          type="button"
                          disabled={!canEdit}
                          className="min-h-[44px] shrink-0 rounded-md bg-navy px-4 py-2 text-sm font-medium text-white disabled:opacity-50 sm:min-h-0 sm:py-1 sm:text-xs"
                          onClick={() => addBreak(cal)}
                        >
                          Add break
                        </button>
                      </div>
                      {breakError[cal.id!] && (
                        <p className="mt-2 text-sm text-red-700" role="alert">
                          {breakError[cal.id!]}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-navy/60">
                      {days.length} non-instructional day{days.length === 1 ? '' : 's'} added
                      so far
                    </p>
                    <p className="mt-1 text-xs text-navy/55">
                      Compare this number to your district calendar to make sure you
                      didn&apos;t miss anything.
                    </p>

                    <div className="mt-4 space-y-5">
                      <div>
                        <h5 className="text-sm font-semibold text-navy">
                          Single days added
                        </h5>
                        {singles.length > 0 ? (
                          <ul className="mt-2 max-h-52 space-y-1 overflow-y-auto rounded border border-navy/10 bg-white p-2 text-sm">
                            {singles.map((s, si) => (
                              <li
                                key={`${s.date}-${s.label}-${si}`}
                                className="flex flex-col gap-2 rounded px-2 py-2 hover:bg-tli-bg sm:flex-row sm:items-center sm:justify-between"
                              >
                                <span className="text-navy">
                                  <span className="font-medium">
                                    {formatDisplayDate(s.date)}
                                  </span>
                                  <span className="text-navy/80"> — {s.label}</span>
                                </span>
                                <button
                                  type="button"
                                  disabled={!canEdit}
                                  className="shrink-0 self-start rounded border border-navy/15 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 sm:self-auto"
                                  onClick={async () => {
                                    await db.districtCalendars.update(cal.id!, {
                                      nonInstructionalDays: removeSingleDay(days, s),
                                    })
                                  }}
                                >
                                  Remove
                                </button>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mt-2 text-sm text-navy/55">
                            None yet — add a single closed day above if you need one-off
                            holidays.
                          </p>
                        )}
                      </div>

                      <div>
                        <h5 className="text-sm font-semibold text-navy">Breaks added</h5>
                        {breaks.length > 0 ? (
                          <ul className="mt-2 flex flex-col gap-2">
                            {breaks.map((b) => (
                              <li
                                key={b.breakGroupId}
                                className="flex flex-col gap-2 rounded-full border border-navy/20 bg-white px-4 py-3 text-sm text-navy shadow-sm sm:flex-row sm:items-center sm:justify-between sm:rounded-2xl sm:py-2"
                              >
                                <span>
                                  {b.label} — {formatDisplayDate(b.start)} to{' '}
                                  {formatDisplayDate(b.end)} ({b.dayCount}{' '}
                                  {b.dayCount === 1 ? 'day' : 'days'})
                                </span>
                                <button
                                  type="button"
                                  disabled={!canEdit}
                                  className="shrink-0 self-start rounded-md border border-navy/15 bg-tli-bg px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 sm:self-auto"
                                  onClick={async () => {
                                    await db.districtCalendars.update(cal.id!, {
                                      nonInstructionalDays: removeBreakGroup(
                                        days,
                                        b.breakGroupId,
                                      ),
                                    })
                                  }}
                                >
                                  Remove
                                </button>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mt-2 text-sm text-navy/55">
                            None yet — use &quot;Add a break&quot; above for winter break,
                            spring break, or other multi-day closures.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
