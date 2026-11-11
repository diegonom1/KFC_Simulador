import { MotionConfig } from 'framer-motion'
import { useEffect } from 'react'
import { ToastProvider } from './components/ui/Toasts'
import { SimProvider } from './engine/SimProvider'
import { useRuta } from './lib/ruta'
import { Evidencias } from './pages/Evidencias'
import { Inicio } from './pages/Inicio'
import { ReferenciaPagina } from './pages/ReferenciaPagina'
import { Resultados } from './pages/Resultados'
import { Simulador } from './pages/Simulador'

const TITULOS = {
  inicio: 'Simulador SD-WAN',
  guiado: 'Modo guiado · Simulador SD-WAN',
  examen: 'Modo examen · Simulador SD-WAN',
  referencia: 'Referencia rápida · Simulador SD-WAN',
  resultados: 'Resultados · Simulador SD-WAN',
  evidencias: 'Hoja de evidencias · Simulador SD-WAN',
}

function Rutas() {
  const ruta = useRuta()
  useEffect(() => {
    document.title = TITULOS[ruta]
  }, [ruta])
  switch (ruta) {
    case 'guiado':
      return <Simulador key="guiado" modo="guiado" />
    case 'examen':
      return <Simulador key="examen" modo="examen" />
    case 'referencia':
      return <ReferenciaPagina />
    case 'resultados':
      return <Resultados />
    case 'evidencias':
      return <Evidencias />
    default:
      return <Inicio />
  }
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <SimProvider>
        <ToastProvider>
          <Rutas />
        </ToastProvider>
      </SimProvider>
    </MotionConfig>
  )
}
