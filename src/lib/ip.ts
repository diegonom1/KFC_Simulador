// Utilidades de direccionamiento IPv4 (todo con enteros sin signo de 32 bits).

export function ipAEntero(ip: string): number | null {
  const partes = ip.trim().split('.')
  if (partes.length !== 4) return null
  let n = 0
  for (const p of partes) {
    if (!/^\d{1,3}$/.test(p)) return null
    const v = Number(p)
    if (v > 255) return null
    n = n * 256 + v
  }
  return n >>> 0
}

export function enteroAIp(n: number): string {
  return [24, 16, 8, 0].map((s) => (n >>> s) & 255).join('.')
}

export const esIpValida = (ip: string) => ipAEntero(ip) !== null

export function esMascaraValida(m: string): boolean {
  const n = ipAEntero(m)
  if (n === null) return false
  const inv = ~n >>> 0
  return ((inv + 1) & inv) >>> 0 === 0
}

export function prefijoDeMascara(m: string): number {
  const n = ipAEntero(m)
  if (n === null) return 0
  let bits = 0
  for (let i = 31; i >= 0; i--) {
    if ((n >>> i) & 1) bits++
    else break
  }
  return bits
}

export function mascaraDePrefijo(p: number): string {
  const n = p === 0 ? 0 : (0xffffffff << (32 - p)) >>> 0
  return enteroAIp(n)
}

export function direccionDeRed(ip: string, mascara: string): string | null {
  const a = ipAEntero(ip)
  const m = ipAEntero(mascara)
  if (a === null || m === null) return null
  return enteroAIp((a & m) >>> 0)
}

export function direccionBroadcast(ip: string, mascara: string): string | null {
  const a = ipAEntero(ip)
  const m = ipAEntero(mascara)
  if (a === null || m === null) return null
  return enteroAIp(((a & m) | (~m >>> 0)) >>> 0)
}

export function mismaRed(a: string, b: string, mascara: string): boolean {
  const x = ipAEntero(a)
  const y = ipAEntero(b)
  const m = ipAEntero(mascara)
  if (x === null || y === null || m === null) return false
  return ((x & m) >>> 0) === ((y & m) >>> 0)
}

/** true si la IP es de host (no es la dirección de red ni la de broadcast). */
export function esIpDeHost(ip: string, mascara: string): boolean {
  if (!esIpValida(ip) || !esMascaraValida(mascara)) return false
  return ip !== direccionDeRed(ip, mascara) && ip !== direccionBroadcast(ip, mascara)
}

/** Base de los tres primeros octetos: "10.112.219" */
export function base24(red: string): string {
  return red.split('.').slice(0, 3).join('.')
}

export function hostEn(red: string, host: number): string {
  return `${base24(red)}.${host}`
}

export function ultimoOcteto(ip: string): number {
  return Number(ip.split('.')[3] ?? 0)
}

export function esPrivada(ip: string): boolean {
  const n = ipAEntero(ip)
  if (n === null) return false
  const a = n >>> 24
  const b = (n >>> 16) & 255
  return a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a === 127 || (a === 169 && b === 254)
}

export function normalizarIp(txt: string): string {
  return txt
    .trim()
    .split('.')
    .map((p) => (p === '' ? p : String(Number(p))))
    .join('.')
}
