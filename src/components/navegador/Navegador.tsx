import { ArrowLeft, ArrowRight, Globe, Info, Lock, Menu, Plus, RotateCw, Star, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { abrirUrl, hostDeUrl, type ResultadoWeb } from '../../engine/red'
import { useSim } from '../../engine/SimProvider'
import type { Origen } from '../../engine/tipos'
import { cx } from '../../lib/util'
import { PaginaBiometrico } from './paginas/Biometrico'
import { PaginaHme50, PaginaHme60 } from './paginas/Hme'
import { PaginaImpresora } from './paginas/Impresora'
import { PaginaSpeedtest } from './paginas/Speedtest'
import { PaginaTelmex } from './paginas/Telmex'
import { PaginaBuscador, PaginaDigi, PaginaError, PaginaFortigate, PaginaInicio, PaginaModemExtra, PaginaOnt, PaginaRouterViejo } from './paginas/Varias'
import { PaginaYealink } from './paginas/Yealink'

type Estado = ResultadoWeb | { tipo: 'inicio'; host: '' }

function tituloDe(e: Estado, hme: 50 | 60, marca: string): string {
  switch (e.tipo) {
    case 'inicio':
      return 'Nueva pestaña'
    case 'internet':
      return e.sitio === 'speedtest' ? 'Prueba de velocidad' : 'Buscador'
    case 'pagina':
      return {
        bio: 'Fingerprint Web Server',
        tel: 'IP Phone T30P',
        hme: hme === 60 ? 'ZOOM Nitro' : 'ZOOM Timer',
        imp: marca === 'hp' ? 'HP Laser MFP 408dn' : 'Command Center',
        digi: 'Digi Remote Manager',
        telmex: 'Módem Telmex',
        'ont-tp': 'ONT',
        fortigate: 'FortiGate',
        'router-viejo': 'Router',
        'modem-extra': 'Módem',
      }[e.web]
    case 'timeout':
      return 'La conexión ha caducado'
    case 'rechazada':
      return 'Problema al cargar la página'
    case 'dns':
      return 'Servidor no encontrado'
    default:
      return 'Sin conexión'
  }
}

export function Navegador({ origen, urlInicial }: { origen: Origen; urlInicial?: string }) {
  const { s } = useSim()
  const sRef = useRef(s)
  sRef.current = s
  const [estado, setEstado] = useState<Estado>({ tipo: 'inicio', host: '' })
  const [barra, setBarra] = useState('')
  const [cargando, setCargando] = useState(false)
  const [atras, setAtras] = useState<string[]>([])
  const [n, setN] = useState(0)
  const timer = useRef<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (urlInicial) navegar(urlInicial)
    return () => {
      if (timer.current) window.clearTimeout(timer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const navegar = (u: string, guardar = true) => {
    const limpio = u.trim()
    if (!limpio) return
    const host = hostDeUrl(limpio)
    const r = abrirUrl(sRef.current, origen, limpio)
    setBarra(/^\d+\.\d+\.\d+\.\d+$/.test(host) ? `http://${host}/` : `https://${host}/`)
    setCargando(true)
    inputRef.current?.blur()
    if (timer.current) window.clearTimeout(timer.current)
    const espera = r.tipo === 'timeout' ? 2800 : r.tipo === 'dns' || r.tipo === 'sin-red' ? 800 : 450 + Math.random() * 450
    timer.current = window.setTimeout(() => {
      if (guardar && estado.host) setAtras((a) => [...a.slice(-20), estado.host])
      setEstado(abrirUrl(sRef.current, origen, limpio))
      setCargando(false)
      setN((x) => x + 1)
    }, espera)
  }

  const contenido = () => {
    const props = { host: estado.host, origen, navegar }
    switch (estado.tipo) {
      case 'inicio':
        return <PaginaInicio navegar={navegar} examen={s.esc.modo === 'examen'} />
      case 'internet':
        return estado.sitio === 'speedtest' ? <PaginaSpeedtest origen={origen} /> : <PaginaBuscador />
      case 'pagina':
        switch (estado.web) {
          case 'bio':
            return <PaginaBiometrico {...props} />
          case 'tel':
            return <PaginaYealink {...props} />
          case 'hme':
            return s.esc.hmeModelo === 60 ? <PaginaHme60 {...props} /> : <PaginaHme50 {...props} />
          case 'imp':
            return <PaginaImpresora {...props} />
          case 'digi':
            return <PaginaDigi {...props} />
          case 'telmex':
            return <PaginaTelmex {...props} />
          case 'ont-tp':
            return <PaginaOnt {...props} />
          case 'fortigate':
            return <PaginaFortigate {...props} />
          case 'router-viejo':
            return <PaginaRouterViejo {...props} />
          case 'modem-extra':
            return <PaginaModemExtra {...props} />
        }
        return null
      default:
        return <PaginaError tipo={estado.tipo} host={estado.host} reintentar={() => navegar(estado.host, false)} />
    }
  }

  const seguro = estado.tipo === 'internet'
  const titulo = cargando ? 'Conectando…' : tituloDe(estado, s.esc.hmeModelo, s.esc.marcaImpresora)

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#f9f9fb] font-sans">
      <div className="flex h-9 shrink-0 items-end gap-1 bg-[#f0f0f4] px-2 pt-1">
        <div className="flex h-8 w-56 min-w-0 items-center gap-2 rounded-t-lg bg-white px-3 text-[12px] text-slate-700 shadow-[0_-1px_2px_rgb(0_0_0/0.06)]">
          {cargando ? <span className="size-3.5 animate-spin rounded-full border-2 border-[#7542e5] border-t-transparent" /> : <Globe size={14} className="shrink-0 text-slate-500" />}
          <span className="flex-1 truncate">{titulo}</span>
          <X size={13} className="shrink-0 text-slate-400" />
        </div>
        <button className="mb-1 grid size-7 place-items-center rounded text-slate-500 hover:bg-black/5" aria-label="Nueva pestaña" onClick={() => (setEstado({ tipo: 'inicio', host: '' }), setBarra(''))}>
          <Plus size={15} />
        </button>
      </div>
      <div className="relative flex h-10 shrink-0 items-center gap-1 border-b border-slate-200 bg-white px-2">
        <button
          disabled={!atras.length}
          onClick={() => {
            const prev = atras[atras.length - 1]
            setAtras((a) => a.slice(0, -1))
            if (prev) navegar(prev, false)
          }}
          className="grid size-8 place-items-center rounded text-slate-600 hover:bg-black/5 disabled:opacity-30"
          aria-label="Atrás"
        >
          <ArrowLeft size={16} />
        </button>
        <button disabled className="grid size-8 place-items-center rounded text-slate-600 opacity-30" aria-label="Adelante">
          <ArrowRight size={16} />
        </button>
        <button onClick={() => estado.host && navegar(estado.host, false)} className="grid size-8 place-items-center rounded text-slate-600 hover:bg-black/5" aria-label="Recargar">
          <RotateCw size={15} />
        </button>
        <form
          className="flex h-8 min-w-0 flex-1 items-center gap-2 rounded-md bg-[#f0f0f4] px-3 text-[13px] text-slate-800 focus-within:bg-white focus-within:ring-2 focus-within:ring-[#0061e0]/50"
          onSubmit={(e) => {
            e.preventDefault()
            navegar(barra)
          }}
        >
          {seguro ? <Lock size={13} className="shrink-0 text-slate-500" /> : estado.tipo === 'inicio' ? <Globe size={13} className="shrink-0 text-slate-400" /> : <Info size={13} className="shrink-0 text-slate-500" />}
          <input
            ref={inputRef}
            data-guide="browser-url"
            value={barra}
            onChange={(e) => setBarra(e.target.value)}
            onFocus={(e) => e.currentTarget.select()}
            placeholder="Buscar o escribir dirección"
            spellCheck={false}
            autoComplete="off"
            autoCapitalize="off"
            className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-slate-400"
          />
          <Star size={14} className="shrink-0 text-slate-400" />
        </form>
        <button className="grid size-8 place-items-center rounded text-slate-600 hover:bg-black/5" aria-label="Menú">
          <Menu size={16} />
        </button>
        {cargando && (
          <div className="absolute inset-x-0 bottom-0 h-0.5 overflow-hidden">
            <div className="h-full w-1/3 bg-gradient-to-r from-[#7542e5] to-[#0061e0]" style={{ animation: 'barrido 1.1s ease-in-out infinite' }} />
          </div>
        )}
      </div>
      <div className={cx('relative min-h-0 flex-1 overflow-hidden', cargando && 'opacity-90')} key={n}>
        {contenido()}
      </div>
    </div>
  )
}
