// Definición de cables (patch cords) del rack y el dominio de red de cada puerto.
import { carriers, equiposRed, equiposVlan40, hojaEtiquetado, pantallasMenu, pcRedCocina, proveedores, vlanDePuerto } from '../data/sucursal'
import type { EquipoId, Escenario, PuertoId, Vlan40Id } from './tipos'

export type GrupoCable = 'interna' | 'cocina' | 'eth1' | 'wan' | 'fortilink' | 'laptop' | 'extra' | 'proveedor' | 'pantallas'

export interface CableDef {
  id: string
  /** Extremo fijo del cable (no se mueve). */
  desde: PuertoId
  grupo: GrupoCable
  nombre: string
  corto: string
  color: string
  equipo?: EquipoId | Vlan40Id
  /** Puerto del switch que indica la hoja de etiquetado (si aplica). */
  puertoHoja?: number
}

export const COLORES: Record<GrupoCable, string> = {
  interna: '#38bdf8',
  cocina: '#fb923c',
  eth1: '#f97316',
  wan: '#facc15',
  fortilink: '#4ade80',
  laptop: '#f8fafc',
  extra: '#f472b6',
  proveedor: '#9ca3af',
  pantallas: '#c084fc',
}

export function cablesDe(esc: Escenario): CableDef[] {
  const lista: CableDef[] = []
  const ids: EquipoId[] = ['pc', 'hd', 'lms', 'bio', 'tel', 'hme', 'imp', 'digi']
  for (const id of ids) {
    const e = equiposRed[id]
    lista.push({ id: `pp${e.pp}`, desde: `pp:${e.pp}`, grupo: 'interna', nombre: e.corto, corto: e.corto, color: COLORES.interna, equipo: id, puertoHoja: e.puerto })
  }
  lista.push({
    id: `pp${pcRedCocina.pp}`,
    desde: `pp:${pcRedCocina.pp}`,
    grupo: 'eth1',
    nombre: 'PC Gerencial · eth1 (cocina)',
    corto: 'PC eth1',
    color: COLORES.eth1,
    puertoHoja: pcRedCocina.puerto,
  })
  for (const v of equiposVlan40) {
    lista.push({ id: `pp${v.pp}`, desde: `pp:${v.pp}`, grupo: 'cocina', nombre: v.nombre, corto: v.nombre, color: COLORES.cocina, equipo: v.id, puertoHoja: v.puerto })
  }
  lista.push({ id: `pp${pantallasMenu.pp}`, desde: `pp:${pantallasMenu.pp}`, grupo: 'pantallas', nombre: pantallasMenu.nombre, corto: pantallasMenu.corto, color: COLORES.pantallas })
  for (const p of proveedores) {
    lista.push({ id: `pp${p.pp}`, desde: `pp:${p.pp}`, grupo: 'proveedor', nombre: p.nombre, corto: p.corto, color: COLORES.proveedor })
  }
  if (esc.carriers !== 'solo-telmex') {
    lista.push({ id: 'tp', desde: 'tp:lan1', grupo: 'wan', nombre: `Enlace ${carriers.totalplay.nombre}`, corto: 'TP', color: COLORES.wan })
  }
  if (esc.carriers !== 'solo-tp') {
    lista.push({ id: 'tx', desde: 'tx:lan1', grupo: 'wan', nombre: `Enlace ${carriers.telmex.nombre}`, corto: 'Telmex', color: COLORES.wan })
  }
  lista.push({ id: 'fga', desde: 'fg:a', grupo: 'fortilink', nombre: 'FortiGate PORT-A (FortiLink)', corto: 'PORT-A', color: COLORES.fortilink })
  for (const ex of esc.modemsExtra) {
    lista.push({ id: ex, desde: `${ex}:lan1`, grupo: 'extra', nombre: `Módem adicional ${ex === 'ex1' ? '1' : '2'}`, corto: 'Extra', color: COLORES.extra })
  }
  lista.push({ id: 'lap', desde: 'lap', grupo: 'laptop', nombre: 'Laptop del técnico', corto: 'Laptop', color: COLORES.laptop })
  return lista
}

export function cablesIniciales(esc: Escenario): Record<string, PuertoId | null> {
  const r: Record<string, PuertoId | null> = {}
  for (const c of cablesDe(esc)) {
    if (c.desde.startsWith('pp:')) {
      const n = Number(c.desde.slice(3))
      r[c.id] = n === pcRedCocina.pp ? null : `old:${n}`
    } else if (c.id === 'ex1') r[c.id] = 'old:24'
    else if (c.id === 'ex2') r[c.id] = 'old:23'
    else r[c.id] = null
  }
  return r
}

/** Puerto del patch panel → id del cable. */
export const cableDeEquipo = (id: EquipoId) => `pp${equiposRed[id].pp}`
export const cableEth1 = `pp${pcRedCocina.pp}`
export const cableDeVlan40 = (id: Vlan40Id) => `pp${equiposVlan40.find((v) => v.id === id)!.pp}`

/**
 * Dominio de capa 2 al que queda conectado algo enchufado en ese puerto.
 * null = sin enlace (sin cable, puerto dañado o puerto sin servicio).
 */
export function dominioDePuerto(esc: Escenario, p: PuertoId | null | undefined): string | null {
  if (!p) return null
  const [eq, num] = p.split(':')
  switch (eq) {
    case 'old':
      return 'old'
    case 'sw': {
      const n = Number(num)
      if (n === esc.puertoDanado) return null
      if (n === hojaEtiquetado.fortilink) return 'fortilink'
      const v = vlanDePuerto(n)
      return v ? `vlan${v}` : null
    }
    case 'pl':
      return 'plano'
    case 'tp':
    case 'tx':
    case 'ex1':
    case 'ex2':
      return `modem:${eq}`
    case 'fg':
      return `fg:${num}`
    default:
      return null
  }
}

export function puertoOcupado(cables: Record<string, PuertoId | null>, defs: CableDef[], puerto: PuertoId, excepto?: string): boolean {
  if (defs.some((d) => d.desde === puerto)) return true
  return Object.entries(cables).some(([id, dest]) => id !== excepto && dest === puerto)
}

export function nombrePuerto(p: PuertoId | null | undefined): string {
  if (!p) return 'desconectado'
  const [eq, n] = p.split(':')
  switch (eq) {
    case 'sw':
      return `Switch nuevo · puerto ${n}`
    case 'old':
      return `Switch anterior · puerto ${n}`
    case 'pl':
      return `SW Plano · puerto ${n}`
    case 'fg':
      return `FortiGate · ${n === 'wan' ? 'WAN' : n === 'a' ? 'PORT-A' : `PORT${n}`}`
    case 'tp':
      return `ONT Totalplay · ${n.toUpperCase()}`
    case 'tx':
      return `Módem Telmex · ${n.toUpperCase()}`
    case 'ex1':
      return `Módem adicional 1 · ${n.toUpperCase()}`
    case 'ex2':
      return `Módem adicional 2 · ${n.toUpperCase()}`
    case 'pp':
      return `Patch panel · ${n}`
    default:
      return p
  }
}
