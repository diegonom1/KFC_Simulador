// Parser y validador de /etc/network/interfaces (formato ifupdown de Debian/Ubuntu).
import { direccionBroadcast, direccionDeRed, esIpValida, esMascaraValida, mascaraDePrefijo } from '../../lib/ip'
import type { NetCfg, RedLinux } from '../tipos'

export interface Stanza {
  nombre: string
  familia: string
  metodo: string
  opciones: Record<string, string>
  linea: number
}

export interface Interfaces {
  autos: string[]
  ifaces: Record<string, Stanza>
  errores: string[]
}

const OPCIONES_VALIDAS = new Set([
  'address',
  'netmask',
  'network',
  'broadcast',
  'gateway',
  'dns-nameservers',
  'dns-search',
  'mtu',
  'hwaddress',
  'metric',
  'pre-up',
  'up',
  'post-up',
  'down',
  'pre-down',
  'post-down',
])

export function parsearInterfaces(texto: string): Interfaces {
  const res: Interfaces = { autos: [], ifaces: {}, errores: [] }
  let actual: Stanza | null = null
  texto.split('\n').forEach((crudo, i) => {
    const linea = crudo.trim()
    if (!linea || linea.startsWith('#')) return
    const tokens = linea.split(/\s+/)
    const clave = tokens[0]
    if (clave === 'auto' || clave === 'allow-hotplug') {
      res.autos.push(...tokens.slice(1))
      actual = null
      return
    }
    if (clave === 'source' || clave === 'source-directory') {
      actual = null
      return
    }
    if (clave === 'iface') {
      const [, nombre, familia, metodo] = tokens
      if (!nombre || !familia || !metodo) {
        res.errores.push(`línea ${i + 1}: "iface" incompleto (se espera: iface <nombre> inet <método>)`)
        actual = null
        return
      }
      if (familia !== 'inet' && familia !== 'inet6') res.errores.push(`línea ${i + 1}: familia desconocida "${familia}"`)
      if (!['static', 'dhcp', 'loopback', 'manual'].includes(metodo)) res.errores.push(`línea ${i + 1}: método desconocido "${metodo}"`)
      if (res.ifaces[nombre]) res.errores.push(`línea ${i + 1}: "${nombre}" está definida dos veces`)
      actual = { nombre, familia, metodo, opciones: {}, linea: i + 1 }
      res.ifaces[nombre] = actual
      return
    }
    if (actual) {
      if (!OPCIONES_VALIDAS.has(clave)) res.errores.push(`línea ${i + 1}: opción desconocida "${clave}" en ${(actual as Stanza).nombre}`)
      ;(actual as Stanza).opciones[clave] = tokens.slice(1).join(' ')
      return
    }
    res.errores.push(`línea ${i + 1}: palabra desconocida "${clave}" fuera de un bloque iface`)
  })
  return res
}

/** Devuelve ip y máscara de una stanza (acepta address con /prefijo). */
export function ipDeStanza(st: Stanza | undefined): { ip: string; mascara: string } | null {
  if (!st) return null
  const addr = st.opciones.address
  if (!addr) return null
  let [ip, pref] = addr.split('/')
  ip = ip.trim()
  let mascara = st.opciones.netmask?.trim() ?? ''
  if (pref && !mascara) mascara = mascaraDePrefijo(Number(pref))
  if (!esIpValida(ip) || !esMascaraValida(mascara)) return null
  return { ip, mascara }
}

export interface ValidacionEth0 {
  ok: boolean
  problemas: string[]
}

export function validarEth0(inter: Interfaces, esperado: NetCfg): ValidacionEth0 {
  const problemas: string[] = []
  const st = inter.ifaces.eth0
  if (!st) return { ok: false, problemas: ['No existe el bloque "iface eth0 inet static".'] }
  if (!inter.autos.includes('eth0')) problemas.push('Falta la línea "auto eth0".')
  if (st.metodo !== 'static') problemas.push(`eth0 debe ser "static" (está como "${st.metodo}").`)
  const o = st.opciones
  const red = direccionDeRed(esperado.ip, esperado.mascara)
  const bc = direccionBroadcast(esperado.ip, esperado.mascara)
  const addr = (o.address ?? '').split('/')[0].trim()
  if (addr !== esperado.ip) problemas.push(`address es "${addr || '(vacío)'}" y la tabla dice ${esperado.ip}.`)
  if ((o.netmask ?? '').trim() !== esperado.mascara) problemas.push(`netmask es "${o.netmask ?? '(vacío)'}" y debe ser ${esperado.mascara}.`)
  if ((o.network ?? '').trim() !== red) problemas.push(`network es "${o.network ?? '(vacío)'}" y con esa máscara debe ser ${red}.`)
  if ((o.broadcast ?? '').trim() !== bc) problemas.push(`broadcast es "${o.broadcast ?? '(vacío)'}" y con esa máscara debe ser ${bc}.`)
  if ((o.gateway ?? '').trim() !== esperado.gateway) problemas.push(`gateway es "${o.gateway ?? '(vacío)'}" y debe ser ${esperado.gateway}.`)
  return { ok: problemas.length === 0 && inter.errores.length === 0, problemas: [...inter.errores, ...problemas] }
}

