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

export interface StudentRecord {
  id?: number
  initials: string
  studentId?: string
  grade: Grade
  evaluationType: EvaluationType
  /** Required for Initial; optional for Re-eval (deadline can vary). */
  referralDate?: string
  /** For Re-eval: manual due date when timeline doesn't follow 45 school days. */
  customDueDate?: string | null
  /** Extra school days to add (e.g. absences). FIIE due = 45 + absenceDays school days from referral. */
  absenceDays?: number
  consentDate?: string | null
  evaluationDate?: string | null
  stage: Stage
  disabilityAreas: DisabilityArea[]
  notes?: string
  /** FIIE due date (45 school days from referral, or customDueDate for Re-eval). */
  deadlineDate: string
  /** ARD due = deadlineDate + 30 calendar days. */
  ardDueDate?: string
  archived: boolean
}

export interface DistrictCalendar {
  nonSchoolDays: string[] // ISO date strings
}
