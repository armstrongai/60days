import { addDays, differenceInCalendarDays, parseISO } from 'date-fns'

export function calculateDeadlineDate(referralDate: string): string {
  if (!referralDate) return ''
  const d = parseISO(referralDate)
  const deadline = addDays(d, 60)
  return deadline.toISOString().slice(0, 10)
}

export function calculateDaysRemaining(deadlineDate: string | null | undefined): number | null {
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

