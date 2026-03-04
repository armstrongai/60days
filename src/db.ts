import Dexie, { type EntityTable } from 'dexie'
import type { StudentRecord } from './types'

const DISTRICT_CALENDAR_KEY = 'districtCalendar'

export interface SettingsRow {
  key: string
  value: unknown
}

export interface Database extends Dexie {
  students: EntityTable<StudentRecord, 'id'>
  settings: EntityTable<SettingsRow, 'key'>
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

export async function getDistrictCalendar(): Promise<{ nonSchoolDays: string[] }> {
  const row = await db.settings.get(DISTRICT_CALENDAR_KEY)
  const value = row?.value as { nonSchoolDays?: string[] } | undefined
  return { nonSchoolDays: Array.isArray(value?.nonSchoolDays) ? value.nonSchoolDays : [] }
}

export async function setDistrictCalendar(nonSchoolDays: string[]): Promise<void> {
  await db.settings.put({ key: DISTRICT_CALENDAR_KEY, value: { nonSchoolDays } })
}
