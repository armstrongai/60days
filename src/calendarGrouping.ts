import {
  eachDayOfInterval,
  format,
  parseISO,
  differenceInCalendarDays,
} from 'date-fns'
import type { NonInstructionalDay } from './types'

export interface BreakGroupDisplay {
  breakGroupId: string
  label: string
  start: string
  end: string
  /** Inclusive count of calendar days in the break (including weekends). */
  dayCount: number
}

export function groupNonInstructionalDays(days: NonInstructionalDay[]): {
  singles: NonInstructionalDay[]
  breaks: BreakGroupDisplay[]
} {
  const singles: NonInstructionalDay[] = []
  const breakMap = new Map<string, NonInstructionalDay[]>()

  for (const d of days) {
    if (d.breakGroupId) {
      const arr = breakMap.get(d.breakGroupId) ?? []
      arr.push(d)
      breakMap.set(d.breakGroupId, arr)
    } else {
      singles.push(d)
    }
  }

  singles.sort((a, b) => a.date.localeCompare(b.date))

  const breaks: BreakGroupDisplay[] = [...breakMap.entries()].map(([, arr]) => {
    const sorted = [...arr].sort((a, b) => a.date.localeCompare(b.date))
    const startIso = sorted[0]!.date.slice(0, 10)
    const endIso = sorted[sorted.length - 1]!.date.slice(0, 10)
    const dayCount =
      differenceInCalendarDays(parseISO(endIso), parseISO(startIso)) + 1
    return {
      breakGroupId: sorted[0]!.breakGroupId!,
      label: sorted[0]!.label,
      start: startIso,
      end: endIso,
      dayCount,
    }
  })
  breaks.sort((a, b) => a.start.localeCompare(b.start))

  return { singles, breaks }
}

export function buildBreakDayEntries(
  start: string,
  end: string,
  label: string,
): NonInstructionalDay[] {
  const groupId =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `brk-${Date.now()}-${Math.random().toString(36).slice(2)}`
  const startD = parseISO(start.slice(0, 10))
  const endD = parseISO(end.slice(0, 10))
  if (endD < startD) return []
  const interval = eachDayOfInterval({ start: startD, end: endD })
  const lab = label.trim() || 'Break'
  return interval.map((d) => ({
    date: format(d, 'yyyy-MM-dd'),
    label: lab,
    breakGroupId: groupId,
  }))
}

export function removeBreakGroup(
  days: NonInstructionalDay[],
  breakGroupId: string,
): NonInstructionalDay[] {
  return days.filter((d) => d.breakGroupId !== breakGroupId)
}

/** Remove the first matching single-day entry (no breakGroupId). */
export function removeSingleDay(
  days: NonInstructionalDay[],
  victim: NonInstructionalDay,
): NonInstructionalDay[] {
  let removed = false
  return days.filter((d) => {
    if (removed) return true
    if (
      !d.breakGroupId &&
      d.date === victim.date &&
      d.label === victim.label
    ) {
      removed = true
      return false
    }
    return true
  })
}
