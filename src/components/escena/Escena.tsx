import { motion } from 'framer-motion'
import {
  Bike,
  Cctv,
  ChefHat,
  Fingerprint,
  GraduationCap,
  Laptop,
  LoaderCircle,
  Monitor,
  PanelTop,
  Phone,
  Printer,
  Radio,
  Receipt,
  Router,
  Server,
  Timer,
  Tv,
  type LucideIcon,
} from 'lucide-react'
import { useLayoutEffect, useRef, useState } from 'react'
import { estadoEquipo, type EstadoEquipo } from '../../engine/objetivos'
import { tieneTelmex, tieneTp } from '../../engine/escenario'
import type { SimState } from '../../engine/tipos'
import { cx } from '../../lib/util'
import type { VentanaId } from '../layout/uiContexto'

// ---------------------------------------------------------------------------
// Proyección isométrica: coordenadas del plano (x, y) en "metros" → pantalla.
// ---------------------------------------------------------------------------
const KX = 5.37
const KY = 3.1
const OX = 362
const OY = 82
export const VB_X = 80
export const VB_Y = 95
export const VB_W = 900
export const VB_H = 545

export function P(x: number, y: number, z = 0): [number, number] {
  return [OX + (x - y) * KX, OY + (x + y) * KY - z]
}
const pts = (arr: Array<[number, number, number?]>) => arr.map(([x, y, z]) => P(x, y, z ?? 0).map((v) => v.toFixed(1)).join(',')).join(' ')

interface Sala {
  id: string
  nombre: string
  r: [number, number, number, number]
  piso: string
}

const SALAS: Sala[] = [
  { id: 'comedor', nombre: 'COMEDOR', r: [14, 0, 40, 64], piso: '#0c1725' },
  { id: 'barra', nombre: 'BARRA', r: [40, 0, 54, 40], piso: '#101d2d' },
  { id: 'cocina', nombre: 'COCINA', r: [54, 0, 100, 34], piso: '#0d1e27' },
  { id: 'delivery', nombre: 'DELIVERY', r: [40, 40, 58, 64], piso: '#131a2c' },
  { id: 'oficina', nombre: 'OFICINA GERENCIAL', r: [58, 34, 86, 64], piso: '#111a2a' },
  { id: 'site', nombre: 'SITE', r: [86, 34, 100, 50], piso: '#161a2b' },
  { id: 'drive', nombre: 'VENTANILLA', r: [86, 50, 100, 64], piso: '#0e1d25' },
]

type Mueble = [number, number, number, number, number, string]
const MESAS: Mueble[] = [0, 1].flatMap((i) => [0, 1, 2, 3].map((j): Mueble => [18 + i * 11, 6 + j * 14, 23 + i * 11, 11 + j * 14, 4.5, '#1a293b']))
const MUEBLES: Mueble[] = ([
  ...MESAS,
  [42, 3, 45, 37, 9, '#21344a'],
  [59, 6, 96, 9.5, 9, '#1b3340'],
  [59, 20, 96, 23.5, 9, '#1b3340'],
  [42, 57, 50, 61, 8, '#252f49'],
  [52, 56, 57, 60, 7, '#252f49'],
  [48, 42, 54, 45, 8, '#252f49'],
  [64, 52, 80, 56, 8, '#273145'],
  [61, 39, 69, 42, 8, '#273145'],
  [76, 38.5, 83, 42, 8, '#2a3550'],
  [81, 60, 85.5, 63.5, 7, '#2a3550'],
  [91, 46, 96, 49.5, 18, '#1f293b'],
  [90.5, 35, 95.5, 40, 46, '#192232'],
  [97.5, 42.5, 99.5, 45.5, 10, '#1f293b'],
  [97.5, 34.5, 99.5, 37.5, 12, '#1f293b'],
  [103, 46, 109, 57, 6, '#7c2d12'],
  [104, 48, 108, 54.5, 10, '#9a3412'],
] as Mueble[]).sort((a, b) => a[2] + a[3] - (b[2] + b[3]))

