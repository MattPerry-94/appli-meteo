import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { applyCityFromUrl } from './hooks/useCityUrlSync'
import './index.css'

// Lien partagé (/?ville=…&lat=…&lon=…) : la ville est appliquée avant le
// premier rendu, une fois le store relu depuis le stockage local.
applyCityFromUrl()

// Service worker (application installable, lecture hors ligne) : en
// production seulement, il gênerait le rechargement à chaud du développement.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      // Sans service worker l'application fonctionne, simplement pas hors ligne.
      console.warn('Service worker non enregistré :', error)
    })
  })

  // Première visite : la page, ses scripts et les prévisions ont été chargés
  // avant que le service worker ne prenne la main, donc sans être enregistrés.
  // Une fois actif, il les récupère pour que l'appli rouvre hors connexion.
  // Les requêtes encore en cours à ce moment-là sont transmises en se terminant.
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    const takenAt = performance.now()
    const send = (message: { page?: string; urls: string[] }) =>
      navigator.serviceWorker.controller?.postMessage({ type: 'cache-urls', ...message })
    send({ page: location.href, urls: [] })

    if (typeof PerformanceObserver === 'undefined') return
    const observer = new PerformanceObserver((list) => {
      const urls = list.getEntries().filter((entry) => entry.startTime < takenAt).map((entry) => entry.name)
      if (urls.length) send({ urls })
    })
    observer.observe({ type: 'resource', buffered: true })
    window.setTimeout(() => observer.disconnect(), 30_000)
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
