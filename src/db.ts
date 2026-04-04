import Dexie, { type EntityTable } from 'dexie'
import type {
  DistrictCalendarRecord,
  PlannerGlobalTask,
  PlannerMeetingLink,
  StudentRecord,
  StudentTask,
  TaskTemplateRecord,
} from './types'
import { DEFAULT_TASK_TEMPLATE_TEXTS } from './taskDefaults'

const DISTRICT_CALENDAR_KEY = 'districtCalendar'

export interface SettingsRow {
  key: string
  value: unknown
}

export interface Database extends Dexie {
  students: EntityTable<StudentRecord, 'id'>
  settings: EntityTable<SettingsRow, 'key'>
  districtCalendars: EntityTable<DistrictCalendarRecord, 'id'>
  taskTemplate: EntityTable<TaskTemplateRecord, 'id'>
  plannerTasks: EntityTable<PlannerGlobalTask, 'id'>
  plannerMeetingLinks: EntityTable<PlannerMeetingLink, 'id'>
}

export const db = new Dexie('45DaysDB') as Database

db.version(1).stores({
  students:
    '++id, initials, studentId, grade, evaluationType, referralDate, deadlineDate, stage, archived',
})

db.version(2).stores({
  students:
    '++id, initials, studentId, grade, evaluationType, referralDate, deadlineDate, stage, archived',
  settings: 'key',
})

db.version(3).stores({
  students:
    '++id, initials, studentId, grade, evaluationType, referralDate, deadlineDate, stage, archived, districtCalendarId',
  settings: 'key',
  districtCalendars: '++id, name, startDate, endDate',
  taskTemplate: 'id',
  plannerTasks: '++id, dueDate, completed, createdAt',
  plannerMeetingLinks: '++id, studentId, dueDate',
}).upgrade(async (tx) => {
  const settingsTbl = tx.table('settings')
  const raw = (await settingsTbl.get(DISTRICT_CALENDAR_KEY)) as
    | { value?: { nonSchoolDays?: string[] } }
    | undefined

  let firstCalId: number
  const days = raw?.value?.nonSchoolDays
  if (Array.isArray(days) && days.length > 0) {
    const sorted = [...days].sort()
    firstCalId = (await tx.table('districtCalendars').add({
      name: 'Imported calendar',
      startDate: sorted[0],
      endDate: sorted[sorted.length - 1],
      nonInstructionalDays: sorted.map((date) => ({
        date: date.slice(0, 10),
        label: 'Imported',
      })),
    })) as number
  } else {
    firstCalId = (await tx.table('districtCalendars').add({
      name: 'Default district',
      startDate: '2024-08-01',
      endDate: '2025-06-30',
      nonInstructionalDays: [],
    })) as number
  }

  await tx.table('taskTemplate').put({
    id: 'default',
    tasks: DEFAULT_TASK_TEMPLATE_TEXTS.map((text) => ({ text })),
  })

  const templateRow = (await tx.table('taskTemplate').get('default')) as TaskTemplateRecord
  const templateTasks = templateRow?.tasks ?? []

  const studentRows = await tx.table('students').toArray()
  for (const s of studentRows) {
    const sid = s.id as number
    const tasks: StudentTask[] =
      Array.isArray(s.tasks) && s.tasks.length > 0
        ? (s.tasks as StudentTask[])
        : templateTasks.map((t) => ({
            id: newId(),
            text: t.text,
            completed: false,
            createdAt: Date.now(),
          }))
    await tx.table('students').update(sid, {
      districtCalendarId: firstCalId,
      stickyNote: s.stickyNote ?? '',
      tasks,
    })
  }
})

