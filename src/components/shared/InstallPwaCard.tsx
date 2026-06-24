import { useEffect, useMemo, useState } from 'react'

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

function detectIos() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent)
}

export function InstallPwaCard() {
  const [deferredPrompt, setDeferredPrompt] = useState<InstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(false)
  const [loading, setLoading] = useState(false)

  const isIos = useMemo(() => detectIos(), [])
  const isStandalone = useMemo(() => {
    const standaloneMedia = window.matchMedia('(display-mode: standalone)').matches
    const standaloneNav = Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone)
    return standaloneMedia || standaloneNav
  }, [])

  useEffect(() => {
    if (isStandalone) {
      setInstalled(true)
      return
    }

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setDeferredPrompt(event as InstallPromptEvent)
    }

    const onInstalled = () => setInstalled(true)

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.addEventListener('appinstalled', onInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [isStandalone])

  if (installed || isStandalone) return null
  if (!deferredPrompt && !isIos) return null

  const handleInstall = async () => {
    if (!deferredPrompt) return
    setLoading(true)
    await deferredPrompt.prompt()
    await deferredPrompt.userChoice
    setDeferredPrompt(null)
    setLoading(false)
  }

  return (
    <section className="card stack install-card">
      <h3>Add Nouri to your home screen</h3>
      {isIos ? (
        <p className="muted">On iPhone: tap Share in Safari, then tap Add to Home Screen.</p>
      ) : (
        <>
          <p className="muted">Install Nouri for app-like launch and smoother repeat use.</p>
          <button className="small" disabled={loading} onClick={() => void handleInstall()}>
            {loading ? 'Opening...' : 'Install app'}
          </button>
        </>
      )}
    </section>
  )
}
