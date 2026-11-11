import { Check, CircleHelp, X } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { carriers, credenciales, destinosValidacion, equiposConRespaldo, equiposRed, equiposVlan40, ordenEquipos } from '../../data/sucursal'
import { ipEsperadaTelmex, tieneTelmex, tieneTp } from '../../engine/escenario'
import { useSim } from '../../engine/SimProvider'
import type { EquipoId } from '../../engine/tipos'
import { direccionBroadcast, normalizarIp } from '../../lib/ip'
import { sfx } from '../../lib/sonido'
import { fechaHora } from '../../lib/util'
import { Insignia } from '../ui/base'

const DONDE: Record<EquipoId, string> = {
  pc: 'Terminal de la PC Gerencial → ip a',
  hd: 'Terminal de Home Delivery → ip a',
  lms: 'Terminal de LMS → ip a',
  bio: 'Termina en .4 · pantalla del biométrico (M/OK → Comunicación → Red) o fingerprint.conf',
  tel: 'Pantalla del teléfono: Menu → Status (o la tecla OK)',
  hme: 'PC Gerencial: cat /ph/timer/etc/timer.conf',
  imp: 'Panel de la impresora: Ajustes → TCP/IP',
  digi: 'Opcional: lo cambia PRB de forma remota',
}

function FilaLibreta({ id }: { id: EquipoId }) {
  const { s, dispatch } = useSim()
  const guiado = s.esc.modo === 'guiado'
  const [v, setV] = useState(s.libreta[id] ?? '')
  const [ayuda, setAyuda] = useState(false)
  const anotado = s.libreta[id] ?? ''
  const correcto = normalizarIp(anotado) === s.esc.ipVieja[id]
  const guardar = () => {
    if (v.trim() !== anotado) {
      dispatch({ tipo: 'LIBRETA', equipo: id, ip: v.trim() })
      sfx.click()
    }
  }
  return (
    <div className="border-b border-sky-300/50 py-1.5">
      <div className="flex items-center gap-2">
        <span className="w-28 shrink-0 text-[13px] font-semibold text-slate-700">{equiposRed[id].corto}</span>
        <input
          data-guide={`libreta-${id}`}
          value={v}
          onChange={(e) => setV(e.target.value)}
          onBlur={guardar}
          onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget.blur(), guardar())}
          placeholder="IP actual…"
          spellCheck={false}
          className="min-w-0 flex-1 bg-transparent font-mano text-[22px] leading-none text-[#1d3b8f] outline-none placeholder:text-slate-400/70"
        />
        <span className="hidden w-28 shrink-0 font-mono text-[12px] text-slate-500 sm:block">{s.esc.ipNueva[id]}</span>
        <span className="w-5 shrink-0">
          {guiado && anotado && (correcto ? <Check size={16} className="text-emerald-600" /> : <X size={16} className="text-rose-600" />)}
        </span>
        {guiado && (
          <button onClick={() => setAyuda((a) => !a)} className="text-slate-400 hover:text-slate-700" aria-label="¿Dónde la veo?">
            <CircleHelp size={15} />
          </button>
        )}
      </div>
      {ayuda && <p className="mt-1 pl-30 text-[11.5px] text-slate-600 sm:pl-[7.5rem]">{DONDE[id]}</p>}
    </div>
  )
}

export function Libreta() {
  const { s } = useSim()
  const ids = ordenEquipos
  const hechos = equiposConRespaldo.filter((id) => normalizarIp(s.libreta[id] ?? '') === s.esc.ipVieja[id]).length
  return (
    <div className="space-y-3">
      <p className="text-[13px] text-tenue">
        Antes de tocar cualquier equipo, anota aquí su <b className="text-slate-200">IP actual</b>. Es tu respaldo para regresar (rollback) si algo falla. La columna derecha es la IP nueva de la tabla.
      </p>
      {s.esc.modo === 'guiado' && (
        <Insignia color={hechos === equiposConRespaldo.length ? 'verde' : 'cyan'}>
          {hechos}/{equiposConRespaldo.length} anotadas correctamente
        </Insignia>
      )}
      <div className="relative overflow-hidden rounded-lg bg-[#fdf8e1] px-4 pb-4 pt-3 shadow-[inset_0_0_30px_rgb(0_0_0/0.06)]" style={{ backgroundImage: 'linear-gradient(90deg, transparent 2.2rem, #f8717166 2.2rem, #f8717166 calc(2.2rem + 1px), transparent calc(2.2rem + 1px))' }}>
        <p className="mb-1 pl-8 font-mano text-2xl text-slate-700">Respaldo de IPs · CECO {s.esc.ceco}</p>
        <div className="mb-1 flex gap-2 pl-8 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          <span className="w-28">Equipo</span>
          <span className="flex-1">IP actual (anotada)</span>
          <span className="hidden w-28 sm:block">IP nueva</span>
        </div>
        <div className="pl-8">
          {ids.map((id) => (
            <FilaLibreta key={id} id={id} />
          ))}
        </div>
      </div>
    </div>
  )
}

function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-borde bg-black/20 p-3">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-cyan-300">{titulo}</p>
      {children}
    </section>
  )
}

