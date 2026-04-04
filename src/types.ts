export type EvaluationType = 'Initial' | 'Re-eval'

export type Grade =
  | 'PK'
  | 'K'
  | '1st'
  | '2nd'
  | '3rd'
  | '4th'
  | '5th'
  | '6th'
  | '7th'
  | '8th'
  | '9th'
  | '10th'
  | '11th'
  | '12th'

export type Stage =
  | 'Referral'
  | 'Consent'
  | 'Testing'
  | 'Report Writing'
  | 'ARD Pending'
  | 'Complete'

export type DisabilityArea =
  | 'LD'
  | 'OHI - Medical'
  | 'OHI - ADHD'
  | 'Autism'
  | 'ED'
  | 'Speech'
  | 'ID'
  | 'Visual Impairment'
  | 'Deaf/Hard of Hearing'
  | 'Other'

export interface NonInstructionalDay {
  date: string
  label: string
}

/** One district calendar (multiple supported). */
export interface DistrictCalendarRecord {
  id?: number
  name: string
  startDate: string
  endDate: string
  nonInstructionalDays: NonInstructionalDay[]
}

export interface TemplateTaskRow {
  text: string
}

export interface TaskTemplateRecord {
  id: string
  tasks: TemplateTaskRow[]
}

export interface StudentTask {
  id: string
  text: string
  dueDate?: string
  completed: boolean
  createdAt: number
}

export type PlannerGlobalCategory = 'Eval' | 'Admin' | 'Meeting' | 'Campus Visit'

export interface PlannerGlobalTask {
  id?: number
  text: string
  dueDate: string
  category: PlannerGlobalCategory
  completed: boolean
  createdAt: number
}

/** Linked when an ARD/IEP-style student task gets a due date. */
export interface PlannerMeetingLink {
  id?: number
  studentId: number
  initials: string
  taskText: string
  dueDate: string
  createdAt: number
}

export interface StudentRecord {
  id?: number
  initials: string
  /** Legacy field — not shown in UI (FERPA / initials-only policy). */
  fullName?: string
  schoolName?: string
  studentId?: string
  grade: Grade
  evaluationType: EvaluationType
  referralDate?: string
  customDueDate?: string | null
  absenceDays?: number
  consentDate?: string | null
  evaluationDate?: string | null
  stage: Stage
  disabilityAreas: DisabilityArea[]
  notes?: string
  deadlineDate: string
  ardDueDate?: string
  archived: boolean
  districtCalendarId?: number
  stickyNote?: string
  tasks?: StudentTask[]
}
