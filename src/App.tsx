import { useEffect, useState } from 'react'
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

const sandwormAnimations = [
  ['Idle', 'idle breathing loop', 'row-0', 'play-6'],
  ['Run right', 'rightward travel cycle', 'row-1', 'play-8'],
  ['Run left', 'leftward travel cycle', 'row-2', 'play-8'],
  ['Wave', 'greeting gesture', 'row-3', 'play-4'],
  ['Jump', 'anticipation and lift', 'row-4', 'play-5'],
  ['Failed', 'deflated reaction', 'row-5', 'play-8'],
  ['Waiting', 'patient idle variant', 'row-6', 'play-6'],
  ['Running', 'in-place dash loop', 'row-7', 'play-6'],
  ['Review', 'focused inspection', 'row-8', 'play-6'],
]

function App() {
  const [config, setConfig] = useState<ConfigState | null>(null)
  const [templates, setTemplates] = useState<Template[]>([])
  const [loadingTemplateId, setLoadingTemplateId] = useState('')
  const [purchasedTemplate, setPurchasedTemplate] = useState<PurchasedTemplate | null>(null)
  const [error, setError] = useState('')
  const [downloadStatus, setDownloadStatus] = useState('')
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
        template.id === 'sandorm' ? 'sandworm-larva-template.zip' : 'oracle-octopus-jar-template.zip'
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

  function renderFrame(sheet: string, className: string) {
    return <div className={`atlas-frame ${className}`} style={{ backgroundImage: `url(${sheet})` }} />
  }

  function renderTemplateArt(templateId: string) {
    if (templateId === 'sandorm') {
      return (
        <div className="animation-grid">
          {sandwormAnimations.map(([name, description, rowClass, playClass]) => (
            <div className="animation-tile" key={name}>
              {renderFrame(sandwormSheet, `${rowClass} ${playClass}`)}
              <div>
                <strong>{name}</strong>
                <span>{description}</span>
              </div>
            </div>
          ))}
        </div>
      )
    }

    return (
      <div className="octopus-preview">
        <div className="octopus-stills">
          {renderFrame(octopusSheet, 'row-0 col-0 still')}
          {renderFrame(octopusSheet, 'row-8 col-3 still')}
        </div>
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
          <span className="brand-mark">cp</span>
          <span>Codex Pet Templates</span>
        </a>
        <span className={config?.configured ? 'pill ready' : 'pill'}>
          {config?.configured
            ? `Stripe ${config.mode === 'live' ? 'live' : 'test'} mode ready`
            : 'Stripe setup needed'}
        </span>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Pixel companion templates</p>
          <h1>Download tiny pets for Codex.</h1>
          <p className="lede">
            Two handpicked pet templates, each unlocked by its own one-time Stripe Checkout payment.
          </p>
        </div>
        <div className="hero-preview" aria-label="Template preview">
          <div className="hero-sprite-stage">
            {renderFrame(sandwormSheet, 'row-1 play-8 hero-frame')}
            {renderFrame(octopusSheet, 'row-0 col-0 still hero-frame')}
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
                <p>{template.id === 'sandorm' ? 'desert-pixel' : 'aquatic-pixel'}</p>
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
