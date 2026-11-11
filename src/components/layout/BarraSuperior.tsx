import { BookOpen, ClipboardList, Gauge, House, ListChecks, NotebookPen, Send, Settings2, Timer, Volume2, VolumeX } from 'lucide-react'
import { useEffect, useState, useSyncExternalStore } from 'react'
import { fases } from '../../data/sucursal'
import { progresoFase } from '../../engine/objetivos'
import { useSim } from '../../engine/SimProvider'
import { irA } from '../../lib/ruta'
import { cambiarAjustes, obtenerAjustes, sfx, suscribirAjustes } from '../../lib/sonido'
import { cx, formatoTiempo } from '../../lib/util'
import { Boton, Insignia } from '../ui/base'
import { useUi } from './uiContexto'

function Reloj({ inicio, fin }: { inicio: number; fin: number | null }) {
  const [t, setT] = useState(Date.now())
  useEffect(() => {
    if (fin) return
    const id = window.setInterval(() => setT(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [fin])
  return <span className="font-mono tabular-nums">{formatoTiempo((fin ?? t) - inicio)}</span>
}

export function BarraSuperior({ onTerminar }: { onTerminar: () => void }) {
  const { s } = useSim()
  const { abrirPanel } = useUi()
  const examen = s.esc.modo === 'examen'
  const ajustes = useSyncExternalStore(suscribirAjustes, obtenerAjustes)
  const [menu, setMenu] = useState(false)
  return (
    <header className="relative z-40 flex items-center gap-2 border-b border-borde bg-panel/80 px-2 py-2 backdrop-blur-xl sm:gap-3 sm:px-3">
      <button onClick={() => irA('inicio')} className="grid size-9 shrink-0 place-items-center rounded-xl border border-borde bg-panel-3 text-tenue hover:text-tinta" aria-label="Inicio" title="Inicio (tu avance se guarda)">
        <House size={17} />
      </button>
      <div className="hidden min-w-0 md:block">
        <p className="truncate text-sm font-semibold leading-tight">Migración SD-WAN</p>
        <p className="truncate text-[11px] text-tenue">
          {s.esc.nombre} · CECO {s.esc.ceco}
        </p>
      </div>
      <Insignia color={examen ? 'ambar' : 'cyan'} className="shrink-0">
        {examen ? 'Examen' : 'Guiado'}
      </Insignia>

      <div className="mx-1 flex min-w-0 flex-1 items-center gap-1" aria-label="Progreso por fases">
        {fases.map((f) => {
          const p = progresoFase(s, f.n)
          if (!p.total) return null
          const v = p.hechos / p.total
          return (
            <div key={f.n} className="group relative h-2 min-w-2 flex-1 overflow-hidden rounded-full bg-white/[0.07]" title={examen ? undefined : `${f.n}. ${f.titulo} (${p.hechos}/${p.total})`}>
              <div className={cx('h-full rounded-full transition-all duration-700', v === 1 ? 'bg-emerald-400' : 'bg-gradient-to-r from-cyan-400 to-violet-400')} style={{ width: `${v * 100}%` }} />
            </div>
          )
        })}
      </div>

      {examen && (
        <span className="flex shrink-0 items-center gap-1.5 rounded-lg border border-amber-400/30 bg-amber-400/10 px-2.5 py-1 text-sm text-amber-100">
          <Timer size={14} />
          <Reloj inicio={s.inicio} fin={s.fin} />
        </span>
      )}

      <div className="hidden shrink-0 items-center gap-1.5 lg:flex">
        <Boton tam="sm" icono={<NotebookPen size={14} />} onClick={() => abrirPanel('libreta')} data-guide="libreta-btn">
          Libreta
        </Boton>
        <Boton tam="sm" icono={<ClipboardList size={14} />} onClick={() => abrirPanel('hoja')}>
          Hoja
        </Boton>
        {!examen && (
          <Boton tam="sm" icono={<BookOpen size={14} />} onClick={() => abrirPanel('referencia')}>
            Referencia
          </Boton>
        )}
      </div>
      <button onClick={() => abrirPanel('mision')} className="grid size-9 shrink-0 place-items-center rounded-xl border border-borde bg-panel-3 text-tenue hover:text-tinta lg:hidden" aria-label="Misión y accesos" data-guide="libreta-btn-movil">
        <ListChecks size={17} />
      </button>
      <div className="relative shrink-0">
        <button onClick={() => setMenu((m) => !m)} className="grid size-9 place-items-center rounded-xl border border-borde bg-panel-3 text-tenue hover:text-tinta" aria-label="Ajustes">
          <Settings2 size={16} />
        </button>
        {menu && (
          <div className="panel absolute right-0 top-11 z-50 w-64 space-y-1 p-2 text-sm">
            <button
              onClick={() => {
                cambiarAjustes({ sonido: !ajustes.sonido })
                if (!ajustes.sonido) window.setTimeout(() => sfx.exito(), 50)
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-2 hover:bg-white/5"
            >
              {ajustes.sonido ? <Volume2 size={16} className="text-cyan-300" /> : <VolumeX size={16} className="text-tenue" />}
              Sonidos {ajustes.sonido ? 'activados' : 'desactivados'}
            </button>
            <button onClick={() => cambiarAjustes({ pingRapido: !ajustes.pingRapido })} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 hover:bg-white/5">
              <Gauge size={16} className="text-cyan-300" />
              Ping: {ajustes.pingRapido ? 'rápido (simulado)' : 'real (1 por segundo)'}
            </button>
          </div>
        )}
      </div>
      <Boton tam="sm" variante={examen ? 'primario' : 'secundario'} icono={<Send size={14} />} onClick={onTerminar} className="shrink-0">
        <span className="hidden sm:inline">{examen ? 'Entregar' : 'Terminar'}</span>
      </Boton>
    </header>
  )
}