export type EstadoCocina = 'alias-intacto' | 'eth1-correcto' | 'alias-modificado' | 'eth1-incorrecto' | 'ambos' | 'ausente'

export function estadoCocina(inter: Interfaces, original: { ip: string; mascara: string }): EstadoCocina {
  const alias = inter.ifaces['eth0:1']
  const eth1 = inter.ifaces.eth1
  const igual = (st: Stanza | undefined) => {
    const v = ipDeStanza(st)
    return !!v && v.ip === original.ip && v.mascara === original.mascara && st!.metodo === 'static'
  }
  if (alias && eth1) return 'ambos'
  if (alias) return igual(alias) && inter.autos.includes('eth0:1') ? 'alias-intacto' : 'alias-modificado'
  if (eth1) return igual(eth1) && inter.autos.includes('eth1') ? 'eth1-correcto' : 'eth1-incorrecto'
  return 'ausente'
}

export interface LogArranque {
  t: string
  estado: 'ok' | 'fail' | 'info' | 'warn'
}

/** Aplica el archivo al arrancar: devuelve la configuración que queda corriendo y el log de arranque. */
export function aplicarArranque(texto: string, hayEth1: boolean): { red: RedLinux; log: LogArranque[] } {
  const inter = parsearInterfaces(texto)
  const fallos: string[] = [...inter.errores]
  const red: RedLinux = { eth0: null, alias: null, eth1: null, fallos }
  const st0 = inter.ifaces.eth0
  const v0 = ipDeStanza(st0)
  if (st0 && inter.autos.includes('eth0') && st0.metodo === 'static' && v0) {
    const gw = (st0.opciones.gateway ?? '').trim()
    red.eth0 = { ip: v0.ip, mascara: v0.mascara, gateway: esIpValida(gw) ? gw : '' }
    if (gw && !esIpValida(gw)) fallos.push(`gateway inválido "${gw}"`)
  } else if (st0) {
    fallos.push('eth0: no se pudo levantar (revisa address/netmask)')
  } else {
    fallos.push('eth0: no hay configuración')
  }
  const sta = inter.ifaces['eth0:1']
  const va = ipDeStanza(sta)
  if (sta && va && inter.autos.includes('eth0:1') && red.eth0) red.alias = va
  const st1 = inter.ifaces.eth1
  const v1 = ipDeStanza(st1)
  if (st1 && inter.autos.includes('eth1')) {
    if (!hayEth1) fallos.push('Cannot find device "eth1"')
    else if (v1) red.eth1 = v1
    else fallos.push('eth1: no se pudo levantar (revisa address/netmask)')
  }
  const falloRed = !red.eth0 || fallos.length > 0
  const log: LogArranque[] = [
    { t: 'Started Journal Service.', estado: 'ok' },
    { t: 'Mounted /boot/efi.', estado: 'ok' },
    { t: 'Reached target Local File Systems.', estado: 'ok' },
    { t: 'Started Load Kernel Modules.', estado: 'ok' },
    { t: 'Started udev Kernel Device Manager.', estado: 'ok' },
    ...(hayEth1 ? [{ t: 'Found device eth1 (Realtek RTL8111/8168 PCI Express Gigabit Ethernet).', estado: 'ok' as const }] : []),
    falloRed
      ? { t: 'Failed to start Raise network interfaces.', estado: 'fail' as const }
      : { t: 'Started Raise network interfaces.', estado: 'ok' as const },
    ...fallos.map((f) => ({ t: `networking: ${f}`, estado: 'warn' as const })),
    { t: 'Reached target Network.', estado: 'ok' },
    { t: 'Started OpenBSD Secure Shell server.', estado: 'ok' },
    { t: 'Started PH Fingerprint sync service.', estado: 'ok' },
    { t: 'Started PH Drive-Thru timer service.', estado: 'ok' },
    { t: 'Reached target Graphical Interface.', estado: 'ok' },
  ]
  return { red, log }
}

const CABECERA = `# This file describes the network interfaces available on your system
# and how to activate them. For more information, see interfaces(5).

source /etc/network/interfaces.d/*

# The loopback network interface
auto lo
iface lo inet loopback
`

export function generarInterfaces(eth0: NetCfg, cocina?: { ip: string; mascara: string }): string {
  const red = direccionDeRed(eth0.ip, eth0.mascara)
  const bc = direccionBroadcast(eth0.ip, eth0.mascara)
  let t = `${CABECERA}
# The primary network interface
auto eth0
iface eth0 inet static
\taddress ${eth0.ip}
\tnetmask ${eth0.mascara}
\tnetwork ${red}
\tbroadcast ${bc}
\tgateway ${eth0.gateway}
`
  if (cocina) {
    t += `
# Red de cocina / KDS
auto eth0:1
iface eth0:1 inet static
\taddress ${cocina.ip}
\tnetmask ${cocina.mascara}
`
  }
  return t
}
