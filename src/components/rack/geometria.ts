// Coordenadas de cada puerto dentro del SVG del rack.
import { tieneTelmex, tieneTp } from '../../engine/escenario'
import type { Escenario, PuertoId } from '../../engine/tipos'

export const RW = 1200
export const RH = 900

export const MODEM = { w: 250, h: 118, y: 22 }
export const PP = { y: 200, h: 74 }
export const FG = { y: 296, h: 78, x0: 90, x1: 560 }
export const PL = { x0: 640, x1: 1110 }
export const SW = { y: 398, h: 124 }
export const OLD = { y: 560, h: 86 }
export const LAP = { x: 860, y: 712 }
export const PORT = { w: 28, h: 22 }

export interface PosPuerto {
  x: number
  y: number
  grupo: 'sw' | 'old' | 'pl' | 'fg' | 'modem' | 'pp' | 'lap'
}

export function modemsVisibles(esc: Escenario): Array<'tp' | 'tx' | 'ex1' | 'ex2'> {
  const r: Array<'tp' | 'tx' | 'ex1' | 'ex2'> = []
  if (tieneTp(esc)) r.push('tp')
  if (tieneTelmex(esc)) r.push('tx')
  r.push(...esc.modemsExtra)
  return r
}

export const xModem = (i: number) => 40 + i * 285

export function colSw(c: number) {
  return 120 + c * 40 + Math.floor(c / 6) * 12
}

export function posicionesPuertos(esc: Escenario): Record<PuertoId, PosPuerto> {
  const p: Record<PuertoId, PosPuerto> = {}
  modemsVisibles(esc).forEach((m, i) => {
    const mx = xModem(i)
    for (let k = 1; k <= 4; k++) p[`${m}:lan${k}`] = { x: mx + 24 + (k - 1) * 44 + PORT.w / 2, y: MODEM.y + 78 + PORT.h / 2, grupo: 'modem' }
  })
  for (let n = 1; n <= 24; n++) p[`pp:${n}`] = { x: 118 + (n - 1) * 41 + 13, y: PP.y + 30 + 10, grupo: 'pp' }
  const fgPuertos: Array<[string, number]> = [
    ['wan', 290],
    ['a', 340],
    ['1', 390],
    ['2', 440],
    ['3', 490],
  ]
  for (const [id, x] of fgPuertos) p[`fg:${id}`] = { x: x + 15, y: FG.y + 38 + 12, grupo: 'fg' }
  for (let n = 1; n <= 8; n++) p[`pl:${n}`] = { x: 700 + (n - 1) * 48 + PORT.w / 2, y: FG.y + 38 + PORT.h / 2, grupo: 'pl' }
  for (let n = 1; n <= 48; n++) {
    const c = Math.floor((n - 1) / 2)
    const fila = n % 2 === 1 ? 0 : 1
    p[`sw:${n}`] = { x: colSw(c) + PORT.w / 2, y: SW.y + 36 + fila * 36 + PORT.h / 2, grupo: 'sw' }
  }
  for (let n = 1; n <= 24; n++) p[`old:${n}`] = { x: colSw(n - 1) + PORT.w / 2, y: OLD.y + 40 + PORT.h / 2, grupo: 'old' }
  p.lap = { x: LAP.x + 14, y: LAP.y + 120, grupo: 'lap' }
  return p
}

export function esDestinoValido(id: PuertoId): boolean {
  return !id.startsWith('pp:') && id !== 'lap'
}
