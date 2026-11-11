import { ArrowLeft, CircleCheck, CircleX, Printer } from 'lucide-react'
import { useState } from 'react'
import { Boton } from '../components/ui/base'
import { carriers, destinosValidacion, equiposRed, equiposVlan40, ordenEquipos, PINGS_REQUERIDOS } from '../data/sucursal'
import { cablesDe, nombrePuerto } from '../engine/cables'
import { cfgIgual } from '../engine/objetivos'
import { cfgNueva, tieneTelmex, tieneTp } from '../engine/escenario'
import { useSimCtx } from '../engine/SimProvider'
import type { EquipoId, SimState } from '../engine/tipos'
import { CLAVES, guardar, leer } from '../lib/almacen'
import { normalizarIp } from '../lib/ip'
import { irA } from '../lib/ruta'
import { cx, fechaHora, formatoTiempo, hora } from '../lib/util'

function ipActual(s: SimState, id: EquipoId): string {
  if (id === 'pc' || id === 'hd' || id === 'lms') return s.linux[id].red.eth0?.ip ?? '—'
  return s.disp[id].activa.ip
}

function Marca({ ok }: { ok: boolean }) {
  return ok ? <CircleCheck size={16} className="inline text-emerald-600" /> : <CircleX size={16} className="inline text-rose-600" />
}

