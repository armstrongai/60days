import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db'
import {
  getEffectivePaymentStatus,
  getStripeTrialPaymentLink,
  showBillingPastDueWarning,
  trialDaysRemaining,
} from './license'
import type { PaymentStatus, UserProfileRecord } from './types'

export interface LicenseValue {
  profile: UserProfileRecord | undefined
  paymentStatus: PaymentStatus
  isExpired: boolean
  isTrial: boolean
  showBillingPastDueWarning: boolean
  trialDaysLeft: number
  canEditCaseload: boolean
  stripeTrialPaymentLink: string
}

const LicenseContext = createContext<LicenseValue | null>(null)

export function LicenseProvider({ children }: { children: ReactNode }) {
  const profile = useLiveQuery(() => db.userProfile.get('default'), [])
  const trialPaymentLink = getStripeTrialPaymentLink()
  const status = getEffectivePaymentStatus(profile ?? undefined)
  const isExpired = status === 'expired' || status === 'cancelled'
  const isTrial = status === 'trial'
  const billingWarn = showBillingPastDueWarning(profile ?? undefined)
  const daysLeft = trialDaysRemaining(profile ?? undefined)

  const value = useMemo<LicenseValue>(
    () => ({
      profile: profile ?? undefined,
      paymentStatus: status,
      isExpired,
      isTrial,
      showBillingPastDueWarning: billingWarn,
      trialDaysLeft: daysLeft,
      canEditCaseload: !isExpired,
      stripeTrialPaymentLink: trialPaymentLink,
    }),
    [profile, status, isExpired, isTrial, billingWarn, daysLeft, trialPaymentLink],
  )

  return (
    <LicenseContext.Provider value={value}>{children}</LicenseContext.Provider>
  )
}

export function useLicense(): LicenseValue {
  const v = useContext(LicenseContext)
  if (!v) {
    throw new Error('useLicense must be used within LicenseProvider')
  }
  return v
}
