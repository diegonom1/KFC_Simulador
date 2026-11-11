import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useEffect, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cx } from '../../lib/util'

type Variante = 'primario' | 'secundario' | 'fantasma' | 'peligro' | 'exito'

export function Boton({
  variante = 'secundario',
  tam = 'md',
  className,
  children,
  icono,
  ...p
}: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: Variante; tam?: 'sm' | 'md' | 'lg'; icono?: ReactNode }) {
  const v: Record<Variante, string> = {
    primario:
      'bg-gradient-to-b from-cyan-300 to-cyan-500 text-slate-950 shadow-[0_8px_24px_-8px_rgb(34_211_238/0.7)] hover:from-cyan-200 hover:to-cyan-400 font-semibold',
    secundario: 'bg-panel-3 text-tinta border border-borde-2 hover:border-cyan-400/50 hover:bg-[#1a2838]',
    fantasma: 'text-tenue hover:text-tinta hover:bg-white/5',
    peligro: 'bg-rose-500/15 text-rose-200 border border-rose-400/30 hover:bg-rose-500/25',
    exito: 'bg-gradient-to-b from-emerald-300 to-emerald-500 text-emerald-950 font-semibold hover:from-emerald-200',
  }
  const t = { sm: 'h-8 px-3 text-xs gap-1.5 rounded-lg', md: 'h-10 px-4 text-sm gap-2 rounded-xl', lg: 'h-12 px-6 text-base gap-2.5 rounded-xl' }
  return (
    <button
      {...p}
      className={cx(
        'inline-flex items-center justify-center whitespace-nowrap transition-all duration-150 active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 cursor-pointer',
        v[variante],
        t[tam],
        className,
      )}
    >
      {icono}
      {children}
    </button>
  )
}

export function Insignia({ children, color = 'cyan', className }: { children: ReactNode; color?: 'cyan' | 'verde' | 'ambar' | 'rojo' | 'violeta' | 'gris' | 'naranja'; className?: string }) {
  const c = {
    cyan: 'bg-cyan-400/10 text-cyan-200 ring-cyan-400/30',
    verde: 'bg-emerald-400/10 text-emerald-200 ring-emerald-400/30',
    ambar: 'bg-amber-400/10 text-amber-200 ring-amber-400/30',
    rojo: 'bg-rose-400/10 text-rose-200 ring-rose-400/30',
    violeta: 'bg-violet-400/10 text-violet-200 ring-violet-400/30',
    gris: 'bg-slate-400/10 text-slate-300 ring-slate-400/25',
    naranja: 'bg-orange-400/10 text-orange-200 ring-orange-400/30',
  }[color]
  return <span className={cx('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset', c, className)}>{children}</span>
}

export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      className={cx(
        'inline-flex min-w-6 items-center justify-center rounded-md border border-b-[3px] border-slate-500/50 bg-slate-800 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-slate-100 shadow-sm',
        className,
      )}
    >
      {children}
    </kbd>
  )
}

export function Modal({
  abierto,
  onCerrar,
  children,
  ancho = 'max-w-lg',
  titulo,
  icono,
  sinCerrar,
}: {
  abierto: boolean
  onCerrar?: () => void
  children: ReactNode
  ancho?: string
  titulo?: ReactNode
  icono?: ReactNode
  sinCerrar?: boolean
}) {
  useEffect(() => {
    if (!abierto || sinCerrar) return
    const f = (e: KeyboardEvent) => e.key === 'Escape' && onCerrar?.()
    window.addEventListener('keydown', f)
    return () => window.removeEventListener('keydown', f)
  }, [abierto, onCerrar, sinCerrar])
  return (
    <AnimatePresence>
      {abierto && (
        <motion.div className="fixed inset-0 z-[80] flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={sinCerrar ? undefined : onCerrar} />
          <motion.div
            role="dialog"
            aria-modal="true"
            className={cx('panel relative w-full max-h-[90dvh] overflow-auto scroll-fino p-6', ancho)}
            initial={{ y: 24, scale: 0.97, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 12, scale: 0.98, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          >
            {(titulo || !sinCerrar) && (
              <div className="mb-4 flex items-start gap-3">
                {icono && <div className="mt-0.5 shrink-0">{icono}</div>}
                <h2 className="flex-1 text-lg font-semibold leading-snug">{titulo}</h2>
                {!sinCerrar && (
                  <button onClick={onCerrar} className="rounded-lg p-1 text-tenue hover:bg-white/5 hover:text-tinta" aria-label="Cerrar">
                    <X size={18} />
                  </button>
                )}
              </div>
            )}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function Cajon({ abierto, onCerrar, titulo, icono, children, ancho = 'w-[min(560px,100vw)]' }: { abierto: boolean; onCerrar: () => void; titulo: ReactNode; icono?: ReactNode; children: ReactNode; ancho?: string }) {
  useEffect(() => {
    if (!abierto) return
    const f = (e: KeyboardEvent) => e.key === 'Escape' && onCerrar()
    window.addEventListener('keydown', f)
    return () => window.removeEventListener('keydown', f)
  }, [abierto, onCerrar])
  return (
    <AnimatePresence>
      {abierto && (
        <motion.div className="fixed inset-0 z-[70]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onCerrar} />
          <motion.aside
            className={cx('absolute right-0 top-0 flex h-full flex-col border-l border-borde bg-panel/95 shadow-2xl backdrop-blur-xl', ancho)}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 360, damping: 36 }}
          >
            <header className="flex items-center gap-3 border-b border-borde px-5 py-4">
              {icono}
              <h2 className="flex-1 text-base font-semibold">{titulo}</h2>
              <button onClick={onCerrar} className="rounded-lg p-1.5 text-tenue hover:bg-white/5 hover:text-tinta" aria-label="Cerrar">
                <X size={18} />
              </button>
            </header>
            <div className="scroll-fino flex-1 overflow-y-auto p-5">{children}</div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function Acordeon({ titulo, icono, children, abiertoInicial = false, extra }: { titulo: ReactNode; icono?: ReactNode; children: ReactNode; abiertoInicial?: boolean; extra?: ReactNode }) {
  return (
    <details open={abiertoInicial} className="group panel overflow-hidden !rounded-xl">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3.5 transition hover:bg-white/[0.03]">
        {icono && <span className="text-cyan-300">{icono}</span>}
        <span className="flex-1 font-medium">{titulo}</span>
        {extra}
        <span className="text-tenue transition group-open:rotate-90">›</span>
      </summary>
      <div className="border-t border-borde px-4 py-4 text-sm leading-relaxed text-slate-300">{children}</div>
    </details>
  )
}

export function Separador({ className }: { className?: string }) {
  return <div className={cx('h-px w-full bg-gradient-to-r from-transparent via-borde-2 to-transparent', className)} />
}

export function Barra({ valor, color = 'from-cyan-400 to-violet-400', className }: { valor: number; color?: string; className?: string }) {
  return (
    <div className={cx('h-1.5 w-full overflow-hidden rounded-full bg-white/5', className)}>
      <motion.div className={cx('h-full rounded-full bg-gradient-to-r', color)} initial={false} animate={{ width: `${Math.round(Math.max(0, Math.min(1, valor)) * 100)}%` }} transition={{ type: 'spring', stiffness: 120, damping: 20 }} />
    </div>
  )
}
