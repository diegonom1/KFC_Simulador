import { Gauge } from 'lucide-react'
import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type KeyboardEvent as RKeyboardEvent } from 'react'
import { completar, ejecutar, nuevaSesion, promptDe, type Clase, type Efecto, type Linea, type Sesion } from '../../engine/linux/shell'
import { directorios, padre, puedeEscribir } from '../../engine/linux/vfs'
import { resolver } from '../../engine/red'
import { useSim } from '../../engine/SimProvider'
import type { HostLinux, SimState } from '../../engine/tipos'
import { cambiarAjustes, obtenerAjustes, sfx, suscribirAjustes } from '../../lib/sonido'
import { cx } from '../../lib/util'
import { Nano, type ResultadoGuardado } from './Nano'

const CLASES: Record<Clase, string> = {
  dir: 'text-[#729fcf] font-bold',
  exe: 'text-[#8ae234] font-bold',
  err: 'text-[#ef2929]',
  dim: 'text-white/50',
  user: 'text-[#8ae234] font-bold',
  root: 'text-[#ef2929] font-bold',
  path: 'text-[#729fcf] font-bold',
  bold: 'font-bold',
  ok: 'text-[#8ae234]',
  warn: 'text-[#fce94f]',
  hl: 'text-white',
}

interface LineaT {
  id: number
  l: Linea
}

interface Memoria {
  sesion: Sesion
  lineas: LineaT[]
  arranque: number
}

// Las sesiones sobreviven aunque cierres la ventana (hasta que el equipo se reinicia).
const memorias = new Map<HostLinux, Memoria>()
let idLinea = 1

function bienvenida(host: HostLinux): Linea[] {
  return [
    'Welcome to Ubuntu 18.04.6 LTS (GNU/Linux 4.15.0-213-generic x86_64)',
    '',
    ' * Documentation:  https://help.ubuntu.com',
    ' * Management:     https://landscape.canonical.com',
    '',
    [{ t: `Last login: Tue Nov 10 07:58:12 2026 from tty1 · ${host === 'pc' ? 'PC Gerencial' : host === 'hd' ? 'Home Delivery' : 'LMS'}`, c: 'dim' }],
  ]
}

function obtenerMemoria(host: HostLinux, arranque: number): Memoria {
  const m = memorias.get(host)
  if (m && m.arranque === arranque) return m
  const nueva: Memoria = { sesion: nuevaSesion(host), lineas: bienvenida(host).map((l) => ({ id: idLinea++, l })), arranque }
  memorias.set(host, nueva)
  return nueva
}

function Render({ l }: { l: Linea }) {
  if (typeof l === 'string') return <>{l || ' '}</>
  if (!l.length) return <>{' '}</>
  return (
    <>
      {l.map((s, i) => (
        <span key={i} className={s.c ? CLASES[s.c] : undefined}>
          {s.t}
        </span>
      ))}
    </>
  )
}

const fmt = (n: number) => (n < 10 ? n.toFixed(3) : n < 100 ? n.toFixed(2) : n.toFixed(1))
const g = (n: number) => String(parseFloat(n.toPrecision(6)))

function useAjustes() {
  return useSyncExternalStore(suscribirAjustes, obtenerAjustes)
}

type ModoEntrada = { tipo: 'shell' } | { tipo: 'password'; ef: Extract<Efecto, { tipo: 'password' }>; esperando?: boolean } | { tipo: 'ping' } | { tipo: 'ocupado' }

