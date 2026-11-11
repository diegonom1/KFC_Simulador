import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { configLaptop, resolver } from '../../engine/red'
import { useSim } from '../../engine/SimProvider'
import type { SimState } from '../../engine/tipos'
import { esIpValida } from '../../lib/ip'
import { obtenerAjustes, sfx } from '../../lib/sonido'

const PROMPT = 'C:\\Users\\tecnico>'

/** Símbolo del sistema (Windows) de la laptop: ping e ipconfig. */
export function Cmd({ onCerrar }: { onCerrar: () => void }) {
  const { s } = useSim()
  const sRef = useRef<SimState>(s)
  sRef.current = s
  const [lineas, setLineas] = useState<string[]>(['Microsoft Windows [Versión 10.0.19045]', '(c) Microsoft Corporation. Todos los derechos reservados.', ''])
  const [entrada, setEntrada] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const hist = useRef<string[]>([])
  const idx = useRef(0)
  const ping = useRef<{ timer: number; parar: () => void } | null>(null)
  const scroll = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)

  useLayoutEffect(() => {
    if (scroll.current) scroll.current.scrollTop = scroll.current.scrollHeight
  }, [lineas])
  useEffect(() => () => ping.current?.parar(), [])

  const agregar = (...l: string[]) => setLineas((x) => [...x, ...l].slice(-800))

  const ipconfig = () => {
    const c = configLaptop(sRef.current)
    const r = ['', 'Configuración IP de Windows', '']
    r.push('Adaptador de Ethernet Ethernet:', '')
    if (c.medio !== 'cable') r.push('   Estado de los medios. . . . . . . . . . . : medios desconectados', '')
    else {
      r.push('   Sufijo DNS específico para la conexión. . :')
      r.push(`   Dirección IPv4. . . . . . . . . . . . . . : ${c.ip || '0.0.0.0'}${c.apipa ? '(Duplicado/APIPA)' : ''}`)
      r.push(`   Máscara de subred . . . . . . . . . . . . : ${c.mascara || '0.0.0.0'}`)
      r.push(`   Puerta de enlace predeterminada . . . . . : ${c.gateway}`, '')
    }
    r.push('Adaptador de LAN inalámbrica Wi-Fi:', '')
    if (c.medio !== 'wifi') r.push('   Estado de los medios. . . . . . . . . . . : medios desconectados', '')
    else {
      r.push(`   Dirección IPv4. . . . . . . . . . . . . . : ${c.ip}`)
      r.push(`   Máscara de subred . . . . . . . . . . . . : ${c.mascara}`)
      r.push(`   Puerta de enlace predeterminada . . . . . : ${c.gateway}`, '')
    }
    return r
  }

  const iniciarPing = (destino: string, n: number | null) => {
    if (!esIpValida(destino)) {
      agregar(`La solicitud de ping no pudo encontrar el host ${destino}. Compruebe el nombre y vuelva a intentarlo.`, '')
      return
    }
    agregar('', `Haciendo ping a ${destino} con 32 bytes de datos:`)
    setOcupado(true)
    let env = 0
    let rec = 0
    const t: number[] = []
    const parar = () => {
      if (!ping.current) return
      window.clearInterval(ping.current.timer)
      ping.current = null
      const per = env - rec
      const r = ['', `Estadísticas de ping para ${destino}:`, `    Paquetes: enviados = ${env}, recibidos = ${rec}, perdidos = ${per}`, `    (${env ? Math.round((per / env) * 100) : 0}% perdidos),`]
      if (t.length) r.push('Tiempos aproximados de ida y vuelta en milisegundos:', `    Mínimo = ${Math.min(...t)}ms, Máximo = ${Math.max(...t)}ms, Media = ${Math.round(t.reduce((a, b) => a + b, 0) / t.length)}ms`)
      agregar(...r, '')
      setOcupado(false)
      requestAnimationFrame(() => input.current?.focus())
    }
    const timer = window.setInterval(
      () => {
        env++
        const r = resolver(sRef.current, 'laptop', destino)
        if (r.tipo === 'ok' || r.tipo === 'local') {
          const ms = r.tipo === 'local' ? 0 : Math.round(r.nodo.rtt[0] + Math.random() * (r.nodo.rtt[1] - r.nodo.rtt[0]))
          const ttl = r.tipo === 'local' ? 128 : r.nodo.ttl
          rec++
          t.push(ms)
          agregar(`Respuesta desde ${destino}: bytes=32 tiempo${ms < 1 ? '<1m' : `=${ms}ms`} TTL=${ttl}`)
          sfx.ping()
        } else if (r.tipo === 'inalcanzable') agregar(`Respuesta desde ${r.desde.ip}: Host de destino inaccesible.`)
        else if (r.tipo === 'sin-red') agregar('Error general.')
        else agregar('Tiempo de espera agotado para esta solicitud.')
        if (n && env >= n) parar()
      },
      obtenerAjustes().pingRapido ? 300 : 1000,
    )
    ping.current = { timer, parar }
  }

  const ejecutar = (linea: string) => {
    const a = linea.trim().split(/\s+/)
    const cmd = (a[0] ?? '').toLowerCase()
    if (!cmd) return
    if (cmd === 'cls') setLineas([])
    else if (cmd === 'exit') onCerrar()
    else if (cmd === 'ipconfig') agregar(...ipconfig())
    else if (cmd === 'ping') {
      const t = a.includes('-t') || a.includes('/t')
      const ni = a.findIndex((x) => x === '-n' || x === '/n')
      const n = t ? null : ni >= 0 ? Number(a[ni + 1]) || 4 : 4
      const destino = a.slice(1).filter((x, i, arr) => !x.startsWith('-') && !x.startsWith('/') && !(arr[i - 1] === '-n' || arr[i - 1] === '/n'))[0]
      if (!destino) agregar('', 'Uso: ping [-t] [-n cuenta] nombre_destino', '')
      else iniciarPing(destino, n)
    } else if (cmd === 'help') agregar('', 'Comandos disponibles en el simulador: ipconfig, ping [-t] [-n cuenta] IP, cls, exit', '')
    else agregar(`"${a[0]}" no se reconoce como un comando interno o externo,`, 'programa o archivo por lotes ejecutable.', '')
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#0c0c0c] font-mono text-[13px] leading-[1.35] text-[#cccccc]" onMouseUp={() => !window.getSelection()?.toString() && input.current?.focus()}>
      <div ref={scroll} className="scroll-fino min-h-0 flex-1 overflow-y-auto whitespace-pre-wrap break-all px-2 py-1.5">
        {lineas.map((l, i) => (
          <div key={i}>{l || '\u00a0'}</div>
        ))}
        {!ocupado ? (
          <label className="flex">
            <span>{PROMPT}</span>
            <input
              ref={input}
              autoFocus
              value={entrada}
              spellCheck={false}
              autoComplete="off"
              aria-label="Símbolo del sistema"
              onChange={(e) => setEntrada(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  agregar(PROMPT + entrada)
                  if (entrada.trim()) hist.current.push(entrada)
                  idx.current = hist.current.length
                  ejecutar(entrada)
                  setEntrada('')
                } else if (e.key === 'ArrowUp' && hist.current.length) {
                  e.preventDefault()
                  idx.current = Math.max(0, idx.current - 1)
                  setEntrada(hist.current[idx.current])
                } else if (e.key === 'ArrowDown') {
                  e.preventDefault()
                  idx.current = Math.min(hist.current.length, idx.current + 1)
                  setEntrada(hist.current[idx.current] ?? '')
                }
              }}
              className="min-w-0 flex-1 bg-transparent text-[#cccccc] caret-[#cccccc] outline-none"
            />
          </label>
        ) : (
          <input
            ref={input}
            autoFocus
            readOnly
            aria-label="Ping en curso (Ctrl+C para detener)"
            className="h-0 w-0 opacity-0"
            onKeyDown={(e) => {
              if (e.ctrlKey && e.key.toLowerCase() === 'c') {
                e.preventDefault()
                agregar('Control-C', '^C')
                ping.current?.parar()
              }
            }}
          />
        )}
      </div>
      {ocupado && (
        <div className="flex justify-end border-t border-white/10 px-2 py-1 font-sans text-[11px]">
          <button onClick={() => (agregar('Control-C', '^C'), ping.current?.parar())} className="rounded bg-white/10 px-2 py-0.5 font-mono text-white hover:bg-white/20">
            Ctrl + C
          </button>
        </div>
      )}
    </div>
  )
}
