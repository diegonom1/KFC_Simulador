import { AnimatePresence, motion } from 'framer-motion'
import { CircleCheck, Info, OctagonAlert, PartyPopper, TriangleAlert, X } from 'lucide-react'
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { cx } from '../../lib/util'

export type TipoToast = 'exito' | 'error' | 'aviso' | 'info' | 'logro'

export interface Toast {
  id: number
  tipo: TipoToast
  titulo: string
  texto?: string
  correccion?: string
  duracion?: number
}

interface Ctx {
  mostrar: (t: Omit<Toast, 'id'>) => void
}

const ToastCtx = createContext<Ctx>({ mostrar: () => {} })
let contador = 1

export function ToastProvider({ children }: { children: ReactNode }) {
  const [lista, setLista] = useState<Toast[]>([])
  const quitar = useCallback((id: number) => setLista((l) => l.filter((x) => x.id !== id)), [])
  const mostrar = useCallback(
    (t: Omit<Toast, 'id'>) => {
      const id = contador++
      setLista((l) => [...l.slice(-3), { ...t, id }])
      window.setTimeout(() => quitar(id), t.duracion ?? (t.tipo === 'error' ? 11000 : t.tipo === 'logro' ? 6000 : 4500))
    },
    [quitar],
  )
  const valor = useMemo(() => ({ mostrar }), [mostrar])
  return (
    <ToastCtx.Provider value={valor}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[90] flex w-[min(420px,calc(100vw-2rem))] flex-col gap-2.5 no-imprimir">
        <AnimatePresence initial={false}>
          {lista.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 60, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 420, damping: 32 }}
              className={cx(
                'pointer-events-auto relative overflow-hidden rounded-2xl border p-3.5 pr-9 shadow-2xl backdrop-blur-xl',
                t.tipo === 'error' && 'border-rose-400/40 bg-[#2a0f18]/95',
                t.tipo === 'exito' && 'border-emerald-400/30 bg-[#0b2219]/95',
                t.tipo === 'aviso' && 'border-amber-400/35 bg-[#271d08]/95',
                t.tipo === 'info' && 'border-cyan-400/30 bg-[#0a1d26]/95',
                t.tipo === 'logro' && 'border-violet-400/40 bg-[#1a1230]/95',
              )}
            >
              <div className="flex gap-3">
                <div className="mt-0.5 shrink-0">
                  {t.tipo === 'error' && <OctagonAlert className="text-rose-300" size={20} />}
                  {t.tipo === 'exito' && <CircleCheck className="text-emerald-300" size={20} />}
                  {t.tipo === 'aviso' && <TriangleAlert className="text-amber-300" size={20} />}
                  {t.tipo === 'info' && <Info className="text-cyan-300" size={20} />}
                  {t.tipo === 'logro' && <PartyPopper className="text-violet-300" size={20} />}
                </div>
                <div className="min-w-0 text-sm">
                  <p className="font-semibold leading-snug">{t.titulo}</p>
                  {t.texto && <p className="mt-1 text-[13px] leading-snug text-slate-300">{t.texto}</p>}
                  {t.correccion && (
                    <p className="mt-2 rounded-lg bg-black/25 px-2.5 py-2 text-[13px] leading-snug text-slate-200">
                      <span className="font-semibold text-emerald-300">Cómo corregirlo: </span>
                      {t.correccion}
                    </p>
                  )}
                </div>
              </div>
              <button onClick={() => quitar(t.id)} className="absolute right-2 top-2 rounded-md p-1 text-slate-400 hover:bg-white/10 hover:text-white" aria-label="Cerrar aviso">
                <X size={14} />
              </button>
              <motion.div
                className={cx('absolute bottom-0 left-0 h-0.5', t.tipo === 'error' ? 'bg-rose-400/60' : t.tipo === 'exito' ? 'bg-emerald-400/60' : 'bg-cyan-400/50')}
                initial={{ width: '100%' }}
                animate={{ width: 0 }}
                transition={{ duration: (t.duracion ?? (t.tipo === 'error' ? 11000 : t.tipo === 'logro' ? 6000 : 4500)) / 1000, ease: 'linear' }}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  )
}

export function useToasts() {
  return useContext(ToastCtx)
}
