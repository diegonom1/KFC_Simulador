import confetti from 'canvas-confetti'
import { motion } from 'framer-motion'
import { ArrowLeftRight, CircleCheck, CircleHelp, CircleX, Clock, FileCheck2, House, OctagonAlert, RotateCcw, TriangleAlert } from 'lucide-react'
import { useEffect, useMemo, useRef } from 'react'
import { Boton, Insignia } from '../components/ui/base'
import { calificar, PUNTOS, type ResumenHistorial } from '../engine/calificacion'
import { useSimCtx } from '../engine/SimProvider'
import { CLAVES, guardar, leer } from '../lib/almacen'
import { irA } from '../lib/ruta'
import { sfx } from '../lib/sonido'
import { cx, formatoTiempo, hora } from '../lib/util'

function Anillo({ valor }: { valor: number }) {
  const r = 70
  const c = 2 * Math.PI * r
  const color = valor >= 90 ? '#34d399' : valor >= 80 ? '#22d3ee' : valor >= 70 ? '#fbbf24' : '#fb7185'
  return (
    <svg viewBox="0 0 180 180" className="size-48">
      <circle cx={90} cy={90} r={r} fill="none" stroke="#ffffff10" strokeWidth={14} />
      <motion.circle cx={90} cy={90} r={r} fill="none" stroke={color} strokeWidth={14} strokeLinecap="round" transform="rotate(-90 90 90)" strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - valor / 100) }} transition={{ duration: 1.6, ease: 'easeOut' }} style={{ filter: `drop-shadow(0 0 10px ${color}88)` }} />
      <motion.text x={90} y={98} textAnchor="middle" fontSize={44} fontWeight={700} fill="#f1f5f9" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
        {valor}
      </motion.text>
      <text x={90} y={122} textAnchor="middle" fontSize={11} fill="#8698ad">
        de 100
      </text>
    </svg>
  )
}

