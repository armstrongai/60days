import { differenceInCalendarDays, format, parseISO } from 'date-fns'
import { db } from './db'
import type { PaymentStatus, UserProfileRecord } from './types'

/** Injected at build from STRIPE_TRIAL_PAYMENT_LINK (Netlify). Never hardcode secrets in source. */
export function getStripeTrialPaymentLink(): string {
  if (typeof window === 'undefined') return '#'
  const u = window.__45DAYS_CONFIG__?.stripeTrialPaymentLink?.trim()
  return u && u.length > 0 ? u : '#'
}

export function isOnline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine
}

/** When config is present, wait briefly for /supabase.js (CDN import) to attach the bridge. */
export async function waitForSupabaseBridge(maxMs = 4000): Promise<void> {
  if (typeof window === 'undefined') return
  const url = window.__45DAYS_CONFIG__?.supabaseUrl
  const key = window.__45DAYS_CONFIG__?.supabaseAnonKey
  if (!url || !key) return
  const w = window.__45DAYS__
  if (
    typeof w?.fetchLicenseRowByEmail === 'function' ||
    typeof w?.queryLicenseStatusByEmail === 'function'
  )
    return
  const start = Date.now()
  while (Date.now() - start < maxMs) {
    await new Promise((r) => setTimeout(r, 30))
    const x = window.__45DAYS__
    if (
      typeof x?.fetchLicenseRowByEmail === 'function' ||
      typeof x?.queryLicenseStatusByEmail === 'function'
    )
      return
  }
}

type RemoteLicenseRow = { status: string; updated_at: string | null }

async function fetchRemoteLicenseRow(email: string): Promise<RemoteLicenseRow | null> {
  const w = typeof window !== 'undefined' ? window.__45DAYS__ : undefined
  if (typeof w?.fetchLicenseRowByEmail === 'function') {
    return w.fetchLicenseRowByEmail(email) as Promise<RemoteLicenseRow | null>
  }
  if (typeof w?.queryLicenseStatusByEmail === 'function') {
    const status = await w.queryLicenseStatusByEmail(email)
    if (status == null) return null
    return { status, updated_at: null }
  }
  return null
}

function normalizeRemoteStatus(raw: string): PaymentStatus | null {
  const s = raw.trim().toLowerCase()
  if (s === 'active') return 'active'
  if (s === 'trial') return 'trial'
  if (s === 'expired') return 'expired'
  if (s === 'cancelled' || s === 'canceled') return 'cancelled'
  if (s === 'past_due') return 'past_due'
  return null
}

/**
 * Reads email from IndexedDB, queries Supabase, aligns local paymentStatus.
 * Skips when offline, no email, or bridge missing. On failure: no local change; console only.
 */
export async function checkLicenseStatus(): Promise<void> {
  if (!isOnline()) return

  try {
    const profile = await db.userProfile.get('default')
    const email = profile?.email?.trim()
    if (!email) return

    await waitForSupabaseBridge()

    let remote: RemoteLicenseRow | null
    try {
      remote = await fetchRemoteLicenseRow(email)
    } catch (e) {
      console.error('[45Days] checkLicenseStatus: Supabase query threw', e)
      return
    }

    if (remote == null) return

    const next = normalizeRemoteStatus(remote.status)
    if (!next) {
      console.error('[45Days] checkLicenseStatus: unknown remote status', remote.status)
      return
    }

    const cur = await db.userProfile.get('default')
    if (!cur) return

    const patch: Partial<UserProfileRecord> = { paymentStatus: next }
    if (remote.updated_at) {
      patch.licenseRowUpdatedAt = remote.updated_at
    }

    const sameStatus = cur.paymentStatus === next
    const sameTs =
      !remote.updated_at || cur.licenseRowUpdatedAt === remote.updated_at
    if (sameStatus && sameTs) return

    await db.userProfile.update('default', patch)
  } catch (e) {
    console.error('[45Days] checkLicenseStatus', e)
  }
}

export async function initUserProfileFromUrl(): Promise<void> {
  const params = new URLSearchParams(window.location.search)
  const raw = params.get('email')
  if (!raw?.trim()) return

  const email = decodeURIComponent(raw.trim())
  const existing = await db.userProfile.get('default')
  if (existing) return

  await db.userProfile.put({
    id: 'default',
    email,
    trialStartDate: format(new Date(), 'yyyy-MM-dd'),
    paymentStatus: 'trial',
  })
}

export async function expireTrialIfNeeded(): Promise<void> {
  const p = await db.userProfile.get('default')
  if (!p || p.paymentStatus !== 'trial' || !p.trialStartDate) return

  const start = parseISO(p.trialStartDate.slice(0, 10))
  const elapsed = differenceInCalendarDays(new Date(), start)
  if (elapsed > 30) {
    await db.userProfile.update('default', { paymentStatus: 'expired' })
  }
}

export function trialDaysRemaining(profile: UserProfileRecord | undefined): number {
  if (!profile?.trialStartDate || profile.paymentStatus !== 'trial') return 0
  const start = parseISO(profile.trialStartDate.slice(0, 10))
  const elapsed = differenceInCalendarDays(new Date(), start)
  return Math.max(0, 30 - elapsed)
}

const ACTIVATION_CODE_RE = /^45D-[A-Za-z0-9]{8}$/

export function isValidActivationCode(code: string): boolean {
  return ACTIVATION_CODE_RE.test(code.trim())
}

export async function verifyLicenseAfterActivationCodeAttempt(
  code: string,
): Promise<{ ok: true } | { ok: false; reason: 'format' | 'verify' }> {
  const trimmed = code.trim()
  if (!isValidActivationCode(trimmed)) return { ok: false, reason: 'format' }

  await checkLicenseStatus()

  const p = await db.userProfile.get('default')
  if (p?.paymentStatus === 'active') return { ok: true }
  return { ok: false, reason: 'verify' }
}

/** No profile row means full access (existing installs). */
export function getEffectivePaymentStatus(
  profile: UserProfileRecord | undefined,
): PaymentStatus {
  if (!profile) return 'active'
  return profile.paymentStatus
}

/** True while Supabase says past_due and the in-browser grace window still allows access. */
export function showBillingPastDueWarning(profile: UserProfileRecord | undefined): boolean {
  return profile?.paymentStatus === 'past_due'
}

/**
 * Opens Stripe Customer Billing Portal (same tab). Fails silently except console.error.
 */
export async function openStripeBillingPortal(): Promise<void> {
  try {
    const email = (await db.userProfile.get('default'))?.email?.trim()
    if (!email) {
      console.error('[45Days] openStripeBillingPortal: no email on profile')
      return
    }
    const res = await fetch('/api/create-portal-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    if (!res.ok) {
      console.error('[45Days] openStripeBillingPortal: HTTP', res.status)
      return
    }
    const data = (await res.json()) as { url?: string }
    if (data?.url) {
      window.location.href = data.url
    }
  } catch (e) {
    console.error('[45Days] openStripeBillingPortal', e)
  }
}
