import { motion, useDragControls } from 'framer-motion'
import { GripHorizontal, X } from 'lucide-react'
import type { ReactNode, RefObject } from 'react'
import { cx } from '../../lib/util'
import { Insignia } from '../ui/base'

export function VentanaPrimaria({ titulo, icono, subtitulo, estado, onCerrar, children }: { titulo: string; icono: ReactNode; subtitulo?: string; estado?: { t: string; c: 'verde' | 'ambar' | 'rojo' | 'gris' }; onCerrar: () => void; children: ReactNode }) {
  return (
    <motion.section
      initial={{ opacity: 0, scale: 0.97, y: 14 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97, y: 10 }}
      transition={{ type: 'spring', stiffness: 320, damping: 30 }}
      className="panel absolute inset-1.5 z-30 flex flex-col overflow-hidden !rounded-2xl sm:inset-3"
    >
      <header className="flex items-center gap-3 border-b border-borde bg-panel-2/70 px-4 py-2.5">
        <span className="grid size-8 place-items-center rounded-lg bg-cyan-400/10 text-cyan-300 ring-1 ring-cyan-400/25">{icono}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{titulo}</p>
          {subtitulo && <p className="truncate text-[11px] text-tenue">{subtitulo}</p>}
        </div>
        {estado && <Insignia color={estado.c}>{estado.t}</Insignia>}
        <button onClick={onCerrar} className="rounded-lg p-1.5 text-tenue hover:bg-white/5 hover:text-tinta" aria-label="Cerrar ventana">
          <X size={18} />
        </button>
      </header>
      <div className="relative min-h-0 flex-1">{children}</div>
    </motion.section>
  )
}

export function VentanaFlotante({
  titulo,
  icono,
  onCerrar,
  children,
  indice,
  z,
  onFoco,
  limites,
  ancho = 360,
}: {
  titulo: string
  icono: ReactNode
  onCerrar: () => void
  children: ReactNode
  indice: number
  z: number
  onFoco: () => void
  limites: RefObject<HTMLElement | null>
  ancho?: number
}) {
  const controles = useDragControls()
  return (
    <motion.section
      drag
      dragControls={controles}
      dragListener={false}
      dragMomentum={false}
      dragConstraints={limites}
      dragElastic={0.05}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.92 }}
      onPointerDown={onFoco}
      className={cx('panel absolute flex max-h-[calc(100%-1.5rem)] flex-col overflow-hidden !rounded-2xl shadow-2xl')}
      style={{ width: `min(${ancho}px, calc(100% - 1rem))`, right: 12 + indice * 26, top: 12 + indice * 26, zIndex: z }}
    >
      <header className="flex cursor-grab items-center gap-2 border-b border-borde bg-panel-2/80 px-3 py-2 active:cursor-grabbing" onPointerDown={(e) => controles.start(e)} style={{ touchAction: 'none' }}>
        <span className="text-cyan-300">{icono}</span>
        <p className="flex-1 truncate text-[13px] font-semibold">{titulo}</p>
        <GripHorizontal size={14} className="text-apagado" />
        <button onPointerDown={(e) => e.stopPropagation()} onClick={onCerrar} className="rounded p-1 text-tenue hover:bg-white/5 hover:text-tinta" aria-label="Cerrar">
          <X size={15} />
        </button>
      </header>
      <div className="scroll-fino min-h-0 flex-1 overflow-y-auto">{children}</div>
    </motion.section>
  )
}
