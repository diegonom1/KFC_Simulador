import { Cable, Globe, LayoutGrid, Network, Search, SquareTerminal, Wifi, WifiOff } from 'lucide-react'
import { useState } from 'react'
import { cablesDe, nombrePuerto, puertoOcupado } from '../../engine/cables'
import { configLaptop } from '../../engine/red'
import { useSim } from '../../engine/SimProvider'
import { tieneTelmex, tieneTp } from '../../engine/escenario'
import { esIpValida, esMascaraValida, mismaRed } from '../../lib/ip'
import { sfx } from '../../lib/sonido'
import { cx } from '../../lib/util'
import { Navegador } from '../navegador/Navegador'
import { posicionesPuertos, esDestinoValido } from '../rack/geometria'
import { IpInput } from '../ui/IpInput'
import { Cmd } from './Cmd'
import { Ventana } from './Ventana'

type V = 'firefox' | 'red' | 'cmd'

export function Laptop() {
  const { s } = useSim()
  const [ventanas, setVentanas] = useState<V[]>([])
  const [foco, setFoco] = useState<V | null>(null)
  const cfg = configLaptop(s)
  const abrir = (v: V) => {
    if (!ventanas.includes(v)) setVentanas((x) => [...x, v])
    setFoco(v)
    sfx.click()
  }
  const cerrar = (v: V) => setVentanas((x) => x.filter((y) => y !== v))

  return (
    <div className="flex h-full min-h-0 flex-col items-center p-2 sm:p-3">
      <div className="relative min-h-0 w-full max-w-[1250px] flex-1 rounded-t-2xl border-[10px] border-b-[14px] border-[#202124] bg-black shadow-2xl">
        <div className="absolute inset-0 overflow-hidden bg-[radial-gradient(90%_120%_at_30%_20%,#1d4ed8_0%,#1e3a8a_35%,#0b1437_75%)] font-sans">
          <div className="absolute left-3 top-3 flex flex-col gap-3">
            {(
              [
                ['firefox', 'Firefox', <Globe key="f" size={26} className="text-orange-300" />],
                ['red', 'Configuración de red', <Network key="r" size={26} className="text-sky-200" />],
                ['cmd', 'Símbolo del sistema', <SquareTerminal key="c" size={26} className="text-slate-200" />],
              ] as const
            ).map(([v, t, ic]) => (
              <button key={v} onDoubleClick={() => abrir(v)} onClick={() => abrir(v)} className="flex w-20 flex-col items-center gap-1 rounded p-1.5 text-[11px] text-white hover:bg-white/10">
                {ic}
                <span className="text-center leading-tight drop-shadow">{t}</span>
              </button>
            ))}
          </div>
          <div className="absolute inset-x-0 bottom-10 top-0">
            {ventanas.includes('firefox') && (
              <Ventana titulo="Mozilla Firefox" icono={<Globe size={13} className="text-orange-500" />} estilo="windows" inicial={{ x: 110, y: 16, w: 880, h: 520 }} z={foco === 'firefox' ? 20 : 10} onFoco={() => setFoco('firefox')} onCerrar={() => cerrar('firefox')}>
                <Navegador origen="laptop" />
              </Ventana>
            )}
            {ventanas.includes('red') && (
              <Ventana titulo="Configuración de red · Ethernet" icono={<Network size={13} className="text-sky-600" />} estilo="windows" inicial={{ x: 140, y: 30, w: 800, h: 500 }} z={foco === 'red' ? 20 : 10} onFoco={() => setFoco('red')} onCerrar={() => cerrar('red')}>
                <PanelRed />
              </Ventana>
            )}
            {ventanas.includes('cmd') && (
              <Ventana titulo="Símbolo del sistema" icono={<SquareTerminal size={13} />} estilo="windows" inicial={{ x: 180, y: 60, w: 700, h: 400 }} z={foco === 'cmd' ? 20 : 10} onFoco={() => setFoco('cmd')} onCerrar={() => cerrar('cmd')}>
                <Cmd onCerrar={() => cerrar('cmd')} />
              </Ventana>
            )}
          </div>
          <div className="absolute inset-x-0 bottom-0 flex h-10 items-center gap-1 border-t border-white/10 bg-[#0d1530]/90 px-2 backdrop-blur">
            <button className="grid size-8 place-items-center rounded text-sky-300 hover:bg-white/10" aria-label="Inicio">
              <LayoutGrid size={18} />
            </button>
            <div className="mx-1 hidden h-7 w-48 items-center gap-2 rounded bg-white/10 px-2 text-xs text-slate-400 sm:flex">
              <Search size={13} /> Buscar
            </div>
            <button data-guide="lap-firefox" onClick={() => abrir('firefox')} className={cx('grid size-8 place-items-center rounded hover:bg-white/10', ventanas.includes('firefox') && 'bg-white/10')} title="Firefox">
              <Globe size={18} className="text-orange-300" />
            </button>
            <button data-guide="lap-red" onClick={() => abrir('red')} className={cx('grid size-8 place-items-center rounded hover:bg-white/10', ventanas.includes('red') && 'bg-white/10')} title="Configuración de red">
              <Network size={18} className="text-sky-200" />
            </button>
            <button onClick={() => abrir('cmd')} className={cx('grid size-8 place-items-center rounded hover:bg-white/10', ventanas.includes('cmd') && 'bg-white/10')} title="Símbolo del sistema (ping, ipconfig)">
              <SquareTerminal size={18} className="text-slate-200" />
            </button>
            <div className="ml-auto flex items-center gap-2 text-[11px] text-slate-200">
              <button onClick={() => abrir('red')} className="flex items-center gap-1.5 rounded px-2 py-1 hover:bg-white/10" title="Estado de red">
                {cfg.medio === 'cable' ? <Cable size={14} className={cfg.dominio ? 'text-emerald-300' : 'text-amber-300'} /> : cfg.medio === 'wifi' ? <Wifi size={14} /> : <WifiOff size={14} className="text-slate-400" />}
                <span className="hidden font-mono sm:inline">{cfg.ip || 'sin red'}</span>
              </button>
              <span>10:31</span>
            </div>
          </div>
        </div>
      </div>
      <div className="h-3 w-[104%] max-w-[1290px] rounded-b-xl bg-gradient-to-b from-[#3a3d42] to-[#202124]" />
    </div>
  )
}

