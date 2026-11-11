import '@fontsource-variable/inter'
import '@fontsource-variable/jetbrains-mono'
import '@fontsource/caveat/600.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
