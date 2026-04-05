/**
 * Browser Supabase client for license checks only (student data stays on device).
 * Copied to public/supabase.js before `npm run dev` / `npm run build` — edit this file.
 *
 * Requires window.__45DAYS_CONFIG__ = { supabaseUrl, supabaseAnonKey }
 * - Local: copy public/config.example.js → public/config.js (gitignored).
 * - Netlify: set SUPABASE_URL + SUPABASE_ANON_KEY; Vite injects them at build (see vite.config.ts).
 *
 * Supabase JS client is loaded from jsDelivr as specified.
 */
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

const cfg = typeof window !== 'undefined' ? window.__45DAYS_CONFIG__ : undefined

if (!cfg?.supabaseUrl || !cfg?.supabaseAnonKey) {
  console.warn(
    '[45Days] Supabase config missing — add public/config.js from config.example.js, or set SUPABASE_URL and SUPABASE_ANON_KEY on Netlify for build injection.',
  )
} else {
  const client = createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  window.__45DAYS__ = window.__45DAYS__ || {}

  const PAST_DUE_GRACE_DAYS = 7

  /**
   * Fetches license row from Supabase. On error returns null (caller leaves local state unchanged).
   * For status "past_due", compares updated_at to grant a short grace window matching the app.
   */
  window.__45DAYS__.fetchLicenseRowByEmail = async function fetchLicenseRowByEmail(email) {
    const trimmed = String(email || '').trim().toLowerCase()
    if (!trimmed) return null

    try {
      const { data, error } = await client.rpc('get_license_status', {
        check_email: trimmed,
      })

      if (error) {
        console.error('[45Days] Supabase get_license_status', error)
        return null
      }

      const row = Array.isArray(data) ? data[0] : data
      if (!row || typeof row.status !== 'string') return null

      const status = row.status.trim().toLowerCase()
      const updatedAtRaw = row.updated_at
      const updatedAt =
        typeof updatedAtRaw === 'string'
          ? updatedAtRaw
          : updatedAtRaw != null
            ? new Date(updatedAtRaw).toISOString()
            : null

      if (status === 'past_due' && updatedAt) {
        const changed = new Date(updatedAt)
        const now = new Date()
        const t0 = Date.UTC(
          changed.getUTCFullYear(),
          changed.getUTCMonth(),
          changed.getUTCDate(),
        )
        const t1 = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
        const calendarDaysSince = Math.floor((t1 - t0) / 86400000)
        if (calendarDaysSince >= PAST_DUE_GRACE_DAYS) {
          return { status: 'expired', updated_at: updatedAt }
        }
      }

      return { status: row.status, updated_at: updatedAt }
    } catch (e) {
      console.error('[45Days] Supabase get_license_status', e)
      return null
    }
  }

  /** @deprecated use fetchLicenseRowByEmail — returns status string only */
  window.__45DAYS__.queryLicenseStatusByEmail = async function queryLicenseStatusByEmail(
    email,
  ) {
    const row = await window.__45DAYS__.fetchLicenseRowByEmail(email)
    return row?.status ?? null
  }
}