function PanelRed() {
  const { s, dispatch } = useSim()
  const cfg = configLaptop(s)
  const l = s.laptop
  const defs = cablesDe(s.esc)
  const pos = posicionesPuertos(s.esc)
  const [manual, setManual] = useState(l.modo === 'estatica')
  const [ip, setIp] = useState(l.modo === 'estatica' ? l.ip : '')
  const [mascara, setMascara] = useState(l.modo === 'estatica' ? l.mascara : '')
  const [gw, setGw] = useState(l.modo === 'estatica' ? l.gateway : '')
  const [dns, setDns] = useState(l.dns)
  const [alerta, setAlerta] = useState<{ t: string; confirmar?: boolean } | null>(null)
  const [aplicado, setAplicado] = useState(false)

  const aplicar = (forzar = false) => {
    if (manual) {
      if (!esIpValida(ip)) return setAlerta({ t: 'La dirección IP especificada no es válida. Escribe una dirección IP válida.' })
      if (!esMascaraValida(mascara)) return setAlerta({ t: 'La máscara de subred no es válida. Escribe una máscara válida (por ejemplo 255.255.255.0).' })
      if (gw && !esIpValida(gw)) return setAlerta({ t: 'La puerta de enlace predeterminada no es válida.' })
      if (gw && !mismaRed(ip, gw, mascara) && !forzar)
        return setAlerta({ t: 'La puerta de enlace predeterminada no está en el mismo segmento de red (subred) definido por la dirección IP y la máscara de subred. ¿Deseas guardar esta configuración?', confirmar: true })
      dispatch({ tipo: 'LAPTOP_RED', cfg: { modo: 'estatica', ip: ip.trim(), mascara: mascara.trim(), gateway: gw.trim(), dns: dns.trim() } })
    } else dispatch({ tipo: 'LAPTOP_RED', cfg: { modo: 'dhcp', ip: '', mascara: '', gateway: '', dns: '' } })
    setAlerta(null)
    setAplicado(true)
    sfx.exito()
    window.setTimeout(() => setAplicado(false), 2000)
  }

  const opcionesCable = Object.keys(pos).filter((p) => esDestinoValido(p) && (p === s.cables.lap || !puertoOcupado(s.cables, defs, p, 'lap')))
  const redesWifi = [...(tieneTp(s.esc) ? [{ id: 'tp' as const, ssid: s.esc.ssidTp }] : []), ...(tieneTelmex(s.esc) ? [{ id: 'tx' as const, ssid: s.esc.ssidTx }] : [])]

  return (
    <div className="@container relative h-full overflow-y-auto bg-[#f3f3f3] p-4 text-[13px] text-slate-800">
      <div className="grid gap-4 @2xl:grid-cols-2">
        <div className="space-y-3">
          <section className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="mb-2 font-semibold">Estado</p>
            <div className="flex items-start gap-3">
              {cfg.medio === 'cable' ? <Cable className={cfg.dominio ? 'text-emerald-600' : 'text-amber-600'} /> : cfg.medio === 'wifi' ? <Wifi className="text-sky-600" /> : <WifiOff className="text-slate-400" />}
              <div className="min-w-0 text-[12.5px]">
                <p className="font-medium">
                  {cfg.medio === 'cable' ? (cfg.dominio ? 'Ethernet conectado' : 'Ethernet: sin enlace') : cfg.medio === 'wifi' ? `Wi-Fi: ${s.laptop.wifi === 'tp' ? s.esc.ssidTp : s.esc.ssidTx}` : 'Cable de red desconectado'}
                </p>
                {s.cables.lap && <p className="text-slate-500">{nombrePuerto(s.cables.lap)}</p>}
                <p className="mt-1 font-mono text-[12px]">
                  IPv4: {cfg.ip || '—'} {cfg.ip && <span className="font-sans text-slate-500">({cfg.dhcp ? (cfg.apipa ? 'sin DHCP: dirección automática privada' : 'DHCP') : 'estática'})</span>}
                </p>
                {cfg.ip && <p className="font-mono text-[12px]">Máscara: {cfg.mascara || '—'} · Puerta de enlace: {cfg.gateway || '—'}</p>}
              </div>
            </div>
          </section>
          <section data-guide="lap-cable" className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="mb-1 font-semibold">Cable de red (patch cord blanco)</p>
            <p className="mb-2 text-[12px] text-slate-500">¿A dónde conectas la laptop? También lo puedes arrastrar en el rack.</p>
            <select
              value={s.cables.lap ?? ''}
              onChange={(e) => {
                dispatch({ tipo: 'CABLE', cable: 'lap', destino: e.target.value || null })
                if (e.target.value) sfx.conectar()
                else sfx.desconectar()
              }}
              className="w-full rounded border border-slate-300 bg-white px-2 py-1.5"
            >
              <option value="">— Sin conectar —</option>
              {opcionesCable.map((o) => (
                <option key={o} value={o}>
                  {nombrePuerto(o)}
                </option>
              ))}
            </select>
          </section>
          <section data-guide="lap-wifi" className="rounded-lg border border-slate-200 bg-white p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="font-semibold">Wi-Fi</p>
              <button onClick={() => dispatch({ tipo: 'LAPTOP_RED', cfg: { wifi: null } })} className={cx('rounded-full px-2.5 py-0.5 text-[11px] font-semibold', s.laptop.wifi ? 'bg-sky-600 text-white' : 'bg-slate-200 text-slate-600')}>
                {s.laptop.wifi ? 'Activado · apagar' : 'Desactivado'}
              </button>
            </div>
            {redesWifi.map((r) => (
              <div key={r.id} className="flex items-center justify-between border-t border-slate-100 py-1.5">
                <span className="flex items-center gap-2">
                  <Wifi size={14} /> {r.ssid}
                </span>
                <button onClick={() => dispatch({ tipo: 'LAPTOP_RED', cfg: { wifi: s.laptop.wifi === r.id ? null : r.id } })} className="rounded border border-slate-300 px-2 py-0.5 text-[11px] hover:bg-slate-50">
                  {s.laptop.wifi === r.id ? 'Desconectar' : 'Conectar'}
                </button>
              </div>
            ))}
            {s.laptop.wifi && s.cables.lap && <p className="mt-1 text-[11px] text-slate-500">Con cable y Wi-Fi a la vez, Windows usa el cable.</p>}
          </section>
        </div>
        <section data-guide="lap-ipv4" className="h-fit rounded border border-slate-400 bg-[#f0f0f0] shadow-sm">
          <p className="border-b border-slate-300 bg-white px-3 py-1.5 text-[12px]">Propiedades: Protocolo de Internet versión 4 (TCP/IPv4)</p>
          <div className="space-y-2 p-3">
            <div className="border-b border-slate-300 pb-1 text-[12px] font-medium">General</div>
            <p className="text-[11.5px] text-slate-600">Puedes hacer que la configuración IP se asigne automáticamente o capturarla a mano (consulta al administrador de red).</p>
            <label className="flex items-center gap-2">
              <input type="radio" checked={!manual} onChange={() => setManual(false)} /> Obtener una dirección IP automáticamente
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" checked={manual} onChange={() => setManual(true)} /> Usar la siguiente dirección IP:
            </label>
            <div className="space-y-1.5 pl-6">
              {(
                [
                  ['Dirección IP:', ip, setIp],
                  ['Máscara de subred:', mascara, setMascara],
                  ['Puerta de enlace predeterminada:', gw, setGw],
                ] as const
              ).map(([t, v, f]) => (
                <div key={t} className="flex items-center justify-between gap-2">
                  <span className={cx('text-[12px]', !manual && 'text-slate-400')}>{t}</span>
                  <IpInput valor={manual ? v : ''} onCambio={f} deshabilitado={!manual} claro />
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between gap-2 pl-6 pt-1">
              <span className={cx('text-[12px]', !manual && 'text-slate-400')}>Servidor DNS preferido:</span>
              <IpInput valor={manual ? dns : ''} onCambio={setDns} deshabilitado={!manual} claro />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => aplicar()} className="min-w-20 rounded border border-[#0067c0] bg-[#0067c0] px-3 py-1 text-white hover:bg-[#1975c5]">
                Aceptar
              </button>
              <button onClick={() => (setManual(l.modo === 'estatica'), setIp(l.ip), setMascara(l.mascara), setGw(l.gateway))} className="min-w-20 rounded border border-slate-400 bg-white px-3 py-1 hover:bg-slate-50">
                Cancelar
              </button>
            </div>
            {aplicado && <p className="text-right text-[11.5px] text-emerald-700">Configuración aplicada.</p>}
          </div>
        </section>
      </div>
      {alerta && (
        <div className="absolute inset-0 grid place-items-center bg-black/20">
          <div className="w-96 rounded border border-slate-400 bg-white shadow-xl">
            <p className="border-b border-slate-200 px-3 py-1.5 text-[12px]">Protocolo de Internet versión 4 (TCP/IPv4)</p>
            <p className="p-4 text-[13px]">{alerta.t}</p>
            <div className="flex justify-end gap-2 px-4 pb-3">
              {alerta.confirmar ? (
                <>
                  <button onClick={() => aplicar(true)} className="min-w-16 rounded border border-[#0067c0] bg-[#0067c0] px-3 py-1 text-white">
                    Sí
                  </button>
                  <button onClick={() => setAlerta(null)} className="min-w-16 rounded border border-slate-400 px-3 py-1">
                    No
                  </button>
                </>
              ) : (
                <button onClick={() => setAlerta(null)} className="min-w-16 rounded border border-[#0067c0] bg-[#0067c0] px-3 py-1 text-white">
                  Aceptar
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
