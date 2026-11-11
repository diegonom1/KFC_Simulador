import { AnimatePresence, motion } from 'framer-motion'
import { ArrowDown, ArrowUp, Camera, CircleCheck, RotateCcw, TriangleAlert, Wifi } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { catalogoErrores } from '../../../data/errores'
import { condicionesSpeedtest, enlaces, type CondicionSpeed } from '../../../engine/red'
import { useSim } from '../../../engine/SimProvider'
import type { Origen, SimState } from '../../../engine/tipos'
import { sfx } from '../../../lib/sonido'
import { aleatorio, cx } from '../../../lib/util'

const MARCAS = [0, 5, 10, 50, 100, 250, 500, 750, 1000]

function angulo(v: number): number {
  const n = MARCAS.length - 1
  for (let i = 0; i < n; i++) {
    if (v <= MARCAS[i + 1]) {
      const f = (v - MARCAS[i]) / (MARCAS[i + 1] - MARCAS[i])
      return -120 + ((i + f) / n) * 240
    }
  }
  return 120
}

function objetivo(s: SimState, c: CondicionSpeed) {
  let carrier = c.carrier
  if (carrier === 'otro') carrier = enlaces(s).tpWan ? 'tp' : 'tx'
  let base = carrier === 'tp' ? { bajada: aleatorio(188, 214), subida: aleatorio(94, 107), ping: aleatorio(4, 9) } : { bajada: aleatorio(46, 54), subida: aleatorio(9.4, 10.8), ping: aleatorio(8, 15) }
  if (c.conexion === 'wifi') base = { bajada: base.bajada * aleatorio(0.42, 0.6), subida: base.subida * aleatorio(0.5, 0.7), ping: base.ping + aleatorio(6, 16) }
  if (c.motivo === 'SPEEDTEST_COMPARTIDO') base = { bajada: base.bajada * aleatorio(0.35, 0.55), subida: base.subida * aleatorio(0.45, 0.65), ping: base.ping + aleatorio(10, 30) }
  if (c.motivo === 'SPEEDTEST_NO_DIRECTO' || c.motivo === 'PRUEBA_PC') base = { bajada: base.bajada * aleatorio(0.82, 0.95), subida: base.subida * aleatorio(0.85, 0.95), ping: base.ping + aleatorio(1, 4) }
  return base
}

type Fase = 'listo' | 'ping' | 'bajada' | 'subida' | 'fin'

