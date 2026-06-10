import './assets/meridian.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App, { AppErrorBoundary } from './App'

if (window.location.search.includes('capture=1')) {
  // Light capture window — import i18n init but NOT heavy stores/vault bridge
  Promise.all([import('./i18n'), import('./components/CaptureWindow')]).then(
    ([, { default: CaptureWindow }]) => {
      createRoot(document.getElementById('root')!).render(
        <StrictMode>
          <CaptureWindow />
        </StrictMode>
      )
    }
  )
} else {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <AppErrorBoundary>
        <App />
      </AppErrorBoundary>
    </StrictMode>
  )
}
