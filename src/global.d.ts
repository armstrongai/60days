export {}

declare global {
  interface Window {
    __45DAYS_CONFIG__?: {
      supabaseUrl?: string
      supabaseAnonKey?: string
      /** Netlify build: STRIPE_TRIAL_PAYMENT_LINK (free trial Payment Link). */
      stripeTrialPaymentLink?: string
    }
    __45DAYS__?: {
      fetchLicenseRowByEmail?: (
        email: string,
      ) => Promise<{ status: string; updated_at: string | null } | null>
      queryLicenseStatusByEmail?: (email: string) => Promise<string | null>
    }
  }
}
