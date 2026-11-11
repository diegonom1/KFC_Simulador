// Calificación del modo examen.
import { obtenerPregunta, type Pregunta } from '../data/preguntas'
import { fases } from '../data/sucursal'
import { textoPaso } from './escenario'
import { objetivosAplicables, objetivoPorId } from './objetivos'
import type { RegistroError, SimState } from './tipos'

export interface ItemObjetivo {
  id: string
  titulo: string
  fase: number
  faseTitulo: string
  t?: number
  fueraDeOrden?: boolean
  faltaban?: string[]
}

export interface Calificacion {
  total: number
  procedimiento: number
  orden: number
  teoria: number
  penalizacion: number
  logrados: ItemObjetivo[]
  faltantes: ItemObjetivo[]
  fueraDeOrden: ItemObjetivo[]
  errores: RegistroError[]
  preguntas: Array<{ pregunta: Pregunta; elegida: number | null; ok: boolean }>
  duracion: number
  nivel: 'excelente' | 'muybien' | 'aprobado' | 'reprobado'
  veredicto: string
}

export const PUNTOS = { procedimiento: 65, orden: 10, teoria: 25, maxPenalizacion: 30, grave: 2, leve: 1 }

export function calificar(s: SimState): Calificacion {
  const aplicables = objetivosAplicables(s.esc)
  const item = (id: string): ItemObjetivo => {
    const o = objetivoPorId[id]
    const c = s.completados[id]
    return {
      id,
      titulo: textoPaso(s.esc, id).titulo,
      fase: o.fase,
      faseTitulo: fases[o.fase - 1]?.titulo ?? '',
      t: c?.t,
      fueraDeOrden: c?.fueraDeOrden,
      faltaban: c?.faltaban.map((f) => textoPaso(s.esc, f).titulo),
    }
  }
  const logrados = aplicables.filter((o) => s.completados[o.id]).map((o) => item(o.id)).sort((a, b) => (a.t ?? 0) - (b.t ?? 0))
  const faltantes = aplicables.filter((o) => !s.completados[o.id]).map((o) => item(o.id))
  const fueraDeOrden = logrados.filter((l) => l.fueraDeOrden)

  const ids = s.esc.preguntas
  const preguntas = ids
    .map((id) => {
      const p = obtenerPregunta(id, s.esc)
      if (!p) return null
      const r = s.quiz.respuestas[id]
      return { pregunta: p, elegida: r ? r.opcion : null, ok: !!r?.correcta }
    })
    .filter((x): x is NonNullable<typeof x> => !!x)

  const procedimiento = aplicables.length ? (PUNTOS.procedimiento * logrados.length) / aplicables.length : 0
  const orden = logrados.length ? PUNTOS.orden * (1 - fueraDeOrden.length / logrados.length) : 0
  const teoria = preguntas.length ? (PUNTOS.teoria * preguntas.filter((p) => p.ok).length) / preguntas.length : 0
  const penalizacion = Math.min(
    PUNTOS.maxPenalizacion,
    s.errores.reduce((acc, e) => acc + (e.leve ? PUNTOS.leve : PUNTOS.grave), 0),
  )
  const total = Math.max(0, Math.min(100, Math.round(procedimiento + orden + teoria - penalizacion)))
  const nivel = total >= 90 ? 'excelente' : total >= 80 ? 'muybien' : total >= 70 ? 'aprobado' : 'reprobado'
  const veredicto = {
    excelente: 'Excelente: estás listo para ir a campo.',
    muybien: 'Muy bien: repasa los detalles marcados y quedas listo.',
    aprobado: 'Aprobado con observaciones: practica otra vez las fases que fallaste.',
    reprobado: 'No aprobado: vuelve a recorrer el procedimiento en modo guiado.',
  }[nivel]
  return {
    total,
    procedimiento: Math.round(procedimiento * 10) / 10,
    orden: Math.round(orden * 10) / 10,
    teoria: Math.round(teoria * 10) / 10,
    penalizacion,
    logrados,
    faltantes,
    fueraDeOrden,
    errores: s.errores,
    preguntas,
    duracion: (s.fin ?? Date.now()) - s.inicio,
    nivel,
    veredicto,
  }
}

export interface ResumenHistorial {
  t: number
  total: number
  nivel: Calificacion['nivel']
  ceco: string
  nombre: string
  duracion: number
  errores: number
}
