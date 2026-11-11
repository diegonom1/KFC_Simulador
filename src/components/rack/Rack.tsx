import { AnimatePresence, motion } from 'framer-motion'
import { Cable, ClipboardList, Info, List, Minus, MousePointerClick, Plus, Tag, Unplug } from 'lucide-react'
import { useMemo, useRef, useState, type PointerEvent as RPointerEvent } from 'react'
import { carriers, hojaEtiquetado, vlanDePuerto } from '../../data/sucursal'
import { cablesDe, nombrePuerto, puertoOcupado, type CableDef } from '../../engine/cables'
import { enlaces } from '../../engine/red'
import { useSim } from '../../engine/SimProvider'
import type { PuertoId, SimState } from '../../engine/tipos'
import { sfx } from '../../lib/sonido'
import { cx } from '../../lib/util'
import { Boton, Modal } from '../ui/base'
import { HojaEtiquetado } from './HojaEtiquetado'
import { FG, LAP, MODEM, modemsVisibles, OLD, PL, PORT, PP, posicionesPuertos, RH, RW, SW, colSw, esDestinoValido, xModem, type PosPuerto } from './geometria'

const ABREV: Record<number, string> = {
  1: 'PC',
  2: 'PC·2',
  3: 'HD',
  4: 'LMS',
  5: 'BIO',
  6: 'TEL',
  7: 'HME',
  8: 'IMP',
  9: 'DIGI',
  10: 'SUS1',
  11: 'SUS2',
  12: 'PKD1',
  13: 'PKD2',
  14: 'IEMP',
  15: 'MENÚ',
  16: 'DVR',
  17: 'MÚS',
}

const ETIQUETAS = ['L4-ONT', 'L5-ONT', 'L6-ONT', 'L7-ONT']

function rutaCable(a: { x: number; y: number }, b: { x: number; y: number }): string {
  const dy = b.y - a.y
  const dx = b.x - a.x
  if (Math.abs(dy) < 50) {
    const sag = 34 + Math.min(110, Math.abs(dx) * 0.16)
    return `M${a.x},${a.y} C${a.x},${a.y + sag} ${b.x},${b.y + sag} ${b.x},${b.y}`
  }
  const k = Math.max(44, Math.abs(dy) * 0.55)
  const dir = dy > 0 ? 1 : -1
  return `M${a.x},${a.y} C${a.x + dx * 0.05},${a.y + dir * k} ${b.x - dx * 0.05},${b.y - dir * k} ${b.x},${b.y}`
}

function Puerto({ x, y, activo, led, danado, resaltar, objetivo, onClick, onEnter, onLeave, guia }: {
  x: number
  y: number
  activo?: boolean
  led?: 'verde' | 'ambar' | null
  danado?: boolean
  resaltar?: boolean
  objetivo?: boolean
  onClick?: () => void
  onEnter?: () => void
  onLeave?: () => void
  guia?: string
}) {
  return (
    <g data-guide={guia} onClick={onClick} onPointerEnter={onEnter} onPointerLeave={onLeave} style={{ cursor: onClick ? 'pointer' : undefined }}>
      {resaltar && <rect x={x - 4} y={y - 4} width={PORT.w + 8} height={PORT.h + 8} rx={5} fill="none" stroke={objetivo ? '#22d3ee' : '#22d3ee66'} strokeWidth={objetivo ? 2.5 : 1.2} />}
      <rect x={x} y={y} width={PORT.w} height={PORT.h} rx={2.5} fill="#05070b" stroke={activo ? '#3f5470' : '#2a3442'} strokeWidth={1} />
      <rect x={x + 9} y={y + 2} width={10} height={4} fill="#1f2937" />
      <rect x={x + 4} y={y + 7} width={PORT.w - 8} height={PORT.h - 10} fill="#0b0f15" />
      {led !== undefined && <rect x={x + 2} y={y - 5} width={5} height={3} rx={1} fill={led === 'verde' ? '#4ade80' : led === 'ambar' ? '#fbbf24' : '#1f2937'} className={led ? 'led-actividad' : undefined} />}
      {danado && (
        <g pointerEvents="none">
          <line x1={x + 2} y1={y + 2} x2={x + PORT.w - 2} y2={y + PORT.h - 2} stroke="#f43f5e" strokeWidth={2.5} />
          <line x1={x + PORT.w - 2} y1={y + 2} x2={x + 2} y2={y + PORT.h - 2} stroke="#f43f5e" strokeWidth={2.5} />
        </g>
      )}
    </g>
  )
}

function Conector({ x, y, color, arrastrando, seleccionado }: { x: number; y: number; color: string; arrastrando?: boolean; seleccionado?: boolean }) {
  return (
    <g pointerEvents="none" transform={`translate(${x} ${y})`}>
      {(arrastrando || seleccionado) && <circle r={17} fill="none" stroke="#22d3ee" strokeWidth={2} strokeDasharray="4 3" />}
      <rect x={-8} y={-2} width={16} height={20} rx={3} fill={color} stroke="#0008" strokeWidth={1} />
      <rect x={-6} y={-10} width={12} height={10} rx={1.5} fill="#cbd5e1" fillOpacity={0.8} stroke="#0006" />
      <line x1={-3} y1={-8} x2={-3} y2={-3} stroke="#a16207" strokeWidth={1} />
      <line x1={0} y1={-8} x2={0} y2={-3} stroke="#a16207" strokeWidth={1} />
      <line x1={3} y1={-8} x2={3} y2={-3} stroke="#a16207" strokeWidth={1} />
    </g>
  )
}

