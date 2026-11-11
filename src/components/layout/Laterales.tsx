import { motion } from 'framer-motion'
import { Activity, CircleCheck, Info, OctagonAlert } from 'lucide-react'
import { estadoMarca, LeyendaEstados, MARCAS } from '../escena/Escena'
import { textoPaso } from '../../engine/escenario'
import { useSim } from '../../engine/SimProvider'
import { cx, hora } from '../../lib/util'
import { useUi } from './uiContexto'

const PUNTO: Record<string, string> = { ok: 'bg-emerald-400 shadow-[0_0_10px_rgb(52_211_153/0.8)]', error: 'bg-rose-400 shadow-[0_0_10px_rgb(251_113_133/0.8)]', parcial: 'bg-amber-300', pendiente: 'bg-slate-600' }

export function MiniMapa() {
  const { s } = useSim()
  const { abrir } = useUi()
  const orden = ['laptop', 'bio', 'tel', 'hme', 'imp', 'digi', 'hd', 'lms', 'pc', 'rack', 'modems', 'sus1', 'menu', 'proveedores'] as const
  const nombres: Record<string, string> = { laptop: 'Laptop', hme: 'HME', sus1: 'Cocina', menu: 'Menú', modems: 'ONT/módems', proveedores: 'Proveedores', hd: 'Home Deliv.', pc: 'PC Gerencial', tel: 'Teléfono' }
  return (
    <div className="rounded-2xl border border-borde bg-panel-2/60 p-3">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-tenue">Mapa de equipos</p>
      <div className="grid grid-cols-2 gap-1.5">
        {orden.map((id) => {
          const m = MARCAS.find((x) => x.id === id)!
          const e = estadoMarca(s, id)
          const Icono = m.icono
          return (
            <motion.button
              layout
              key={id}
              onClick={() => abrir(id)}
              className={cx('flex items-center gap-2 rounded-lg border px-2 py-1.5 text-left text-[11.5px] transition hover:border-cyan-400/40', e === 'error' ? 'border-rose-400/40 bg-rose-500/10' : e === 'ok' ? 'border-emerald-400/25 bg-emerald-500/5' : 'border-borde bg-black/20')}
            >
              <span className={cx('size-2 shrink-0 rounded-full', PUNTO[e])} />
              <Icono size={13} className="shrink-0 text-tenue" />
              <span className="truncate">{nombres[id] ?? m.nombre}</span>
            </motion.button>
          )
        })}
      </div>
      <LeyendaEstados className="mt-2" />
    </div>
  )
}

export function Bitacora() {
  const { s } = useSim()
  const examen = s.esc.modo === 'examen'
  const ev = [...s.eventos].reverse().filter((e) => (examen ? e.tipo === 'info' : e.tipo !== 'quiz' && e.tipo !== 'fase')).slice(0, 14)
  return (
    <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-borde bg-panel-2/60 p-3">
      <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-tenue">
        <Activity size={13} /> Bitácora
      </p>
      <div className="scroll-fino min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
        {ev.length === 0 && <p className="text-[12px] text-apagado">{examen ? 'Aquí aparecen avisos del sitio.' : 'Aquí verás lo que vas logrando.'}</p>}
        {ev.map((e) => (
          <motion.div key={e.id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="flex gap-2 text-[12px] leading-snug">
            {e.tipo === 'objetivo' ? <CircleCheck size={14} className="mt-0.5 shrink-0 text-emerald-300" /> : e.tipo === 'error' ? <OctagonAlert size={14} className="mt-0.5 shrink-0 text-rose-300" /> : <Info size={14} className="mt-0.5 shrink-0 text-cyan-300" />}
            <span className="min-w-0">
              <span className="text-slate-200">{e.tipo === 'objetivo' ? textoPaso(s.esc, e.ref).titulo : e.texto}</span>
              {e.detalle && <span className="block text-[11px] text-tenue">{e.detalle}</span>}
            </span>
          </motion.div>
        ))}
      </div>
      <p className="mt-2 text-[10px] text-apagado">Inicio: {hora(s.inicio)}</p>
    </div>
  )
}
