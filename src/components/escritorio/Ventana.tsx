import { Maximize2, Minimize2, Minus, Square, X } from 'lucide-react'
import { useEffect, useRef, useState, type PointerEvent as RPointerEvent, type ReactNode } from 'react'
import { cx } from '../../lib/util'

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

/** Ventana arrastrable dentro de un escritorio simulado. */
export function Ventana({
  titulo,
  icono,
  estilo,
  inicial,
  z,
  onFoco,
  onCerrar,
  children,
  maximizadaInicial,
}: {
  titulo: string
  icono?: ReactNode
  estilo: 'ubuntu' | 'windows'
  inicial: Rect
  z: number
  onFoco: () => void
  onCerrar: () => void
  children: ReactNode
  maximizadaInicial?: boolean
}) {
  const [r, setR] = useState<Rect>(inicial)
  const [max, setMax] = useState(!!maximizadaInicial)
  const ref = useRef<HTMLDivElement>(null)
  const arr = useRef<{ dx: number; dy: number; tipo: 'mover' | 'tam'; w0: number; h0: number; x0: number; y0: number } | null>(null)

  useEffect(() => {
    const padre = ref.current?.parentElement
    if (!padre) return
    const W = padre.clientWidth
    const H = padre.clientHeight
    if (W < 700) {
      setMax(true)
      return
    }
    setR((v) => {
      const w = Math.min(v.w, W - 16)
      const h = Math.min(v.h, H - 12)
      return { w, h, x: Math.max(4, Math.min(v.x, W - w - 8)), y: Math.max(4, Math.min(v.y, H - h - 6)) }
    })
  }, [])

  const limites = () => {
    const p = ref.current?.parentElement
    return { W: p?.clientWidth ?? 1000, H: p?.clientHeight ?? 700 }
  }

  const down = (e: RPointerEvent, tipo: 'mover' | 'tam') => {
    if (max && tipo === 'mover') return
    e.preventDefault()
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    arr.current = { dx: e.clientX - r.x, dy: e.clientY - r.y, tipo, w0: r.w, h0: r.h, x0: e.clientX, y0: e.clientY }
    onFoco()
  }
  const move = (e: RPointerEvent) => {
    const a = arr.current
    if (!a) return
    const { W, H } = limites()
    if (a.tipo === 'mover') {
      setR((v) => ({ ...v, x: Math.max(-v.w + 80, Math.min(W - 80, e.clientX - a.dx)), y: Math.max(0, Math.min(H - 40, e.clientY - a.dy)) }))
    } else {
      setR((v) => ({ ...v, w: Math.max(320, a.w0 + e.clientX - a.x0), h: Math.max(200, a.h0 + e.clientY - a.y0) }))
    }
  }
  const up = () => {
    arr.current = null
  }

  const estiloPos = max ? { left: 0, top: 0, width: '100%', height: '100%' } : { left: r.x, top: r.y, width: r.w, height: r.h }

  return (
    <div
      ref={ref}
      className={cx('absolute flex flex-col overflow-hidden shadow-[0_18px_50px_-10px_rgb(0_0_0/0.75)]', estilo === 'ubuntu' ? 'rounded-t-lg rounded-b-md' : 'rounded-md border border-slate-400/40')}
      style={{ ...estiloPos, zIndex: z }}
      onPointerDown={onFoco}
    >
      {estilo === 'ubuntu' ? (
        <div
          className="flex h-8 shrink-0 cursor-grab items-center bg-gradient-to-b from-[#3c3b37] to-[#2b2a27] px-2 text-[12.5px] text-[#dfdbd2] active:cursor-grabbing"
          onPointerDown={(e) => down(e, 'mover')}
          onPointerMove={move}
          onPointerUp={up}
          onDoubleClick={() => setMax((m) => !m)}
        >
          <span className="mr-2 opacity-80">{icono}</span>
          <span className="flex-1 truncate text-center font-medium">{titulo}</span>
          <button onPointerDown={(e) => e.stopPropagation()} onClick={() => setMax((m) => !m)} className="mr-1 grid size-5 place-items-center rounded-full text-[#dfdbd2] hover:bg-white/10" aria-label="Maximizar">
            {max ? <Minimize2 size={11} /> : <Maximize2 size={11} />}
          </button>
          <button onPointerDown={(e) => e.stopPropagation()} onClick={onCerrar} className="grid size-5 place-items-center rounded-full bg-[#e95420] text-white hover:brightness-110" aria-label="Cerrar">
            <X size={12} strokeWidth={3} />
          </button>
        </div>
      ) : (
        <div
          className="flex h-8 shrink-0 cursor-grab items-center bg-white pl-3 text-[12px] text-slate-800 active:cursor-grabbing"
          onPointerDown={(e) => down(e, 'mover')}
          onPointerMove={move}
          onPointerUp={up}
          onDoubleClick={() => setMax((m) => !m)}
        >
          <span className="mr-2">{icono}</span>
          <span className="flex-1 truncate">{titulo}</span>
          <span className="grid h-8 w-11 place-items-center text-slate-600">
            <Minus size={14} />
          </span>
          <button onPointerDown={(e) => e.stopPropagation()} onClick={() => setMax((m) => !m)} className="grid h-8 w-11 place-items-center text-slate-600 hover:bg-slate-200" aria-label="Maximizar">
            <Square size={11} />
          </button>
          <button onPointerDown={(e) => e.stopPropagation()} onClick={onCerrar} className="grid h-8 w-11 place-items-center text-slate-600 hover:bg-[#e81123] hover:text-white" aria-label="Cerrar">
            <X size={15} />
          </button>
        </div>
      )}
      <div className="relative min-h-0 flex-1 overflow-hidden">{children}</div>
      {!max && <div className="absolute bottom-0 right-0 size-4 cursor-se-resize" onPointerDown={(e) => down(e, 'tam')} onPointerMove={move} onPointerUp={up} />}
    </div>
  )
}
