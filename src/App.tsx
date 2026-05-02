import { useEffect, useState } from 'react'
import goldfishSheet from './assets/noir-detective-goldfish-spritesheet.webp'
import octopusSheet from './assets/oracle-octopus-jar-spritesheet.webp'
import sandwormSheet from './assets/sandworm-larva-spritesheet.webp'
import './App.css'

type ConfigState = {
  configured: boolean
  mode: 'test' | 'live' | 'missing'
  templates: Array<{
    id: string
    configured: boolean
    fileReady: boolean
  }>
}

type Template = {
  id: string
  name: string
  tagline: string
  price: string
}

type PurchasedTemplate = {
  id: string
  name: string
  price: string
  fileReady: boolean
}

type SpriteFrame = {
  row: number
  col: number
}

type Preview = {
  frames: SpriteFrame[]
  sheet: string
}

const atlasRows = [
  { label: 'Idle', row: 0, frames: 6 },
  { label: 'Run right', row: 1, frames: 8 },
  { label: 'Run left', row: 2, frames: 8 },
  { label: 'Wave', row: 3, frames: 4 },
  { label: 'Jump', row: 4, frames: 5 },
  { label: 'Failed', row: 5, frames: 8 },
  { label: 'Waiting', row: 6, frames: 6 },
  { label: 'Running', row: 7, frames: 6 },
  { label: 'Review', row: 8, frames: 6 },
]

const sandwormSequence = atlasRows.flatMap(({ row, frames }) =>
  Array.from({ length: frames }, (_, col) => ({ row, col })),
)
const goldfishSequence = [
  { row: 0, col: 0 },
  { row: 1, col: 0 },
  { row: 2, col: 0 },
  { row: 3, col: 3 },
]
const octopusSequence = [
  { row: 0, col: 0 },
  { row: 5, col: 3 },
  { row: 5, col: 7 },
  { row: 5, col: 4 },
  { row: 7, col: 5 },
  { row: 0, col: 3 },
]

