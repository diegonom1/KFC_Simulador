// Archivos KEY=VALUE de /ph (fingerprint.conf y timer.conf).
import { credenciales } from '../../data/sucursal'

export function parsearConf(texto: string): Record<string, string> {
  const r: Record<string, string> = {}
  for (const crudo of texto.split('\n')) {
    const l = crudo.trim()
    if (!l || l.startsWith('#') || l.startsWith('[')) continue
    const i = l.indexOf('=')
    if (i < 0) continue
    r[l.slice(0, i).trim().toUpperCase()] = l.slice(i + 1).trim()
  }
  return r
}

export interface ValidacionConf {
  ipOk: boolean
  ip: string
  credencialesCambiadas: boolean
  otrosCambios: string[]
}

export function validarConf(texto: string, original: string, ipEsperada: string): ValidacionConf {
  const a = parsearConf(texto)
  const o = parsearConf(original)
  const credencialesCambiadas = a.USER !== o.USER || a.PASS !== o.PASS
  const otrosCambios = Object.keys({ ...o, ...a }).filter((k) => k !== 'IP' && k !== 'USER' && k !== 'PASS' && a[k] !== o[k])
  return { ipOk: a.IP === ipEsperada, ip: a.IP ?? '', credencialesCambiadas, otrosCambios }
}

export function confFingerprint(ip: string): string {
  return `# Configuracion del lector biometrico (checador)
# Solo modificar IP= cuando cambie el direccionamiento de la tienda.
[fingerprint]
IP=${ip}
PORT=4370
USER=${credenciales.biometrico.usuario}
PASS=${credenciales.biometrico.password}
SYNC_MIN=5
`
}

export function confTimer(ip: string, ceco: string): string {
  return `# Configuracion del temporizador Drive-Thru (HME)
# Solo modificar IP= cuando cambie el direccionamiento de la tienda.
[timer]
IP=${ip}
PORT=80
USER=${credenciales.hme.usuario}
PASS=${credenciales.hme.password}
STORE=${ceco}
`
}
