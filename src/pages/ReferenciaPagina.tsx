import { ArrowLeft, BookOpen } from 'lucide-react'
import { ContenidoReferencia } from '../components/Referencia'
import { Boton } from '../components/ui/base'
import { irA } from '../lib/ruta'

export function ReferenciaPagina() {
  return (
    <div className="fondo-app min-h-dvh">
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
        <div className="mb-5 flex items-center gap-3">
          <Boton tam="sm" variante="fantasma" icono={<ArrowLeft size={15} />} onClick={() => irA('inicio')}>
            Inicio
          </Boton>
        </div>
        <div className="mb-5 flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-xl bg-violet-400/15 text-violet-300 ring-1 ring-violet-400/30">
            <BookOpen size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Referencia rápida</h1>
            <p className="text-sm text-tenue">Credenciales de ejemplo, comandos, reglas de cableado y el orden de los pasos.</p>
          </div>
        </div>
        <ContenidoReferencia />
      </div>
    </div>
  )
}