function App() {
  const [config, setConfig] = useState<ConfigState | null>(null)
  const [templates, setTemplates] = useState<Template[]>([])
  const [loadingTemplateId, setLoadingTemplateId] = useState('')
  const [purchasedTemplate, setPurchasedTemplate] = useState<PurchasedTemplate | null>(null)
  const [error, setError] = useState('')
  const [downloadStatus, setDownloadStatus] = useState('')
  const [sandwormFrame, setSandwormFrame] = useState(0)
  const [goldfishFrame, setGoldfishFrame] = useState(0)
  const [octopusFrame, setOctopusFrame] = useState(0)
  const path = window.location.pathname
  const sessionId = new URLSearchParams(window.location.search).get('session_id')
  const [isVerifying, setIsVerifying] = useState(path === '/success' && Boolean(sessionId))

  useEffect(() => {
    fetch('/api/config')
      .then((response) => response.json())
      .then(setConfig)
      .catch(() => {
        setConfig({ configured: false, mode: 'missing', templates: [] })
      })

    fetch('/api/templates')
      .then((response) => response.json())
      .then((data) => setTemplates(data.templates || []))
      .catch(() => setTemplates([]))
  }, [])

  useEffect(() => {
    if (path !== '/success' || !sessionId) {
      return
    }

    fetch(`/api/checkout-session/${sessionId}`)
      .then(async (response) => {
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Payment could not be verified.')
        }

        setPurchasedTemplate(data.template)
      })
      .catch((verifyError) => {
        setError(verifyError instanceof Error ? verifyError.message : 'Payment could not be verified.')
      })
      .finally(() => setIsVerifying(false))
  }, [path, sessionId])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSandwormFrame((frame) => (frame + 1) % sandwormSequence.length)
    }, 180)

    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setGoldfishFrame((frame) => (frame + 1) % goldfishSequence.length)
      setOctopusFrame((frame) => (frame + 1) % octopusSequence.length)
    }, 1400)

    return () => window.clearInterval(timer)
  }, [])

  async function downloadTemplate(template: PurchasedTemplate) {
    if (!sessionId) {
      setError('Missing Checkout session.')
      return
    }

    setError('')
    setDownloadStatus('Preparing download...')

    try {
      const response = await fetch(`/api/download/${template.id}?session_id=${sessionId}`)

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Download failed.')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download =
        template.id === 'sandorm'
          ? 'sandworm-larva-template.zip'
          : template.id === 'goldfish'
            ? 'noir-detective-goldfish-template.zip'
            : 'oracle-octopus-jar-template.zip'
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      setDownloadStatus('Download started. Check your browser downloads if it is not visible.')
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : 'Download failed.')
      setDownloadStatus('')
    }
  }

  async function startCheckout(templateId: string) {
    setLoadingTemplateId(templateId)
    setError('')

    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId }),
      })
      const data = await response.json()

      if (!response.ok || !data.url) {
        throw new Error(data.error || 'Checkout is unavailable.')
      }

      window.location.assign(data.url)
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : 'Checkout is unavailable.')
    } finally {
      setLoadingTemplateId('')
    }
  }

  function renderFrame(sheet: string, frame: SpriteFrame, className = '') {
    return (
      <div
        className={`atlas-frame ${className}`}
        style={{
          backgroundImage: `url(${sheet})`,
          backgroundPosition: `-${frame.col * 192}px -${frame.row * 208}px`,
        }}
      />
    )
  }

  function getPreview(templateId: string): Preview {
    if (templateId === 'sandorm') {
      const activeFrame = sandwormSequence[sandwormFrame]
      return {
        frames: [activeFrame],
        sheet: sandwormSheet,
      }
    }

    if (templateId === 'goldfish') {
      return {
        frames: [goldfishSequence[goldfishFrame]],
        sheet: goldfishSheet,
      }
    }

    return {
      frames: [octopusSequence[octopusFrame]],
      sheet: octopusSheet,
    }
  }

  function renderTemplateArt(templateId: string) {
    const preview = getPreview(templateId)

    return (
      <div className="single-preview">
        {renderFrame(preview.sheet, preview.frames[0], 'card-frame')}
      </div>
    )
  }

  if (path === '/success') {
    return (
      <main className="page success-page">
        <section className="status-panel">
          <p className="eyebrow">Payment accepted</p>
          <h1>Your template is unlocked.</h1>
          {isVerifying && <p className="lede">Checking Stripe before opening the download.</p>}
          {purchasedTemplate && (
            <>
              <p className="lede">
                {purchasedTemplate.name} is ready for this paid Checkout session.
              </p>
              {purchasedTemplate.fileReady ? (
                <button
                  type="button"
                  className="secondary-link"
                  onClick={() => downloadTemplate(purchasedTemplate)}
                >
                  Download {purchasedTemplate.name}
                </button>
              ) : (
                <p className="notice">
                  The payment is verified, but the ZIP has not been uploaded to the private downloads
                  folder yet.
                </p>
              )}
            </>
          )}
          {downloadStatus && <p className="notice">{downloadStatus}</p>}
          {error && <p className="error">{error}</p>}
          <a className="secondary-link" href="/">
            Back to gallery
          </a>
        </section>
      </main>
    )
  }

  if (path === '/cancel') {
    return (
      <main className="page success-page">
        <section className="status-panel">
          <p className="eyebrow">Checkout cancelled</p>
          <h1>No charge was made.</h1>
          <p className="lede">You can return to the landing page and try the payment flow again.</p>
          <a className="secondary-link" href="/">
            Back to gallery
          </a>
        </section>
      </main>
    )
  }

  return (
    <main className="page">
      <header className="topbar">
        <a className="brand" href="/">
          <span className="brand-mark" aria-hidden="true">
            {renderFrame(sandwormSheet, { row: 0, col: 0 }, 'brand-mascot-frame')}
          </span>
          <span>Premium Codex Pets</span>
        </a>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Pixel companion templates</p>
          <h1>Download tiny pets for Codex.</h1>
          <p className="lede">
            Three handpicked pet templates, each with its own unique personality.
          </p>
        </div>
        <div className="hero-preview" aria-label="Template preview">
          <div className="hero-sprite-stage">
            {renderFrame(sandwormSheet, { row: 0, col: 0 }, 'hero-frame')}
            {renderFrame(goldfishSheet, { row: 0, col: 0 }, 'hero-frame')}
            {renderFrame(octopusSheet, { row: 0, col: 0 }, 'hero-frame')}
          </div>
        </div>
      </section>

      <section className="gallery" aria-label="Pet template gallery">
        {templates.map((template) => {
          const templateStatus = config?.templates.find((item) => item.id === template.id)
          const canBuy = Boolean(templateStatus?.configured)
          const isLoading = loadingTemplateId === template.id

          return (
            <article className={`template-card ${template.id}`} key={template.id}>
              <div className={`template-art ${template.id}`}>
                {renderTemplateArt(template.id)}
              </div>
              <div className="template-copy">
                <h2>{template.name}</h2>
                <span>{template.tagline}</span>
              </div>
              <div className="template-actions">
                <strong>{template.price}</strong>
                <button type="button" onClick={() => startCheckout(template.id)} disabled={!canBuy || isLoading}>
                  {isLoading ? 'Opening...' : 'Buy template'}
                </button>
              </div>
            </article>
          )
        })}
      </section>

      {error && <p className="error page-error">{error}</p>}
    </main>
  )
}

export default App
