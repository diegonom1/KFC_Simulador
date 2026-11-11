import { motion } from 'framer-motion'
import { ChefHat, ChevronLeft, Delete, Fingerprint, Home, PanelTop, Printer, Radio, Receipt, Settings, Tv, Cctv } from 'lucide-react'
import { useEffect, useState } from 'react'
import { equiposVlan40, proveedores } from '../../data/sucursal'
import { nombrePuerto } from '../../engine/cables'
import { useSim } from '../../engine/SimProvider'
import type { Vlan40Id } from '../../engine/tipos'
import { sfx } from '../../lib/sonido'
import { cx } from '../../lib/util'

// ---------------------------------------------------------------------------
// Teléfono IP Yealink T30P
// ---------------------------------------------------------------------------
type PantallaTel = 'idle' | 'menu' | 'status' | 'features'
const MENU_TEL = ['Status', 'Features', 'Settings', 'Directory', 'History']

export function TelefonoFisico() {
  const { s } = useSim()
  const d = s.disp.tel
  const [p, setP] = useState<PantallaTel>('idle')
  const [sel, setSel] = useState(0)
  const reiniciando = !!d.reiniciandoHasta
  const tecla = (k: string) => {
    sfx.tecla()
    if (reiniciando) return
    if (p === 'idle') {
      if (k === 'menu') {
        setP('menu')
        setSel(0)
      } else if (k === 'ok') setP('status')
    } else if (p === 'menu') {
      if (k === 'up') setSel((x) => (x - 1 + MENU_TEL.length) % MENU_TEL.length)
      else if (k === 'down') setSel((x) => (x + 1) % MENU_TEL.length)
      else if (k === 'ok' || k === 'enter') setP(sel === 0 ? 'status' : 'features')
      else if (k === 'back' || k === 'x') setP('idle')
    } else if (k === 'back' || k === 'x' || k === 'ok') setP(p === 'status' || p === 'features' ? 'menu' : 'idle')
  }
  const soft = p === 'idle' ? ['History', 'Directory', 'DND', 'Menu'] : p === 'menu' ? ['Back', '', '', 'Enter'] : ['Back', '', '', '']
  return (
    <div className="flex justify-center p-3">
      <div className="w-[300px] rounded-[28px] bg-gradient-to-b from-[#3a3d42] to-[#1b1d20] p-4 shadow-2xl ring-1 ring-white/10">
        <div className="mb-2 flex items-center justify-between px-1 text-[9px] text-slate-400">
          <span>T30P</span>
          <span className={cx('size-2 rounded-full', reiniciando ? 'bg-amber-400' : 'bg-red-500/70')} />
        </div>
        <div className="h-32 rounded-md border-4 border-[#111] bg-[#b7c4a8] p-2 font-mono text-[11px] leading-tight text-[#1b2416] shadow-inner">
          {reiniciando ? (
            <div className="grid h-full place-items-center text-center">
              <div>
                <p>Rebooting...</p>
                <motion.div className="mx-auto mt-2 h-1.5 w-24 overflow-hidden bg-[#8a9a7b]">
                  <motion.div className="h-full bg-[#1b2416]" animate={{ x: ['-100%', '100%'] }} transition={{ repeat: Infinity, duration: 1.2 }} />
                </motion.div>
              </div>
            </div>
          ) : p === 'idle' ? (
            <div className="flex h-full flex-col justify-between">
              <div className="flex justify-between">
                <span>{d.dnsEstatico && !d.dhcp ? '1001' : 'Sin registrar'}</span>
                <span>10:31AM</span>
              </div>
              <p className="text-center text-base font-bold">10:31</p>
              <p className="text-center">mar 10 nov</p>
            </div>
          ) : p === 'menu' ? (
            <div>
              <p className="mb-0.5 border-b border-[#1b2416]/40 text-center font-bold">Menu</p>
              {MENU_TEL.map((m, i) => (
                <p key={m} className={cx('px-1', i === sel && 'bg-[#1b2416] text-[#b7c4a8]')}>
                  {i + 1}. {m}
                </p>
              ))}
            </div>
          ) : p === 'status' ? (
            <div>
              <p className="mb-0.5 border-b border-[#1b2416]/40 text-center font-bold">Status</p>
              <p>IPv4:</p>
              <p className="font-bold">{d.activa.ip}</p>
              <p>MAC: 805EC02A913F</p>
              <p>Firmware: 124.86.0.40</p>
            </div>
          ) : (
            <div className="grid h-full place-items-center text-center">Sin cambios en esta sección</div>
          )}
        </div>
        <div className="mt-1 grid grid-cols-4 gap-1 text-center font-mono text-[9px] text-slate-300">
          {soft.map((t, i) => (
            <span key={i}>{t}</span>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-4 gap-1.5">
          {soft.map((t, i) => (
            <button
              key={i}
              data-guide={p === 'idle' && t === 'Menu' ? 'tel-tecla-menu' : undefined}
              onClick={() => tecla(t === 'Menu' ? 'menu' : t === 'Back' ? 'back' : t === 'Enter' ? 'enter' : 'nada')}
              className="h-5 rounded-full bg-[#55595f] hover:bg-[#6b7077]"
              aria-label={t || 'tecla'}
            />
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between">
          <div className="grid grid-cols-1 gap-1.5">
            {['Msg', 'Hold', 'Trans'].map((t) => (
              <button key={t} onClick={() => sfx.tecla()} className="h-6 w-12 rounded bg-[#2a2d31] text-[9px] text-slate-300 ring-1 ring-white/10">
                {t}
              </button>
            ))}
          </div>
          <div className="relative size-24 rounded-full bg-[#2a2d31] ring-1 ring-white/10">
            {(
              [
                ['up', 'left-1/2 top-1 -translate-x-1/2', '▲'],
                ['down', 'left-1/2 bottom-1 -translate-x-1/2', '▼'],
                ['left', 'left-1 top-1/2 -translate-y-1/2', '◀'],
                ['right', 'right-1 top-1/2 -translate-y-1/2', '▶'],
              ] as const
            ).map(([k, c, t]) => (
              <button key={k} onClick={() => tecla(k)} className={cx('absolute grid size-7 place-items-center rounded-full text-[10px] text-slate-300 hover:bg-white/10', c)}>
                {t}
              </button>
            ))}
            <button onClick={() => tecla('ok')} className="absolute left-1/2 top-1/2 grid size-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-[#44484e] text-[11px] font-bold text-white hover:bg-[#555a61]">
              OK
            </button>
          </div>
          <button onClick={() => tecla('x')} className="h-8 w-10 rounded bg-[#5b2a2a] text-xs font-bold text-red-200">
            X
          </button>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-1.5">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map((t) => (
            <button key={t} onClick={() => sfx.tecla()} className="h-7 rounded-md bg-[#2a2d31] font-mono text-sm text-slate-200 ring-1 ring-white/5 hover:bg-[#34383d]">
              {t}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Biométrico
// ---------------------------------------------------------------------------
export function BiometricoFisico() {
  const { s } = useSim()
  const d = s.disp.bio
  const [p, setP] = useState<'idle' | 'menu' | 'com' | 'red'>('idle')
  const [sel, setSel] = useState(0)
  const items = ['Usuarios', 'Comunicación', 'Sistema', 'Información']
  const rein = !!d.reiniciandoHasta
  const ok = () => {
    sfx.tecla()
    if (p === 'idle') setP('menu')
    else if (p === 'menu') setP(sel === 1 ? 'com' : 'menu')
    else if (p === 'com') setP('red')
  }
  return (
    <div className="flex justify-center p-3">
      <div className="w-[240px] rounded-3xl bg-gradient-to-b from-[#2d3036] to-[#15171a] p-4 shadow-2xl ring-1 ring-white/10">
        <div className="h-36 rounded-lg border-4 border-black bg-gradient-to-b from-[#0d3b66] to-[#082640] p-2 font-sans text-[11px] text-white">
          {rein ? (
            <div className="grid h-full place-items-center">Reiniciando…</div>
          ) : p === 'idle' ? (
            <div className="flex h-full flex-col items-center justify-center">
              <p className="text-2xl font-bold">10:31</p>
              <p className="text-[10px] text-sky-200">martes 10 nov</p>
              <p className="mt-2 text-[10px]">Coloque su dedo</p>
            </div>
          ) : p === 'menu' ? (
            <div>
              <p className="mb-1 text-center font-bold">Menú principal</p>
              {items.map((it, i) => (
                <p key={it} className={cx('rounded px-1.5', i === sel && 'bg-sky-500')}>
                  {it}
                </p>
              ))}
            </div>
          ) : p === 'com' ? (
            <div>
              <p className="mb-1 text-center font-bold">Comunicación</p>
              <p className="rounded bg-sky-500 px-1.5">Red Ethernet</p>
              <p className="px-1.5">Puerto serie</p>
            </div>
          ) : (
            <div className="space-y-0.5">
              <p className="mb-1 text-center font-bold">Red Ethernet</p>
              <p>IP: {d.activa.ip}</p>
              <p>Máscara: {d.activa.mascara}</p>
              <p>Gateway: {d.activa.gateway}</p>
            </div>
          )}
        </div>
        <div className="mx-auto mt-4 grid size-16 place-items-center rounded-2xl bg-gradient-to-b from-[#1e293b] to-[#0f172a] ring-2 ring-sky-500/40">
          <Fingerprint className="text-sky-400/70" size={36} />
        </div>
        <div className="mt-4 grid grid-cols-4 gap-1.5 text-[10px]">
          <button onClick={() => (sfx.tecla(), setSel((x) => (x - 1 + items.length) % items.length))} className="h-7 rounded bg-[#2a2d31] text-slate-200">
            ▲
          </button>
          <button onClick={() => (sfx.tecla(), setSel((x) => (x + 1) % items.length))} className="h-7 rounded bg-[#2a2d31] text-slate-200">
            ▼
          </button>
          <button onClick={() => (sfx.tecla(), setP(p === 'red' ? 'com' : p === 'com' ? 'menu' : 'idle'))} className="h-7 rounded bg-[#2a2d31] text-slate-200">
            ESC
          </button>
          <button onClick={ok} className="h-7 rounded bg-sky-700 font-bold text-white">
            M/OK
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Impresora: panel táctil (opción B)
// ---------------------------------------------------------------------------
export function ImpresoraPanel() {
  const { s, dispatch } = useSim()
  const d = s.disp.imp
  const hp = s.esc.marcaImpresora === 'hp'
  const [p, setP] = useState<'home' | 'ajustes' | 'tcpip' | 'editar' | 'ok'>('home')
  const [campos, setCampos] = useState({ ip: d.activa.ip, mascara: d.activa.mascara, gateway: d.activa.gateway })
  const [activo, setActivo] = useState<'ip' | 'mascara' | 'gateway'>('ip')
  const rein = !!d.reiniciandoHasta
  useEffect(() => {
    if (p !== 'editar') setCampos({ ip: d.activa.ip, mascara: d.activa.mascara, gateway: d.activa.gateway })
  }, [d.activa, p])
  const color = hp ? 'from-[#0071bc] to-[#00539b]' : 'from-[#00807a] to-[#005e59]'
  const teclear = (k: string) => {
    sfx.tecla()
    setCampos((c) => ({ ...c, [activo]: k === 'del' ? c[activo].slice(0, -1) : k === 'clr' ? '' : c[activo] + k }))
  }
  return (
    <div className="flex justify-center p-3">
      <div className="w-[340px] rounded-2xl bg-gradient-to-b from-[#e5e7eb] to-[#cbd0d6] p-3 shadow-2xl">
        <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold text-slate-600">
          <Printer size={14} /> {hp ? 'HP Laser MFP 408dn' : 'Kyocera ECOSYS'}
        </div>
        <div className="h-[260px] overflow-hidden rounded-lg border-4 border-[#222] bg-white font-sans text-[12px] text-slate-800">
          <div className={cx('flex items-center gap-2 bg-gradient-to-r px-2 py-1 text-white', color)}>
            {p !== 'home' && (
              <button onClick={() => setP(p === 'editar' ? 'tcpip' : p === 'tcpip' ? 'ajustes' : 'home')} aria-label="Atrás">
                <ChevronLeft size={16} />
              </button>
            )}
            <span className="flex-1 font-semibold">{p === 'home' ? 'Inicio' : p === 'ajustes' ? 'Ajustes' : p === 'tcpip' ? 'TCP/IP' : p === 'editar' ? 'Cambiar TCP/IP' : 'Listo'}</span>
            <button onClick={() => setP('home')} aria-label="Inicio">
              <Home size={14} />
            </button>
          </div>
          {rein ? (
            <div className="grid h-[220px] place-items-center text-slate-500">Aplicando configuración de red…</div>
          ) : p === 'home' ? (
            <div className="grid grid-cols-2 gap-2 p-3">
              {['Copiar', 'Escanear', 'Fax', 'Ajustes'].map((t) => (
                <button key={t} data-guide={t === 'Ajustes' ? 'imp-panel-ajustes' : undefined} onClick={() => (sfx.tecla(), t === 'Ajustes' && setP('ajustes'))} className="flex h-20 flex-col items-center justify-center gap-1 rounded-lg bg-slate-100 font-medium hover:bg-slate-200">
                  {t === 'Ajustes' ? <Settings size={22} /> : <Printer size={22} />}
                  {t}
                </button>
              ))}
            </div>
          ) : p === 'ajustes' ? (
            <div className="divide-y divide-slate-100">
              {['Bandejas', 'Configuración del equipo', 'TCP/IP', 'Wi-Fi Direct', 'Mantenimiento'].map((t) => (
                <button key={t} data-guide={t === 'TCP/IP' ? 'imp-panel-tcpip' : undefined} onClick={() => (sfx.tecla(), t === 'TCP/IP' && setP('tcpip'))} className="block w-full px-3 py-2.5 text-left hover:bg-slate-50">
                  {t}
                </button>
              ))}
            </div>
          ) : p === 'tcpip' ? (
            <div className="space-y-1 p-3">
              <p>Modo IPv4: {d.manual ? 'Manual' : 'Automático'}</p>
              <p>Dirección IP: {d.activa.ip}</p>
              <p>Máscara: {d.activa.mascara}</p>
              <p>Puerta de enlace: {d.activa.gateway}</p>
              <button data-guide="imp-panel-cambiar" onClick={() => (sfx.tecla(), setP('editar'))} className={cx('mt-3 w-full rounded-lg bg-gradient-to-r py-2 font-semibold text-white', color)}>
                Cambiar
              </button>
            </div>
          ) : p === 'editar' ? (
            <div data-guide="imp-panel-form" className="p-2">
              {(['ip', 'mascara', 'gateway'] as const).map((k) => (
                <button key={k} onClick={() => setActivo(k)} className={cx('mb-1 flex w-full justify-between rounded border px-2 py-1 text-left', activo === k ? 'border-sky-500 bg-sky-50' : 'border-slate-200')}>
                  <span className="text-slate-500">{k === 'ip' ? 'IP' : k === 'mascara' ? 'Máscara' : 'Gateway'}</span>
                  <span className="font-mono">{campos[k] || '—'}</span>
                </button>
              ))}
              <div className="mt-1 grid grid-cols-4 gap-1">
                {['1', '2', '3', 'del', '4', '5', '6', 'clr', '7', '8', '9', '.', '0'].map((k) => (
                  <button key={k} onClick={() => teclear(k)} className="h-7 rounded bg-slate-200 font-mono text-[12px] hover:bg-slate-300">
                    {k === 'del' ? <Delete size={13} className="mx-auto" /> : k === 'clr' ? 'C' : k}
                  </button>
                ))}
                <button
                  onClick={() => {
                    dispatch({ tipo: 'IMP_GUARDAR', via: 'panel', cfg: { ip: campos.ip, mascara: campos.mascara, gateway: campos.gateway }, ipv6: !!d.ipv6, manual: true })
                    sfx.exito()
                    setP('ok')
                  }}
                  className={cx('col-span-3 h-7 rounded bg-gradient-to-r font-semibold text-white', color)}
                >
                  Guardar
                </button>
              </div>
            </div>
          ) : (
            <div className="grid h-[220px] place-items-center p-4 text-center">
              <p>
                Configuración guardada. <br />
                Nueva IP: <b className="font-mono">{d.activa.ip}</b>
              </p>
            </div>
          )}
        </div>
        <div className="mt-3 h-8 rounded bg-gradient-to-b from-[#9ca3af] to-[#6b7280]" />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// HME (display del temporizador)
// ---------------------------------------------------------------------------
export function HmeFisico() {
  const { s } = useSim()
  const [t, setT] = useState(118)
  useEffect(() => {
    const id = window.setInterval(() => setT((x) => (x > 260 ? 20 : x + 1)), 1000)
    return () => window.clearInterval(id)
  }, [])
  const mm = String(Math.floor(t / 60)).padStart(2, '0')
  const ss = String(t % 60).padStart(2, '0')
  return (
    <div className="space-y-3 p-3">
      <div className="rounded-xl bg-black p-4 font-mono shadow-inner ring-1 ring-white/10">
        <div className="flex items-center justify-between text-[10px] text-slate-500">
          <span>LANE 1 · MENU BOARD</span>
          <span>GOAL 03:00</span>
        </div>
        <p className={cx('mt-1 text-center text-5xl font-bold tabular-nums tracking-wider', t > 180 ? 'text-red-500' : 'text-emerald-400')}>
          {mm}:{ss}
        </p>
        <div className="mt-2 grid grid-cols-3 gap-2 text-center text-[10px] text-slate-400">
          <span>CARS 47</span>
          <span>AVG 02:58</span>
          <span>{s.disp.hme.reiniciandoHasta ? 'UPDATING' : 'ONLINE'}</span>
        </div>
      </div>
      <div className="rounded-lg border border-borde bg-panel-2 p-3 text-xs text-tenue">
        <p className="font-semibold text-slate-200">Control Unit · ZOOM {s.esc.hmeModelo === 60 ? 'Nitro (modelo 60)' : '(modelo 50)'}</p>
        <p className="mt-1">El HME se configura desde su página web (Firefox) usando su IP actual.</p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Digi
// ---------------------------------------------------------------------------
export function DigiFisico() {
  const { s } = useSim()
  return (
    <div className="space-y-3 p-3">
      <div className="flex items-center gap-4 rounded-xl bg-gradient-to-b from-[#2b3039] to-[#171a20] p-4 ring-1 ring-white/10">
        <Radio className="text-sky-300" size={34} />
        <div className="flex-1">
          <p className="font-semibold">Digi</p>
          <div className="mt-1 flex gap-2">
            {['PWR', 'NET', 'WAN', 'SIG'].map((l, i) => (
              <span key={l} className="flex flex-col items-center text-[9px] text-slate-400">
                <span className={cx('mb-0.5 size-2 rounded-full', i === 0 || (i === 1 && s.digiPrb) ? 'bg-emerald-400' : i === 3 ? 'bg-amber-400' : 'bg-slate-600')} />
                {l}
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-xs text-amber-100">
        <p className="font-semibold">Administrado por PRB</p>
        <p className="mt-1">El Digi lo configura PRB de forma remota. En sitio solo validas que responda con ping a su IP nueva.</p>
        <p className="mt-2 text-amber-200/80">Estado: {s.digiPrb ? 'reconfigurado por PRB' : 'esperando a que la tienda quede en línea'}</p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Fichas informativas: VLAN40, pantallas de menú y proveedores
// ---------------------------------------------------------------------------
export function InfoVlan40({ id }: { id: Vlan40Id }) {
  const { s } = useSim()
  const v = equiposVlan40.find((x) => x.id === id)!
  const Icono = id.startsWith('pkd') ? ChefHat : id === 'iemp' ? Receipt : Tv
  return (
    <div className="space-y-3 p-3">
      <div className="flex items-center gap-3 rounded-xl bg-gradient-to-br from-orange-500/15 to-transparent p-4 ring-1 ring-orange-400/30">
        <Icono className="text-orange-300" size={30} />
        <div>
          <p className="font-semibold">{v.nombre}</p>
          <p className="text-xs text-tenue">{v.descripcion} · VLAN40 (cocina)</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg border border-borde bg-black/20 p-2">
          <p className="text-tenue">IP (no cambia)</p>
          <p className="font-mono text-slate-200">{v.ip}</p>
        </div>
        <div className="rounded-lg border border-borde bg-black/20 p-2">
          <p className="text-tenue">Cable actual</p>
          <p className="text-slate-200">{nombrePuerto(s.cables[`pp${v.pp}`])}</p>
        </div>
      </div>
      <p className="text-xs text-tenue">Estos equipos no se configuran: se mueven a su puerto VLAN40 del switch nuevo y se validan con ping -c 40 desde la PC Gerencial (por eth1).</p>
    </div>
  )
}

export function InfoMenu() {
  const { s } = useSim()
  return (
    <div className="space-y-3 p-3">
      <div className="flex items-center gap-3 rounded-xl bg-gradient-to-br from-violet-500/15 to-transparent p-4 ring-1 ring-violet-400/30">
        <PanelTop className="text-violet-300" size={30} />
        <div>
          <p className="font-semibold">Pantallas de menú de la barra</p>
          <p className="text-xs text-tenue">Conectadas a un switch plano propio</p>
        </div>
      </div>
      <p className="text-xs text-tenue">Las pantallas de menú se conectan a la ONT mediante su switch plano (llegan al rack por el puerto 15 del patch panel). No entran a la red de la tienda.</p>
      <p className="rounded-lg border border-borde bg-black/20 p-2 text-xs">Cable actual: {nombrePuerto(s.cables.pp15)}</p>
    </div>
  )
}

export function InfoProveedores() {
  const { s } = useSim()
  return (
    <div className="space-y-3 p-3">
      <div className="flex items-center gap-3 rounded-xl bg-gradient-to-br from-slate-500/20 to-transparent p-4 ring-1 ring-slate-400/30">
        <Cctv className="text-slate-300" size={30} />
        <div>
          <p className="font-semibold">Equipos de proveedores</p>
          <p className="text-xs text-tenue">DVR de cámaras y música ambiental</p>
        </div>
      </div>
      <p className="text-xs text-tenue">Se reconectan al SW Plano (switch no administrable). No tiene asignación fija de puertos.</p>
      {proveedores.map((p) => (
        <p key={p.id} className="rounded-lg border border-borde bg-black/20 p-2 text-xs">
          {p.nombre}: {nombrePuerto(s.cables[`pp${p.pp}`])}
        </p>
      ))}
    </div>
  )
}