export function Terminal({ host, onCerrar, onApagar }: { host: HostLinux; onCerrar: () => void; onApagar?: (reinicio: boolean) => void }) {
  const { s, dispatch } = useSim()
  const sRef = useRef<SimState>(s)
  sRef.current = s
  const mem = obtenerMemoria(host, s.linux[host].arranques)
  const [lineas, setLineas] = useState<LineaT[]>(mem.lineas)
  const [entrada, setEntrada] = useState('')
  const [cursor, setCursor] = useState(0)
  const [modo, setModo] = useState<ModoEntrada>({ tipo: 'shell' })
  const [nano, setNano] = useState<Extract<Efecto, { tipo: 'nano' }> | null>(null)
  const [, forzar] = useState(0)
  const histIdx = useRef<number | null>(null)
  const borrador = useRef('')
  const tabDoble = useRef(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const pingRef = useRef<{ timer: number; parar: (interrumpido: boolean) => void } | null>(null)
  const ajustes = useAjustes()

  useEffect(() => {
    mem.lineas = lineas
  }, [lineas, mem])

  useLayoutEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [lineas, entrada, modo])

  useEffect(() => () => pingRef.current?.parar(false), [])

  const agregar = useCallback((...ls: Linea[]) => {
    setLineas((prev) => {
      const n = [...prev, ...ls.map((l) => ({ id: idLinea++, l }))]
      return n.length > 1500 ? n.slice(n.length - 1500) : n
    })
  }, [])

  const enfocar = () => {
    if (window.getSelection()?.toString()) return
    inputRef.current?.focus()
  }

  const iniciarPing = (ef: Extract<Efecto, { tipo: 'ping' }>) => {
    const r0 = resolver(sRef.current, host, ef.ip)
    if (r0.tipo === 'sin-red') {
      agregar('connect: Network is unreachable')
      return
    }
    const desde = 'desde' in r0 && r0.desde ? r0.desde : null
    agregar(`PING ${ef.destino} (${ef.ip}) 56(84) bytes of data.`)
    setModo({ tipo: 'ping' })
    let enviados = 0
    let recibidos = 0
    let errores = 0
    const rtts: number[] = []
    const intervalo = obtenerAjustes().pingRapido ? 210 : 1000
    const parar = (interrumpido: boolean) => {
      if (!pingRef.current) return
      window.clearInterval(pingRef.current.timer)
      pingRef.current = null
      const perdida = enviados ? ((enviados - recibidos) / enviados) * 100 : 0
      const tiempo = Math.max(0, (enviados - 1) * 1000 + Math.round(Math.random() * 60))
      const salida: Linea[] = []
      if (interrumpido) salida.push('^C')
      salida.push(`--- ${ef.destino} ping statistics ---`)
      salida.push([
        { t: `${enviados} packets transmitted, ${recibidos} received,${errores ? ` +${errores} errors,` : ''} ` },
        { t: `${g(perdida)}% packet loss`, c: perdida === 0 ? 'ok' : 'err' },
        { t: `, time ${tiempo}ms` },
      ])
      if (rtts.length) {
        const min = Math.min(...rtts)
        const max = Math.max(...rtts)
        const avg = rtts.reduce((a, b) => a + b, 0) / rtts.length
        const mdev = Math.sqrt(rtts.reduce((a, b) => a + (b - avg) ** 2, 0) / rtts.length)
        salida.push(`rtt min/avg/max/mdev = ${min.toFixed(3)}/${avg.toFixed(3)}/${max.toFixed(3)}/${mdev.toFixed(3)} ms`)
      }
      agregar(...salida)
      setModo({ tipo: 'shell' })
      if (enviados > 0) {
        dispatch({
          tipo: 'PING',
          registro: { origen: host, ipOrigen: desde?.ip ?? '', iface: desde?.nombre ?? '', destino: ef.ip, enviados, recibidos, conteo: ef.conteo },
        })
        if (perdida === 0) sfx.pingFin()
        else sfx.aviso()
      }
      requestAnimationFrame(() => inputRef.current?.focus())
    }
    const timer = window.setInterval(() => {
      enviados++
      const r = resolver(sRef.current, host, ef.ip)
      if (r.tipo === 'ok' || r.tipo === 'local') {
        const [a, b] = r.tipo === 'local' ? [0.02, 0.07] : r.nodo.rtt
        const ttl = r.tipo === 'local' ? 64 : r.nodo.ttl
        const perdido = r.tipo === 'ok' && r.dup && Math.random() < 0.4
        if (!perdido) {
          const t = a + Math.random() * (b - a)
          rtts.push(t)
          recibidos++
          agregar(`64 bytes from ${ef.ip}: icmp_seq=${enviados} ttl=${ttl} time=${fmt(t)} ms`)
          if (r.tipo === 'ok' && r.dup && Math.random() < 0.6) agregar(`64 bytes from ${ef.ip}: icmp_seq=${enviados} ttl=${ttl} time=${fmt(t * 1.4)} ms (DUP!)`)
          sfx.ping()
        }
      } else if (r.tipo === 'inalcanzable') {
        errores++
        agregar(`From ${r.desde.ip} icmp_seq=${enviados} Destination Host Unreachable`)
      }
      if (ef.conteo && enviados >= ef.conteo) parar(false)
    }, intervalo)
    pingRef.current = { timer, parar }
  }

  const procesar = (ef: Efecto) => {
    switch (ef.tipo) {
      case 'salida':
        agregar(...ef.lineas)
        break
      case 'password':
        if (ef.previo) agregar(...ef.previo)
        setModo({ tipo: 'password', ef })
        break
      case 'nano':
        setNano(ef)
        break
      case 'ping':
        iniciarPing(ef)
        break
      case 'reiniciar':
      case 'apagar':
        agregar(...ef.lineas)
        setModo({ tipo: 'ocupado' })
        window.setTimeout(() => {
          memorias.delete(host)
          if (ef.tipo === 'reiniciar') dispatch({ tipo: 'LINUX_REINICIAR', host })
          else dispatch({ tipo: 'LINUX_APAGAR', host })
          onApagar?.(ef.tipo === 'reiniciar')
          onCerrar()
        }, 1100)
        break
      case 'archivos':
        for (const c of ef.cambios) dispatch({ tipo: 'ARCHIVO', host, ruta: c.ruta, contenido: c.contenido })
        if (ef.lineas.length) agregar(...ef.lineas)
        break
      case 'limpiar':
        setLineas([])
        break
      case 'cerrar':
        memorias.delete(host)
        onCerrar()
        break
      case 'nada':
        break
    }
  }

  const enviar = () => {
    const texto = entrada
    if (modo.tipo === 'password') {
      const ef = modo.ef
      agregar(ef.prompt)
      setEntrada('')
      setCursor(0)
      if (ef.verificar(texto)) {
        setModo({ tipo: 'shell' })
        procesar(ef.exito())
      } else {
        setModo({ tipo: 'password', ef, esperando: true })
        window.setTimeout(() => {
          setModo({ tipo: 'shell' })
          procesar(ef.fallo())
          sfx.error()
          requestAnimationFrame(() => inputRef.current?.focus())
        }, 1300)
      }
      return
    }
    if (modo.tipo !== 'shell') return
    agregar([...promptDe(mem.sesion), { t: texto }])
    if (texto.trim()) {
      mem.sesion.historial.push(texto)
      if (mem.sesion.historial.length > 200) mem.sesion.historial.shift()
    }
    histIdx.current = null
    setEntrada('')
    setCursor(0)
    procesar(ejecutar(mem.sesion, texto, sRef.current))
    forzar((x) => x + 1)
  }

  const actualizarCursor = () => {
    const el = inputRef.current
    if (el) setCursor(el.selectionStart ?? el.value.length)
  }

  const fijar = (texto: string, pos = texto.length) => {
    setEntrada(texto)
    setCursor(pos)
    requestAnimationFrame(() => {
      const el = inputRef.current
      if (el) el.setSelectionRange(pos, pos)
    })
  }

  const onKeyDown = (e: RKeyboardEvent<HTMLInputElement>) => {
    const k = e.key
    if (e.ctrlKey && !e.altKey && k.toLowerCase() === 'c' && !window.getSelection()?.toString()) {
      e.preventDefault()
      if (pingRef.current) {
        pingRef.current.parar(true)
        return
      }
      if (modo.tipo === 'password') {
        agregar(modo.ef.prompt + '^C')
        setModo({ tipo: 'shell' })
        setEntrada('')
        return
      }
      agregar([...promptDe(mem.sesion), { t: entrada + '^C' }])
      fijar('')
      return
    }
    if (modo.tipo === 'ping' || modo.tipo === 'ocupado' || (modo.tipo === 'password' && modo.esperando)) {
      e.preventDefault()
      return
    }
    if (k === 'Enter') {
      e.preventDefault()
      tabDoble.current = false
      enviar()
      return
    }
    if (modo.tipo === 'password') return
    if (k === 'Tab') {
      e.preventDefault()
      const antes = entrada.slice(0, cursor)
      const r = completar(mem.sesion, sRef.current, antes)
      if (r.texto !== antes) {
        fijar(r.texto + entrada.slice(cursor), r.texto.length)
        tabDoble.current = false
      } else if (r.opciones.length) {
        if (tabDoble.current) {
          agregar([...promptDe(mem.sesion), { t: entrada }], r.opciones.join('  '))
          tabDoble.current = false
        } else tabDoble.current = true
      }
      return
    }
    tabDoble.current = false
    if (k === 'ArrowUp' || k === 'ArrowDown') {
      e.preventDefault()
      const h = mem.sesion.historial
      if (!h.length) return
      if (histIdx.current === null) {
        borrador.current = entrada
        histIdx.current = h.length
      }
      const n = Math.max(0, Math.min(h.length, histIdx.current + (k === 'ArrowUp' ? -1 : 1)))
      histIdx.current = n
      fijar(n === h.length ? borrador.current : h[n])
      return
    }
    if (e.ctrlKey && k.toLowerCase() === 'l') {
      e.preventDefault()
      setLineas([])
      return
    }
    if (e.ctrlKey && k.toLowerCase() === 'a') {
      e.preventDefault()
      fijar(entrada, 0)
      return
    }
    if (e.ctrlKey && k.toLowerCase() === 'e') {
      e.preventDefault()
      fijar(entrada)
      return
    }
    if (e.ctrlKey && k.toLowerCase() === 'u') {
      e.preventDefault()
      fijar(entrada.slice(cursor), 0)
      return
    }
    if (e.ctrlKey && k.toLowerCase() === 'd' && !entrada) {
      e.preventDefault()
      agregar([...promptDe(mem.sesion)])
      procesar(ejecutar(mem.sesion, 'exit', sRef.current))
      forzar((x) => x + 1)
    }
  }

  const guardarNano = (texto: string, ruta: string): ResultadoGuardado => {
    if (!nano) return 'permiso'
    if (!directorios(host).has(padre(ruta))) return 'directorio'
    const permitido = ruta === nano.ruta ? nano.escribible : puedeEscribir(nano.usuario, ruta)
    if (!permitido) {
      sfx.error()
      return 'permiso'
    }
    dispatch({ tipo: 'ARCHIVO', host, ruta, contenido: texto })
    sfx.exito()
    return 'ok'
  }

  if (nano) {
    return (
      <Nano
        key={nano.ruta + String(nano.contenido.length)}
        ruta={nano.ruta}
        contenido={nano.contenido}
        escribible={nano.escribible}
        aviso={nano.aviso}
        onGuardar={guardarNano}
        onSalir={() => {
          setNano(null)
          requestAnimationFrame(() => inputRef.current?.focus())
        }}
      />
    )
  }

  const prompt = promptDe(mem.sesion)
  const visible = modo.tipo === 'password' ? '' : entrada
  const antes = visible.slice(0, cursor)
  const bajo = visible.slice(cursor, cursor + 1)
  const despues = visible.slice(cursor + 1)

  return (
    <div className="term relative flex h-full min-h-0 flex-col bg-[#300a24] text-[13px] leading-[1.4] text-[#eeeeec]" onMouseUp={enfocar}>
      <button
        type="button"
        onClick={() => cambiarAjustes({ pingRapido: !ajustes.pingRapido })}
        className="absolute right-2 top-1.5 z-10 inline-flex items-center gap-1 rounded-md bg-black/30 px-2 py-0.5 font-sans text-[10px] text-white/70 ring-1 ring-white/10 hover:text-white"
        title="Velocidad de ping en el simulador"
      >
        <Gauge size={11} /> ping {ajustes.pingRapido ? 'rápido' : 'real (1 s)'}
      </button>
      <div ref={scrollRef} className="scroll-fino min-h-0 flex-1 overflow-y-auto px-2 py-1.5 whitespace-pre-wrap break-all">
        {lineas.map((x) => (
          <div key={x.id}>
            <Render l={x.l} />
          </div>
        ))}
        {modo.tipo !== 'ping' && modo.tipo !== 'ocupado' && (
          <div className="relative" data-guide="term-input">
            {modo.tipo === 'password' ? <span>{modo.ef.prompt}</span> : <Render l={prompt} />}
            <span>{antes}</span>
            <span className={cx('animate-parpadeo', bajo ? 'bg-[#eeeeec] text-[#300a24]' : 'bg-[#eeeeec]')}>{bajo || ' '}</span>
            <span>{despues}</span>
            <input
              ref={inputRef}
              autoFocus
              value={entrada}
              onChange={(e) => {
                setEntrada(e.target.value)
                setCursor(e.target.selectionStart ?? e.target.value.length)
                histIdx.current = null
              }}
              onKeyDown={onKeyDown}
              onKeyUp={actualizarCursor}
              onSelect={actualizarCursor}
              onClick={actualizarCursor}
              type={modo.tipo === 'password' ? 'password' : 'text'}
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              aria-label="Línea de comandos"
              className="absolute inset-0 h-full w-full cursor-text opacity-0"
            />
          </div>
        )}
        {(modo.tipo === 'ping' || modo.tipo === 'ocupado') && (
          <input ref={inputRef} autoFocus onKeyDown={onKeyDown} className="h-0 w-0 opacity-0" aria-label="Terminal ocupada (Ctrl+C para detener)" readOnly />
        )}
      </div>
      {modo.tipo === 'ping' && (
        <div className="flex items-center justify-between gap-2 border-t border-white/10 bg-black/20 px-2 py-1 font-sans text-[11px] text-white/70">
          <span>Ping en curso…</span>
          <button type="button" onClick={() => pingRef.current?.parar(true)} className="rounded bg-white/10 px-2 py-0.5 font-mono text-white hover:bg-white/20">
            Ctrl + C
          </button>
        </div>
      )}
    </div>
  )
}