function pistaCable(s: SimState, c: CableDef): string {
  if (c.puertoHoja) {
    const v = vlanDePuerto(c.puertoHoja)
    if (c.puertoHoja === s.esc.puertoDanado) return `Su puerto de la hoja (${c.puertoHoja}) está dañado: usa otro puerto libre de la VLAN${v}.`
    return `Llévalo al puerto ${c.puertoHoja} del switch nuevo (VLAN${v}).`
  }
  switch (c.grupo) {
    case 'wan':
      return c.id === 'tp' ? 'Va al puerto WAN del FortiGate.' : s.esc.carriers === 'solo-telmex' ? 'Único carrier: va al WAN del FortiGate.' : 'Va al PORT1 del FortiGate.'
    case 'fortilink':
      return 'Va al puerto 48 del switch nuevo.'
    case 'proveedor':
      return 'Va a cualquier puerto del SW Plano.'
    case 'pantallas':
      return 'Va a un LAN libre de la ONT principal.'
    case 'extra':
      return 'Desconéctalo: arrástralo fuera y suéltalo en un espacio vacío.'
    case 'laptop':
      return 'Conecta la laptop donde la necesites.'
    default:
      return ''
  }
}

export function Rack() {
  const { s, dispatch } = useSim()
  const esc = s.esc
  const svgRef = useRef<SVGSVGElement>(null)
  const defs = useMemo(() => cablesDe(esc), [esc])
  const pos = useMemo(() => posicionesPuertos(esc), [esc])
  const modems = useMemo(() => modemsVisibles(esc), [esc])
  const [drag, setDrag] = useState<{ cable: string; x: number; y: number; x0: number; y0: number; movido: boolean } | null>(null)
  const [sel, setSel] = useState<string | null>(null)
  const [hover, setHover] = useState<PuertoId | null>(null)
  const [zoom, setZoom] = useState(1)
  const [hoja, setHoja] = useState(false)
  const [lista, setLista] = useState(false)
  const [fabrica, setFabrica] = useState<string | null>(null)
  const [etiquetaDe, setEtiquetaDe] = useState<'tp' | 'tx' | 'ex1' | 'ex2' | null>(null)
  const en = enlaces(s)

  const aSvg = (e: { clientX: number; clientY: number }) => {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }
    const pt = svg.createSVGPoint()
    pt.x = e.clientX
    pt.y = e.clientY
    const m = svg.getScreenCTM()
    if (!m) return { x: 0, y: 0 }
    const r = pt.matrixTransform(m.inverse())
    return { x: r.x, y: r.y }
  }

  const ocupado = (p: PuertoId, excepto?: string) => puertoOcupado(s.cables, defs, p, excepto)
  const libreParaCable = (p: PuertoId, cable: string) => esDestinoValido(p) && !!pos[p] && !ocupado(p, cable)

  const conectar = (cable: string, destino: PuertoId | null) => {
    const actual = s.cables[cable]
    if (actual === destino) return
    if (destino && !libreParaCable(destino, cable)) {
      sfx.error()
      return
    }
    dispatch({ tipo: 'CABLE', cable, destino })
    if (destino) sfx.conectar()
    else sfx.desconectar()
  }

  const masCercano = (x: number, y: number, cable: string): PuertoId | null => {
    let mejor: PuertoId | null = null
    let d = 24
    for (const [id, p] of Object.entries(pos)) {
      if (!libreParaCable(id, cable)) continue
      const dist = Math.hypot(p.x - x, p.y - y)
      if (dist < d) {
        d = dist
        mejor = id
      }
    }
    return mejor
  }

  // El arrastre vive en una ref (sincrónica) y en estado (para pintar): así soltar rápido no usa una posición vieja.
  const dragRef = useRef<typeof drag>(null)
  const onDown = (e: RPointerEvent, cable: string) => {
    e.stopPropagation()
    e.preventDefault()
    const p = aSvg(e)
    svgRef.current?.setPointerCapture(e.pointerId)
    dragRef.current = { cable, x: p.x, y: p.y, x0: p.x, y0: p.y, movido: false }
    setDrag(dragRef.current)
  }
  const onMove = (e: RPointerEvent) => {
    const d = dragRef.current
    if (!d) return
    const p = aSvg(e)
    const movido = d.movido || Math.hypot(p.x - d.x0, p.y - d.y0) > 8
    dragRef.current = { ...d, x: p.x, y: p.y, movido }
    setDrag(dragRef.current)
  }
  const onUp = (e: RPointerEvent) => {
    const d = dragRef.current
    if (!d) return
    const p = aSvg(e)
    const movidoFinal = d.movido || Math.hypot(p.x - d.x0, p.y - d.y0) > 8
    const { cable } = d
    const { x, y } = p
    const movido = movidoFinal
    dragRef.current = null
    setDrag(null)
    if (!movido) {
      setSel((v) => (v === cable ? null : cable))
      sfx.click()
      return
    }
    setSel(null)
    conectar(cable, masCercano(x, y, cable))
  }

  const clickPuerto = (p: PuertoId) => {
    if (sel && libreParaCable(p, sel)) {
      conectar(sel, p)
      setSel(null)
    }
  }

  const extremo = (c: CableDef, i: number): { x: number; y: number; libre: boolean } => {
    if (drag?.cable === c.id) return { x: drag.x, y: drag.y, libre: true }
    const d = s.cables[c.id]
    if (d && pos[d]) return { ...pos[d], libre: false }
    const a = pos[c.desde]
    const lado = ((i * 37) % 23) - 11
    if (c.desde.startsWith('pp:')) return { x: a.x + lado, y: a.y + 46, libre: true }
    if (c.desde === 'lap') return { x: a.x - 60, y: a.y + 22, libre: true }
    return { x: a.x + lado, y: a.y + 56, libre: true }
  }

  const activoCableEn = (p: PuertoId) => Object.entries(s.cables).some(([, d]) => d === p) || defs.some((d) => d.desde === p && s.cables[d.id])
  const cableArrastrado = drag ? defs.find((d) => d.id === drag.cable) : sel ? defs.find((d) => d.id === sel) : null
  const objetivoDrop = drag?.movido ? masCercano(drag.x, drag.y, drag.cable) : null

  const infoPuerto = (p: PuertoId | null): string => {
    if (!p) return ''
    const [eq, n] = p.split(':')
    let t = nombrePuerto(p)
    if (eq === 'sw') {
      const num = Number(n)
      t += num === hojaEtiquetado.fortilink ? ' · FortiLink (PORT-A)' : ` · VLAN${vlanDePuerto(num)} ${hojaEtiquetado.vlans.find((v) => v.id === vlanDePuerto(num))?.nombre ?? ''}`
      if (num === esc.puertoDanado) t += ' · DAÑADO (sin enlace)'
    }
    const cable = defs.find((d) => s.cables[d.id] === p || d.desde === p)
    t += cable ? ` · ${cable.nombre}` : ' · libre'
    return t
  }

  const resaltable = (p: PuertoId) => !!cableArrastrado && libreParaCable(p, cableArrastrado.id)

  const puertoSvg = (id: PuertoId, extra?: { led?: 'verde' | 'ambar' | null; danado?: boolean }) => {
    const p = pos[id]
    if (!p) return null
    return (
      <Puerto
        key={id}
        x={p.x - PORT.w / 2}
        y={p.y - PORT.h / 2}
        activo={activoCableEn(id)}
        led={extra?.led}
        danado={extra?.danado}
        resaltar={resaltable(id)}
        objetivo={objetivoDrop === id}
        onClick={sel ? () => clickPuerto(id) : undefined}
        onEnter={() => setHover(id)}
        onLeave={() => setHover((h) => (h === id ? null : h))}
        guia={`rack-port-${id}`}
      />
    )
  }

  const ledSw = (n: number) => {
    if (n === esc.puertoDanado) return null
    const ocup = activoCableEn(`sw:${n}`)
    if (!ocup) return null
    return n === hojaEtiquetado.fortilink ? 'ambar' : 'verde'
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-borde bg-panel-2/60 px-3 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <Boton tam="sm" variante="primario" icono={<ClipboardList size={15} />} onClick={() => setHoja(true)} data-guide="rack-hoja">
          Hoja de etiquetado
        </Boton>
        <Boton tam="sm" icono={<List size={15} />} onClick={() => setLista((v) => !v)}>
          {lista ? 'Ocultar lista' : 'Lista de cables'}
        </Boton>
        <div className="ml-1 flex items-center gap-1 rounded-lg border border-borde bg-black/20 p-0.5">
          <button className="rounded-md p-1.5 text-tenue hover:bg-white/5 hover:text-tinta" onClick={() => setZoom((z) => Math.max(0.8, z - 0.2))} aria-label="Alejar">
            <Minus size={14} />
          </button>
          <span className="w-10 text-center font-mono text-[11px] text-tenue">{Math.round(zoom * 100)}%</span>
          <button className="rounded-md p-1.5 text-tenue hover:bg-white/5 hover:text-tinta" onClick={() => setZoom((z) => Math.min(2, z + 0.2))} aria-label="Acercar">
            <Plus size={14} />
          </button>
        </div>
        {sel && (
          <Boton tam="sm" variante="peligro" icono={<Unplug size={14} />} onClick={() => (conectar(sel, null), setSel(null))}>
            Desconectar
          </Boton>
        )}
      </div>
        <p className="mt-1.5 flex h-4 min-w-0 items-center gap-1.5 overflow-hidden whitespace-nowrap text-xs text-tenue">
          {hover ? (
            <>
              <Info size={13} className="shrink-0 text-cyan-300" />
              <span className="truncate text-slate-200">{infoPuerto(hover)}</span>
            </>
          ) : cableArrastrado ? (
            <>
              <Cable size={13} className="shrink-0" style={{ color: cableArrastrado.color }} />
              <span className="truncate">
                {cableArrastrado.nombre}: {sel ? 'toca un puerto libre para conectarlo' : 'suéltalo sobre un puerto libre'}
              </span>
            </>
          ) : (
            <>
              <MousePointerClick size={13} className="shrink-0" />
              <span className="truncate">Arrastra el conector de un cable a un puerto · en celular: toca el conector y luego el puerto</span>
            </>
          )}
        </p>
      </div>

      <div className="scroll-fino relative min-h-0 flex-1 overflow-auto bg-[radial-gradient(ellipse_at_top,#101b29,#070b11_70%)]">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${RW} ${RH}`}
          style={{ width: `${zoom * 100}%`, minWidth: 720 * zoom, touchAction: drag ? 'none' : 'pan-x pan-y' }}
          className="block select-none"
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={() => {
            dragRef.current = null
            setDrag(null)
          }}
          onClick={(e) => {
            if (e.target === svgRef.current) setSel(null)
          }}
        >
          <defs>
            <linearGradient id="rk-metal" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#1e293b" />
              <stop offset="1" stopColor="#0f172a" />
            </linearGradient>
            <linearGradient id="rk-fg" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#2b2f36" />
              <stop offset="1" stopColor="#15181d" />
            </linearGradient>
            <linearGradient id="rk-sw" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#273449" />
              <stop offset="1" stopColor="#141c2a" />
            </linearGradient>
            <pattern id="rk-rayas" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="5" height="10" fill="#f59e0b" fillOpacity="0.25" />
            </pattern>
          </defs>

          {/* Repisa de módems */}
          <rect x={20} y={MODEM.y + MODEM.h + 6} width={RW - 40} height={10} rx={3} fill="#1e293b" />
          <text x={24} y={14} fill="#64748b" fontSize={11} fontWeight={600} letterSpacing={1.5}>
            REPISA DE ONT / MÓDEMS
          </text>
          {modems.map((m, i) => {
            const mx = xModem(i)
            const claro = m === 'tp'
            const nombre = m === 'tp' ? 'ONT Totalplay' : m === 'tx' ? 'Módem Telmex' : `Módem anterior ${m === 'ex1' ? '1' : '2'}`
            const et = s.etiquetas[m]
            const enUso = m === 'tp' || m === 'tx' ? defs.filter((d) => d.id !== 'lap' && ((d.desde.startsWith(`${m}:`) && s.cables[d.id]) || s.cables[d.id]?.startsWith(`${m}:`))).length : 0
            return (
              <g key={m}>
                <rect x={mx} y={MODEM.y} width={MODEM.w} height={MODEM.h} rx={12} fill={claro ? '#e5e9ef' : m === 'tx' ? '#16191f' : '#3a4152'} stroke={claro ? '#cbd5e1' : '#2d3748'} />
                <text x={mx + 16} y={MODEM.y + 24} fontSize={13} fontWeight={700} fill={claro ? '#1e293b' : '#e2e8f0'}>
                  {nombre}
                </text>
                <text x={mx + 16} y={MODEM.y + 40} fontSize={9.5} fill={claro ? '#64748b' : '#94a3b8'}>
                  {m === 'tp' ? `IP LAN ${carriers.totalplay.ipLan}` : m === 'tx' ? `IP LAN ${s.telmexLan}` : 'Otro proveedor'}
                </text>
                {['PWR', 'PON', 'NET', 'WLAN'].map((l, k) => (
                  <g key={l}>
                    <circle cx={mx + 22 + k * 30} cy={MODEM.y + 56} r={3} fill={k === 2 && m !== 'tp' && m !== 'tx' ? '#ef4444' : '#22c55e'} className={k === 3 ? 'led-actividad' : undefined} />
                    <text x={mx + 22 + k * 30} y={MODEM.y + 69} fontSize={7} textAnchor="middle" fill={claro ? '#64748b' : '#94a3b8'}>
                      {l}
                    </text>
                  </g>
                ))}
                {[1, 2, 3, 4].map((k) => (
                  <g key={k}>
                    {puertoSvg(`${m}:lan${k}`, { led: activoCableEn(`${m}:lan${k}`) ? 'verde' : null })}
                    <text x={mx + 24 + (k - 1) * 44 + PORT.w / 2} y={MODEM.y + 112} fontSize={7.5} textAnchor="middle" fill={claro ? '#475569' : '#94a3b8'}>
                      LAN{k}
                    </text>
                  </g>
                ))}
                {/* etiqueta (la que pone el técnico) */}
                <g data-guide={`rack-etiqueta-${m}`} onClick={() => setEtiquetaDe(m)} style={{ cursor: 'pointer' }}>
                  {et ? (
                    <g transform={`rotate(-4 ${mx + 218} ${MODEM.y + 32})`}>
                      <rect x={mx + 190} y={MODEM.y + 14} width={54} height={30} rx={3} fill="#fde047" stroke="#ca8a04" />
                      <text x={mx + 217} y={MODEM.y + 33} fontSize={10} fontWeight={800} textAnchor="middle" fill="#422006">
                        {et}
                      </text>
                    </g>
                  ) : (
                    <g>
                      <rect x={mx + 190} y={MODEM.y + 14} width={54} height={30} rx={4} fill="transparent" stroke={claro ? '#94a3b8' : '#64748b'} strokeDasharray="4 3" />
                      <text x={mx + 217} y={MODEM.y + 27} fontSize={7.5} textAnchor="middle" fill={claro ? '#64748b' : '#94a3b8'}>
                        Sin
                      </text>
                      <text x={mx + 217} y={MODEM.y + 37} fontSize={7.5} textAnchor="middle" fill={claro ? '#64748b' : '#94a3b8'}>
                        etiqueta
                      </text>
                    </g>
                  )}
                </g>
                <g onClick={() => setFabrica(m)} style={{ cursor: 'pointer' }}>
                  <rect x={mx + 190} y={MODEM.y + 54} width={54} height={18} rx={4} fill={claro ? '#cbd5e1' : '#334155'} />
                  <text x={mx + 217} y={MODEM.y + 66} fontSize={8} textAnchor="middle" fill={claro ? '#334155' : '#cbd5e1'}>
                    ⓘ fábrica
                  </text>
                </g>
                {(m === 'tp' || m === 'tx') && enUso > 0 && (
                  <text x={mx + MODEM.w - 8} y={MODEM.y + 112} fontSize={7.5} textAnchor="end" fill={claro ? '#0f766e' : '#5eead4'}>
                    {enUso} en uso
                  </text>
                )}
              </g>
            )
          })}

          {/* Marco del rack */}
          <rect x={30} y={186} width={RW - 60} height={490} rx={6} fill="#0a1019" stroke="#1e293b" />
          {[34, RW - 56].map((x) => (
            <g key={x}>
              <rect x={x} y={190} width={22} height={482} fill="url(#rk-metal)" />
              {Array.from({ length: 30 }, (_, k) => (
                <rect key={k} x={x + 8} y={198 + k * 16} width={6} height={6} rx={1} fill="#020617" />
              ))}
            </g>
          ))}

          {/* Patch panel */}
          <rect x={66} y={PP.y} width={RW - 132} height={PP.h} rx={4} fill="url(#rk-metal)" stroke="#334155" />
          <text x={78} y={PP.y + 16} fontSize={10} fill="#94a3b8" fontWeight={700} letterSpacing={1}>
            PATCH PANEL 24
          </text>
          {Array.from({ length: 24 }, (_, k) => {
            const n = k + 1
            const p = pos[`pp:${n}`]
            return (
              <g key={n}>
                <text x={p.x} y={PP.y + 26} fontSize={8} textAnchor="middle" fill="#64748b">
                  {n}
                </text>
                <Puerto x={p.x - 13} y={PP.y + 30} activo={!!ABREV[n]} />
                {ABREV[n] && (
                  <g>
                    <rect x={p.x - 17} y={PP.y + 55} width={34} height={13} rx={2} fill="#f8fafc" />
                    <text x={p.x} y={PP.y + 65} fontSize={7.5} fontWeight={700} textAnchor="middle" fill="#0f172a">
                      {ABREV[n]}
                    </text>
                  </g>
                )}
              </g>
            )
          })}

          {/* FortiGate 40F */}
          <rect x={FG.x0} y={FG.y} width={FG.x1 - FG.x0} height={FG.h} rx={6} fill="url(#rk-fg)" stroke="#3f444d" />
          <rect x={FG.x0} y={FG.y} width={FG.x1 - FG.x0} height={6} rx={3} fill="#b91c1c" fillOpacity={0.85} />
          <text x={FG.x0 + 16} y={FG.y + 30} fontSize={14} fontWeight={800} fill="#f1f5f9">
            FortiGate 40F
          </text>
          <text x={FG.x0 + 16} y={FG.y + 46} fontSize={9} fill="#94a3b8">
            SD-WAN · Firewall
          </text>
          {['STATUS', 'ALARM', 'HA', 'POWER'].map((l, k) => (
            <g key={l}>
              <circle cx={FG.x0 + 22 + k * 36} cy={FG.y + 60} r={3} fill={k === 1 ? (en.internet ? '#1f2937' : '#f59e0b') : k === 2 ? '#1f2937' : '#22c55e'} />
              <text x={FG.x0 + 22 + k * 36} y={FG.y + 72} fontSize={6.5} textAnchor="middle" fill="#94a3b8">
                {l}
              </text>
            </g>
          ))}
          {(
            [
              ['wan', 'WAN'],
              ['a', 'A'],
              ['1', '1'],
              ['2', '2'],
              ['3', '3'],
            ] as const
          ).map(([id, l]) => {
            const p = pos[`fg:${id}`]
            const led = id === 'wan' ? (activoCableEn('fg:wan') ? 'verde' : null) : id === '1' ? (en.txPort1 ? (en.txPort1Ok ? 'verde' : 'ambar') : activoCableEn('fg:1') ? 'verde' : null) : id === 'a' ? (en.fortilink ? 'ambar' : null) : activoCableEn(`fg:${id}`) ? 'verde' : null
            return (
              <g key={id}>
                <text x={p.x} y={FG.y + 30} fontSize={10} fontWeight={700} textAnchor="middle" fill={id === 'wan' ? '#facc15' : id === 'a' ? '#4ade80' : '#e2e8f0'}>
                  {l}
                </text>
                {puertoSvg(`fg:${id}`, { led })}
              </g>
            )
          })}

          {/* SW Plano */}
          <rect x={PL.x0} y={FG.y + 6} width={PL.x1 - PL.x0} height={64} rx={6} fill="#1c2431" stroke="#334155" />
          <text x={PL.x0 + 14} y={FG.y + 26} fontSize={11} fontWeight={700} fill="#e2e8f0">
            SW Plano
          </text>
          <text x={PL.x0 + 14} y={FG.y + 40} fontSize={8} fill="#94a3b8">
            No administrable
          </text>
          <text x={PL.x0 + 14} y={FG.y + 52} fontSize={8} fill="#94a3b8">
            Proveedores
          </text>
          {Array.from({ length: 8 }, (_, k) => (
            <g key={k}>
              {puertoSvg(`pl:${k + 1}`, { led: activoCableEn(`pl:${k + 1}`) ? 'verde' : null })}
              <text x={pos[`pl:${k + 1}`].x} y={FG.y + 68} fontSize={7.5} textAnchor="middle" fill="#64748b">
                {k + 1}
              </text>
            </g>
          ))}

          {/* Switch nuevo 48 puertos */}
          <rect x={66} y={SW.y} width={RW - 132} height={SW.h} rx={5} fill="url(#rk-sw)" stroke="#3b4b63" />
          <text x={80} y={SW.y + 18} fontSize={11} fontWeight={800} fill="#f1f5f9">
            Switch 48 puertos · nuevo
          </text>
          <text x={260} y={SW.y + 18} fontSize={8.5} fill="#94a3b8">
            FortiSwitch (lo administra el FortiGate por FortiLink)
          </text>
          {hojaEtiquetado.vlans.map((v) => {
            const c0 = Math.floor((v.desde - 1) / 2)
            const c1 = Math.floor((v.hasta - 1) / 2)
            const x0 = colSw(c0) - 5
            const x1 = colSw(c1) + PORT.w + 5
            return (
              <g key={v.id}>
                <rect x={x0} y={SW.y + 26} width={x1 - x0} height={SW.h - 32} rx={4} fill={v.color} fillOpacity={0.09} stroke={v.color} strokeOpacity={0.4} />
                <text x={x0 + 4} y={SW.y + SW.h - 10} fontSize={8} fontWeight={700} fill={v.color}>
                  {v.desde === v.hasta ? `VLAN${v.id}` : `VLAN${v.id} · ${v.nombre}`}
                </text>
              </g>
            )
          })}
          {Array.from({ length: 48 }, (_, k) => {
            const n = k + 1
            const p = pos[`sw:${n}`]
            const arriba = n % 2 === 1
            return (
              <g key={n}>
                <text x={p.x} y={arriba ? p.y - 15 : p.y + 21} fontSize={7.5} textAnchor="middle" fill={n === 48 ? '#4ade80' : '#94a3b8'} fontWeight={n === 48 ? 800 : 400}>
                  {n}
                </text>
                {puertoSvg(`sw:${n}`, { led: ledSw(n), danado: n === esc.puertoDanado })}
              </g>
            )
          })}
          {esc.puertoDanado && (
            <g pointerEvents="none">
              <rect x={pos[`sw:${esc.puertoDanado}`].x - 22} y={esc.puertoDanado % 2 ? pos[`sw:${esc.puertoDanado}`].y - 36 : pos[`sw:${esc.puertoDanado}`].y + 24} width={44} height={11} rx={2} fill="#be123c" />
              <text x={pos[`sw:${esc.puertoDanado}`].x} y={esc.puertoDanado % 2 ? pos[`sw:${esc.puertoDanado}`].y - 28 : pos[`sw:${esc.puertoDanado}`].y + 32} fontSize={7} fontWeight={800} textAnchor="middle" fill="#fff">
                DAÑADO
              </text>
            </g>
          )}

          {/* Switch anterior */}
          <rect x={66} y={OLD.y} width={RW - 132} height={OLD.h} rx={5} fill="#161b25" stroke="#2d3748" />
          <rect x={RW - 230} y={OLD.y + 8} width={150} height={16} rx={3} fill="url(#rk-rayas)" stroke="#b45309" strokeOpacity={0.6} />
          <text x={RW - 155} y={OLD.y + 20} fontSize={8.5} fontWeight={800} textAnchor="middle" fill="#fbbf24">
            SE RETIRA
          </text>
          <text x={80} y={OLD.y + 20} fontSize={11} fontWeight={700} fill="#cbd5e1">
            Switch anterior
          </text>
          <text x={200} y={OLD.y + 20} fontSize={8.5} fill="#64748b">
            Red vieja · gateway {esc.viejo.gateway}
          </text>
          {Array.from({ length: 24 }, (_, k) => {
            const n = k + 1
            return (
              <g key={n}>
                {puertoSvg(`old:${n}`, { led: activoCableEn(`old:${n}`) ? 'verde' : null })}
                <text x={pos[`old:${n}`].x} y={OLD.y + 76} fontSize={7.5} textAnchor="middle" fill="#64748b">
                  {n}
                </text>
              </g>
            )
          })}

          {/* Laptop */}
          <g>
            <rect x={LAP.x} y={LAP.y + 30} width={250} height={140} rx={10} fill="#1f2937" stroke="#374151" />
            <rect x={LAP.x + 12} y={LAP.y + 40} width={226} height={110} rx={4} fill="#0b1220" />
            <text x={LAP.x + 125} y={LAP.y + 92} fontSize={13} fontWeight={700} textAnchor="middle" fill="#93c5fd">
              Laptop del técnico
            </text>
            <text x={LAP.x + 125} y={LAP.y + 110} fontSize={9} textAnchor="middle" fill="#64748b">
              Puerto Ethernet ⟶ cable blanco
            </text>
            <rect x={LAP.x - 10} y={LAP.y + 170} width={270} height={12} rx={5} fill="#374151" />
            <rect x={LAP.x + 4} y={LAP.y + 110} width={20} height={20} rx={2} fill="#05070b" stroke="#475569" />
          </g>

          {/* Leyenda de colores */}
          <g transform={`translate(40 ${LAP.y + 34})`}>
            <text x={0} y={0} fontSize={10} fontWeight={700} fill="#94a3b8" letterSpacing={1}>
              COLORES DE CABLE
            </text>
            {(
              [
                ['#38bdf8', 'Red interna (VLAN10)'],
                ['#fb923c', 'Cocina / KDS (VLAN40)'],
                ['#facc15', 'Enlaces de carriers'],
                ['#4ade80', 'FortiLink (PORT-A)'],
                ['#9ca3af', 'Proveedores'],
                ['#c084fc', 'Pantallas de menú'],
                ['#f472b6', 'Módem adicional'],
                ['#f8fafc', 'Laptop'],
              ] as const
            ).map(([c, t], k) => (
              <g key={t} transform={`translate(${(k % 2) * 250} ${18 + Math.floor(k / 2) * 22})`}>
                <rect width={26} height={8} rx={4} fill={c} />
                <text x={34} y={8} fontSize={10} fill="#cbd5e1">
                  {t}
                </text>
              </g>
            ))}
          </g>

          {/* Cables */}
          {defs.map((c, i) => {
            if (drag?.cable === c.id) return null
            return <CableSvg key={c.id} c={c} a={pos[c.desde]} b={extremo(c, i)} sel={sel === c.id} onDown={(e) => onDown(e, c.id)} pista={pistaCable(s, c)} />
          })}
          {drag &&
            (() => {
              const c = defs.find((d) => d.id === drag.cable)!
              return <CableSvg c={c} a={pos[c.desde]} b={{ x: drag.x, y: drag.y, libre: true }} arrastrando onDown={() => {}} pista="" />
            })()}
        </svg>
      </div>

      <AnimatePresence>
        {lista && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden border-t border-borde bg-panel-2/70">
            <ListaCables defs={defs} pos={pos} onCambio={conectar} />
          </motion.div>
        )}
      </AnimatePresence>

      <HojaEtiquetado abierto={hoja} onCerrar={() => setHoja(false)} />

      <Modal abierto={!!etiquetaDe} onCerrar={() => setEtiquetaDe(null)} titulo="Poner etiqueta al módem" icono={<Tag className="text-amber-300" size={20} />} ancho="max-w-sm">
        <p className="mb-3 text-sm text-tenue">{etiquetaDe === 'tp' ? 'ONT Totalplay' : etiquetaDe === 'tx' ? 'Módem Telmex' : 'Módem anterior'}: elige la etiqueta que vas a pegar.</p>
        <div className="grid grid-cols-2 gap-2">
          {ETIQUETAS.map((e) => (
            <button
              key={e}
              onClick={() => {
                if (etiquetaDe) dispatch({ tipo: 'ETIQUETA', modem: etiquetaDe, etiqueta: e })
                sfx.click()
                setEtiquetaDe(null)
              }}
              className={cx('rounded-lg border-2 border-yellow-600 bg-yellow-300 px-3 py-2 font-mono text-sm font-black text-yellow-950 shadow transition hover:-rotate-2 hover:scale-105', etiquetaDe && s.etiquetas[etiquetaDe] === e && 'ring-2 ring-cyan-300')}
            >
              {e}
            </button>
          ))}
        </div>
        <Boton
          className="mt-3 w-full"
          variante="fantasma"
          onClick={() => {
            if (etiquetaDe) dispatch({ tipo: 'ETIQUETA', modem: etiquetaDe, etiqueta: null })
            setEtiquetaDe(null)
          }}
        >
          Quitar etiqueta
        </Boton>
      </Modal>

      <Modal abierto={!!fabrica} onCerrar={() => setFabrica(null)} titulo="Etiqueta de fábrica" icono={<Info className="text-cyan-300" size={20} />} ancho="max-w-sm">
        <div className="rounded-xl border border-slate-300 bg-slate-100 p-4 font-mono text-[13px] leading-6 text-slate-800 shadow-inner">
          {fabrica === 'tx' ? (
            <>
              <p className="font-sans text-xs font-bold uppercase tracking-wider text-slate-500">Módem Telmex · Gateway residencial</p>
              <p>Usuario: <b>{'TELMEX'}</b></p>
              <p>Contraseña: <b>{esc.telmexPassword}</b></p>
              <p>Red Wi-Fi: {esc.ssidTx}</p>
              <p>IP de acceso: 192.168.1.254</p>
            </>
          ) : fabrica === 'tp' ? (
            <>
              <p className="font-sans text-xs font-bold uppercase tracking-wider text-slate-500">ONT Totalplay · Fibra óptica</p>
              <p>Red Wi-Fi: {esc.ssidTp}</p>
              <p>IP LAN: {carriers.totalplay.ipLan}</p>
              <p className="font-sans text-xs text-slate-500">La ONT de Totalplay no se configura en esta migración.</p>
            </>
          ) : (
            <>
              <p className="font-sans text-xs font-bold uppercase tracking-wider text-slate-500">Módem de otro proveedor</p>
              <p>Equipo del servicio anterior.</p>
            </>
          )}
        </div>
      </Modal>
    </div>
  )
}

function CableSvg({ c, a, b, sel, arrastrando, onDown, pista }: { c: CableDef; a: PosPuerto; b: { x: number; y: number; libre: boolean }; sel?: boolean; arrastrando?: boolean; onDown: (e: RPointerEvent) => void; pista: string }) {
  const d = rutaCable(a, b)
  return (
    <g>
      <path d={d} fill="none" stroke="#000" strokeOpacity={0.45} strokeWidth={7} strokeLinecap="round" pointerEvents="none" />
      <path d={d} fill="none" stroke={c.color} strokeOpacity={arrastrando ? 1 : 0.82} strokeWidth={4.5} strokeLinecap="round" pointerEvents="none" />
      <circle cx={a.x} cy={a.y} r={5} fill={c.color} pointerEvents="none" />
      <g data-guide={`rack-cable-${c.id}`} data-pista={pista} onPointerDown={onDown} style={{ cursor: arrastrando ? 'grabbing' : 'grab', touchAction: 'none' }}>
        <circle cx={b.x} cy={b.y + 4} r={18} fill="transparent" />
        <Conector x={b.x} y={b.y} color={c.color} arrastrando={arrastrando} seleccionado={sel} />
      </g>
      {(arrastrando || sel) && (
        <g pointerEvents="none">
          <rect x={b.x + 16} y={b.y - 30} width={Math.max(60, c.nombre.length * 6.4)} height={18} rx={4} fill="#0b1220" stroke={c.color} />
          <text x={b.x + 22} y={b.y - 17} fontSize={10.5} fill="#e2e8f0">
            {c.nombre}
          </text>
        </g>
      )}
    </g>
  )
}

function ListaCables({ defs, pos, onCambio }: { defs: CableDef[]; pos: Record<string, PosPuerto>; onCambio: (cable: string, destino: PuertoId | null) => void }) {
  const { s } = useSim()
  const opciones = Object.keys(pos).filter(esDestinoValido)
  return (
    <div className="scroll-fino max-h-64 overflow-auto px-3 py-2">
      <table className="w-full text-xs">
        <thead className="text-left text-tenue">
          <tr>
            <th className="py-1 font-medium">Cable</th>
            <th className="py-1 font-medium">Extremo fijo</th>
            <th className="py-1 font-medium">Conectado en</th>
          </tr>
        </thead>
        <tbody>
          {defs.map((d) => (
            <tr key={d.id} className="border-t border-borde/60">
              <td className="py-1.5 pr-2">
                <span className="mr-2 inline-block size-2.5 rounded-full align-middle" style={{ background: d.color }} />
                {d.nombre}
              </td>
              <td className="py-1.5 pr-2 text-tenue">{nombrePuerto(d.desde)}</td>
              <td className="py-1.5">
                <select
                  className="w-full max-w-64 rounded-md border border-borde-2 bg-black/40 px-2 py-1 text-xs"
                  value={s.cables[d.id] ?? ''}
                  onChange={(e) => onCambio(d.id, e.target.value || null)}
                >
                  <option value="">— desconectado —</option>
                  {opciones
                    .filter((o) => o === s.cables[d.id] || !puertoOcupado(s.cables, defs, o, d.id))
                    .map((o) => (
                      <option key={o} value={o}>
                        {nombrePuerto(o)}
                      </option>
                    ))}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
