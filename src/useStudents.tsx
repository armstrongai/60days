import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'
import { db } from './db'
import type { DisabilityArea, Stage, StudentRecord } from './types'
import { calculateDeadlineDate, calculateDaysRemaining } from './dateUtils'

export type FilterTab = 'all' | 'urgent' | 'by-stage'

export interface StudentsFilterState {
  tab: FilterTab
  stage?: Stage
}

export function useStudents(filter: StudentsFilterState) {
  const students = useLiveQuery(async () => {
    const all = await db.students.filter((s) => !s.archived).toArray()
    return all.map((s) => {
      const deadlineDate = s.deadlineDate || calculateDeadlineDate(s.referralDate)
      const daysRemaining = calculateDaysRemaining(deadlineDate)
      return { ...s, deadlineDate, daysRemaining }
    })
  }, [filter.tab, filter.stage])

  const filtered = useMemo(() => {
    if (!students) return []
    let list = [...students]

    if (filter.tab === 'urgent') {
      list = list.filter((s) => (s as any).daysRemaining != null && (s as any).daysRemaining <= 14)
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

export async function addStudent(input: Omit<StudentRecord, 'id' | 'deadlineDate' | 'archived'>) {
  const deadlineDate = calculateDeadlineDate(input.referralDate)
  await db.students.add({
    ...input,
    deadlineDate,
    archived: false,
  })
}

export async function updateStudent(
  id: number,
  patch: Partial<Omit<StudentRecord, 'id'>>,
) {
  const current = await db.students.get(id)
  if (!current) return
  const referralDate = patch.referralDate ?? current.referralDate
  const deadlineDate = calculateDeadlineDate(referralDate)
  await db.students.update(id, {
    ...patch,
    referralDate,
    deadlineDate,
  })
}

export async function archiveStudent(id: number) {
  await db.students.update(id, { archived: true })
}

export async function archiveCompletedStudents() {
  await db.students.where({ stage: 'Complete', archived: false }).modify({ archived: true })
}

export async function backupAll() {
  const students = await db.students.toArray()
  return { students }
}

export interface BackupPayload {
  students: StudentRecord[]
}

export async function restoreFromBackup(payload: BackupPayload, mode: 'merge' | 'replace') {
  if (mode === 'replace') {
    await db.transaction('rw', db.students, async () => {
      await db.students.clear()
      await db.students.bulkAdd(payload.students)
    })
  } else {
    await db.students.bulkPut(payload.students)
  }
}

export const allDisabilityAreas: DisabilityArea[] = [
  'LD',
  'OHI',
  'Autism',
  'ED',
  'Speech',
  'ID',
  'Visual',
  'Hearing',
  'Other',
]