export function PaginaSpeedtest({ origen }: { origen: Origen }) {
  const { s, dispatch } = useSim()
  const sRef = useRef(s)
  sRef.current = s
  const [fase, setFase] = useState<Fase>('listo')
  const [valor, setValor] = useState(0)
  const [res, setRes] = useState<{ ping?: number; bajada?: number; subida?: number }>({})
  const [cond, setCond] = useState<CondicionSpeed>(() => condicionesSpeedtest(s, origen))
  const [registro, setRegistro] = useState<number | null>(null)
  const [flash, setFlash] = useState(false)
  const conteoAntes = useRef(0)
  const raf = useRef(0)

  const condActual = fase === 'listo' ? condicionesSpeedtest(s, origen) : cond
  const proveedor = condActual.carrier === 'tp' ? 'Totalplay' : condActual.carrier === 'tx' ? 'Telmex' : enlaces(s).tpWan ? 'Totalplay (vía FortiGate)' : 'Telmex (vía FortiGate)'

  useEffect(() => () => cancelAnimationFrame(raf.current), [])

  useEffect(() => {
    if (fase === 'fin' && registro === null && s.speedtests.length > conteoAntes.current) setRegistro(s.speedtests[s.speedtests.length - 1].id)
  }, [fase, registro, s.speedtests])

  const iniciar = () => {
    const c = condicionesSpeedtest(sRef.current, origen)
    setCond(c)
    setRes({})
    setRegistro(null)
    const meta = objetivo(sRef.current, c)
    const t0 = performance.now()
    const D = { ping: 1300, bajada: 4200, subida: 3600 }
    sfx.click()
    const paso = (t: number) => {
      const e = t - t0
      if (e < D.ping) {
        setFase('ping')
        setValor(0)
      } else if (e < D.ping + D.bajada) {
        setFase('bajada')
        setRes((r) => (r.ping ? r : { ...r, ping: meta.ping }))
        const f = (e - D.ping) / D.bajada
        setValor(meta.bajada * Math.min(1, f * 1.8) * (0.92 + Math.random() * 0.12))
      } else if (e < D.ping + D.bajada + D.subida) {
        setFase('subida')
        setRes((r) => (r.bajada ? r : { ...r, bajada: meta.bajada }))
        const f = (e - D.ping - D.bajada) / D.subida
        setValor(meta.subida * Math.min(1, f * 1.8) * (0.9 + Math.random() * 0.14))
      } else {
        setFase('fin')
        setValor(0)
        setRes({ ping: meta.ping, bajada: meta.bajada, subida: meta.subida })
        conteoAntes.current = sRef.current.speedtests.length
        dispatch({
          tipo: 'SPEEDTEST',
          registro: {
            carrier: c.carrier,
            conexion: c.conexion,
            valido: c.valido,
            motivo: c.motivo,
            ping: Math.round(meta.ping),
            bajada: Math.round(meta.bajada * 10) / 10,
            subida: Math.round(meta.subida * 10) / 10,
            captura: false,
          },
        })
        sfx.pingFin()
        return
      }
      raf.current = requestAnimationFrame(paso)
    }
    raf.current = requestAnimationFrame(paso)
  }

  const capturar = () => {
    if (registro === null) return
    setFlash(true)
    sfx.obturador()
    dispatch({ tipo: 'SPEEDTEST_CAPTURA', id: registro })
    window.setTimeout(() => setFlash(false), 450)
  }

  const capturado = registro !== null && s.speedtests.find((r) => r.id === registro)?.captura
  const ang = angulo(valor)
  const motivo = condActual.motivo ? catalogoErrores[condActual.motivo] : null

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-y-auto bg-[radial-gradient(ellipse_at_top,#1d1f3b,#0d0e1c_70%)] font-sans text-white">
      <header className="flex items-center justify-between px-5 py-3 text-sm">
        <p className="font-bold tracking-wide">
          Prueba de <span className="text-cyan-300">velocidad</span>
        </p>
        <p className="text-xs text-slate-400">speedtest.net</p>
      </header>
      {motivo && (
        <div className="mx-auto mb-2 flex max-w-lg items-start gap-2 rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-xs text-amber-100">
          <TriangleAlert size={15} className="mt-0.5 shrink-0 text-amber-300" />
          <span>
            <b>{motivo.titulo}.</b> {motivo.correccion}
            {condActual.otros.length > 0 && <> En uso por: {condActual.otros.join(', ')}.</>}
          </span>
        </div>
      )}
      <div className="flex flex-1 flex-col items-center justify-center gap-5 px-4 pb-6">
        <div className="grid grid-cols-3 gap-6 text-center">
          {(
            [
              ['PING', res.ping, 'ms', null],
              ['DESCARGA', res.bajada, 'Mbps', <ArrowDown key="d" size={13} className="text-cyan-300" />],
              ['CARGA', res.subida, 'Mbps', <ArrowUp key="u" size={13} className="text-violet-300" />],
            ] as const
          ).map(([t, v, u, ic]) => (
            <div key={t} className="min-w-20">
              <p className="flex items-center justify-center gap-1 text-[11px] font-semibold tracking-widest text-slate-400">
                {ic}
                {t}
              </p>
              <p className="mt-1 text-2xl font-light tabular-nums">{v !== undefined ? (t === 'PING' ? Math.round(v) : v.toFixed(2)) : '—'}</p>
              <p className="text-[10px] text-slate-500">{u}</p>
            </div>
          ))}
        </div>
        {fase === 'listo' ? (
          <motion.button
            data-guide="speed-go"
            onClick={iniciar}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.96 }}
            className="relative grid size-44 place-items-center rounded-full text-4xl font-semibold tracking-widest"
          >
            <span className="absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,#22d3ee,#a78bfa,#22d3ee)] p-[3px]">
              <span className="block size-full rounded-full bg-[#14152a]" />
            </span>
            <span className="absolute inset-0 animate-ping rounded-full border border-cyan-300/30" />
            <span className="relative">GO</span>
          </motion.button>
        ) : fase === 'fin' ? (
          <div className="flex flex-col items-center gap-3">
            <div className={cx('flex items-center gap-2 rounded-full px-4 py-1.5 text-sm', cond.valido ? 'bg-emerald-400/15 text-emerald-200' : 'bg-amber-400/15 text-amber-200')}>
              {cond.valido ? <CircleCheck size={16} /> : <TriangleAlert size={16} />}
              {cond.valido ? 'Resultado válido como evidencia' : 'Resultado NO válido como evidencia'}
            </div>
            <div className="flex gap-2">
              <button data-guide={capturado ? undefined : 'speed-captura'} onClick={capturar} disabled={!!capturado || registro === null} className="inline-flex items-center gap-2 rounded-full bg-cyan-400 px-5 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-300 disabled:opacity-50">
                <Camera size={16} /> {capturado ? 'Captura guardada' : 'Tomar captura'}
              </button>
              <button onClick={() => setFase('listo')} className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-sm hover:bg-white/10">
                <RotateCcw size={15} /> Otra vez
              </button>
            </div>
          </div>
        ) : (
          <div className="relative">
            <svg viewBox="-130 -130 260 200" className="w-72">
              <defs>
                <linearGradient id="st-g" x1="0" x2="1">
                  <stop offset="0" stopColor="#22d3ee" />
                  <stop offset="1" stopColor={fase === 'subida' ? '#a78bfa' : '#38bdf8'} />
                </linearGradient>
              </defs>
              <path d="M -103.9 60 A 120 120 0 1 1 103.9 60" fill="none" stroke="#ffffff14" strokeWidth={16} strokeLinecap="round" transform="scale(0.92)" />
              <path
                d="M -103.9 60 A 120 120 0 1 1 103.9 60"
                fill="none"
                stroke="url(#st-g)"
                strokeWidth={16}
                strokeLinecap="round"
                transform="scale(0.92)"
                pathLength={240}
                strokeDasharray={`${ang + 120} 240`}
              />
              {MARCAS.map((m) => {
                const a = ((angulo(m) - 90) * Math.PI) / 180
                return (
                  <text key={m} x={Math.cos(a) * 84} y={Math.sin(a) * 84 + 4} fontSize={9} textAnchor="middle" fill="#94a3b8">
                    {m}
                  </text>
                )
              })}
              <g transform={`rotate(${ang})`}>
                <polygon points="-4,0 4,0 0,-92" fill="#e2e8f0" />
              </g>
              <circle r={9} fill="#1e2040" stroke="#e2e8f0" strokeWidth={2} />
            </svg>
            <div className="absolute inset-x-0 bottom-0 text-center">
              <p className="text-4xl font-light tabular-nums">{fase === 'ping' ? '…' : valor.toFixed(2)}</p>
              <p className="text-xs tracking-widest text-slate-400">{fase === 'ping' ? 'MIDIENDO PING' : fase === 'bajada' ? 'DESCARGA · Mbps' : 'CARGA · Mbps'}</p>
            </div>
          </div>
        )}
        <div className="flex items-center gap-4 text-xs text-slate-400">
          <span className="inline-flex items-center gap-1">
            {condActual.conexion === 'wifi' ? <Wifi size={13} /> : <span className="inline-block size-2 rounded-full bg-emerald-400" />}
            {condActual.conexion === 'wifi' ? 'Wi-Fi' : condActual.conexion === 'cable' ? 'Cable directo al módem' : condActual.conexion === 'switch' ? 'Cable a la red de la tienda' : 'Sin conexión'}
          </span>
          <span>Proveedor: {proveedor}</span>
          <span>Servidor: Ciudad de México</span>
        </div>
      </div>
      <AnimatePresence>
        {flash && <motion.div className="pointer-events-none absolute inset-0 bg-white" initial={{ opacity: 0.95 }} animate={{ opacity: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.45 }} />}
      </AnimatePresence>
    </div>
  )
}