function Caja({ m }: { m: Mueble }) {
  const [x0, y0, x1, y1, h, c] = m
  return (
    <g>
      <polygon points={pts([[x0, y1, 0], [x1, y1, 0], [x1, y1, h], [x0, y1, h]])} fill={c} style={{ filter: 'brightness(0.78)' }} />
      <polygon points={pts([[x1, y0, 0], [x1, y1, 0], [x1, y1, h], [x1, y0, h]])} fill={c} style={{ filter: 'brightness(0.6)' }} />
      <polygon points={pts([[x0, y0, h], [x1, y0, h], [x1, y1, h], [x0, y1, h]])} fill={c} stroke="rgb(148 163 184 / 0.18)" strokeWidth={0.6} />
    </g>
  )
}

function Paredes({ s }: { s: Sala }) {
  const [x0, y0, x1, y1] = s.r
  const h = s.id === 'comedor' || y0 === 0 ? 18 : 12
  return (
    <g>
      <polygon points={pts([[x0, y0, 0], [x1, y0, 0], [x1, y0, h], [x0, y0, h]])} fill="rgb(56 189 248 / 0.05)" stroke="rgb(56 189 248 / 0.22)" strokeWidth={0.7} />
      <polygon points={pts([[x0, y0, 0], [x0, y1, 0], [x0, y1, h], [x0, y0, h]])} fill="rgb(56 189 248 / 0.035)" stroke="rgb(56 189 248 / 0.18)" strokeWidth={0.7} />
      <polyline points={pts([[x0, y1, h], [x0, y0, h], [x1, y0, h]])} fill="none" stroke="rgb(103 232 249 / 0.5)" strokeWidth={1.1} />
    </g>
  )
}

function TextoPiso({ x, y, texto, tam = 1.9, opacidad = 0.32 }: { x: number; y: number; texto: string; tam?: number; opacidad?: number }) {
  const [sx, sy] = P(x, y)
  return (
    <text
      transform={`matrix(${KX / 6.2} ${KY / 6.2} ${-KX / 6.2} ${KY / 6.2} ${sx} ${sy})`}
      fontSize={tam * 6.2}
      fill={`rgb(186 230 253 / ${opacidad})`}
      fontWeight={700}
      letterSpacing={2}
      style={{ fontFamily: 'var(--font-sans)' }}
    >
      {texto}
    </text>
  )
}

export interface MarcaEscena {
  id: VentanaId
  nombre: string
  icono: LucideIcon
  x: number
  y: number
  z: number
}

export const MARCAS: MarcaEscena[] = [
  { id: 'rack', nombre: 'Rack', icono: Server, x: 93, y: 37.5, z: 56 },
  { id: 'modems', nombre: 'ONT / módems', icono: Router, x: 93.5, y: 47.8, z: 26 },
  { id: 'digi', nombre: 'Digi', icono: Radio, x: 99.5, y: 44, z: 14 },
  { id: 'proveedores', nombre: 'Proveedores', icono: Cctv, x: 99.5, y: 34.6, z: 16 },
  { id: 'laptop', nombre: 'Laptop técnico', icono: Laptop, x: 79.5, y: 40.2, z: 10 },
  { id: 'pc', nombre: 'PC Gerencial', icono: Monitor, x: 68.6, y: 54, z: 10 },
  { id: 'tel', nombre: 'Teléfono IP', icono: Phone, x: 78.8, y: 52.2, z: 10 },
  { id: 'imp', nombre: 'Impresora', icono: Printer, x: 83.4, y: 61.8, z: 9 },
  { id: 'lms', nombre: 'LMS', icono: GraduationCap, x: 50.8, y: 43.5, z: 10 },
  { id: 'bio', nombre: 'Biométrico', icono: Fingerprint, x: 66.7, y: 32, z: 16 },
  { id: 'hd', nombre: 'Home Delivery', icono: Bike, x: 45, y: 59, z: 10 },
  { id: 'iemp', nombre: 'I.Emp Delivery', icono: Receipt, x: 54.5, y: 58, z: 9 },
  { id: 'hme', nombre: 'HME Drive-Thru', icono: Timer, x: 98, y: 60, z: 14 },
  { id: 'sus1', nombre: 'Sus 01', icono: Tv, x: 45.9, y: 9, z: 12 },
  { id: 'sus2', nombre: 'Sus 02', icono: Tv, x: 46.8, y: 24.8, z: 12 },
  { id: 'pkd1', nombre: 'PKDs L1', icono: ChefHat, x: 78.7, y: 4.6, z: 18 },
  { id: 'pkd2', nombre: 'PKDs L2', icono: ChefHat, x: 75.4, y: 19.5, z: 18 },
  { id: 'menu', nombre: 'Pantallas de menú', icono: PanelTop, x: 40.5, y: 18, z: 30 },
]

