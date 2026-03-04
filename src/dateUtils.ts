import {
  addDays,
  differenceInCalendarDays,
  parseISO,
  format,
  isWeekend,
} from 'date-fns'

const SCHOOL_DAYS_FOR_INITIAL = 45
const CALENDAR_DAYS_ARD_AFTER_FIIE = 30

/** Normalize to YYYY-MM-DD. */
function toISODate(d: Date): string {
  return format(d, 'yyyy-MM-dd')
}

/**
 * Count forward N school days from start, skipping weekends and non-school days.
 * Returns the date of the Nth school day.
 */
export function addSchoolDays(
  startDate: string,
  count: number,
  nonSchoolDays: string[] = [],
): string {
  if (!startDate || count <= 0) return startDate
  const set = new Set(nonSchoolDays)
  let d = parseISO(startDate)
  let remaining = count
  while (remaining > 0) {
    const iso = toISODate(d)
    const isSchoolDay = !isWeekend(d) && !set.has(iso)
    if (isSchoolDay) remaining -= 1
    if (remaining === 0) return iso
    d = addDays(d, 1)
  }
  return toISODate(d)
}

/** Add N calendar days to a date string. */
export function addCalendarDays(dateStr: string, days: number): string {
  if (!dateStr) return ''
  return toISODate(addDays(parseISO(dateStr), days))
}

/**
 * FIIE due = referral date + 45 school days (plus optional absence days).
 * Uses district calendar to skip holidays/non-school days.
 */
export function calculateFiiieDueDate(
  referralDate: string,
  nonSchoolDays: string[],
  absenceDays: number = 0,
): string {
  return addSchoolDays(referralDate, SCHOOL_DAYS_FOR_INITIAL + absenceDays, nonSchoolDays)
}

/** ARD due = FIIE due date + 30 calendar days. */
export function calculateArdDueDate(fiiieDueDate: string): string {
  return addCalendarDays(fiiieDueDate, CALENDAR_DAYS_ARD_AFTER_FIIE)
}

export function calculateDaysRemaining(
  deadlineDate: string | null | undefined,
): number | null {
  if (!deadlineDate) return null
  const deadline = parseISO(deadlineDate)
  const today = new Date()
  return differenceInCalendarDays(deadline, today)
}

export function formatDisplayDate(iso: string | undefined | null): string {
  if (!iso) return ''
  try {
    return parseISO(iso).toLocaleDateString(undefined, {
      year: '2-digit',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return iso
  }
}

/** Parse CSV: one date per line (YYYY-MM-DD) or header "date". */
export function parseCalendarFile(text: string): string[] {
  const lines = text.trim().split(/\r?\n/)
  const dates: string[] = []
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    const lower = line.toLowerCase()
    if (lower === 'date' && i === 0) continue // skip header
    const match = line.match(/^(\d{4}-\d{2}-\d{2})/)
    if (match) {
      dates.push(match[1])
    }
  }
  return [...new Set(dates)].sort()
}
