export function cx(...clases: Array<string | false | null | undefined>): string {
  return clases.filter(Boolean).join(' ')
}

export function formatoTiempo(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const ss = s % 60
  const mm = String(m).padStart(2, '0')
  const sss = String(ss).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${sss}` : `${mm}:${sss}`
}

export function fechaHora(t: number): string {
  try {
    return new Date(t).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })
  } catch {
    return new Date(t).toISOString()
  }
}

export function hora(t: number): string {
  try {
    return new Date(t).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  } catch {
    return new Date(t).toISOString().slice(11, 19)
  }
}

/** Reemplaza {clave} por vars[clave]. */
export function plantilla(texto: string, vars: Record<string, string | number>): string {
  return texto.replace(/\{([\w.]+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m))
}

export const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms))

export function aleatorio(min: number, max: number): number {
  return min + Math.random() * (max - min)
}
