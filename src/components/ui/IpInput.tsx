import { useEffect, useRef, useState } from 'react'
import { cx } from '../../lib/util'

/** Campo de IP con cuatro octetos (estilo ventana de propiedades de red). */
export function IpInput({
  valor,
  onCambio,
  deshabilitado,
  claro,
  id,
  autoFoco,
}: {
  valor: string
  onCambio: (v: string) => void
  deshabilitado?: boolean
  claro?: boolean
  id?: string
  autoFoco?: boolean
}) {
  const partes = (valor || '').split('.')
  const [oct, setOct] = useState<string[]>([0, 1, 2, 3].map((i) => partes[i] ?? ''))
  const refs = useRef<Array<HTMLInputElement | null>>([])

  useEffect(() => {
    const p = (valor || '').split('.')
    const actual = oct.join('.')
    if (valor !== actual && !(valor === '' && actual === '...')) setOct([0, 1, 2, 3].map((i) => p[i] ?? ''))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valor])

  useEffect(() => {
    if (autoFoco) refs.current[0]?.focus()
  }, [autoFoco])

  const emitir = (n: string[]) => {
    setOct(n)
    onCambio(n.every((x) => x === '') ? '' : n.join('.'))
  }

  return (
    <div
      id={id}
      className={cx(
        'flex h-8 w-44 items-center rounded border px-1 font-mono text-sm',
        claro ? 'border-slate-400 bg-white text-slate-900' : 'border-borde-2 bg-black/40 text-tinta',
        deshabilitado && 'opacity-50',
      )}
    >
      {oct.map((o, i) => (
        <div key={i} className="flex items-center">
          <input
            ref={(el) => {
              refs.current[i] = el
            }}
            disabled={deshabilitado}
            inputMode="numeric"
            value={o}
            maxLength={3}
            aria-label={`Octeto ${i + 1}`}
            className="w-9 bg-transparent text-center outline-none"
            onChange={(e) => {
              const limpio = e.target.value.replace(/\D/g, '').slice(0, 3)
              const n = [...oct]
              n[i] = limpio
              emitir(n)
              if (limpio.length === 3 && i < 3) refs.current[i + 1]?.focus()
            }}
            onKeyDown={(e) => {
              if (e.key === '.' || e.key === ' ') {
                e.preventDefault()
                // Como en Windows: el punto en un octeto vacío (recién saltado) se ignora.
                if (i < 3 && o !== '') {
                  refs.current[i + 1]?.focus()
                  refs.current[i + 1]?.select()
                }
              } else if (e.key === 'Backspace' && !o && i > 0) {
                refs.current[i - 1]?.focus()
              } else if (e.key === 'ArrowRight' && i < 3 && (e.currentTarget.selectionStart ?? 0) >= o.length) {
                refs.current[i + 1]?.focus()
              } else if (e.key === 'ArrowLeft' && i > 0 && (e.currentTarget.selectionStart ?? 0) === 0) {
                refs.current[i - 1]?.focus()
              }
            }}
            onPaste={(e) => {
              const t = e.clipboardData.getData('text').trim()
              if (/^\d{1,3}(\.\d{1,3}){3}$/.test(t)) {
                e.preventDefault()
                emitir(t.split('.'))
              }
            }}
          />
          {i < 3 && <span className={claro ? 'text-slate-500' : 'text-tenue'}>.</span>}
        </div>
      ))}
    </div>
  )
}