const RACK = MARCAS[0]

export function estadoMarca(s: SimState, id: VentanaId): EstadoEquipo {
  switch (id) {
    case 'modems': {
      const e = [tieneTp(s.esc) && estadoEquipo(s, 'tp'), tieneTelmex(s.esc) && estadoEquipo(s, 'tx')].filter(Boolean) as EstadoEquipo[]
      if (e.includes('error')) return 'error'
      if (e.every((x) => x === 'ok')) return 'ok'
      return e.some((x) => x !== 'pendiente') ? 'parcial' : 'pendiente'
    }
    case 'sus1':
    case 'sus2':
    case 'pkd1':
    case 'pkd2':
    case 'iemp':
      return estadoEquipo(s, 'vlan40')
    case 'menu':
      return s.completados['cab-pantallas'] ? 'ok' : 'pendiente'
    case 'proveedores':
      return s.completados['cab-proveedores'] ? 'ok' : 'pendiente'
    default:
      return estadoEquipo(s, id)
  }
}

function reiniciando(s: SimState, id: VentanaId): boolean {
  if (id === 'pc' || id === 'hd' || id === 'lms') return !!s.linux[id].reiniciandoHasta
  if (id === 'bio' || id === 'tel' || id === 'hme' || id === 'imp' || id === 'digi') return !!s.disp[id].reiniciandoHasta
  return false
}

const COLOR: Record<EstadoEquipo, { anillo: string; linea: string; texto: string }> = {
  ok: { anillo: 'ring-emerald-400/80 bg-emerald-500/15 text-emerald-200 shadow-[0_0_24px_-4px_rgb(52_211_153/0.7)]', linea: '#34d399', texto: 'Listo' },
  error: { anillo: 'ring-rose-400/90 bg-rose-500/20 text-rose-100 shadow-[0_0_24px_-4px_rgb(251_113_133/0.8)]', linea: '#fb7185', texto: 'Con error' },
  parcial: { anillo: 'ring-amber-300/80 bg-amber-400/15 text-amber-100 shadow-[0_0_20px_-6px_rgb(251_191_36/0.7)]', linea: '#fbbf24', texto: 'En progreso' },
  pendiente: { anillo: 'ring-slate-400/40 bg-slate-800/80 text-slate-200', linea: '#475569', texto: 'Pendiente' },
}

function Arco({ m, estado, animar }: { m: MarcaEscena; estado: EstadoEquipo; animar: boolean }) {
  const [x1, y1] = P(m.x, m.y, m.z)
  const [x2, y2] = P(RACK.x, RACK.y, RACK.z - 6)
  const cx = (x1 + x2) / 2
  const cy = Math.min(y1, y2) - 34 - Math.abs(x2 - x1) * 0.12
  const d = `M${x1.toFixed(1)},${y1.toFixed(1)} Q${cx.toFixed(1)},${cy.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}`
  const c = COLOR[estado].linea
  return (
    <g>
      <path d={d} fill="none" stroke={c} strokeOpacity={estado === 'pendiente' ? 0.25 : 0.5} strokeWidth={estado === 'pendiente' ? 1 : 1.4} className={estado === 'pendiente' ? 'flujo-lento' : 'flujo'} />
      {animar && estado === 'ok' && (
        <circle r={2.4} fill={c}>
          <animateMotion dur={`${2.2 + (m.x % 5) * 0.3}s`} repeatCount="indefinite" path={d} />
        </circle>
      )}
    </g>
  )
}

