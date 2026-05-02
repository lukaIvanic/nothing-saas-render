import 'dotenv/config'
import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Stripe from 'stripe'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const port = Number(process.env.PORT || process.env.SERVER_PORT || 4242)
const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173'
const stripeSecretKey = process.env.STRIPE_SECRET_KEY
const stripePriceId = process.env.STRIPE_PRICE_ID
const staticDir = path.join(__dirname, '..', 'dist')

const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null

app.use(express.json())

app.get('/api/config', (_req, res) => {
  res.json({
    configured: Boolean(stripe && stripePriceId),
    mode: stripeSecretKey?.startsWith('sk_test_')
      ? 'test'
      : stripeSecretKey?.startsWith('sk_live_')
        ? 'live'
        : 'missing',
  })
})

app.post('/api/create-checkout-session', async (_req, res) => {
  if (!stripe || !stripePriceId) {
    res.status(400).json({
      error:
        'Stripe is not configured yet. Add STRIPE_SECRET_KEY and STRIPE_PRICE_ID to .env, then restart npm run dev.',
    })
    return
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: stripePriceId, quantity: 1 }],
      success_url: `${clientUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${clientUrl}/cancel`,
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
    })

    res.json({ url: session.url })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to create Checkout session.'
    res.status(500).json({ error: message })
  }
})

app.use(express.static(staticDir))

app.get(/^(?!\/api).*/, (_req, res) => {
  res.sendFile(path.join(staticDir, 'index.html'))
})

app.listen(port, () => {
  console.log(`Stripe server listening on http://localhost:${port}`)
})