function newId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `t-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function newStudentTasksFromTemplate(tasks: { text: string }[]): StudentTask[] {
  return tasks.map((t) => ({
    id: newId(),
    text: t.text,
    completed: false,
    createdAt: Date.now(),
  }))
}

export async function getDefaultTaskTemplate(): Promise<TaskTemplateRecord> {
  let row = await db.taskTemplate.get('default')
  if (!row) {
    await db.taskTemplate.put({
      id: 'default',
      tasks: DEFAULT_TASK_TEMPLATE_TEXTS.map((text) => ({ text })),
    })
    row = (await db.taskTemplate.get('default'))!
  }
  return row
}

export async function saveDefaultTaskTemplate(tasks: { text: string }[]): Promise<void> {
  await db.taskTemplate.put({ id: 'default', tasks })
}

export async function instantiateTasksForNewStudent(): Promise<StudentTask[]> {
  const tpl = await getDefaultTaskTemplate()
  return newStudentTasksFromTemplate(tpl.tasks)
}

/** @deprecated Legacy flat list — use districtCalendars table. */
export async function getDistrictCalendar(): Promise<{ nonSchoolDays: string[] }> {
  const cals = await db.districtCalendars.orderBy('id').first()
  if (!cals?.nonInstructionalDays?.length) {
    const row = await db.settings.get(DISTRICT_CALENDAR_KEY)
    const value = row?.value as { nonSchoolDays?: string[] } | undefined
    return { nonSchoolDays: Array.isArray(value?.nonSchoolDays) ? value.nonSchoolDays : [] }
  }
  return {
    nonSchoolDays: cals.nonInstructionalDays.map((d) => d.date.slice(0, 10)),
  }
}

export async function setDistrictCalendar(nonSchoolDays: string[]): Promise<void> {
  await db.settings.put({ key: DISTRICT_CALENDAR_KEY, value: { nonSchoolDays } })
  const first = await db.districtCalendars.orderBy('id').first()
  if (first?.id != null) {
    const sorted = [...nonSchoolDays].sort()
    await db.districtCalendars.update(first.id, {
      nonInstructionalDays: sorted.map((date) => ({
        date: date.slice(0, 10),
        label: 'Imported',
      })),
      startDate: sorted[0] ?? first.startDate,
      endDate: sorted[sorted.length - 1] ?? first.endDate,
    })
  }
}

export async function getDistrictCalendarById(
  id: number | undefined,
): Promise<DistrictCalendarRecord | undefined> {
  if (id == null) return undefined
  return db.districtCalendars.get(id)
}

export async function linkStudentTaskToPlanner(
  studentId: number,
  initials: string,
  taskText: string,
  dueDate: string | undefined,
): Promise<void> {
  const { isArdOrIepMeetingTask } = await import('./instructionalDays')
  if (!isArdOrIepMeetingTask(taskText)) return
  await db.plannerMeetingLinks
    .where('studentId')
    .equals(studentId)
    .filter((l) => l.taskText === taskText)
    .delete()
  if (!dueDate) return
  await db.plannerMeetingLinks.add({
    studentId,
    initials,
    taskText,
    dueDate: dueDate.slice(0, 10),
    createdAt: Date.now(),
  })
}

/** Fresh installs skip Dexie upgrade(); seed defaults on first load. */
export async function ensureDatabaseSeeded(): Promise<void> {
  const calCount = await db.districtCalendars.count()
  let defaultCalId: number
  if (calCount === 0) {
    defaultCalId = (await db.districtCalendars.add({
      name: 'Default district',
      startDate: '2024-08-01',
      endDate: '2025-06-30',
      nonInstructionalDays: [],
    })) as number
  } else {
    const first = await db.districtCalendars.orderBy('id').first()
    defaultCalId = first!.id as number
  }

  const tpl = await db.taskTemplate.get('default')
  if (!tpl) {
    await db.taskTemplate.put({
      id: 'default',
      tasks: DEFAULT_TASK_TEMPLATE_TEXTS.map((text) => ({ text })),
    })
  }

  const students = await db.students.toArray()
  for (const s of students) {
    const patch: Partial<StudentRecord> = {}
    if (s.districtCalendarId == null) patch.districtCalendarId = defaultCalId
    if (!Array.isArray(s.tasks) || s.tasks.length === 0) {
      patch.tasks = await instantiateTasksForNewStudent()
    }
    if (s.stickyNote === undefined) patch.stickyNote = ''
    if (Object.keys(patch).length) await db.students.update(s.id!, patch)
  }
}