export function Resultados() {
  const { s, iniciar } = useSimCtx()
  const cal = useMemo(() => (s && s.esc.modo === 'examen' && s.fin ? calificar(s) : null), [s])
  const guardado = useRef(false)

  useEffect(() => {
    if (!cal || !s || guardado.current) return
    guardado.current = true
    const h = leer<ResumenHistorial[]>(CLAVES.historial, [])
    if (!h.some((x) => x.t === s.fin)) {
      h.push({ t: s.fin!, total: cal.total, nivel: cal.nivel, ceco: s.esc.ceco, nombre: s.esc.nombre, duracion: cal.duracion, errores: cal.errores.length })
      guardar(CLAVES.historial, h.slice(-30))
    }
    if (cal.total >= 70) {
      sfx.logro()
      void confetti({ particleCount: 160, spread: 100, origin: { y: 0.3 }, colors: ['#22d3ee', '#a78bfa', '#34d399', '#fbbf24'] })
    }
  }, [cal, s])

  if (!s || !cal) {
    return (
      <div className="fondo-app grid min-h-dvh place-items-center p-4">
        <div className="panel max-w-md p-6 text-center">
          <p className="font-semibold">No hay un examen terminado</p>
          <p className="mt-1 text-sm text-tenue">Genera un examen nuevo desde el inicio.</p>
          <Boton className="mt-4" variante="primario" onClick={() => irA('inicio')}>
            Ir al inicio
          </Boton>
        </div>
      </div>
    )
  }

  const bloque = (t: string, n: number, max: number, color: string) => (
    <div className="rounded-xl border border-borde bg-black/20 p-3">
      <p className="text-[11px] uppercase tracking-wider text-tenue">{t}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">
        {n}
        <span className="text-sm text-tenue"> / {max}</span>
      </p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5">
        <motion.div className={cx('h-full rounded-full', color)} initial={{ width: 0 }} animate={{ width: `${(n / max) * 100}%` }} transition={{ duration: 1.2 }} />
      </div>
    </div>
  )

  return (
    <div className="fondo-app min-h-dvh">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="panel grid items-center gap-6 p-6 md:grid-cols-[auto_1fr]">
          <div className="flex justify-center">
            <Anillo valor={cal.total} />
          </div>
          <div>
            <Insignia color={cal.nivel === 'reprobado' ? 'rojo' : cal.nivel === 'aprobado' ? 'ambar' : 'verde'}>{cal.nivel === 'excelente' ? 'Excelente' : cal.nivel === 'muybien' ? 'Muy bien' : cal.nivel === 'aprobado' ? 'Aprobado' : 'No aprobado'}</Insignia>
            <h1 className="mt-2 text-2xl font-bold">{cal.veredicto}</h1>
            <p className="mt-1 text-sm text-tenue">
              {s.esc.nombre} · CECO {s.esc.ceco} · <Clock size={13} className="inline" /> {formatoTiempo(cal.duracion)}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {bloque('Procedimiento', Math.round(cal.procedimiento), PUNTOS.procedimiento, 'bg-cyan-400')}
              {bloque('Orden', Math.round(cal.orden), PUNTOS.orden, 'bg-violet-400')}
              {bloque('Teoría', Math.round(cal.teoria), PUNTOS.teoria, 'bg-amber-400')}
              <div className="rounded-xl border border-rose-400/30 bg-rose-500/5 p-3">
                <p className="text-[11px] uppercase tracking-wider text-tenue">Errores</p>
                <p className="mt-1 text-xl font-semibold tabular-nums text-rose-200">{cal.penalizacion ? `−${cal.penalizacion}` : 0}</p>
                <p className="text-[11px] text-tenue">{cal.errores.length} registrados</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Boton variante="primario" icono={<FileCheck2 size={16} />} onClick={() => irA('evidencias')}>
                Hoja de evidencias
              </Boton>
              <Boton
                icono={<RotateCcw size={16} />}
                onClick={() => {
                  iniciar('examen')
                  irA('examen')
                }}
              >
                Nuevo examen
              </Boton>
              <Boton variante="fantasma" icono={<House size={16} />} onClick={() => irA('inicio')}>
                Inicio
              </Boton>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <section className="panel p-5">
            <h2 className="flex items-center gap-2 font-semibold">
              <CircleCheck size={18} className="text-emerald-300" /> Lo que hiciste bien ({cal.logrados.length})
            </h2>
            <ul className="mt-3 space-y-1.5 text-[13px]">
              {cal.logrados.map((l) => (
                <li key={l.id} className="flex items-start gap-2">
                  <span className="mt-0.5 w-12 shrink-0 font-mono text-[11px] text-tenue">{l.t ? hora(l.t).slice(0, 5) : ''}</span>
                  <span className="flex-1">
                    {l.titulo} <span className="text-[11px] text-tenue">· fase {l.fase}</span>
                  </span>
                  {l.fueraDeOrden && <Insignia color="ambar">fuera de orden</Insignia>}
                </li>
              ))}
              {!cal.logrados.length && <li className="text-tenue">Ningún objetivo completado.</li>}
            </ul>
          </section>
          <div className="space-y-4">
            <section className="panel p-5">
              <h2 className="flex items-center gap-2 font-semibold">
                <CircleX size={18} className="text-rose-300" /> Lo que te faltó ({cal.faltantes.length})
              </h2>
              <ul className="mt-3 space-y-1.5 text-[13px]">
                {cal.faltantes.map((l) => (
                  <li key={l.id} className="flex gap-2">
                    <span className="text-rose-300">•</span>
                    <span>
                      {l.titulo} <span className="text-[11px] text-tenue">· {l.faseTitulo}</span>
                    </span>
                  </li>
                ))}
                {!cal.faltantes.length && <li className="text-emerald-300">¡Nada! Completaste todo.</li>}
              </ul>
            </section>
            <section className="panel p-5">
              <h2 className="flex items-center gap-2 font-semibold">
                <ArrowLeftRight size={18} className="text-amber-300" /> Fuera de orden ({cal.fueraDeOrden.length})
              </h2>
              <ul className="mt-3 space-y-2 text-[13px]">
                {cal.fueraDeOrden.map((l) => (
                  <li key={l.id}>
                    <p>{l.titulo}</p>
                    <p className="text-[12px] text-tenue">Antes debías: {l.faltaban?.join(' · ')}</p>
                  </li>
                ))}
                {!cal.fueraDeOrden.length && <li className="text-emerald-300">Seguiste el orden correcto.</li>}
              </ul>
            </section>
          </div>
        </div>

        <section className="panel mt-4 p-5">
          <h2 className="flex items-center gap-2 font-semibold">
            <OctagonAlert size={18} className="text-rose-300" /> Errores ({cal.errores.length})
          </h2>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {cal.errores.map((e) => (
              <div key={e.id} className={cx('rounded-xl border p-3 text-[13px]', e.leve ? 'border-amber-400/30 bg-amber-400/5' : 'border-rose-400/30 bg-rose-500/5')}>
                <p className="flex items-center gap-2 font-semibold">
                  {e.leve ? <TriangleAlert size={15} className="text-amber-300" /> : <OctagonAlert size={15} className="text-rose-300" />}
                  {e.titulo}
                  <span className="ml-auto font-mono text-[11px] text-tenue">{hora(e.t).slice(0, 5)}</span>
                </p>
                {e.extra && <p className="mt-1 font-mono text-[12px] text-slate-300">{e.extra}</p>}
                <p className="mt-1.5 text-slate-300">{e.detalle}</p>
                <p className="mt-1.5 text-emerald-200/90">
                  <b>Corrección:</b> {e.correccion}
                </p>
              </div>
            ))}
            {!cal.errores.length && <p className="text-emerald-300">Sin errores registrados. ¡Muy bien!</p>}
          </div>
        </section>

        <section className="panel mt-4 p-5">
          <h2 className="flex items-center gap-2 font-semibold">
            <CircleHelp size={18} className="text-amber-300" /> Preguntas teóricas ({cal.preguntas.filter((p) => p.ok).length}/{cal.preguntas.length})
          </h2>
          <div className="mt-3 space-y-3">
            {cal.preguntas.map(({ pregunta, elegida, ok }) => (
              <div key={pregunta.id} className="rounded-xl border border-borde bg-black/20 p-3 text-[13px]">
                <p className="flex gap-2 font-medium">
                  {ok ? <CircleCheck size={16} className="mt-0.5 shrink-0 text-emerald-300" /> : <CircleX size={16} className="mt-0.5 shrink-0 text-rose-300" />}
                  {pregunta.texto}
                </p>
                <p className="mt-1 pl-6 text-slate-300">
                  Tu respuesta: <b className={ok ? 'text-emerald-200' : 'text-rose-200'}>{elegida === null ? 'sin responder' : pregunta.opciones[elegida]}</b>
                  {!ok && (
                    <>
                      {' '}
                      · Correcta: <b className="text-emerald-200">{pregunta.opciones[pregunta.correcta]}</b>
                    </>
                  )}
                </p>
                <p className="mt-1 pl-6 text-[12px] text-tenue">{pregunta.explicacion}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
