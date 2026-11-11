import { WifiOff } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { abrirUrl, type TipoWeb } from '../../engine/red'
import { useSim } from '../../engine/SimProvider'
import type { Origen } from '../../engine/tipos'

export interface PropsPagina {
  host: string
  origen: Origen
  navegar: (url: string) => void
}

/** Si el equipo deja de responder (cambió de IP, se reinició, se desconectó…) cubre la página. */
export function Vigilante({ origen, host, web, children, navegar }: { origen: Origen; host: string; web: TipoWeb; children: ReactNode; navegar: (u: string) => void }) {
  const { s } = useSim()
  const r = abrirUrl(s, origen, host)
  const vivo = r.tipo === 'pagina' && r.web === web
  const [mostrar, setMostrar] = useState(false)
  useEffect(() => {
    if (vivo) {
      setMostrar(false)
      return
    }
    const t = window.setTimeout(() => setMostrar(true), 1800)
    return () => window.clearTimeout(t)
  }, [vivo])
  return (
    <div className="relative h-full">
      {children}
      {mostrar && !vivo && (
        <div className="absolute inset-0 z-20 grid place-items-center bg-white/80 backdrop-blur-[2px]">
          <div className="max-w-sm rounded-xl border border-slate-300 bg-white p-5 text-center text-slate-700 shadow-xl">
            <WifiOff className="mx-auto mb-2 text-slate-400" size={30} />
            <p className="font-semibold">La página dejó de responder</p>
            <p className="mt-1 text-sm text-slate-500">
              {host} ya no contesta. Si acabas de cambiarle la IP o lo reiniciaste, es normal: ahora vive en otra dirección (o se está reiniciando).
            </p>
            <button onClick={() => navegar(host)} className="mt-3 rounded-md bg-slate-800 px-3 py-1.5 text-sm text-white hover:bg-slate-700">
              Reintentar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export function CampoWeb({ etiqueta, valor, onCambio, tipo = 'text', deshabilitado, ancho = 'w-48', className }: { etiqueta: string; valor: string; onCambio?: (v: string) => void; tipo?: string; deshabilitado?: boolean; ancho?: string; className?: string }) {
  return (
    <label className={'flex items-center gap-3 py-1 ' + (className ?? '')}>
      <span className="w-40 shrink-0 text-right text-[13px]">{etiqueta}</span>
      <input
        type={tipo}
        value={valor}
        disabled={deshabilitado}
        onChange={(e) => onCambio?.(e.target.value)}
        spellCheck={false}
        autoComplete="off"
        className={`${ancho} rounded-sm border border-slate-400 bg-white px-2 py-1 text-[13px] text-slate-900 outline-none focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-500`}
      />
    </label>
  )
}
