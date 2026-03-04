import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'
import { db, getDistrictCalendar, setDistrictCalendar } from './db'
import type { DisabilityArea, Stage, StudentRecord } from './types'
import {
  calculateFiiieDueDate,
  calculateArdDueDate,
  calculateDaysRemaining,
} from './dateUtils'

export type FilterTab = 'all' | 'urgent' | 'by-stage'

export interface StudentsFilterState {
  tab: FilterTab
  stage?: Stage
}

async function computeDueDates(
  s: StudentRecord,
): Promise<{ deadlineDate: string; ardDueDate: string; daysRemaining: number | null }> {
  const calendar = await getDistrictCalendar()
  let deadlineDate = s.deadlineDate
  let ardDueDate = s.ardDueDate

  if (s.evaluationType === 'Initial' && s.referralDate) {
    deadlineDate =
      s.deadlineDate ||
      calculateFiiieDueDate(
        s.referralDate,
        calendar.nonSchoolDays,
        s.absenceDays ?? 0,
      )
    ardDueDate = ardDueDate || (deadlineDate ? calculateArdDueDate(deadlineDate) : '')
  } else if (s.evaluationType === 'Re-eval' && (s.customDueDate || s.referralDate)) {
    if (s.customDueDate) {
      deadlineDate = s.customDueDate
      ardDueDate = ardDueDate || calculateArdDueDate(deadlineDate)
    } else if (s.referralDate) {
      deadlineDate =
        s.deadlineDate ||
        calculateFiiieDueDate(
          s.referralDate,
          calendar.nonSchoolDays,
          s.absenceDays ?? 0,
        )
      ardDueDate = ardDueDate || (deadlineDate ? calculateArdDueDate(deadlineDate) : '')
    }
  }

  const daysRemaining = calculateDaysRemaining(deadlineDate || undefined)
  return {
    deadlineDate: deadlineDate || '',
    ardDueDate: ardDueDate || '',
    daysRemaining,
  }
}

export function useStudents(filter: StudentsFilterState) {
  const students = useLiveQuery(async () => {
    const all = await db.students.filter((s) => !s.archived).toArray()
    const withComputed = await Promise.all(
      all.map(async (s) => {
        const { deadlineDate, ardDueDate, daysRemaining } = await computeDueDates(s)
        return { ...s, deadlineDate, ardDueDate, daysRemaining }
      }),
    )
    return withComputed
  }, [filter.tab, filter.stage])

  const filtered = useMemo(() => {
    if (!students) return []
    let list = [...students]

    if (filter.tab === 'urgent') {
      list = list.filter(
        (s) => (s as any).daysRemaining != null && (s as any).daysRemaining <= 14,
      )
    }

    if (filter.tab === 'by-stage' && filter.stage) {
      list = list.filter((s) => s.stage === filter.stage)
    }

    list.sort((a, b) => {
      const da = (a as any).daysRemaining
      const db = (b as any).daysRemaining
      if (da == null && db == null) return 0
      if (da == null) return 1
      if (db == null) return -1
      return da - db
    })

    return list
  }, [students, filter])

  const stats = useMemo(() => {
    if (!students || students.length === 0) {
      return {
        total: 0,
        critical: 0,
        atRisk: 0,
        avgDaysRemaining: null as number | null,
      }
    }

    let total = students.length
    let critical = 0
    let atRisk = 0
    let sum = 0
    let countWithDays = 0

    for (const s of students as any[]) {
      const days = s.daysRemaining as number | null
      if (days != null) {
        if (days <= 7) critical += 1
        else if (days <= 14) atRisk += 1
        sum += days
        countWithDays += 1
      }
    }

    return {
      total,
      critical,
      atRisk,
      avgDaysRemaining: countWithDays ? Math.round(sum / countWithDays) : null,
    }
  }, [students])

  return { students: filtered, stats }
}

export async function addStudent(
  input: Omit<
    StudentRecord,
    'id' | 'deadlineDate' | 'ardDueDate' | 'archived'
  >,
) {
  const calendar = await getDistrictCalendar()
  let deadlineDate = ''
  let ardDueDate = ''

  if (input.evaluationType === 'Initial' && input.referralDate) {
    deadlineDate = calculateFiiieDueDate(
      input.referralDate,
      calendar.nonSchoolDays,
      input.absenceDays ?? 0,
    )
    ardDueDate = calculateArdDueDate(deadlineDate)
  } else if (input.evaluationType === 'Re-eval') {
    if (input.customDueDate) {
      deadlineDate = input.customDueDate
      ardDueDate = calculateArdDueDate(deadlineDate)
    } else if (input.referralDate) {
      deadlineDate = calculateFiiieDueDate(
        input.referralDate,
        calendar.nonSchoolDays,
        input.absenceDays ?? 0,
      )
      ardDueDate = calculateArdDueDate(deadlineDate)
    }
  }

  await db.students.add({
    ...input,
    deadlineDate,
    ardDueDate: ardDueDate || undefined,
    archived: false,
  })
}

