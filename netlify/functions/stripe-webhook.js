/**
 * Netlify serverless: Stripe → Supabase licenses
 *
 * Environment variables — Netlify → Site settings → Environment variables.
 * Never commit real values (see repo-root .env.example).
 *
 *   SUPABASE_URL
 *   SUPABASE_ANON_KEY            — SPA build only
 *   SUPABASE_SERVICE_ROLE_KEY    — this function
 *   STRIPE_WEBHOOK_SECRET
 *   STRIPE_SECRET_KEY
 *
 * Register webhook in Stripe for:
 *   https://45days.thelearningindex.com/api/stripe-webhook
 * Events: checkout.session.completed, customer.subscription.updated,
 *         customer.subscription.deleted, invoice.payment_failed
 */

import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

function mapSubscriptionToLicenseStatus(stripeStatus) {
  const s = String(stripeStatus || '').toLowerCase()
  if (s === 'active') return 'active'
  if (s === 'trialing') return 'trial'
  if (s === 'past_due') return 'past_due'
  if (s === 'canceled' || s === 'cancelled') return 'cancelled'
  if (s === 'unpaid') return 'expired'
  return null
}

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  const stripeKey = process.env.STRIPE_SECRET_KEY
  const supabaseUrl = process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!webhookSecret || !stripeKey || !supabaseUrl || !serviceKey) {
    console.error('[stripe-webhook] Missing required environment variables')
    return { statusCode: 500, body: 'Server misconfiguration' }
  }

  const stripe = new Stripe(stripeKey)
  const signature = event.headers['stripe-signature'] || event.headers['Stripe-Signature']

  let rawBody = event.body
  if (event.isBase64Encoded && rawBody) {
    rawBody = Buffer.from(rawBody, 'base64').toString('utf8')
  }

  let stripeEvent
  try {
    stripeEvent = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
  } catch (err) {
    console.error('[stripe-webhook] Signature verification failed', err)
    return { statusCode: 400, body: 'Webhook signature verification failed' }
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  try {
    switch (stripeEvent.type) {
      case 'checkout.session.completed': {
        const session = stripeEvent.data.object
        const emailRaw =
          session.customer_details?.email ||
          session.customer_email ||
          session.metadata?.email
        const email = typeof emailRaw === 'string' ? emailRaw.trim().toLowerCase() : ''
        const customerId =
          typeof session.customer === 'string'
            ? session.customer
            : session.customer?.id || null
        const subscriptionId =
          typeof session.subscription === 'string'
            ? session.subscription
            : session.subscription?.id || null

        if (!email || !customerId) {
          console.error('[stripe-webhook] checkout.session.completed missing email or customer id')
          break
        }

        const today = new Date().toISOString().slice(0, 10)
        const mode = session.mode
        const licenseStatus = mode === 'payment' ? 'active' : 'trial'

        const { error } = await supabase.from('licenses').upsert(
          {
            email,
            status: licenseStatus,
            trial_start: today,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
          },
          { onConflict: 'email' },
        )
        if (error) console.error('[stripe-webhook] licenses upsert (checkout)', error)
        break
      }

      case 'customer.subscription.updated': {
        const sub = stripeEvent.data.object
        const customerId =
          typeof sub.customer === 'string' ? sub.customer : sub.customer?.id
        const mapped = mapSubscriptionToLicenseStatus(sub.status)
        if (!customerId || !mapped) break

        const { error } = await supabase
          .from('licenses')
          .update({
            status: mapped,
            stripe_subscription_id: sub.id,
          })
          .eq('stripe_customer_id', customerId)

        if (error) console.error('[stripe-webhook] licenses update (subscription.updated)', error)
        break
      }

      case 'customer.subscription.deleted': {
        const sub = stripeEvent.data.object
        const customerId =
          typeof sub.customer === 'string' ? sub.customer : sub.customer?.id
        if (!customerId) break

        const { error } = await supabase
          .from('licenses')
          .update({ status: 'cancelled' })
          .eq('stripe_customer_id', customerId)

        if (error) console.error('[stripe-webhook] licenses update (subscription.deleted)', error)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = stripeEvent.data.object
        const customerId =
          typeof invoice.customer === 'string'
            ? invoice.customer
            : invoice.customer?.id || null
        if (!customerId) break

        const subRef = invoice.subscription
        const subId =
          typeof subRef === 'string' ? subRef : subRef?.id || null
        if (!subId) break

        const sub = await stripe.subscriptions.retrieve(subId)
        const now = Math.floor(Date.now() / 1000)
        const trialEnded = !sub.trial_end || sub.trial_end <= now
        if (!trialEnded) break

        const { error } = await supabase
          .from('licenses')
          .update({ status: 'past_due' })
          .eq('stripe_customer_id', customerId)

        if (error) console.error('[stripe-webhook] licenses update (invoice.payment_failed)', error)
        break
      }

      default:
        break
    }
  } catch (e) {
    console.error('[stripe-webhook] Handler error', e)
    return { statusCode: 500, body: 'Handler error' }
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) }
}
