import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import SessionQueryProvider from './components/SessionQueryProvider'
import './index.css'
import App from './App.tsx'
import { ToastProvider } from './components/ui/toast'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SessionQueryProvider>
      <ToastProvider>
        <App />
      </ToastProvider>
    </SessionQueryProvider>
  </StrictMode>,
)
