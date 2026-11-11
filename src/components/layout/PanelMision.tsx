import { AnimatePresence, motion } from 'framer-motion'
import { BookOpen, Check, ChevronDown, CircleDashed, ClipboardList, Eye, FileCheck2, Flag, Lightbulb, NotebookPen, OctagonAlert, PartyPopper, Send, Target, Timer, TriangleAlert, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { bienvenidaGuiado, fases } from '../../data/sucursal'
import { textoPaso, variablesTexto } from '../../engine/escenario'
import { objetivosAplicables, progresoFase, type Objetivo } from '../../engine/objetivos'
import { useSim } from '../../engine/SimProvider'
import type { RegistroError } from '../../engine/tipos'
import { irA } from '../../lib/ruta'
import { cx, formatoTiempo, plantilla } from '../../lib/util'
import { Barra, Boton, Insignia } from '../ui/base'
import { useUi } from './uiContexto'

export function PanelMision({ actual, onTerminar }: { actual: Objetivo | null; onTerminar: () => void }) {
  const { s } = useSim()
  const { abrirPanel } = useUi()
  const [verFases, setVerFases] = useState(false)
  const [bienvenida, setBienvenida] = useState(Object.keys(s.completados).length === 0)
  const [errorVisto, setErrorVisto] = useState<number>(() => s.errores[s.errores.length - 1]?.id ?? 0)
  const ultimoError: RegistroError | undefined = s.errores[s.errores.length - 1]
  const mostrarError = ultimoError && ultimoError.id > errorVisto
  const t = actual ? textoPaso(s.esc, actual.id) : null
  const fase = actual ? fases[actual.fase - 1] : null
  const pf = actual ? progresoFase(s, actual.fase) : null
  const prog = actual?.progreso?.(s)
  const aplicables = objetivosAplicables(s.esc)
  const delaFase = actual ? aplicables.filter((o) => o.fase === actual.fase) : []

  return (
    <div className="scroll-fino h-full space-y-3 overflow-y-auto p-3">
      <AnimatePresence>
        {bienvenida && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} className="relative overflow-hidden rounded-2xl border border-violet-400/30 bg-gradient-to-br from-violet-500/15 via-cyan-500/5 to-transparent p-4">
            <button onClick={() => setBienvenida(false)} className="absolute right-2 top-2 rounded p-1 text-tenue hover:text-tinta" aria-label="Cerrar bienvenida">
              <X size={14} />
            </button>
            <p className="flex items-center gap-2 text-sm font-semibold text-violet-200">
              <Flag size={15} /> {bienvenidaGuiado.titulo}
            </p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-slate-300">{plantilla(bienvenidaGuiado.texto, variablesTexto(s.esc))}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {mostrarError && ultimoError && (
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, height: 0 }} className="rounded-2xl border border-rose-400/40 bg-rose-500/10 p-4">
            <div className="flex items-start gap-2">
              {ultimoError.leve ? <TriangleAlert size={18} className="mt-0.5 shrink-0 text-amber-300" /> : <OctagonAlert size={18} className="mt-0.5 shrink-0 text-rose-300" />}
              <div className="min-w-0 text-[13px]">
                <p className="font-semibold text-rose-100">¡Ojo! {ultimoError.titulo}</p>
                {ultimoError.extra && <p className="mt-1 font-mono text-[12px] text-rose-200/90">{ultimoError.extra}</p>}
                <p className="mt-2 text-slate-300">
                  <b className="text-slate-100">En la vida real: </b>
                  {ultimoError.detalle}
                </p>
                <p className="mt-2 text-slate-300">
                  <b className="text-emerald-300">Cómo corregirlo: </b>
                  {ultimoError.correccion}
                </p>
                <Boton tam="sm" className="mt-3" onClick={() => setErrorVisto(ultimoError.id)}>
                  Entendido
                </Boton>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {actual && t && fase && pf ? (
        <>
          <div className="rounded-2xl border border-borde bg-panel-2/70 p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <Insignia color="cyan">
                Fase {fase.n} de {fases.length}
              </Insignia>
              <span className="text-[11px] text-tenue">
                {pf.hechos}/{pf.total} objetivos
              </span>
            </div>
            <p className="text-[12px] font-medium uppercase tracking-wider text-tenue">{fase.titulo}</p>
            <Barra valor={pf.hechos / pf.total} className="mt-2" />
          </div>

          <motion.div key={actual.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} className="rounded-2xl border border-cyan-400/30 bg-gradient-to-b from-cyan-400/[0.08] to-transparent p-4 shadow-[0_0_40px_-20px_rgb(34_211_238/0.6)]">
            <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-cyan-300">
              <Target size={13} /> Qué sigue
            </p>
            <h3 className="mt-1 text-lg font-semibold leading-snug">{t.titulo}</h3>
            {prog && (
              <div className="mt-2">
                <div className="mb-1 flex justify-between text-[11px] text-tenue">
                  <span>Avance</span>
                  <span>
                    {prog.hechos}/{prog.total}
                  </span>
                </div>
                <Barra valor={prog.hechos / prog.total} color="from-emerald-400 to-cyan-400" />
              </div>
            )}
            <ol className="mt-3 space-y-1.5 text-[13px] leading-relaxed text-slate-200">
              {t.que.map((q, i) =>
                q.startsWith('•') ? (
                  <li key={i} className="pl-6 text-slate-300">
                    {q}
                  </li>
                ) : (
                  <li key={i} className="flex gap-2">
                    <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-cyan-400/15 text-[11px] font-bold text-cyan-200">{t.que.slice(0, i + 1).filter((x) => !x.startsWith('•')).length}</span>
                    <span>{q}</span>
                  </li>
                ),
              )}
            </ol>
            <div className="mt-3 rounded-xl bg-black/25 p-3 text-[12.5px] leading-relaxed text-slate-300">
              <p className="mb-1 flex items-center gap-1.5 font-semibold text-amber-200">
                <Lightbulb size={14} /> ¿Por qué?
              </p>
              {t.porque}
            </div>
            {t.buscar && (
              <p className="mt-2 flex items-start gap-1.5 text-[12.5px] text-tenue">
                <Eye size={14} className="mt-0.5 shrink-0 text-violet-300" />
                <span>
                  <b className="text-slate-300">Qué buscar: </b>
                  {t.buscar}
                </span>
              </p>
            )}
          </motion.div>

          <div className="rounded-2xl border border-borde bg-panel-2/50 p-3">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-tenue">En esta fase</p>
            <ul className="space-y-1">
              {delaFase.map((o) => {
                const c = s.completados[o.id]
                return (
                  <li key={o.id} className={cx('flex items-center gap-2 rounded-lg px-2 py-1 text-[12.5px]', o.id === actual.id && 'bg-cyan-400/10')}>
                    {c ? <Check size={14} className="text-emerald-300" /> : <CircleDashed size={14} className={o.id === actual.id ? 'text-cyan-300' : 'text-apagado'} />}
                    <span className={cx(c ? 'text-slate-400 line-through decoration-slate-600' : 'text-slate-200')}>{textoPaso(s.esc, o.id).titulo}</span>
                    {c?.fueraDeOrden && <Insignia color="ambar">fuera de orden</Insignia>}
                  </li>
                )
              })}
            </ul>
          </div>
        </>
      ) : (
        <div className="rounded-2xl border border-emerald-400/40 bg-gradient-to-b from-emerald-400/15 to-transparent p-5 text-center">
          <PartyPopper className="mx-auto text-emerald-300" size={34} />
          <p className="mt-2 text-lg font-semibold">¡Misión cumplida!</p>
          <p className="mt-1 text-[13px] text-slate-300">Completaste toda la migración. Genera tu hoja de evidencias.</p>
          <div className="mt-3 flex flex-col gap-2">
            <Boton variante="exito" icono={<FileCheck2 size={16} />} onClick={() => irA('evidencias')}>
              Hoja de evidencias
            </Boton>
            <Boton icono={<Send size={16} />} onClick={onTerminar}>
              Terminar práctica
            </Boton>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Boton tam="sm" icono={<NotebookPen size={14} />} onClick={() => abrirPanel('libreta')} data-guide="libreta-btn-mision">
          Libreta
        </Boton>
        <Boton tam="sm" icono={<ClipboardList size={14} />} onClick={() => abrirPanel('hoja')}>
          Hoja de trabajo
        </Boton>
        <Boton tam="sm" className="col-span-2" icono={<BookOpen size={14} />} onClick={() => abrirPanel('referencia')}>
          Referencia rápida
        </Boton>
      </div>

      <div className="rounded-2xl border border-borde bg-panel-2/40">
        <button onClick={() => setVerFases((v) => !v)} className="flex w-full items-center justify-between px-3 py-2.5 text-[12px] font-semibold uppercase tracking-wider text-tenue">
          Todas las fases
          <ChevronDown size={14} className={cx('transition', verFases && 'rotate-180')} />
        </button>
        {verFases && (
          <ul className="space-y-1 px-3 pb-3">
            {fases.map((f) => {
              const p = progresoFase(s, f.n)
              if (!p.total) return null
              return (
                <li key={f.n} className="flex items-center gap-2 text-[12.5px]">
                  <span className={cx('grid size-5 place-items-center rounded-full text-[10px] font-bold', p.hechos === p.total ? 'bg-emerald-400/20 text-emerald-200' : actual?.fase === f.n ? 'bg-cyan-400/20 text-cyan-200' : 'bg-white/5 text-tenue')}>{f.n}</span>
                  <span className="flex-1">{f.titulo}</span>
                  <span className="text-[11px] text-tenue">
                    {p.hechos}/{p.total}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

export function PanelExamen({ onEntregar }: { onEntregar: () => void }) {
  const { s } = useSim()
  const { abrirPanel } = useUi()
  const [ahora, setAhora] = useState(Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setAhora(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])
  const apl = objetivosAplicables(s.esc)
  const hechos = apl.filter((o) => s.completados[o.id]).length
  return (
    <div className="scroll-fino h-full space-y-3 overflow-y-auto p-3">
      <div className="rounded-2xl border border-amber-400/30 bg-gradient-to-b from-amber-400/10 to-transparent p-4 text-center">
        <p className="flex items-center justify-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-amber-200">
          <Timer size={13} /> Modo examen
        </p>
        <p className="mt-1 font-mono text-4xl font-semibold tabular-nums">{formatoTiempo((s.fin ?? ahora) - s.inicio)}</p>
        <p className="mt-1 text-[12px] text-tenue">Sin pistas: usa la hoja de trabajo y tu libreta.</p>
      </div>
      <div className="rounded-2xl border border-borde bg-panel-2/60 p-4">
        <p className="text-sm font-semibold">{s.esc.nombre}</p>
        <p className="text-[12px] text-tenue">CECO {s.esc.ceco}</p>
        <div className="mt-3">
          <div className="mb-1 flex justify-between text-[11px] text-tenue">
            <span>Avance general</span>
            <span>{Math.round((hechos / apl.length) * 100)}%</span>
          </div>
          <Barra valor={hechos / apl.length} color="from-amber-300 to-rose-400" />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-center">
          <div className="rounded-xl bg-black/25 p-2">
            <p className="text-xl font-semibold tabular-nums">{s.quiz.preguntadas.length - s.quiz.pendientes.length}</p>
            <p className="text-[10px] uppercase tracking-wider text-tenue">preguntas resp.</p>
          </div>
          <div className="rounded-xl bg-black/25 p-2">
            <p className="text-xl font-semibold tabular-nums">{s.esc.preguntas.length}</p>
            <p className="text-[10px] uppercase tracking-wider text-tenue">preguntas total</p>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Boton tam="sm" icono={<NotebookPen size={14} />} onClick={() => abrirPanel('libreta')}>
          Libreta
        </Boton>
        <Boton tam="sm" icono={<ClipboardList size={14} />} onClick={() => abrirPanel('hoja')}>
          Hoja de trabajo
        </Boton>
      </div>
      <Boton variante="primario" icono={<Send size={16} />} onClick={onEntregar}>
        Entregar examen
      </Boton>
      <p className="px-1 text-[11.5px] leading-relaxed text-tenue">
        Tus errores, lo que te falte y lo que hagas fuera de orden se califican al entregar. Las preguntas teóricas aparecen conforme avanzas.
      </p>
    </div>
  )
}
