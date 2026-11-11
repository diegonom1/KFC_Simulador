// Enrutador mínimo por hash (#/ruta): funciona en GitHub Pages y en cualquier hosting estático.
import { useEffect, useState } from 'react'

export type Ruta = 'inicio' | 'guiado' | 'examen' | 'referencia' | 'resultados' | 'evidencias'

function leerRuta(): Ruta {
  const h = window.location.hash.replace(/^#\/?/, '').split('?')[0]
  const validas: Ruta[] = ['inicio', 'guiado', 'examen', 'referencia', 'resultados', 'evidencias']
  return (validas as string[]).includes(h) ? (h as Ruta) : 'inicio'
}

export function irA(r: Ruta) {
  window.location.hash = r === 'inicio' ? '/' : `/${r}`
  window.scrollTo({ top: 0 })
}

export function useRuta(): Ruta {
  const [r, setR] = useState<Ruta>(leerRuta)
  useEffect(() => {
    const f = () => setR(leerRuta())
    window.addEventListener('hashchange', f)
    return () => window.removeEventListener('hashchange', f)
  }, [])
  return r
}
