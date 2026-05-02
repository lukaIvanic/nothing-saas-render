import { useEffect, useState } from 'react'
import './App.css'

type ConfigState = {
  configured: boolean
  mode: 'test' | 'live' | 'missing'
}

function App() {
  const [config, setConfig] = useState<ConfigState | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const path = window.location.pathname

  useEffect(() => {
    fetch('/api/config')
      .then((response) => response.json())
      .then(setConfig)
      .catch(() => {
        setConfig({ configured: false, mode: 'missing' })
      })
  }, [])

  async function startCheckout() {
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await response.json()

      if (!response.ok || !data.url) {
        throw new Error(data.error || 'Checkout is unavailable.')
      }

      window.location.href = data.url
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : 'Checkout is unavailable.')
    } finally {
      setIsLoading(false)
    }
  }

  if (path === '/success') {
    return (
      <main className="page success-page">
        <section className="status-panel">
          <p className="eyebrow">Payment accepted</p>
          <h1>You now own Nothing Pro.</h1>
          <p className="lede">
            The product does exactly nothing, but the one-time checkout flow did the important part.
          </p>
          <a className="secondary-link" href="/">
            Back to the app
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
            Back to the app
          </a>
        </section>
      </main>
    )
  }

  return (
    <main className="page">
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Nothing SaaS</p>
          <h1>Pay once for absolutely nothing.</h1>
          <p className="lede">
            A deliberately empty app for proving that the one-time payment plumbing works.
          </p>
          <div className="actions">
            <button type="button" onClick={startCheckout} disabled={isLoading}>
              {isLoading ? 'Opening checkout...' : 'Buy for EUR 5'}
            </button>
            <span className={config?.configured ? 'pill ready' : 'pill'}>
              {config?.configured
                ? `Stripe ${config.mode === 'live' ? 'live' : 'test'} mode ready`
                : 'Stripe keys needed'}
            </span>
          </div>
          {error && <p className="error">{error}</p>}
        </div>
        <div className="receipt" aria-label="Subscription summary">
          <div className="receipt-row">
            <span>Plan</span>
            <strong>Nothing Pass</strong>
          </div>
          <div className="receipt-row">
            <span>Delivery</span>
            <strong>Never</strong>
          </div>
          <div className="receipt-row total">
            <span>Total</span>
            <strong>EUR 5 once</strong>
          </div>
        </div>
      </section>

      <section className="setup-strip">
        <div>
          <h2>Local Stripe test flow</h2>
          <p>Set a Stripe price and secret key in the hosting environment, then use Checkout to pay.</p>
        </div>
        <div>
          <h2>What the app stores</h2>
          <p>Nothing yet. This version redirects to Checkout and confirms success via the return URL.</p>
        </div>
      </section>
    </main>
  )
}

export default App