export function Escena({ s, onAbrir, decorativa = false, className }: { s?: SimState; onAbrir?: (id: VentanaId) => void; decorativa?: boolean; className?: string }) {
  const caja = useRef<HTMLDivElement>(null)
  const [dim, setDim] = useState({ w: 0, h: 0 })
  useLayoutEffect(() => {
    const el = caja.current?.parentElement
    if (!el) return
    const ro = new ResizeObserver(() => {
      const W = el.clientWidth
      const H = el.clientHeight
      const w = Math.min(W, H > 0 ? (H * VB_W) / VB_H : W)
      setDim({ w, h: (w * VB_H) / VB_W })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const estado = (id: VentanaId): EstadoEquipo => (s ? estadoMarca(s, id) : decorativa ? (['ok', 'ok', 'parcial', 'pendiente'] as const)[MARCAS.findIndex((m) => m.id === id) % 4] : 'pendiente')

  return (
    <div ref={caja} className={cx('relative select-none', className)} style={{ width: dim.w, height: dim.h }}>
      <svg viewBox={`${VB_X} ${VB_Y} ${VB_W} ${VB_H}`} className="absolute inset-0 h-full w-full" aria-hidden>
        <defs>
          <radialGradient id="esc-halo" cx="50%" cy="55%" r="55%">
            <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.16" />
            <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="esc-asfalto" x1="0" x2="1">
            <stop offset="0" stopColor="#0a0f16" />
            <stop offset="1" stopColor="#111823" />
          </linearGradient>
        </defs>
        <ellipse cx={VB_X + VB_W / 2} cy={VB_Y + VB_H * 0.56} rx={VB_W * 0.55} ry={VB_H * 0.48} fill="url(#esc-halo)" />
        {/* sombra del edificio */}
        <polygon points={pts([[16, 66], [114, 66], [114, 2], [16, 2]])} fill="black" opacity={0.35} transform="translate(10 14)" style={{ filter: 'blur(10px)' }} />
        {/* carril del drive-thru */}
        <polygon points={pts([[100, 0], [112, 0], [112, 64], [100, 64]])} fill="url(#esc-asfalto)" stroke="#1e293b" strokeWidth={0.8} />
        <polyline points={pts([[106, 2], [106, 62]])} fill="none" stroke="#facc15" strokeOpacity={0.5} strokeWidth={1.2} strokeDasharray="7 7" />
        {[10, 26, 42].map((y) => (
          <polyline key={y} points={pts([[103.5, y], [106, y + 3.5], [108.5, y]])} fill="none" stroke="#e2e8f0" strokeOpacity={0.35} strokeWidth={1.4} />
        ))}
        <TextoPiso x={101.2} y={4} texto="DRIVE-THRU" tam={1.6} opacidad={0.4} />
        {/* pisos */}
        {SALAS.map((sa) => {
          const [x0, y0, x1, y1] = sa.r
          return <polygon key={sa.id} points={pts([[x0, y0], [x1, y0], [x1, y1], [x0, y1]])} fill={sa.piso} stroke="rgb(56 189 248 / 0.18)" strokeWidth={0.8} />
        })}
        {/* baldosas sutiles de cocina */}
        {Array.from({ length: 9 }, (_, i) => (
          <polyline key={`c${i}`} points={pts([[54 + i * 5, 0], [54 + i * 5, 34]])} stroke="rgb(148 163 184 / 0.05)" strokeWidth={0.6} fill="none" />
        ))}
        {SALAS.map((sa) => (
          <TextoPiso key={`t${sa.id}`} x={sa.r[0] + 2} y={sa.r[3] - 3} texto={sa.nombre} tam={sa.id === 'site' || sa.id === 'drive' ? 1.25 : 1.8} />
        ))}
        {[...SALAS].sort((a, b) => a.r[0] + a.r[1] - (b.r[0] + b.r[1])).map((sa) => (
          <Paredes key={`p${sa.id}`} s={sa} />
        ))}
        {/* muebles */}
        {MUEBLES.map((m, i) => (
          <Caja key={i} m={m} />
        ))}
        {/* LEDs del rack */}
        {Array.from({ length: 7 }, (_, i) => {
          const [lx, ly] = P(95.5, 37.5, 10 + i * 5)
          return <circle key={i} cx={lx + 2} cy={ly} r={1.3} fill={i % 3 === 0 ? '#facc15' : '#4ade80'} className="led-actividad" style={{ animationDelay: `${i * 0.13}s` }} />
        })}
        {/* pantallas de menú (paneles colgantes sobre la barra) */}
        {[6, 14, 22].map((y) => (
          <polygon key={y} points={pts([[40.6, y, 22], [40.6, y + 6, 22], [40.6, y + 6, 31], [40.6, y, 31]])} fill="#0b2a3a" stroke="#38bdf8" strokeOpacity={0.5} strokeWidth={0.7} />
        ))}
        {/* arcos de red hacia el rack */}
        {MARCAS.filter((m) => m.id !== 'rack').map((m) => (
          <Arco key={`a${m.id}`} m={m} estado={estado(m.id)} animar={!decorativa || true} />
        ))}
        {/* postes de los marcadores */}
        {MARCAS.map((m) => {
          const [ax, ay] = P(m.x, m.y, 0)
          const [bx, by] = P(m.x, m.y, m.z)
          return (
            <g key={`poste${m.id}`}>
              <ellipse cx={ax} cy={ay} rx={7} ry={3.4} fill="black" opacity={0.45} />
              <line x1={ax} y1={ay} x2={bx} y2={by + 14} stroke={COLOR[estado(m.id)].linea} strokeOpacity={0.55} strokeWidth={1} strokeDasharray="2 2" />
            </g>
          )
        })}
      </svg>
      {/* marcadores clicables */}
      {MARCAS.map((m) => {
        const [sx, sy] = P(m.x, m.y, m.z)
        const e = estado(m.id)
        const Icono = m.icono
        const rein = s ? reiniciando(s, m.id) : false
        return (
          <motion.button
            key={m.id}
            type="button"
            data-guide={decorativa ? undefined : `scene-${m.id}`}
            disabled={decorativa}
            onClick={() => onAbrir?.(m.id)}
            className={cx('group absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 outline-none', decorativa ? 'cursor-default' : 'cursor-pointer')}
            style={{ left: `${((sx - VB_X) / VB_W) * 100}%`, top: `${((sy - VB_Y) / VB_H) * 100}%` }}
            whileHover={decorativa ? undefined : { scale: 1.12, y: -3 }}
            whileTap={decorativa ? undefined : { scale: 0.95 }}
            title={decorativa ? undefined : `${m.nombre} · ${COLOR[e].texto}`}
          >
            <span
              className={cx(
                'relative grid place-items-center rounded-xl ring-2 backdrop-blur transition-colors',
                m.id === 'rack' ? 'size-11' : 'size-9',
                COLOR[e].anillo,
                'group-focus-visible:outline-2 group-focus-visible:outline-cyan-300',
              )}
            >
              <Icono size={m.id === 'rack' ? 22 : 18} strokeWidth={1.9} />
              {rein && (
                <span className="absolute -right-1.5 -top-1.5 grid size-4 place-items-center rounded-full bg-amber-400 text-slate-900">
                  <LoaderCircle size={11} className="animate-spin" />
                </span>
              )}
            </span>
            <span
              className={cx(
                'whitespace-nowrap rounded-md bg-slate-950/80 px-1.5 py-[1px] text-[10px] font-medium leading-tight text-slate-200 ring-1 ring-white/10',
                (dim.w < 640 || decorativa) && 'hidden',
                'group-hover:text-white',
              )}
            >
              {m.nombre}
            </span>
          </motion.button>
        )
      })}
    </div>
  )
}

export function LeyendaEstados({ className }: { className?: string }) {
  return (
    <div className={cx('flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-tenue', className)}>
      {(['ok', 'parcial', 'pendiente', 'error'] as const).map((k) => (
        <span key={k} className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full" style={{ background: COLOR[k].linea }} />
          {COLOR[k].texto}
        </span>
      ))}
    </div>
  )
}
