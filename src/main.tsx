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
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Sans service worker l'application fonctionne, simplement pas hors ligne.
    })
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
