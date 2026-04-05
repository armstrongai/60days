#!/usr/bin/env node
/**
 * Creates the Netlify webhook endpoint in Stripe (one-time).
 * The signing secret is only shown once — add it to Netlify as STRIPE_WEBHOOK_SECRET.
 *
 *   export STRIPE_SECRET_KEY=sk_live_...
 *   node scripts/stripe-register-webhook.mjs
 *
 * If you already have this URL registered, use Stripe Dashboard → Developers → Webhooks
 * to copy the secret or delete the duplicate endpoint.
 */

import Stripe from 'stripe'

const stripeKey = process.env.STRIPE_SECRET_KEY
if (!stripeKey) {
  console.error('Set STRIPE_SECRET_KEY and run again.')
  process.exit(1)
}

const stripe = new Stripe(stripeKey)

const WEBHOOK_URL = 'https://45days.thelearningindex.com/api/stripe-webhook'
const EVENTS = [
  'checkout.session.completed',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.payment_failed',
]

async function main() {
  const endpoint = await stripe.webhookEndpoints.create({
    url: WEBHOOK_URL,
    enabled_events: EVENTS,
    description: '45Days Netlify (Supabase license sync)',
  })

  console.log('Webhook endpoint id:', endpoint.id)
  console.log('\nAdd this to Netlify → STRIPE_WEBHOOK_SECRET (shown once only):\n')
  console.log(endpoint.secret)
}

main().catch((e) => {
  console.error(e.message || e)
  process.exit(1)
})
