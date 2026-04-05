/**
 * POST /api/create-portal-session
 * Body: { "email": "user@example.com" }
 * Response: { "url": "https://billing.stripe.com/..." }
 *
 * Env (Netlify):
 *   STRIPE_SECRET_KEY
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   STRIPE_PORTAL_RETURN_URL — where Stripe sends the user after the portal (e.g. https://45days.thelearningindex.com/settings)
 */

import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY
  const supabaseUrl = process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const returnUrl =
    process.env.STRIPE_PORTAL_RETURN_URL ||
    'https://45days.thelearningindex.com/app/'

  if (!stripeKey || !supabaseUrl || !serviceKey) {
    console.error('[create-portal-session] Missing server environment variables')
    return { statusCode: 500, body: JSON.stringify({ error: 'Server misconfiguration' }) }
  }

  let body
  try {
    body = JSON.parse(event.body || '{}')
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) }
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  if (!email) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Email is required' }) }
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  try {
    const { data: row, error: qErr } = await supabase
      .from('licenses')
      .select('stripe_customer_id')
      .eq('email', email)
      .maybeSingle()

    if (qErr) {
      console.error('[create-portal-session] Supabase lookup', qErr)
      return { statusCode: 500, body: JSON.stringify({ error: 'Lookup failed' }) }
    }

    const customerId = row?.stripe_customer_id
    if (!customerId) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          error: 'No billing account found for that email. Complete checkout first.',
        }),
      }
    }

    const stripe = new Stripe(stripeKey)
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    })

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: session.url }),
    }
  } catch (e) {
    console.error('[create-portal-session]', e)
    return { statusCode: 500, body: JSON.stringify({ error: 'Could not open billing portal' }) }
  }
}
