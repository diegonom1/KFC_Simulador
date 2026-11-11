import { ClipboardList } from 'lucide-react'
import { hojaEtiquetado, vlanDePuerto } from '../../data/sucursal'
import { cablesDe } from '../../engine/cables'
import { useSim } from '../../engine/SimProvider'
import { Modal } from '../ui/base'

export function HojaEtiquetado({ abierto, onCerrar }: { abierto: boolean; onCerrar: () => void }) {
  const { s } = useSim()
  const defs = cablesDe(s.esc)
  const asignado = (p: number) => defs.find((d) => d.puertoHoja === p)
  const vlan = (p: number) => hojaEtiquetado.vlans.find((v) => v.id === vlanDePuerto(p))
  const filas = Array.from({ length: 48 }, (_, i) => i + 1)
  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo="Hoja de etiquetado del switch" icono={<ClipboardList className="text-cyan-300" size={20} />} ancho="max-w-3xl">
      <p className="mb-3 text-sm text-tenue">
        Cada equipo va al puerto que indica la hoja. <b className="text-slate-200">Si no se puede</b> (puerto dañado u ocupado), va a cualquier puerto libre <b className="text-slate-200">de la misma VLAN</b>. El puerto 48 es solo para el PORT-A del FortiGate.
      </p>
      <div className="mb-3 flex flex-wrap gap-2">
        {hojaEtiquetado.vlans.map((v) => (
          <span key={v.id} className="inline-flex items-center gap-2 rounded-lg border px-2.5 py-1 text-xs" style={{ borderColor: v.color + '66', background: v.color + '14' }}>
            <span className="size-2.5 rounded-full" style={{ background: v.color }} />
            VLAN{v.id} · {v.nombre} · puertos {v.desde}
            {v.hasta !== v.desde ? `–${v.hasta}` : ''}
          </span>
        ))}
        <span className="inline-flex items-center gap-2 rounded-lg border border-emerald-400/40 bg-emerald-400/10 px-2.5 py-1 text-xs">
          <span className="size-2.5 rounded-full bg-emerald-400" />
          48 · FortiLink (PORT-A)
        </span>
      </div>
      <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
        {[filas.slice(0, 24), filas.slice(24)].map((grupo, gi) => (
          <table key={gi} className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-tenue">
                <th className="py-1 font-medium">Puerto</th>
                <th className="py-1 font-medium">VLAN</th>
                <th className="py-1 font-medium">Equipo</th>
              </tr>
            </thead>
            <tbody className="font-mono text-[13px]">
              {grupo.map((p) => {
                const v = vlan(p)
                const a = asignado(p)
                return (
                  <tr key={p} className="border-t border-borde/60">
                    <td className="py-1">{p}</td>
                    <td className="py-1">{p === 48 ? <span className="text-emerald-300">FortiLink</span> : <span style={{ color: v?.color }}>VLAN{v?.id}</span>}</td>
                    <td className="py-1 font-sans text-[13px]">{p === 48 ? 'FortiGate PORT-A' : a ? a.nombre : <span className="text-apagado">libre</span>}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        ))}
      </div>
      <p className="mt-4 rounded-lg border border-borde bg-black/20 p-3 text-xs text-tenue">
        Además: <b className="text-slate-300">proveedores</b> (DVR, música) → cualquier puerto del <b className="text-slate-300">SW Plano</b>; <b className="text-slate-300">pantallas de menú</b> → un LAN libre de la <b className="text-slate-300">ONT</b> (por su switch plano); <b className="text-slate-300">módems adicionales</b> → sin nada conectado.
      </p>
    </Modal>
  )
}
