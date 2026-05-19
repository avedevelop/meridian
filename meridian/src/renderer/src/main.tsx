import './assets/meridian.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App, { AppErrorBoundary } from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </StrictMode>
)
