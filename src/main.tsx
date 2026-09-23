import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { applyCityFromUrl } from './hooks/useCityUrlSync'
import './index.css'

// Lien partagé (/?ville=…&lat=…&lon=…) : la ville est appliquée avant le
// premier rendu, une fois le store relu depuis le stockage local.
applyCityFromUrl()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
