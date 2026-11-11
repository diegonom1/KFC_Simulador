import { CircleHelp } from 'lucide-react'
import { useEffect, useState } from 'react'
import { obtenerPregunta } from '../../data/preguntas'
import { useSim } from '../../engine/SimProvider'
import { sfx } from '../../lib/sonido'
import { cx } from '../../lib/util'
import { Boton, Modal } from '../ui/base'

export function PreguntaModal() {
  const { s, dispatch } = useSim()
  const id = s.quiz.pendientes[0]
  const p = id ? obtenerPregunta(id, s.esc) : null
  const [sel, setSel] = useState<number | null>(null)
  useEffect(() => {
    setSel(null)
    if (id) sfx.aviso()
  }, [id])
  const n = id ? s.quiz.preguntadas.indexOf(id) + 1 : 0
  return (
    <Modal abierto={!!p} sinCerrar titulo={`Pregunta teórica ${n} de ${s.esc.preguntas.length}`} icono={<CircleHelp className="text-amber-300" size={22} />}>
      {p && (
        <div>
          <p className="mb-4 text-[15px] leading-relaxed">{p.texto}</p>
          <div className="space-y-2">
            {p.opciones.map((o, i) => (
              <button
                key={i}
                onClick={() => setSel(i)}
                className={cx(
                  'flex w-full items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left text-sm transition',
                  sel === i ? 'border-cyan-400 bg-cyan-400/10 text-white' : 'border-borde-2 bg-black/20 hover:border-cyan-400/40',
                )}
              >
                <span className={cx('grid size-6 shrink-0 place-items-center rounded-full text-xs font-bold', sel === i ? 'bg-cyan-400 text-slate-950' : 'bg-white/5 text-tenue')}>{String.fromCharCode(65 + i)}</span>
                <span className={o.match(/^[\d.]+$|^0\d+r$/) ? 'font-mono' : undefined}>{o}</span>
              </button>
            ))}
          </div>
          <div className="mt-5 flex items-center justify-between gap-3">
            <p className="text-[12px] text-tenue">El cronómetro sigue corriendo.</p>
            <Boton
              variante="primario"
              disabled={sel === null}
              onClick={() => {
                if (sel === null || !id) return
                dispatch({ tipo: 'QUIZ', id, opcion: sel })
                sfx.click()
              }}
            >
              Responder
            </Boton>
          </div>
        </div>
      )}
    </Modal>
  )
}
