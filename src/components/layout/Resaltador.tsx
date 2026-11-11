import { AnimatePresence, motion } from 'framer-motion'
import { MousePointerClick } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { textoPaso } from '../../engine/escenario'
import type { Objetivo } from '../../engine/objetivos'
import { useSim } from '../../engine/SimProvider'

interface Hallado {
  x: number
  y: number
  w: number
  h: number
  id: string
  pista: string
}

function contenedorScroll(el: Element): HTMLElement | null {
  let p = el.parentElement
  while (p && p !== document.body) {
    const st = getComputedStyle(p)
    if (/(auto|scroll)/.test(st.overflowY + st.overflowX)) return p
    p = p.parentElement
  }
  return null
}

function estado(el: Element): 'visible' | 'fuera' | 'tapado' {
  const r = el.getBoundingClientRect()
  if (r.width < 2 || r.height < 2) return 'tapado'
  const c = contenedorScroll(el)
  if (c) {
    const cr = c.getBoundingClientRect()
    if (r.bottom < cr.top + 4 || r.top > cr.bottom - 4 || r.right < cr.left + 4 || r.left > cr.right - 4) return 'fuera'
  }
  if (r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) return 'fuera'
  const x = Math.min(Math.max(r.left + r.width / 2, 1), innerWidth - 2)
  const y = Math.min(Math.max(r.top + Math.min(r.height / 2, 30), 1), innerHeight - 2)
  const top = document.elementFromPoint(x, y)
  if (!top) return 'tapado'
  return el === top || el.contains(top) ? 'visible' : 'tapado'
}

export function Resaltador({ objetivo }: { objetivo: Objetivo | null }) {
  const { s } = useSim()
  const ids = objetivo ? objetivo.guia(s) : []
  const clave = ids.join('|')
  const pistasRef = useRef<Record<string, string>>({})
  pistasRef.current = objetivo ? (textoPaso(s.esc, objetivo.id).pistas ?? {}) : {}
  const [h, setH] = useState<Hallado | null>(null)
  const desplazados = useRef(new Set<string>())
  const presionado = useRef(false)

  // No desplazar la vista mientras el usuario arrastra algo (por ejemplo un cable).
  useEffect(() => {
    const abajo = () => {
      presionado.current = true
    }
    const arriba = () => {
      window.setTimeout(() => {
        presionado.current = false
      }, 400)
    }
    window.addEventListener('pointerdown', abajo, true)
    window.addEventListener('pointerup', arriba, true)
    window.addEventListener('pointercancel', arriba, true)
    return () => {
      window.removeEventListener('pointerdown', abajo, true)
      window.removeEventListener('pointerup', arriba, true)
      window.removeEventListener('pointercancel', arriba, true)
    }
  }, [])

  useEffect(() => {
    if (!clave) {
      setH(null)
      return
    }
    const lista = clave.split('|')
    let raf = 0
    let ultimo = 0
    const ciclo = (t: number) => {
      if (t - ultimo > 140) {
        ultimo = t
        let hallado: { el: Element; id: string } | null = null
        let porDesplazar: { el: Element; id: string } | null = null
        for (const id of lista) {
          const els = document.querySelectorAll(`[data-guide="${id}"]`)
          for (const el of els) {
            const e = estado(el)
            if (e === 'visible') {
              hallado = { el, id }
              break
            }
            if (e === 'fuera' && !porDesplazar) porDesplazar = { el, id }
          }
          if (hallado || porDesplazar) break
        }
        if (!hallado && porDesplazar && !presionado.current && !desplazados.current.has(porDesplazar.id)) {
          desplazados.current.add(porDesplazar.id)
          porDesplazar.el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' })
        }
        if (hallado) {
          const r = hallado.el.getBoundingClientRect()
          const pista = pistasRef.current[hallado.id] ?? (hallado.el as HTMLElement).dataset?.pista ?? hallado.el.getAttribute('data-pista') ?? ''
          setH((prev) =>
            prev && prev.id === hallado!.id && Math.abs(prev.x - r.left) < 1 && Math.abs(prev.y - r.top) < 1 && Math.abs(prev.w - r.width) < 1 && Math.abs(prev.h - r.height) < 1 && prev.pista === pista
              ? prev
              : { x: r.left, y: r.top, w: r.width, h: r.height, id: hallado!.id, pista },
          )
        } else setH(null)
      }
      raf = requestAnimationFrame(ciclo)
    }
    raf = requestAnimationFrame(ciclo)
    return () => cancelAnimationFrame(raf)
  }, [clave])

  useEffect(() => {
    desplazados.current.clear()
  }, [objetivo?.id])

  const pad = 6
  const arriba = h ? h.y > 90 : false
  return (
    <div className="pointer-events-none fixed inset-0 z-[95] no-imprimir">
      <AnimatePresence>
        {h && (
          <motion.div
            key="anillo"
            initial={{ opacity: 0, scale: 1.3 }}
            animate={{ opacity: 1, scale: 1, left: h.x - pad, top: h.y - pad, width: h.w + pad * 2, height: h.h + pad * 2 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 28 }}
            className="absolute rounded-xl border-2 border-cyan-300 animate-latido"
            style={{ boxShadow: '0 0 0 4px rgb(34 211 238 / 0.18), 0 0 30px rgb(34 211 238 / 0.45)' }}
          />
        )}
        {h && h.pista && (
          <motion.div
            key={`pista-${h.id}`}
            initial={{ opacity: 0, y: arriba ? 6 : -6 }}
            animate={{ opacity: 1, y: 0, left: Math.max(8, Math.min(h.x + h.w / 2 - 150, innerWidth - 308)), top: arriba ? h.y - pad - 48 : h.y + h.h + pad + 10 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 28 }}
            className="absolute flex w-[300px] items-start gap-2 rounded-xl border border-cyan-300/50 bg-[#062633]/95 px-3 py-2 text-[12.5px] leading-snug text-cyan-50 shadow-xl backdrop-blur"
          >
            <MousePointerClick size={15} className="mt-0.5 shrink-0 text-cyan-300" />
            <span>{h.pista}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
