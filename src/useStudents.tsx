import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'
import {
  db,
  getDistrictCalendarById,
  getDistrictCalendar,
  setDistrictCalendar,
  instantiateTasksForNewStudent,
  linkStudentTaskToPlanner,
} from './db'
import type { DisabilityArea, DistrictCalendarRecord, Stage, StudentRecord } from './types'
import {
  calculateFiiieDueDate,
  calculateArdDueDate,
  calculateDaysRemaining,
} from './dateUtils'
import { getDaysRemaining } from './instructionalDays'

export type FilterTab = 'all' | 'urgent' | 'by-stage'

export interface StudentsFilterState {
  tab: FilterTab
  stage?: Stage
}

function nonSchoolIsoList(cal: DistrictCalendarRecord | undefined): string[] {
  if (!cal?.nonInstructionalDays?.length) return []
  return cal.nonInstructionalDays.map((d) => d.date.slice(0, 10))
}

async function computeDueDates(
  s: StudentRecord,
  cal: DistrictCalendarRecord | undefined,
): Promise<{ deadlineDate: string; ardDueDate: string; daysRemaining: number | null }> {
  const flat = nonSchoolIsoList(cal)
  let deadlineDate = s.deadlineDate
  let ardDueDate = s.ardDueDate

  if (s.evaluationType === 'Initial' && s.referralDate) {
    deadlineDate =
      s.deadlineDate ||
      calculateFiiieDueDate(
        s.referralDate,
        flat,
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
          flat,
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

export type EnrichedStudent = StudentRecord & {
  deadlineDate: string
  ardDueDate: string
  daysRemaining: number | null
  instructionalRemaining: number | null
  instructionalTier: ReturnType<typeof getDaysRemaining>['tier']
}

export function useStudents(filter: StudentsFilterState) {
  const students = useLiveQuery(async () => {
    const all = await db.students.filter((s) => !s.archived).toArray()
    const withComputed = await Promise.all(
      all.map(async (s) => {
        const cal = await getDistrictCalendarById(s.districtCalendarId)
        const { deadlineDate, ardDueDate, daysRemaining } = await computeDueDates(s, cal)
        const inst = getDaysRemaining(s.consentDate ?? undefined, cal ?? null)
        return {
          ...s,
          deadlineDate,
          ardDueDate,
          daysRemaining,
          instructionalRemaining: inst.remaining,
          instructionalTier: inst.tier,
        } as EnrichedStudent
      }),
    )
    return withComputed
  }, [filter.tab, filter.stage])

  const filtered = useMemo(() => {
    if (!students) return []
    let list = [...students]

    if (filter.tab === 'urgent') {
      list = list.filter((s) => {
        if (s.instructionalTier === 'urgent' || s.instructionalTier === 'warning')
          return true
        if (s.instructionalRemaining != null && s.instructionalRemaining <= 14) return true
        return false
      })
    }

    if (filter.tab === 'by-stage' && filter.stage) {
      list = list.filter((s) => s.stage === filter.stage)
    }

    list.sort((a, b) => {
      const ta = a.instructionalTier
      const tb = b.instructionalTier
      if (ta === 'no_calendar' || ta === 'no_consent') {
        if (tb === 'no_calendar' || tb === 'no_consent') return 0
        return 1
      }
      if (tb === 'no_calendar' || tb === 'no_consent') return -1
      const ra = a.instructionalRemaining
      const rb = b.instructionalRemaining
      if (ra == null && rb == null) return 0
      if (ra == null) return 1
      if (rb == null) return -1
      return ra - rb
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
    let countWithRemaining = 0

    for (const s of students) {
      if (s.instructionalTier === 'urgent') critical += 1
      else if (s.instructionalTier === 'warning') atRisk += 1
      if (
        s.instructionalRemaining != null &&
        (s.instructionalTier === 'ok' ||
          s.instructionalTier === 'warning' ||
          s.instructionalTier === 'urgent')
      ) {
        sum += s.instructionalRemaining
        countWithRemaining += 1
      }
    }

    return {
      total,
      critical,
      atRisk,
      avgDaysRemaining: countWithRemaining
        ? Math.round(sum / countWithRemaining)
        : null,
    }
  }, [students])

  return { students: filtered, stats }
}

export async function addStudent(
  input: Omit<
    StudentRecord,
    'id' | 'deadlineDate' | 'ardDueDate' | 'archived' | 'tasks'
  > & { tasks?: never },
) {
  let calId = input.districtCalendarId
  if (calId == null) {
    const first = await db.districtCalendars.orderBy('id').first()
    calId = first?.id
  }
  const cal = calId != null ? await getDistrictCalendarById(calId) : undefined
  const flat = nonSchoolIsoList(cal)
  let deadlineDate = ''
  let ardDueDate = ''

  if (input.evaluationType === 'Initial' && input.referralDate) {
    deadlineDate = calculateFiiieDueDate(
      input.referralDate,
      flat,
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
        flat,
        input.absenceDays ?? 0,
      )
      ardDueDate = calculateArdDueDate(deadlineDate)
    }
  }

  const tasks = await instantiateTasksForNewStudent()

  await db.students.add({
    ...input,
    districtCalendarId: calId,
    tasks,
    stickyNote: input.stickyNote ?? '',
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
  const calId = patch.districtCalendarId ?? current.districtCalendarId
  const cal = await getDistrictCalendarById(calId)

  const referralDate = patch.referralDate ?? current.referralDate
  const customDueDate = patch.customDueDate !== undefined ? patch.customDueDate : current.customDueDate
  const absenceDays = patch.absenceDays !== undefined ? patch.absenceDays : current.absenceDays
  const evalType = patch.evaluationType ?? current.evaluationType
  const flat = nonSchoolIsoList(cal)

  let deadlineDate = current.deadlineDate
  let ardDueDate = current.ardDueDate

  if (evalType === 'Initial' && referralDate) {
    deadlineDate = calculateFiiieDueDate(
      referralDate,
      flat,
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
        flat,
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

export async function updateStudentTasks(
  id: number,
  tasks: StudentRecord['tasks'],
  initials: string,
) {
  await db.students.update(id, { tasks })
  for (const t of tasks ?? []) {
    await linkStudentTaskToPlanner(id, initials, t.text, t.dueDate)
  }
}

export async function saveStudentStickyNote(id: number, stickyNote: string) {
  await db.students.update(id, { stickyNote })
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
  const districtCalendars = await db.districtCalendars.toArray()
  const taskTemplate = await db.taskTemplate.get('default')
  const plannerTasks = await db.plannerTasks.toArray()
  const plannerMeetingLinks = await db.plannerMeetingLinks.toArray()
  const legacyCalendar = await getDistrictCalendar()
  return {
    students,
    districtCalendars,
    taskTemplate,
    plannerTasks,
    plannerMeetingLinks,
    districtCalendar: legacyCalendar,
  }
}

export interface BackupPayload {
  students: StudentRecord[]
  districtCalendars?: DistrictCalendarRecord[]
  taskTemplate?: { id: string; tasks: { text: string }[] }
  plannerTasks?: import('./types').PlannerGlobalTask[]
  plannerMeetingLinks?: import('./types').PlannerMeetingLink[]
  districtCalendar?: { nonSchoolDays: string[] }
}

export async function restoreFromBackup(
  payload: BackupPayload,
  mode: 'merge' | 'replace',
) {
  if (mode === 'replace') {
    await db.transaction(
      'rw',
      [
        db.students,
        db.settings,
        db.districtCalendars,
        db.taskTemplate,
        db.plannerTasks,
        db.plannerMeetingLinks,
      ],
      async () => {
        await db.students.clear()
        await db.districtCalendars.clear()
        await db.plannerTasks.clear()
        await db.plannerMeetingLinks.clear()
        await db.students.bulkAdd(payload.students)
        if (payload.districtCalendars?.length) {
          await db.districtCalendars.bulkAdd(payload.districtCalendars)
        }
        if (payload.taskTemplate) {
          await db.taskTemplate.put(payload.taskTemplate as any)
        }
        if (payload.plannerTasks?.length) {
          await db.plannerTasks.bulkAdd(payload.plannerTasks as any)
        }
        if (payload.plannerMeetingLinks?.length) {
          await db.plannerMeetingLinks.bulkAdd(payload.plannerMeetingLinks as any)
        }
        if (payload.districtCalendar?.nonSchoolDays) {
          await setDistrictCalendar(payload.districtCalendar.nonSchoolDays)
        }
      },
    )
  } else {
    await db.students.bulkPut(payload.students)
    if (payload.districtCalendars?.length) {
      await db.districtCalendars.bulkPut(payload.districtCalendars as any)
    }
    if (payload.taskTemplate) {
      await db.taskTemplate.put(payload.taskTemplate as any)
    }
    if (payload.plannerTasks?.length) {
      await db.plannerTasks.bulkPut(payload.plannerTasks as any)
    }
    if (payload.plannerMeetingLinks?.length) {
      await db.plannerMeetingLinks.bulkPut(payload.plannerMeetingLinks as any)
    }
    if (payload.districtCalendar?.nonSchoolDays?.length) {
      const existing = await getDistrictCalendar()
      const merged = [
        ...new Set([
          ...existing.nonSchoolDays,
          ...payload.districtCalendar.nonSchoolDays,
        ]),
      ].sort()
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

const LEGACY_DISABILITY_LABELS: Record<string, string> = {
  Visual: 'Visual Impairment',
  Hearing: 'Deaf/Hard of Hearing',
  OHI: 'OHI - Medical',
}

export function getDisabilityLabel(area: string): string {
  return LEGACY_DISABILITY_LABELS[area] ?? area
}

export function normalizeDisabilityArea(area: string): DisabilityArea {
  if ((allDisabilityAreas as string[]).includes(area)) return area as DisabilityArea
  if (area === 'Visual') return 'Visual Impairment'
  if (area === 'Hearing') return 'Deaf/Hard of Hearing'
  if (area === 'OHI') return 'OHI - Medical'
  return 'Other'
}