export function HojaTrabajo() {
  const { s } = useSim()
  const esc = s.esc
  const guiado = esc.modo === 'guiado'
  return (
    <div className="space-y-3 text-[13px]">
      <div className="rounded-xl border border-cyan-400/30 bg-gradient-to-br from-cyan-400/10 to-transparent p-4">
        <p className="text-[11px] uppercase tracking-widest text-cyan-300">Orden de trabajo · Migración SD-WAN</p>
        <p className="mt-1 text-lg font-semibold">{esc.nombre}</p>
        <p className="text-tenue">
          CECO <b className="text-slate-200">{esc.ceco}</b> · {fechaHora(esc.creado)}
        </p>
      </div>
      <Seccion titulo="Segmentos">
        <table className="w-full font-mono text-[12.5px]">
          <thead className="font-sans text-[11px] text-tenue">
            <tr>
              <th className="text-left font-medium" />
              <th className="text-left font-medium">Red</th>
              <th className="text-left font-medium">Máscara</th>
              <th className="text-left font-medium">Gateway</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="pr-2 font-sans text-tenue">Actual</td>
              <td>{esc.viejo.red}</td>
              <td>{esc.viejo.mascara}</td>
              <td>{esc.viejo.gateway}</td>
            </tr>
            <tr className="text-cyan-200">
              <td className="pr-2 font-sans text-tenue">Nuevo</td>
              <td>{esc.nuevo.red}</td>
              <td>{esc.nuevo.mascara}</td>
              <td>{esc.nuevo.gateway}</td>
            </tr>
          </tbody>
        </table>
        <p className="mt-2 text-[11.5px] text-tenue">
          Broadcast del segmento nuevo: <span className="font-mono text-slate-300">{direccionBroadcast(esc.nuevo.red, esc.nuevo.mascara)}</span>
        </p>
      </Seccion>
      <Seccion titulo="Direccionamiento nuevo">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          {ordenEquipos.map((id) => (
            <div key={id} className="flex justify-between gap-2 border-b border-borde/50 py-0.5">
              <span className="text-slate-300">{equiposRed[id].corto}</span>
              <span className="font-mono text-cyan-200">{esc.ipNueva[id]}</span>
            </div>
          ))}
        </div>
      </Seccion>
      <Seccion titulo="Validación (ping -c 40 desde la PC Gerencial)">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[12.5px]">
          {destinosValidacion.map((d) => (
            <div key={d.ip} className="flex justify-between gap-2">
              <span className="text-slate-300">{d.nombre}</span>
              <span className="font-mono">{d.ip}</span>
            </div>
          ))}
          {equiposVlan40.map((d) => (
            <div key={d.id} className="flex justify-between gap-2">
              <span className="text-slate-300">{d.nombre}</span>
              <span className="font-mono">{d.ip}</span>
            </div>
          ))}
        </div>
      </Seccion>
      <Seccion titulo="Credenciales (ejemplo)">
        <ul className="space-y-1 text-[12.5px]">
          <li>
            PC Gerencial (sesión): {guiado ? <b className="font-mono text-amber-200">{esc.passwordPc}</b> : <span className="text-amber-200">regla 0 + CECO + suma de dígitos (2) + r</span>}
          </li>
          <li>
            Home Delivery / LMS (sesión): <span className="font-mono">{credenciales.homeDelivery.sesion}</span>
          </li>
          <li>
            sysadmin: <span className="font-mono">{credenciales.pcGerencial.sysadmin}</span>
          </li>
          <li>
            Biométrico: <span className="font-mono">{credenciales.biometrico.usuario} / {credenciales.biometrico.password}</span>
          </li>
          <li>
            Teléfono: <span className="font-mono">{credenciales.telefono.usuario} / {credenciales.telefono.password}</span>
          </li>
          <li>
            HME (instalador): <span className="font-mono">{credenciales.hme.usuario} / {credenciales.hme.password}</span>
          </li>
          <li>
            Impresora: <span className="font-mono">{credenciales.impresora.usuario} / {credenciales.impresora.password}</span>
          </li>
          {tieneTelmex(esc) && (
            <li>
              Módem Telmex: usuario <span className="font-mono">{credenciales.telmex.usuario}</span> · contraseña en la etiqueta del módem
            </li>
          )}
        </ul>
      </Seccion>
      {guiado && (
        <Seccion titulo="Datos de esta sucursal (modo guiado)">
          <ul className="space-y-1 text-[12.5px] text-slate-300">
            <li>HME modelo {esc.hmeModelo}</li>
            <li>PC Gerencial {esc.pcRanuraPci ? 'con ranura PCI libre (se instala tarjeta)' : 'sin ranura PCI (se habilita Realtek en BIOS)'}</li>
            <li>
              Carriers: {tieneTp(esc) && `Totalplay → WAN (${carriers.totalplay.etiqueta})`} {tieneTp(esc) && tieneTelmex(esc) && '·'} {tieneTelmex(esc) && `Telmex → ${esc.carriers === 'solo-telmex' ? 'WAN' : 'PORT1'} (${carriers.telmex.etiqueta}), IP LAN ${ipEsperadaTelmex(esc)}`}
            </li>
            <li>Impresora {esc.marcaImpresora === 'hp' ? 'HP Laser 408' : 'Kyocera'}</li>
            <li>Puerto dañado en el switch: {esc.puertoDanado ?? 'ninguno'}</li>
            <li>Módems adicionales: {esc.modemsExtra.length}</li>
          </ul>
        </Seccion>
      )}
    </div>
  )
}