export async function updateStudent(
  id: number,
  patch: Partial<Omit<StudentRecord, 'id'>>,
) {
  const current = await db.students.get(id)
  if (!current) return
  const calendar = await getDistrictCalendar()

  const referralDate = patch.referralDate ?? current.referralDate
  const customDueDate = patch.customDueDate !== undefined ? patch.customDueDate : current.customDueDate
  const absenceDays = patch.absenceDays !== undefined ? patch.absenceDays : current.absenceDays
  const evalType = patch.evaluationType ?? current.evaluationType

  let deadlineDate = current.deadlineDate
  let ardDueDate = current.ardDueDate

  if (evalType === 'Initial' && referralDate) {
    deadlineDate = calculateFiiieDueDate(
      referralDate,
      calendar.nonSchoolDays,
      absenceDays ?? 0,
    )
    ardDueDate = calculateArdDueDate(deadlineDate)
  } else if (evalType === 'Re-eval') {
    if (customDueDate) {
      deadlineDate = customDueDate
      ardDueDate = calculateArdDueDate(deadlineDate)
    } else if (referralDate) {
      deadlineDate = calculateFiiieDueDate(
        referralDate,
        calendar.nonSchoolDays,
        absenceDays ?? 0,
      )
      ardDueDate = calculateArdDueDate(deadlineDate)
    }
  }

  await db.students.update(id, {
    ...patch,
    referralDate,
    customDueDate,
    absenceDays,
    deadlineDate,
    ardDueDate: ardDueDate || undefined,
  })
}

export async function archiveStudent(id: number) {
  await db.students.update(id, { archived: true })
}

export async function archiveCompletedStudents() {
  await db.students
    .where('stage')
    .equals('Complete')
    .filter((s) => !s.archived)
    .modify({ archived: true })
}

export async function backupAll() {
  const students = await db.students.toArray()
  const calendar = await getDistrictCalendar()
  return { students, districtCalendar: calendar }
}

export interface BackupPayload {
  students: StudentRecord[]
  districtCalendar?: { nonSchoolDays: string[] }
}

export async function restoreFromBackup(
  payload: BackupPayload,
  mode: 'merge' | 'replace',
) {
  if (mode === 'replace') {
    await db.transaction('rw', db.students, db.settings, async () => {
      await db.students.clear()
      await db.students.bulkAdd(payload.students)
      if (payload.districtCalendar?.nonSchoolDays) {
        await setDistrictCalendar(payload.districtCalendar.nonSchoolDays)
      }
    })
  } else {
    await db.students.bulkPut(payload.students)
    if (payload.districtCalendar?.nonSchoolDays?.length) {
      const existing = await getDistrictCalendar()
      const merged = [...new Set([...existing.nonSchoolDays, ...payload.districtCalendar.nonSchoolDays])].sort()
      await setDistrictCalendar(merged)
    }
  }
}

export const allDisabilityAreas: DisabilityArea[] = [
  'LD',
  'OHI - Medical',
  'OHI - ADHD',
  'Autism',
  'ED',
  'Speech',
  'ID',
  'Visual Impairment',
  'Deaf/Hard of Hearing',
  'Other',
]

/** Legacy codes from older app version; map to display label. */
const LEGACY_DISABILITY_LABELS: Record<string, string> = {
  Visual: 'Visual Impairment',
  Hearing: 'Deaf/Hard of Hearing',
  OHI: 'OHI - Medical',
}

export function getDisabilityLabel(area: string): string {
  return LEGACY_DISABILITY_LABELS[area] ?? area
}

/** Normalize stored value to current DisabilityArea (for edit form). */
export function normalizeDisabilityArea(area: string): DisabilityArea {
  if ((allDisabilityAreas as string[]).includes(area)) return area as DisabilityArea
  if (area === 'Visual') return 'Visual Impairment'
  if (area === 'Hearing') return 'Deaf/Hard of Hearing'
  if (area === 'OHI') return 'OHI - Medical'
  return 'Other'
}
