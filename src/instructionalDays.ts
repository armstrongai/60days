import { addDays, format, isAfter, isBefore, isWeekend, parseISO } from 'date-fns'
import type { DistrictCalendarRecord } from './types'

const INSTRUCTIONAL_WINDOW = 45

function toISODate(d: Date): string {
  return format(d, 'yyyy-MM-dd')
}

/** Dates that are non-instructional (from calendar list). */
function nonInstructionalSet(calendar: DistrictCalendarRecord | null | undefined): Set<string> {
  const set = new Set<string>()
  for (const row of calendar?.nonInstructionalDays ?? []) {
    if (row?.date) set.add(row.date.slice(0, 10))
  }
  return set
}

/**
 * Walk day by day from startDate to endDate (inclusive).
 * Skips weekends and dates in the district non-instructional list.
 */
export function countInstructionalDays(
  startDate: string,
  endDate: string,
  districtCalendar: DistrictCalendarRecord | null | undefined,
): number {
  if (!startDate || !endDate) return 0
  let start = parseISO(startDate.slice(0, 10))
  const end = parseISO(endDate.slice(0, 10))
  if (isBefore(end, start)) return 0
  const skip = nonInstructionalSet(districtCalendar ?? null)
  let count = 0
  let d = start
  while (!isAfter(d, end)) {
    const iso = toISODate(d)
    if (!isWeekend(d) && !skip.has(iso)) count += 1
    d = addDays(d, 1)
  }
  return count
}

export type UrgencyTier = 'ok' | 'warning' | 'urgent'

export interface DaysRemainingResult {
  remaining: number | null
  tier: UrgencyTier | 'none' | 'no_calendar' | 'no_consent'
}

/**
 * Uses today as end date. Returns 45 minus instructional days elapsed since consentDate.
 * Tier: ok (30+), warning (15–29), urgent (&lt;15).
 */
export function getDaysRemaining(
  consentDate: string | null | undefined,
  districtCalendar: DistrictCalendarRecord | null | undefined,
): DaysRemainingResult {
  if (!districtCalendar) {
    return { remaining: null, tier: 'no_calendar' }
  }
  if (!consentDate) {
    return { remaining: null, tier: 'no_consent' }
  }
  const today = toISODate(new Date())
  const elapsed = countInstructionalDays(consentDate.slice(0, 10), today, districtCalendar)
  const remaining = INSTRUCTIONAL_WINDOW - elapsed
  let tier: UrgencyTier
  if (remaining >= 30) tier = 'ok'
  else if (remaining >= 15) tier = 'warning'
  else tier = 'urgent'
  return { remaining, tier }
}

/** Date of the Nth instructional day on or after start (N >= 1). */
export function addInstructionalDays(
  startDate: string,
  count: number,
  districtCalendar: DistrictCalendarRecord | null | undefined,
): string {
  if (!startDate || count <= 0) return startDate
  const skip = nonInstructionalSet(districtCalendar ?? null)
  let d = parseISO(startDate.slice(0, 10))
  let remaining = count
  while (remaining > 0) {
    const iso = toISODate(d)
    if (!isWeekend(d) && !skip.has(iso)) {
      remaining -= 1
      if (remaining === 0) return iso
    }
    d = addDays(d, 1)
  }
  return toISODate(d)
}

/** 45th instructional day from consent (eval due for planner). */
export function getEvalDueInstructional(consentDate: string, calendar: DistrictCalendarRecord): string {
  return addInstructionalDays(consentDate, INSTRUCTIONAL_WINDOW, calendar)
}

export function isArdOrIepMeetingTask(text: string): boolean {
  return /ard|iep|meeting/i.test(text)
}