export function Evidencias() {
  const { s } = useSimCtx()
  const [tecnico, setTecnico] = useState(() => leer(CLAVES.tecnico, ''))
  if (!s) {
    return (
      <div className="fondo-app grid min-h-dvh place-items-center p-4">
        <div className="panel max-w-md p-6 text-center">
          <p className="font-semibold">No hay una sesión para generar evidencias</p>
          <Boton className="mt-4" variante="primario" onClick={() => irA('inicio')}>
            Ir al inicio
          </Boton>
        </div>
      </div>
    )
  }
  const esc = s.esc
  const destinosPing = [
    ...destinosValidacion.map((d) => ({ ip: d.ip, nombre: d.nombre })),
    ...(['bio', 'tel', 'hme', 'imp', 'digi', 'hd', 'lms'] as EquipoId[]).map((id) => ({ ip: esc.ipNueva[id], nombre: equiposRed[id].corto })),
    ...equiposVlan40.map((v) => ({ ip: v.ip, nombre: `${v.nombre} (VLAN40)` })),
  ]
  const mejorPing = (ip: string) => {
    const r = s.pings.filter((p) => p.origen === 'pc' && p.destino === ip)
    return r.find((p) => p.conteo === PINGS_REQUERIDOS && p.recibidos === PINGS_REQUERIDOS) ?? r[r.length - 1]
  }
  const speeds = s.speedtests.filter((r) => r.captura)
  const defs = cablesDe(esc).filter((c) => c.grupo !== 'laptop')

  return (
    <div className="min-h-dvh bg-slate-200 py-6 print:bg-white print:py-0">
      <div className="no-imprimir mx-auto mb-4 flex max-w-4xl flex-wrap items-center gap-2 px-4">
        <Boton variante="secundario" icono={<ArrowLeft size={15} />} onClick={() => (s.fin ? irA(esc.modo === 'examen' ? 'resultados' : 'inicio') : irA(esc.modo))}>
          Regresar
        </Boton>
        <Boton variante="primario" icono={<Printer size={15} />} onClick={() => window.print()}>
          Imprimir / guardar PDF
        </Boton>
        <span className="text-xs text-slate-600">Sugerencia: en el diálogo de impresión elige “Guardar como PDF”.</span>
      </div>
      <article className="hoja-imprimible mx-auto max-w-4xl bg-white px-8 py-8 text-[12.5px] text-slate-800 shadow-xl print:shadow-none">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-slate-800 pb-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">Hoja de evidencias</p>
            <h1 className="text-2xl font-bold">Migración SD-WAN · {esc.nombre}</h1>
            <p className="text-slate-600">
              CECO <b>{esc.ceco}</b> · {fechaHora(s.inicio)} · Modo {esc.modo} · Duración {formatoTiempo((s.fin ?? Date.now()) - s.inicio)}
            </p>
          </div>
          <label className="text-right text-[11px] text-slate-500">
            Técnico
            <input
              value={tecnico}
              onChange={(e) => {
                setTecnico(e.target.value)
                guardar(CLAVES.tecnico, e.target.value)
              }}
              placeholder="Nombre del técnico"
              className="mt-0.5 block w-56 border-b border-slate-400 bg-transparent text-right text-sm text-slate-800 outline-none"
            />
          </label>
        </header>

        <section className="mt-5">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-slate-700">1. Direccionamiento: IP anterior → IP nueva</h2>
          <table className="w-full border-collapse">
            <thead className="bg-slate-100 text-left text-[11px] uppercase text-slate-600">
              <tr>
                <th className="border border-slate-300 px-2 py-1">Equipo</th>
                <th className="border border-slate-300 px-2 py-1">IP anterior (anotada)</th>
                <th className="border border-slate-300 px-2 py-1">IP nueva (tabla)</th>
                <th className="border border-slate-300 px-2 py-1">IP actual</th>
                <th className="border border-slate-300 px-2 py-1 text-center">OK</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              {ordenEquipos.map((id) => {
                const actual = ipActual(s, id)
                const ok = id === 'pc' || id === 'hd' || id === 'lms' ? cfgIgual(s.linux[id].red.eth0, cfgNueva(esc, id)) : actual === esc.ipNueva[id]
                const anotada = s.libreta[id] ?? ''
                return (
                  <tr key={id}>
                    <td className="border border-slate-300 px-2 py-1 font-sans">{equiposRed[id].corto}</td>
                    <td className={cx('border border-slate-300 px-2 py-1', anotada && normalizarIp(anotada) !== esc.ipVieja[id] && 'text-rose-600')}>{anotada || <span className="font-sans text-slate-400">sin anotar</span>}</td>
                    <td className="border border-slate-300 px-2 py-1">{esc.ipNueva[id]}</td>
                    <td className="border border-slate-300 px-2 py-1">{actual}</td>
                    <td className="border border-slate-300 px-2 py-1 text-center">
                      <Marca ok={ok} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </section>

        <section className="mt-5 break-inside-avoid">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-slate-700">2. Validación con ping -c {PINGS_REQUERIDOS} (PC Gerencial)</h2>
          <table className="w-full border-collapse">
            <thead className="bg-slate-100 text-left text-[11px] uppercase text-slate-600">
              <tr>
                <th className="border border-slate-300 px-2 py-1">Destino</th>
                <th className="border border-slate-300 px-2 py-1">IP</th>
                <th className="border border-slate-300 px-2 py-1">Enviados / recibidos</th>
                <th className="border border-slate-300 px-2 py-1">Pérdida</th>
                <th className="border border-slate-300 px-2 py-1 text-center">OK</th>
              </tr>
            </thead>
            <tbody>
              {destinosPing.map((d) => {
                const p = mejorPing(d.ip)
                const ok = !!p && p.conteo === PINGS_REQUERIDOS && p.recibidos === PINGS_REQUERIDOS
                return (
                  <tr key={d.ip}>
                    <td className="border border-slate-300 px-2 py-1">{d.nombre}</td>
                    <td className="border border-slate-300 px-2 py-1 font-mono">{d.ip}</td>
                    <td className="border border-slate-300 px-2 py-1 font-mono">{p ? `${p.enviados} / ${p.recibidos}` : '—'}</td>
                    <td className="border border-slate-300 px-2 py-1 font-mono">{p ? `${Math.round(((p.enviados - p.recibidos) / p.enviados) * 100)}%` : '—'}</td>
                    <td className="border border-slate-300 px-2 py-1 text-center">
                      <Marca ok={ok} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </section>

        <section className="mt-5 break-inside-avoid">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-slate-700">3. Speedtest (capturas)</h2>
          {speeds.length ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {speeds.map((r) => (
                <div key={r.id} className="overflow-hidden rounded-lg border border-slate-300">
                  <div className="bg-[#14152a] px-3 py-2 text-white">
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>Prueba de velocidad · {r.carrier === 'tp' ? carriers.totalplay.nombre : r.carrier === 'tx' ? carriers.telmex.nombre : 'Otro'}</span>
                      <span>{hora(r.t)}</span>
                    </div>
                    <div className="mt-1 grid grid-cols-3 text-center">
                      <div>
                        <p className="text-[9px] tracking-widest text-slate-400">PING</p>
                        <p className="text-lg">{r.ping} ms</p>
                      </div>
                      <div>
                        <p className="text-[9px] tracking-widest text-slate-400">DESCARGA</p>
                        <p className="text-lg text-cyan-300">{r.bajada}</p>
                      </div>
                      <div>
                        <p className="text-[9px] tracking-widest text-slate-400">CARGA</p>
                        <p className="text-lg text-violet-300">{r.subida}</p>
                      </div>
                    </div>
                  </div>
                  <p className={cx('px-3 py-1.5 text-[11.5px]', r.valido ? 'text-emerald-700' : 'text-rose-700')}>
                    {r.valido ? 'Válido: cable directo al módem, sin otros equipos.' : `No válido (${r.conexion === 'wifi' ? 'Wi-Fi' : r.motivo === 'SPEEDTEST_COMPARTIDO' ? 'red compartida' : 'no directo al módem'}).`}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500">Sin capturas de speedtest.</p>
          )}
        </section>

        <section className="mt-5 grid gap-5 sm:grid-cols-2">
          <div className="break-inside-avoid">
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-slate-700">4. Etiquetas</h2>
            <table className="w-full border-collapse">
              <tbody>
                {tieneTp(esc) && (
                  <tr>
                    <td className="border border-slate-300 px-2 py-1">ONT Totalplay</td>
                    <td className="border border-slate-300 px-2 py-1 font-mono">{s.etiquetas.tp ?? '—'}</td>
                    <td className="border border-slate-300 px-2 py-1 text-center">
                      <Marca ok={s.etiquetas.tp === carriers.totalplay.etiqueta} />
                    </td>
                  </tr>
                )}
                {tieneTelmex(esc) && (
                  <tr>
                    <td className="border border-slate-300 px-2 py-1">Módem Telmex</td>
                    <td className="border border-slate-300 px-2 py-1 font-mono">{s.etiquetas.tx ?? '—'}</td>
                    <td className="border border-slate-300 px-2 py-1 text-center">
                      <Marca ok={s.etiquetas.tx === carriers.telmex.etiqueta} />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            {tieneTelmex(esc) && <p className="mt-2 text-slate-600">IP LAN del módem Telmex: <span className="font-mono">{s.telmexLan}</span></p>}
          </div>
          <div className="break-inside-avoid">
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-slate-700">5. Cableado final</h2>
            <table className="w-full border-collapse text-[11.5px]">
              <tbody>
                {defs.map((d) => (
                  <tr key={d.id}>
                    <td className="border border-slate-300 px-2 py-0.5">{d.nombre}</td>
                    <td className="border border-slate-300 px-2 py-0.5">{nombrePuerto(s.cables[d.id])}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-10 grid grid-cols-2 gap-10 break-inside-avoid text-center text-[11.5px] text-slate-600">
          <div>
            <div className="h-12 border-b border-slate-500" />
            <p className="mt-1">{tecnico || 'Técnico'}</p>
          </div>
          <div>
            <div className="h-12 border-b border-slate-500" />
            <p className="mt-1">Gerente de la sucursal</p>
          </div>
        </section>
        <p className="mt-6 text-center text-[10px] text-slate-400">Generado por el simulador de práctica (datos de ejemplo).</p>
      </article>
    </div>
  )
}
