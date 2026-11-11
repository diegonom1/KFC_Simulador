// Generador pseudoaleatorio con semilla (mulberry32) para que un examen sea reproducible.

export type Rng = () => number

export function crearRng(semilla: number): Rng {
  let a = semilla >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const entre = (rng: Rng, min: number, max: number) => min + Math.floor(rng() * (max - min + 1))

export function elegir<T>(rng: Rng, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)]
}

export function barajar<T>(rng: Rng, arr: readonly T[]): T[] {
  const copia = [...arr]
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[copia[i], copia[j]] = [copia[j], copia[i]]
  }
  return copia
}

export function nuevaSemilla(): number {
  return Math.floor(Math.random() * 2 ** 31)
}
