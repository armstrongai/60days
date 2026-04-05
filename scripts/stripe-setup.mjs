#!/usr/bin/env node
/**
 * Creates prices and Payment Links for the 45Days Stripe product.
 *
 * Prerequisites: STRIPE_SECRET_KEY in the environment (never commit it).
 *
 *   export STRIPE_SECRET_KEY=sk_live_...
 *   npm run stripe:setup
 *
 * Live mode (sk_live_*): uses product prod_UHCTI1FsIt7Dr3 unless you set STRIPE_PRODUCT_ID.
 * Test mode (sk_test_*): set STRIPE_PRODUCT_ID to a test Dashboard product, or omit it and
 * the script will create a "45Days" test product once (then set STRIPE_PRODUCT_ID to reuse).
 *
 * Payment Links do not take a `mode` parameter (unlike Checkout Sessions); mode is inferred
 * from the price type (recurring vs one-time).
 */

import Stripe from 'stripe'

const LIVE_PRODUCT_ID = 'prod_UHCTI1FsIt7Dr3'

const stripeKey = process.env.STRIPE_SECRET_KEY
if (!stripeKey) {
  console.error('Set STRIPE_SECRET_KEY and run again.')
  process.exit(1)
}

const isLiveKey = stripeKey.startsWith('sk_live_')
const isTestKey = stripeKey.startsWith('sk_test_')
if (!isLiveKey && !isTestKey) {
  console.error('STRIPE_SECRET_KEY must start with sk_live_ or sk_test_.')
  process.exit(1)
}

const stripe = new Stripe(stripeKey)

const SUCCESS_URL =
  'https://45days.thelearningindex.com/app/?email={CHECKOUT_SESSION_CUSTOMER_DETAILS_EMAIL}'
const CUSTOM_MESSAGE =
  'Welcome to 45Days! You are all set. Click the link in your confirmation email to access your account.'

async function resolveProductId() {
  const fromEnv = process.env.STRIPE_PRODUCT_ID?.trim()
  if (fromEnv) {
    console.log('Using STRIPE_PRODUCT_ID:', fromEnv)
    return fromEnv
  }
  if (isLiveKey) {
    console.log('Using live product:', LIVE_PRODUCT_ID)
    return LIVE_PRODUCT_ID
  }
  const product = await stripe.products.create({
    name: '45Days',
    description:
      '45-day instructional eval countdown and caseload manager for Texas educational diagnosticians',
  })
  console.log('Created test product (set STRIPE_PRODUCT_ID to reuse):', product.id)
  return product.id
}

async function main() {
  const productId = await resolveProductId()

  const betaOnetime = await stripe.prices.create({
    product: productId,
    unit_amount: 1900,
    currency: 'usd',
    nickname: 'Beta Launch',
  })

  const standardOnetime = await stripe.prices.create({
    product: productId,
    unit_amount: 2900,
    currency: 'usd',
    nickname: 'Standard',
  })

  // $19/month after 30-day trial (card captured at signup; first charge after trial)
  const betaMonthlyAfterTrial = await stripe.prices.create({
    product: productId,
    unit_amount: 1900,
    currency: 'usd',
    recurring: { interval: 'month' },
    nickname: '30-Day Free Trial',
  })

  const trialLink = await stripe.paymentLinks.create({
    line_items: [{ price: betaMonthlyAfterTrial.id, quantity: 1 }],
    subscription_data: { trial_period_days: 30 },
    billing_address_collection: 'required',
    allow_promotion_codes: false,
    after_completion: {
      type: 'redirect',
      redirect: { url: SUCCESS_URL },
    },
    custom_text: {
      submit: { message: CUSTOM_MESSAGE },
    },
    payment_method_collection: 'always',
  })

  const betaLink = await stripe.paymentLinks.create({
    line_items: [{ price: betaOnetime.id, quantity: 1 }],
    billing_address_collection: 'required',
    allow_promotion_codes: true,
    after_completion: {
      type: 'redirect',
      redirect: { url: SUCCESS_URL },
    },
    custom_text: {
      submit: { message: CUSTOM_MESSAGE },
    },
    payment_intent_data: {
      statement_descriptor_suffix: '45DAYS TLI',
    },
  })

  console.log('\n--- Netlify / .env (do not commit secrets) ---\n')
  console.log(`STRIPE_PRODUCT_ID=${productId}`)
  console.log(`STRIPE_BETA_PRICE_ID=${betaOnetime.id}`)
  console.log(`STRIPE_STANDARD_PRICE_ID=${standardOnetime.id}`)
  console.log(`STRIPE_TRIAL_PRICE_ID=${betaMonthlyAfterTrial.id}`)
  console.log(`STRIPE_TRIAL_PAYMENT_LINK_ID=${trialLink.id}`)
  console.log(`STRIPE_TRIAL_PAYMENT_LINK=${trialLink.url}`)
  console.log(`STRIPE_BETA_PAYMENT_LINK_ID=${betaLink.id}`)
  console.log(`STRIPE_BETA_PAYMENT_LINK=${betaLink.url}`)
  console.log('\nWebhook URL: https://45days.thelearningindex.com/api/stripe-webhook')
  console.log(
    'Events: checkout.session.completed, customer.subscription.updated, customer.subscription.deleted, invoice.payment_failed',
  )
  console.log(
    '\nStripe Dashboard → adjust Payment Link confirmation copy or redirect email token if the test checkout URL is wrong.',
  )
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
