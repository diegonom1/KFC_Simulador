import { useEffect, useRef, useState } from 'react'
import { cx } from '../../lib/util'

type Modo = 'editar' | 'guardar' | 'confirmar' | 'guardar-salir' | 'buscar'

export type ResultadoGuardado = 'ok' | 'permiso' | 'directorio'

const contarLineas = (t: string) => {
  if (!t) return 0
  const n = t.split('\n').length
  return t.endsWith('\n') ? n - 1 : n
}

function Atajo({ k, t, onClick }: { k: string; t: string; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex min-w-0 items-center gap-1 whitespace-nowrap text-left hover:bg-white/10">
      <span className="bg-[#eeeeec] px-0.5 text-[#300a24]">{k}</span>
      <span className="truncate">{t}</span>
    </button>
  )
}

/** Editor nano simulado (versión 2.9.3 de Ubuntu 18.04). */
export function Nano({
  ruta,
  contenido,
  escribible,
  aviso,
  onGuardar,
  onSalir,
}: {
  ruta: string
  contenido: string
  escribible: boolean
  aviso?: string
  onGuardar: (texto: string, ruta: string) => ResultadoGuardado
  onSalir: () => void
}) {
  const [texto, setTexto] = useState(contenido)
  const [modificado, setModificado] = useState(false)
  const [modo, setModo] = useState<Modo>('editar')
  const [nombre, setNombre] = useState(ruta)
  const [rutaActual, setRutaActual] = useState(ruta)
  const [estado, setEstado] = useState<{ t: string; error?: boolean } | null>(
    aviso ? { t: aviso, error: true } : ruta ? (contenido ? { t: `[ Read ${contarLineas(contenido)} line${contarLineas(contenido) === 1 ? '' : 's'} ]` } : { t: '[ New File ]' }) : null,
  )
  const [busqueda, setBusqueda] = useState('')
  const area = useRef<HTMLTextAreaElement>(null)
  const prompt = useRef<HTMLInputElement>(null)
  const corte = useRef<{ texto: string; seguido: boolean }>({ texto: '', seguido: false })

  useEffect(() => {
    if (modo === 'editar') area.current?.focus()
    else if (modo === 'guardar' || modo === 'guardar-salir' || modo === 'buscar') prompt.current?.focus()
  }, [modo])

  const escribir = (salir: boolean) => {
    const destino = nombre.trim()
    if (!destino) {
      setEstado({ t: '[ Cancelled ]' })
      setModo('editar')
      return
    }
    const r = onGuardar(texto, destino)
    if (r === 'ok') {
      setModificado(false)
      setRutaActual(destino)
      const n = contarLineas(texto)
      setEstado({ t: `[ Wrote ${n} line${n === 1 ? '' : 's'} ]` })
      if (salir) onSalir()
      else setModo('editar')
    } else {
      setEstado({ t: r === 'permiso' ? `[ Error writing ${destino}: Permission denied ]` : `[ Error writing ${destino}: No such file or directory ]`, error: true })
      setModo('editar')
    }
  }

  const accion = (k: string) => {
    if (modo !== 'editar') return
    if (k === 'o') {
      setNombre(rutaActual)
      setModo('guardar')
    } else if (k === 'x') {
      if (modificado) setModo('confirmar')
      else onSalir()
    } else if (k === 'k') cortarLinea()
    else if (k === 'u') pegar()
    else if (k === 'c') posicion()
    else if (k === 'w') setModo('buscar')
    else if (k === 'g') setEstado({ t: '[ Ayuda: ^O guardar · ^X salir · ^K cortar línea · ^U pegar · ^W buscar (en el navegador usa el botón: Ctrl+W cierra la pestaña) ]' })
    else setEstado({ t: '[ Función no disponible en el simulador ]' })
  }

  const posicion = () => {
    const el = area.current
    if (!el) return
    const p = el.selectionStart
    const antes = texto.slice(0, p)
    const linea = antes.split('\n').length
    const col = p - antes.lastIndexOf('\n')
    const total = texto.split('\n').length
    setEstado({ t: `[ line ${linea}/${total} (${Math.round((linea / total) * 100)}%), col ${col}/${(texto.split('\n')[linea - 1] ?? '').length + 1}, char ${p}/${texto.length} (${texto.length ? Math.round((p / texto.length) * 100) : 0}%) ]` })
  }

  const cortarLinea = () => {
    const el = area.current
    if (!el) return
    const p = el.selectionStart
    const ini = texto.lastIndexOf('\n', p - 1) + 1
    let fin = texto.indexOf('\n', p)
    fin = fin === -1 ? texto.length : fin + 1
    const linea = texto.slice(ini, fin)
    corte.current = { texto: (corte.current.seguido ? corte.current.texto : '') + linea, seguido: true }
    const nuevo = texto.slice(0, ini) + texto.slice(fin)
    setTexto(nuevo)
    setModificado(true)
    requestAnimationFrame(() => {
      el.selectionStart = el.selectionEnd = ini
    })
  }

  const pegar = () => {
    const el = area.current
    if (!el || !corte.current.texto) return
    const p = el.selectionStart
    const ini = texto.lastIndexOf('\n', p - 1) + 1
    const nuevo = texto.slice(0, ini) + corte.current.texto + texto.slice(ini)
    setTexto(nuevo)
    setModificado(true)
    const fin = ini + corte.current.texto.length
    requestAnimationFrame(() => {
      el.selectionStart = el.selectionEnd = fin
    })
  }

  const buscar = () => {
    const el = area.current
    setModo('editar')
    if (!el || !busqueda) return
    const desde = el.selectionEnd
    let i = texto.indexOf(busqueda, desde)
    if (i < 0) i = texto.indexOf(busqueda)
    if (i < 0) setEstado({ t: `[ "${busqueda}" not found ]` })
    else
      requestAnimationFrame(() => {
        el.focus()
        el.setSelectionRange(i, i + busqueda.length)
      })
  }

  return (
    <div className="term relative flex h-full min-h-0 flex-col bg-[#300a24] text-[13px] leading-[1.35] text-[#eeeeec]">
      <div className="flex shrink-0 justify-between gap-4 bg-[#eeeeec] px-2 text-[#300a24]">
        <span>  GNU nano 2.9.3</span>
        <span className="truncate">{rutaActual || 'New Buffer'}</span>
        <span>{modificado ? 'Modified  ' : '          '}</span>
      </div>
      <textarea
        ref={area}
        data-guide="nano-editor"
        value={texto}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        wrap="off"
        className="scroll-fino min-h-0 flex-1 resize-none whitespace-pre bg-transparent px-1 py-0.5 text-[#eeeeec] caret-[#eeeeec] outline-none"
        style={{ tabSize: 8 }}
        onChange={(e) => {
          setTexto(e.target.value)
          setModificado(true)
          corte.current.seguido = false
        }}
        onKeyDown={(e) => {
          if (e.key === 'Tab') {
            e.preventDefault()
            const el = e.currentTarget
            const a = el.selectionStart
            const b = el.selectionEnd
            const n = texto.slice(0, a) + '\t' + texto.slice(b)
            setTexto(n)
            setModificado(true)
            requestAnimationFrame(() => {
              el.selectionStart = el.selectionEnd = a + 1
            })
            return
          }
          if (e.ctrlKey && !e.altKey) {
            const k = e.key.toLowerCase()
            if (['o', 'x', 'k', 'u', 'c', 'w', 'g', 'r', 'j', 't', '\\', '_'].includes(k)) {
              e.preventDefault()
              if (k !== 'k') corte.current.seguido = false
              accion(k)
            }
          }
        }}
      />
      <div className="shrink-0">
        <div className="flex h-[1.35em] justify-center">
          {modo === 'editar' && estado && <span className={cx('px-1', estado.error ? 'bg-[#eeeeec] text-[#cc0000]' : 'bg-[#eeeeec] text-[#300a24]')}>{estado.t}</span>}
          {(modo === 'guardar' || modo === 'guardar-salir' || modo === 'buscar') && (
            <label className="flex w-full items-center bg-[#eeeeec] px-1 text-[#300a24]">
              <span className="whitespace-pre">{modo === 'buscar' ? 'Search: ' : 'File Name to Write: '}</span>
              <input
                ref={prompt}
                value={modo === 'buscar' ? busqueda : nombre}
                onChange={(e) => (modo === 'buscar' ? setBusqueda(e.target.value) : setNombre(e.target.value))}
                className="term min-w-0 flex-1 bg-transparent text-[#300a24] outline-none"
                spellCheck={false}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    if (modo === 'buscar') buscar()
                    else escribir(modo === 'guardar-salir')
                  } else if ((e.ctrlKey && e.key.toLowerCase() === 'c') || e.key === 'Escape') {
                    e.preventDefault()
                    setEstado({ t: '[ Cancelled ]' })
                    setModo('editar')
                  }
                }}
              />
            </label>
          )}
          {modo === 'confirmar' && (
            <ConfirmarSalida
              onSi={() => {
                setNombre(rutaActual)
                setModo('guardar-salir')
              }}
              onNo={onSalir}
              onCancelar={() => {
                setEstado({ t: '[ Cancelled ]' })
                setModo('editar')
              }}
            />
          )}
        </div>
        {modo === 'confirmar' ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-x-2 px-1 pb-0.5">
            <span>
              <span className="bg-[#eeeeec] px-0.5 text-[#300a24]"> Y</span> Yes
            </span>
            <span />
            <span>
              <span className="bg-[#eeeeec] px-0.5 text-[#300a24]"> N</span> No
            </span>
            <span>
              <span className="bg-[#eeeeec] px-0.5 text-[#300a24]">^C</span> Cancel
            </span>
          </div>
        ) : modo === 'guardar' || modo === 'guardar-salir' ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-x-2 px-1 pb-0.5">
            <Atajo k="^G" t="Get Help" />
            <Atajo k="M-D" t="DOS Format" />
            <Atajo k="M-A" t="Append" />
            <Atajo k="M-B" t="Backup File" />
            <Atajo k="^C" t="Cancel" onClick={() => setModo('editar')} />
            <Atajo k="M-M" t="Mac Format" />
            <Atajo k="M-P" t="Prepend" />
            <Atajo k="^T" t="To Files" />
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(122px,1fr))] gap-x-2 px-1 pb-0.5">
            <Atajo k="^G" t="Get Help" onClick={() => accion('g')} />
            <Atajo k="^O" t="Write Out" onClick={() => accion('o')} />
            <Atajo k="^W" t="Where Is" onClick={() => accion('w')} />
            <Atajo k="^K" t="Cut Text" onClick={() => accion('k')} />
            <Atajo k="^J" t="Justify" onClick={() => accion('j')} />
            <Atajo k="^C" t="Cur Pos" onClick={() => accion('c')} />
            <Atajo k="^X" t="Exit" onClick={() => accion('x')} />
            <Atajo k="^R" t="Read File" onClick={() => accion('r')} />
            <Atajo k="^\" t="Replace" onClick={() => accion('\\')} />
            <Atajo k="^U" t="Uncut Text" onClick={() => accion('u')} />
            <Atajo k="^T" t="To Spell" onClick={() => accion('t')} />
            <Atajo k="^_" t="Go To Line" onClick={() => accion('_')} />
          </div>
        )}
      </div>
      {!escribible && modo === 'editar' && !estado?.error && (
        <div className="pointer-events-none absolute right-3 top-8 rounded bg-black/40 px-2 py-0.5 font-sans text-[10px] text-amber-200/80">sin permiso de escritura para este usuario</div>
      )}
    </div>
  )
}

function ConfirmarSalida({ onSi, onNo, onCancelar }: { onSi: () => void; onNo: () => void; onCancelar: () => void }) {
  const ref = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    ref.current?.focus()
  }, [])
  return (
    <button
      ref={ref}
      type="button"
      className="w-full bg-[#eeeeec] px-1 text-left text-[#300a24] outline-none"
      onKeyDown={(e) => {
        const k = e.key.toLowerCase()
        if (k === 'y' || k === 's') {
          e.preventDefault()
          onSi()
        } else if (k === 'n') {
          e.preventDefault()
          onNo()
        } else if ((e.ctrlKey && k === 'c') || k === 'escape') {
          e.preventDefault()
          onCancelar()
        }
      }}
    >
      Save modified buffer?  (Answering &quot;No&quot; will DISCARD changes.)
      <span className="ml-3 inline-flex gap-2 font-sans text-[11px]">
        <span onClick={onSi} className="cursor-pointer rounded bg-[#300a24] px-1.5 text-[#eeeeec]">
          Y
        </span>
        <span onClick={onNo} className="cursor-pointer rounded bg-[#300a24] px-1.5 text-[#eeeeec]">
          N
        </span>
      </span>
    </button>
  )
}
