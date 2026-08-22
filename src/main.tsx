import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { ToastProvider } from '@/components/app/Toast'
import { App } from './App'
import './index.css'

// Respeita o tema do aparelho — e acompanha se a pessoa trocar.
const temaEscuro = window.matchMedia('(prefers-color-scheme: dark)')
function aplicarTema(escuro: boolean) {
  document.documentElement.classList.toggle('dark', escuro)
  document.documentElement.classList.toggle('light', !escuro)
}
aplicarTema(temaEscuro.matches)
temaEscuro.addEventListener('change', (e) => aplicarTema(e.matches))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
