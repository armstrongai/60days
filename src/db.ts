import Dexie, { type EntityTable } from 'dexie'
import type { StudentRecord } from './types'

export interface Database extends Dexie {
  students: EntityTable<StudentRecord, 'id'>
}

export const db = new Dexie('60DaysDB') as Database

db.version(1).stores({
  students:
    '++id, initials, studentId, grade, evaluationType, referralDate, deadlineDate, stage, archived',
})

