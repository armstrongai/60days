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
  | 'OHI'
  | 'Autism'
  | 'ED'
  | 'Speech'
  | 'ID'
  | 'Visual'
  | 'Hearing'
  | 'Other'

export interface StudentRecord {
  id?: number
  initials: string
  studentId?: string
  grade: Grade
  evaluationType: EvaluationType
  referralDate: string
  consentDate?: string | null
  evaluationDate?: string | null
  stage: Stage
  disabilityAreas: DisabilityArea[]
  notes?: string
  deadlineDate: string
  archived: boolean
}

