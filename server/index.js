import 'dotenv/config'
import express from 'express'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Stripe from 'stripe'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const port = Number(process.env.PORT || process.env.SERVER_PORT || 4242)
const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173'
const stripeSecretKey = process.env.STRIPE_SECRET_KEY
const staticDir = path.join(__dirname, '..', 'dist')
const downloadDir = path.join(__dirname, '..', 'private-downloads')

const templates = [
  {
    id: 'sandorm',
    name: 'Sandworm Larva',
    tagline: 'A tiny desert worm larva with safety goggles and a small sand mound.',
    price: '$1',
    priceId: process.env.SANDORM_PRICE_ID,
    fileName: 'sandorm-template.zip',
  },
  {
    id: 'goldfish',
    name: 'Noir Detective Goldfish',
    tagline: 'A floating noir detective goldfish in a bowl, with tiny coat-and-fedora energy.',
    price: '$3',
    priceId: process.env.GOLDFISH_PRICE_ID,
    fileName: 'goldfish-template.zip',
  },
  {
    id: 'octopus-jar',
    name: 'Oracle Octopus Jar',
    tagline: 'A tiny prophetic octopus inside a glass jar with sticky notes. Super cute!!',
    price: '$8',
    priceId: process.env.OCTOPUS_JAR_PRICE_ID,
    fileName: 'octopus-in-a-jar-template.zip',
  },
]

const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null

app.use(express.json())

function getTemplate(templateId) {
  return templates.find((template) => template.id === templateId)
}

function getTemplateDownloadPath(template) {
  return path.join(downloadDir, template.fileName)
}

async function retrievePaidTemplateSession(sessionId) {
  if (!stripe || !sessionId?.startsWith('cs_')) {
    return { error: 'Invalid Checkout session.' }
  }

  const session = await stripe.checkout.sessions.retrieve(sessionId)
  const template = getTemplate(session.metadata?.templateId)

  if (session.payment_status !== 'paid' || !template) {
    return { error: 'This Checkout session has not unlocked a template.' }
  }

  return { session, template }
}

app.get('/api/config', (_req, res) => {
  res.json({
    configured: Boolean(stripe && templates.every((template) => template.priceId)),
    mode: stripeSecretKey?.startsWith('sk_test_')
      ? 'test'
      : stripeSecretKey?.startsWith('sk_live_')
        ? 'live'
        : 'missing',
    templates: templates.map((template) => ({
      id: template.id,
      configured: Boolean(template.priceId),
      fileReady: fs.existsSync(getTemplateDownloadPath(template)),
    })),
  })
})

app.get('/api/templates', (_req, res) => {
  res.json({
    templates: templates.map(({ id, name, tagline, price }) => ({ id, name, tagline, price })),
  })
})

app.post('/api/create-checkout-session', async (req, res) => {
  const template = getTemplate(req.body?.templateId)

  if (!template) {
    res.status(404).json({ error: 'Template not found.' })
    return
  }

  if (!stripe || !template.priceId) {
    res.status(400).json({
      error:
        'Stripe is not configured yet. Add STRIPE_SECRET_KEY and the template price IDs, then restart the server.',
    })
    return
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: template.priceId, quantity: 1 }],
      success_url: `${clientUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${clientUrl}/cancel`,
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      metadata: {
        templateId: template.id,
      },
    })

    res.json({ url: session.url })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to create Checkout session.'
    res.status(500).json({ error: message })
  }
})

app.get('/api/checkout-session/:sessionId', async (req, res) => {
  try {
    const result = await retrievePaidTemplateSession(req.params.sessionId)

    if (result.error) {
      res.status(403).json({ error: result.error })
      return
    }

    res.json({
      paid: true,
      template: {
        id: result.template.id,
        name: result.template.name,
        price: result.template.price,
        fileReady: fs.existsSync(getTemplateDownloadPath(result.template)),
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to verify Checkout session.'
    res.status(500).json({ error: message })
  }
})

app.get('/api/download/:templateId', async (req, res) => {
  const { session_id: sessionId } = req.query

  if (typeof sessionId !== 'string') {
    res.status(400).json({ error: 'Missing Checkout session.' })
    return
  }

  try {
    const result = await retrievePaidTemplateSession(sessionId)

    if (result.error || result.template.id !== req.params.templateId) {
      res.status(403).json({ error: 'This payment does not unlock that template.' })
      return
    }

    const filePath = getTemplateDownloadPath(result.template)

    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: 'Template file is not uploaded yet.' })
      return
    }

    res.download(filePath, result.template.fileName)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to download this template.'
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
