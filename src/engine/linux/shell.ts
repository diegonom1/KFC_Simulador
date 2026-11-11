// Intérprete de comandos de la terminal simulada. Las salidas imitan Ubuntu 18.04 (locale en inglés).
import { credenciales, equiposRed } from '../../data/sucursal'
import { direccionBroadcast, direccionDeRed, esIpValida, prefijoDeMascara } from '../../lib/ip'
import { cableDeEquipo, cableEth1 } from '../cables'
import { hayEth1, resolver } from '../red'
import type { HostLinux, SimState } from '../tipos'
import { directorios, dueñoDe, esBinario, listar, nombreBase, normalizarRuta, padre, puedeEscribir, puedeLeer } from './vfs'

export type Clase = 'dir' | 'exe' | 'err' | 'dim' | 'user' | 'path' | 'bold' | 'ok' | 'warn' | 'root' | 'hl'
export interface Seg {
  t: string
  c?: Clase
}
export type Linea = string | Seg[]

export interface Sesion {
  host: HostLinux
  usuarios: Array<{ nombre: string; cwd: string }>
  historial: string[]
  sudoHasta: number
}

export type Efecto =
  | { tipo: 'salida'; lineas: Linea[] }
  | { tipo: 'password'; prompt: string; verificar: (p: string) => boolean; exito: () => Efecto; fallo: () => Efecto; previo?: Linea[] }
  | { tipo: 'nano'; ruta: string; contenido: string; escribible: boolean; nuevo: boolean; aviso?: string; usuario: string }
  | { tipo: 'ping'; destino: string; ip: string; conteo: number | null }
  | { tipo: 'reiniciar'; lineas: Linea[] }
  | { tipo: 'apagar'; lineas: Linea[] }
  | { tipo: 'archivos'; cambios: Array<{ ruta: string; contenido: string | null }>; lineas: Linea[] }
  | { tipo: 'limpiar' }
  | { tipo: 'cerrar' }
  | { tipo: 'nada' }

const SESION_USUARIO = credenciales.pcGerencial.usuarioSesion

export function nuevaSesion(host: HostLinux): Sesion {
  return { host, usuarios: [{ nombre: SESION_USUARIO, cwd: `/home/${SESION_USUARIO}` }], historial: [], sudoHasta: 0 }
}

export const usuarioActual = (se: Sesion) => se.usuarios[se.usuarios.length - 1]
export const homeDe = (u: string) => (u === 'root' ? '/root' : `/home/${u}`)
export const hostnameDe = (h: HostLinux) => equiposRed[h].hostname ?? h

export function promptDe(se: Sesion): Seg[] {
  const u = usuarioActual(se)
  const h = homeDe(u.nombre)
  const cwd = u.cwd === h ? '~' : u.cwd.startsWith(h + '/') ? '~' + u.cwd.slice(h.length) : u.cwd
  const root = u.nombre === 'root'
  return [{ t: `${u.nombre}@${hostnameDe(se.host)}`, c: root ? 'root' : 'user' }, { t: ':' }, { t: cwd, c: 'path' }, { t: root ? '# ' : '$ ' }]
}

export function passwordDe(s: SimState, host: HostLinux, usuario: string): string | null {
  if (usuario === 'root') return null
  if (usuario === 'sysadmin') return host === 'pc' ? credenciales.pcGerencial.sysadmin : host === 'hd' ? credenciales.homeDelivery.sysadmin : credenciales.lms.sysadmin
  if (usuario === SESION_USUARIO) return host === 'pc' ? s.esc.passwordPc : host === 'hd' ? credenciales.homeDelivery.sesion : credenciales.lms.sesion
  return null
}

const out = (...lineas: Linea[]): Efecto => ({ tipo: 'salida', lineas })
const NADA: Efecto = { tipo: 'nada' }

export const COMANDOS = [
  'cat',
  'cd',
  'clear',
  'cp',
  'date',
  'echo',
  'exit',
  'grep',
  'help',
  'history',
  'hostname',
  'id',
  'ip',
  'logout',
  'ls',
  'man',
  'mv',
  'nano',
  'ping',
  'poweroff',
  'pwd',
  'reboot',
  'rm',
  'shutdown',
  'su',
  'sudo',
  'systemctl',
  'touch',
  'uname',
  'whoami',
]

function tokenizar(linea: string): string[] {
  const r: string[] = []
  let actual = ''
  let comilla: string | null = null
  let hay = false
  for (const ch of linea) {
    if (comilla) {
      if (ch === comilla) comilla = null
      else actual += ch
    } else if (ch === '"' || ch === "'") {
      comilla = ch
      hay = true
    } else if (/\s/.test(ch)) {
      if (actual || hay) r.push(actual)
      actual = ''
      hay = false
    } else actual += ch
  }
  if (actual || hay) r.push(actual)
  return r
}

const MACS: Record<string, string> = {
  pc: '00:1e:67:3a:5b:12',
  hd: '00:1e:67:44:c1:08',
  lms: '00:1e:67:51:9d:3e',
  eth1: '00:e0:4c:68:01:a2',
}

function ipv6Local(mac: string): string {
  const p = mac.split(':').map((x) => parseInt(x, 16))
  p[0] ^= 2
  const h = (a: number, b: number) => ((a << 8) | b).toString(16)
  return `fe80::${h(p[0], p[1])}:${h(p[2], 0xff)}:${h(0xfe, p[3])}:${h(p[4], p[5])}`
}

function bloqueIface(n: number, nombre: string, mac: string, carrier: boolean, inets: Array<{ ip: string; mascara: string; label: string }>): Linea[] {
  const flags = carrier ? '<BROADCAST,MULTICAST,UP,LOWER_UP>' : '<NO-CARRIER,BROADCAST,MULTICAST,UP>'
  const estado = carrier ? 'UP' : 'DOWN'
  const r: Linea[] = [
    [{ t: `${n}: ` }, { t: nombre, c: 'bold' }, { t: `: ${flags} mtu 1500 qdisc fq_codel state ${estado} group default qlen 1000` }],
    `    link/ether ${mac} brd ff:ff:ff:ff:ff:ff`,
  ]
  for (const i of inets) {
    r.push([
      { t: '    inet ' },
      { t: `${i.ip}/${prefijoDeMascara(i.mascara)}`, c: 'hl' },
      { t: ` brd ${direccionBroadcast(i.ip, i.mascara)} scope global ${i.label}` },
    ])
    r.push('       valid_lft forever preferred_lft forever')
  }
  if (carrier || inets.length) {
    r.push(`    inet6 ${ipv6Local(mac)}/64 scope link `)
    r.push('       valid_lft forever preferred_lft forever')
  }
  return r
}

export function salidaIpA(s: SimState, host: HostLinux, filtro?: string): Linea[] {
  const l = s.linux[host]
  const carrier0 = !!s.cables[cableDeEquipo(host)] && s.cables[cableDeEquipo(host)] !== `sw:${s.esc.puertoDanado}`
  const r: Linea[] = []
  if (!filtro || filtro === 'lo') {
    r.push(
      [{ t: '1: ' }, { t: 'lo', c: 'bold' }, { t: ': <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000' }],
      '    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00',
      [{ t: '    inet ' }, { t: '127.0.0.1/8', c: 'hl' }, { t: ' scope host lo' }],
      '       valid_lft forever preferred_lft forever',
      '    inet6 ::1/128 scope host ',
      '       valid_lft forever preferred_lft forever',
    )
  }
  if (!filtro || filtro === 'eth0') {
    const inets = []
    if (l.red.eth0) inets.push({ ...l.red.eth0, label: 'eth0' })
    if (l.red.alias) inets.push({ ...l.red.alias, label: 'eth0:1' })
    r.push(...bloqueIface(2, 'eth0', MACS[host], carrier0, inets))
  }
  if (host === 'pc' && hayEth1(s) && (!filtro || filtro === 'eth1')) {
    const carrier1 = s.hw.cableEth1 && !!s.cables[cableEth1] && s.cables[cableEth1] !== `sw:${s.esc.puertoDanado}`
    r.push(...bloqueIface(3, 'eth1', MACS.eth1, carrier1, l.red.eth1 ? [{ ...l.red.eth1, label: 'eth1' }] : []))
  }
  if (filtro && !r.length) return [`Device "${filtro}" does not exist.`]
  return r
}

function salidaIpRoute(s: SimState, host: HostLinux): Linea[] {
  const l = s.linux[host]
  const r: Linea[] = []
  if (l.red.eth0?.gateway) r.push(`default via ${l.red.eth0.gateway} dev eth0 onlink `)
  const add = (ip: string, m: string, dev: string) => r.push(`${direccionDeRed(ip, m)}/${prefijoDeMascara(m)} dev ${dev} proto kernel scope link src ${ip} `)
  if (l.red.eth1 && hayEth1(s)) add(l.red.eth1.ip, l.red.eth1.mascara, 'eth1')
  if (l.red.alias) add(l.red.alias.ip, l.red.alias.mascara, 'eth0')
  if (l.red.eth0) add(l.red.eth0.ip, l.red.eth0.mascara, 'eth0')
  return r
}

function fechaLs(): string {
  return 'Nov 10 08:00'
}

function permisos(dir: boolean, exe: boolean, ruta: string): string {
  if (dir) return ruta === '/root' ? 'drwx------' : ruta === '/tmp' ? 'drwxrwxrwt' : 'drwxr-xr-x'
  if (ruta === '/etc/shadow') return '-rw-r-----'
  return exe ? '-rwxr-xr-x' : '-rw-r--r--'
}

function existeDir(host: HostLinux, ruta: string) {
  return directorios(host).has(ruta)
}

function cmdLs(se: Sesion, args: string[], s: SimState, como: string): Efecto {
  const u = usuarioActual(se)
  const flags = args.filter((a) => a.startsWith('-')).join('')
  const largo = flags.includes('l')
  const todo = flags.includes('a')
  const rutas = args.filter((a) => !a.startsWith('-'))
  if (!rutas.length) rutas.push('.')
  const archivos = s.linux[se.host].archivos
  const r: Linea[] = []
  for (const arg of rutas) {
    const ruta = normalizarRuta(u.cwd, arg, homeDe(u.nombre))
    if (rutas.length > 1) r.push(`${arg}:`)
    if (ruta in archivos) {
      r.push(largo ? `${permisos(false, esBinario(se.host, ruta), ruta)} 1 ${dueñoDe(ruta)} ${dueñoDe(ruta)} ${archivos[ruta].length} ${fechaLs()} ${arg}` : arg)
      continue
    }
    if (!existeDir(se.host, ruta)) {
      r.push(`ls: cannot access '${arg}': No such file or directory`)
      continue
    }
    if (!puedeLeer(como, ruta)) {
      r.push(`ls: cannot open directory '${arg}': Permission denied`)
      continue
    }
    let ents = listar(se.host, archivos, ruta).filter((e) => todo || !e.oculto)
    if (todo) ents = [{ nombre: '.', ruta, dir: true, exe: false, oculto: true, tam: 4096 }, { nombre: '..', ruta: padre(ruta), dir: true, exe: false, oculto: true, tam: 4096 }, ...ents]
    if (largo) {
      r.push(`total ${Math.max(4, ents.length * 4)}`)
      for (const e of ents) {
        const d = dueñoDe(e.ruta)
        r.push([
          { t: `${permisos(e.dir, e.exe, e.ruta)} ${e.dir ? 2 : 1} ${d.padEnd(8)} ${d.padEnd(8)} ${String(e.tam).padStart(6)} ${fechaLs()} ` },
          { t: e.nombre, c: e.dir ? 'dir' : e.exe ? 'exe' : undefined },
        ])
      }
    } else if (ents.length) {
      const segs: Seg[] = []
      ents.forEach((e, i) => {
        segs.push({ t: e.nombre, c: e.dir ? 'dir' : e.exe ? 'exe' : undefined })
        if (i < ents.length - 1) segs.push({ t: '  ' })
      })
      r.push(segs)
    }
    if (rutas.length > 1) r.push('')
  }
  return out(...r)
}

function cmdCat(se: Sesion, args: string[], s: SimState, como: string): Efecto {
  const u = usuarioActual(se)
  const archivos = s.linux[se.host].archivos
  const r: Linea[] = []
  const rutas = args.filter((a) => !a.startsWith('-'))
  if (!rutas.length) return out('cat: missing operand (este simulador no lee de la entrada estándar)')
  for (const arg of rutas) {
    const ruta = normalizarRuta(u.cwd, arg, homeDe(u.nombre))
    if (existeDir(se.host, ruta)) r.push(`cat: ${arg}: Is a directory`)
    else if (!(ruta in archivos)) r.push(`cat: ${arg}: No such file or directory`)
    else if (!puedeLeer(como, ruta)) r.push(`cat: ${arg}: Permission denied`)
    else if (esBinario(se.host, ruta)) r.push('\u007fELF\u0002\u0001\u0001\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0003\u0000>\u0000\u0001\u0000\u0000\u0000�\u0013@\u0000')
    else {
      const lineas = archivos[ruta].split('\n')
      if (lineas[lineas.length - 1] === '') lineas.pop()
      r.push(...lineas)
    }
  }
  return out(...r)
}

function cmdNano(se: Sesion, args: string[], s: SimState, como: string): Efecto {
  const u = usuarioActual(se)
  const arg = args.find((a) => !a.startsWith('-') && !a.startsWith('+'))
  if (!arg) return { tipo: 'nano', ruta: '', contenido: '', escribible: true, nuevo: true, usuario: como }
  const ruta = normalizarRuta(u.cwd, arg, homeDe(u.nombre))
  const archivos = s.linux[se.host].archivos
  if (existeDir(se.host, ruta)) return out(`Error: "${ruta}" is a directory`)
  const existe = ruta in archivos
  const dirOk = existeDir(se.host, padre(ruta))
  if (existe && !puedeLeer(como, ruta)) {
    return { tipo: 'nano', ruta, contenido: '', escribible: false, nuevo: false, aviso: `[ Error reading ${ruta}: Permission denied ]`, usuario: como }
  }
  if (existe && esBinario(se.host, ruta)) return { tipo: 'nano', ruta, contenido: '\u007fELF\u0002\u0001\u0001', escribible: false, nuevo: false, usuario: como }
  return {
    tipo: 'nano',
    ruta,
    contenido: existe ? archivos[ruta] : '',
    escribible: dirOk && puedeEscribir(como, ruta),
    nuevo: !existe,
    aviso: !dirOk ? `[ Directory '${padre(ruta)}' does not exist ]` : undefined,
    usuario: como,
  }
}

function cmdIp(args: string[], s: SimState, host: HostLinux): Efecto {
  const sub = args[0] ?? ''
  const ADDR = ['a', 'ad', 'add', 'addr', 'addre', 'addres', 'address']
  if (ADDR.includes(sub)) {
    const i = args.indexOf('dev')
    const filtro = i >= 0 ? args[i + 1] : args[1] === 'show' || args[1] === 's' ? args[2] : undefined
    return out(...salidaIpA(s, host, filtro))
  }
  if (['r', 'ro', 'route'].includes(sub)) return out(...salidaIpRoute(s, host))
  if (['l', 'link'].includes(sub)) return out(...salidaIpA(s, host).filter((l) => (typeof l === 'string' ? l.includes('link/') : true)).filter((l) => typeof l === 'string' || !JSON.stringify(l).includes('inet')))
  if (!sub) return out('Usage: ip [ OPTIONS ] OBJECT { COMMAND | help }', '       ip [ -force ] -batch filename', 'where  OBJECT := { link | address | addrlabel | route | rule | neigh | ntable |', '                   tunnel | tuntap | maddress | mroute | mrule | monitor | xfrm |', '                   netns | l2tp | fou | macsec | tcp_metrics | token | netconf | ila }')
  return out(`Object "${sub}" is unknown, try "ip help".`)
}

const NOMBRES_DNS: Record<string, string> = {
  'google.com': '142.250.190.46',
  'www.google.com': '142.250.190.68',
  'google.com.mx': '142.250.217.67',
  'speedtest.net': '151.101.2.219',
  'prb.central': '192.168.101.216',
}

function cmdPing(args: string[], s: SimState, host: HostLinux): Efecto {
  let conteo: number | null = null
  const resto: string[] = []
  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    if (a === '-c') {
      conteo = Number(args[++i])
      if (!Number.isInteger(conteo) || conteo <= 0) return out(`ping: invalid argument: '${args[i] ?? ''}'`)
    } else if (a.startsWith('-c') && a.length > 2) conteo = Number(a.slice(2))
    else if (['-i', '-W', '-w', '-s', '-t', '-I'].includes(a)) i++
    else if (a.startsWith('-')) continue
    else resto.push(a)
  }
  const destino = resto[0]
  if (!destino) return out('ping: usage error: Destination address required')
  if (destino === 'localhost') return { tipo: 'ping', destino, ip: '127.0.0.1', conteo }
  if (/^[\d.]+$/.test(destino)) {
    if (!esIpValida(destino)) return out(`ping: ${destino}: Name or service not known`)
    return { tipo: 'ping', destino, ip: destino, conteo }
  }
  const ip = NOMBRES_DNS[destino.toLowerCase()]
  const r = resolver(s, host, '8.8.8.8')
  if (!ip || r.tipo !== 'ok') return out(`ping: ${destino}: Temporary failure in name resolution`)
  return { tipo: 'ping', destino, ip, conteo }
}

function requiereRoot(accion: string): Efecto {
  return out(
    'Failed to set wall message, ignoring: Interactive authentication required.',
    `Failed to ${accion} system via logind: Interactive authentication required.`,
    `Failed to start ${accion}.target: Interactive authentication required.`,
    `See system logs and 'systemctl status ${accion}.target' for details.`,
  )
}

function mensajeApagado(host: HostLinux, reinicio: boolean): Linea[] {
  const fecha = new Date().toString().split(' (')[0]
  return ['', `Broadcast message from root@${hostnameDe(host)} on pts/0 (${fecha}):`, '', `The system is going down for ${reinicio ? 'reboot' : 'poweroff'} NOW!`, '']
}

function cmdArchivo(se: Sesion, cmd: 'cp' | 'mv' | 'rm' | 'touch', args: string[], s: SimState, como: string): Efecto {
  const u = usuarioActual(se)
  const archivos = s.linux[se.host].archivos
  const rutas = args.filter((a) => !a.startsWith('-')).map((a) => normalizarRuta(u.cwd, a, homeDe(u.nombre)))
  if (cmd === 'touch') {
    if (!rutas.length) return out('touch: missing file operand')
    const cambios = []
    for (const r of rutas) {
      if (r in archivos || existeDir(se.host, r)) continue
      if (!existeDir(se.host, padre(r))) return out(`touch: cannot touch '${r}': No such file or directory`)
      if (!puedeEscribir(como, r)) return out(`touch: cannot touch '${r}': Permission denied`)
      cambios.push({ ruta: r, contenido: '' })
    }
    return { tipo: 'archivos', cambios, lineas: [] }
  }
  if (cmd === 'rm') {
    if (!rutas.length) return out('rm: missing operand')
    const cambios = []
    for (const r of rutas) {
      if (existeDir(se.host, r)) return out(`rm: cannot remove '${r}': Is a directory`)
      if (!(r in archivos)) return out(`rm: cannot remove '${r}': No such file or directory`)
      if (!puedeEscribir(como, r) || r.startsWith('/etc/') || esBinario(se.host, r)) {
        if (!puedeEscribir(como, r)) return out(`rm: cannot remove '${r}': Permission denied`)
      }
      cambios.push({ ruta: r, contenido: null })
    }
    return { tipo: 'archivos', cambios, lineas: [] }
  }
  if (rutas.length < 2) return out(`${cmd}: missing destination file operand after '${args[0] ?? ''}'`)
  const [src, dst0] = rutas
  if (!(src in archivos)) return out(`${cmd}: cannot stat '${src}': No such file or directory`)
  if (!puedeLeer(como, src)) return out(`${cmd}: cannot open '${src}' for reading: Permission denied`)
  const dst = existeDir(se.host, dst0) ? `${dst0 === '/' ? '' : dst0}/${nombreBase(src)}` : dst0
  if (!existeDir(se.host, padre(dst))) return out(`${cmd}: cannot create regular file '${dst}': No such file or directory`)
  if (!puedeEscribir(como, dst)) return out(`${cmd}: cannot create regular file '${dst}': Permission denied`)
  const cambios: Array<{ ruta: string; contenido: string | null }> = [{ ruta: dst, contenido: archivos[src] }]
  if (cmd === 'mv') {
    if (!puedeEscribir(como, src)) return out(`mv: cannot move '${src}' to '${dst}': Permission denied`)
    cambios.push({ ruta: src, contenido: null })
  }
  return { tipo: 'archivos', cambios, lineas: [] }
}

function filtrarGrep(lineas: Linea[], patron: string, invertir: boolean, sinMayus: boolean): Linea[] {
  const txt = (l: Linea) => (typeof l === 'string' ? l : l.map((x) => x.t).join(''))
  const p = sinMayus ? patron.toLowerCase() : patron
  return lineas.filter((l) => {
    const t = sinMayus ? txt(l).toLowerCase() : txt(l)
    return invertir ? !t.includes(p) : t.includes(p)
  })
}

export function ejecutar(se: Sesion, entrada: string, s: SimState): Efecto {
  const linea = entrada.trim()
  if (!linea || linea.startsWith('#')) return NADA
  const partes = linea.split('|').map((p) => p.trim())
  let ef = ejecutarSimple(se, partes[0], s, usuarioActual(se).nombre)
  for (const p of partes.slice(1)) {
    const t = tokenizar(p)
    if (ef.tipo !== 'salida') break
    if (t[0] === 'grep') {
      const flags = t.filter((x) => x.startsWith('-')).join('')
      const patron = t.filter((x) => !x.startsWith('-'))[1] ?? ''
      ef = { tipo: 'salida', lineas: filtrarGrep(ef.lineas, patron, flags.includes('v'), flags.includes('i')) }
    } else if (t[0] === 'less' || t[0] === 'more' || t[0] === 'cat') continue
    else if (t[0] === 'head' || t[0] === 'tail') {
      const n = Number(t[t.indexOf('-n') + 1]) || 10
      ef = { tipo: 'salida', lineas: t[0] === 'head' ? ef.lineas.slice(0, n) : ef.lineas.slice(-n) }
    } else return out(`${t[0]}: command not found`)
  }
  return ef
}

function ejecutarSimple(se: Sesion, linea: string, s: SimState, como: string): Efecto {
  const args = tokenizar(linea)
  const cmd = args[0]
  const resto = args.slice(1)
  const u = usuarioActual(se)
  switch (cmd) {
    case 'sudo':
      return cmdSudo(se, resto, s)
    case 'su':
      return cmdSu(se, resto, s, como)
    case 'exit':
    case 'logout':
      if (se.usuarios.length > 1) {
        se.usuarios.pop()
        return out('logout')
      }
      return { tipo: 'cerrar' }
    case 'cd': {
      if (como !== u.nombre) return out('sudo: cd: command not found')
      const destino = normalizarRuta(u.cwd, resto[0] ?? '~', homeDe(u.nombre))
      if (s.linux[se.host].archivos[destino] !== undefined) return out(`bash: cd: ${resto[0]}: Not a directory`)
      if (!existeDir(se.host, destino)) return out(`bash: cd: ${resto[0]}: No such file or directory`)
      if (!puedeLeer(como, destino)) return out(`bash: cd: ${resto[0]}: Permission denied`)
      u.cwd = destino
      return NADA
    }
    case 'pwd':
      return out(u.cwd)
    case 'ls':
    case 'll':
    case 'dir':
      return cmdLs(se, cmd === 'll' ? ['-la', ...resto] : resto, s, como)
    case 'cat':
      return cmdCat(se, resto, s, como)
    case 'nano':
    case 'pico':
      return cmdNano(se, resto, s, como)
    case 'ip':
      return cmdIp(resto, s, se.host)
    case 'ping':
      return cmdPing(resto, s, se.host)
    case 'reboot':
      return como === 'root' ? { tipo: 'reiniciar', lineas: mensajeApagado(se.host, true) } : requiereRoot('reboot')
    case 'init':
      if (resto[0] === '6') return como === 'root' ? { tipo: 'reiniciar', lineas: mensajeApagado(se.host, true) } : requiereRoot('reboot')
      if (resto[0] === '0') return como === 'root' ? { tipo: 'apagar', lineas: mensajeApagado(se.host, false) } : requiereRoot('poweroff')
      return out('init: se requiere un nivel (0 o 6)')
    case 'shutdown': {
      const reinicio = resto.includes('-r')
      if (como !== 'root') return requiereRoot(reinicio ? 'reboot' : 'poweroff')
      return reinicio ? { tipo: 'reiniciar', lineas: mensajeApagado(se.host, true) } : { tipo: 'apagar', lineas: mensajeApagado(se.host, false) }
    }
    case 'poweroff':
    case 'halt':
      return como === 'root' ? { tipo: 'apagar', lineas: mensajeApagado(se.host, false) } : requiereRoot('poweroff')
    case 'clear':
      return { tipo: 'limpiar' }
    case 'history':
      return out(...se.historial.map((h, i) => `${String(i + 1).padStart(5)}  ${h}`))
    case 'whoami':
      return out(como)
    case 'hostname':
      return out(hostnameDe(se.host))
    case 'id':
      if (como === 'root') return out('uid=0(root) gid=0(root) groups=0(root)')
      if (como === 'sysadmin') return out('uid=1001(sysadmin) gid=1001(sysadmin) groups=1001(sysadmin),4(adm),27(sudo)')
      return out(`uid=1000(${como}) gid=1000(${como}) groups=1000(${como}),24(cdrom),46(plugdev)`)
    case 'date':
      return out(new Date().toString().replace(/ GMT.*$/, ' CST ') + new Date().getFullYear())
    case 'uname':
      return out(resto.includes('-a') ? `Linux ${hostnameDe(se.host)} 4.15.0-213-generic #224-Ubuntu SMP Mon Jun 19 13:30:12 UTC 2023 x86_64 x86_64 x86_64 GNU/Linux` : 'Linux')
    case 'echo':
      return out(
        resto
          .join(' ')
          .replace(/\$USER/g, como)
          .replace(/\$HOME/g, homeDe(como))
          .replace(/\$PWD/g, u.cwd)
          .replace(/\$HOSTNAME/g, hostnameDe(se.host)),
      )
    case 'cp':
    case 'mv':
    case 'rm':
    case 'touch':
      return cmdArchivo(se, cmd, resto, s, como)
    case 'grep': {
      const flags = resto.filter((x) => x.startsWith('-')).join('')
      const [patron, archivo] = resto.filter((x) => !x.startsWith('-'))
      if (!patron || !archivo) return out('Usage: grep [OPTION]... PATTERNS [FILE]...')
      const ef = cmdCat(se, [archivo], s, como)
      if (ef.tipo !== 'salida') return ef
      return { tipo: 'salida', lineas: filtrarGrep(ef.lineas, patron, flags.includes('v'), flags.includes('i')) }
    }
    case 'systemctl': {
      if (resto[0] === 'status') {
        return out(
          [{ t: '● ', c: 'ok' }, { t: `${resto[1] ?? 'networking'}.service - Raise network interfaces` }],
          '   Loaded: loaded (/lib/systemd/system/networking.service; enabled; vendor preset: enabled)',
          [{ t: '   Active: ' }, { t: 'active (exited)', c: 'ok' }, { t: ' since Tue 2026-11-10 08:00:15 CST' }],
          '     Docs: man:interfaces(5)',
        )
      }
      if (resto[0] === 'restart' || resto[0] === 'reload') {
        if (como !== 'root') return out(`Failed to ${resto[0]} ${resto[1] ?? ''}.service: Interactive authentication required.`, `See system logs and 'systemctl status ${resto[1] ?? ''}.service' for details.`)
        return out(
          `Job for ${resto[1] ?? 'networking'}.service failed because the control process exited with error code.`,
          `See "systemctl status ${resto[1] ?? 'networking'}.service" and "journalctl -xe" for details.`,
        )
      }
      return out('systemctl [OPTIONS...] {COMMAND} ...')
    }
    case 'ifconfig':
      return out("Command 'ifconfig' not found, but can be installed with:", '', 'sudo apt install net-tools', '')
    case 'vi':
    case 'vim':
      return out(`Command '${cmd}' not found, but can be installed with:`, '', `sudo apt install ${cmd === 'vi' ? 'vim-tiny' : 'vim'}`, '')
    case 'man':
      return out(resto[0] ? `No manual entry for ${resto[0]}` : 'What manual page do you want?')
    case 'help':
      return out(
        'GNU bash, version 4.4.20(1)-release (x86_64-pc-linux-gnu)',
        'Comandos disponibles en este simulador:',
        [{ t: '  su - sysadmin  ', c: 'bold' }, { t: 'cambiar al usuario administrador' }],
        [{ t: '  ip a           ', c: 'bold' }, { t: 'ver interfaces e IPs' }],
        [{ t: '  sudo nano RUTA ', c: 'bold' }, { t: 'editar un archivo (Ctrl+O guardar, Ctrl+X salir)' }],
        [{ t: '  cat RUTA       ', c: 'bold' }, { t: 'ver un archivo' }],
        [{ t: '  ping -c 40 IP  ', c: 'bold' }, { t: 'probar conectividad (Ctrl+C detiene)' }],
        [{ t: '  sudo reboot    ', c: 'bold' }, { t: 'reiniciar' }],
        '  También: cd, ls, pwd, cp, clear, history, whoami, exit',
      )
    default:
      return out(`${cmd}: command not found`)
  }
}

function cmdSu(se: Sesion, args: string[], s: SimState, como: string): Efecto {
  const login = args.includes('-') || args.includes('-l') || args.includes('--login')
  const objetivo = args.filter((a) => !a.startsWith('-'))[0] ?? 'root'
  if (!['root', 'sysadmin', SESION_USUARIO].includes(objetivo)) return out(`su: user ${objetivo} does not exist`)
  const cambiar = (): Efecto => {
    se.usuarios.push({ nombre: objetivo, cwd: login ? homeDe(objetivo) : usuarioActual(se).cwd })
    return NADA
  }
  if (como === 'root') return cambiar()
  const pass = passwordDe(s, se.host, objetivo)
  return {
    tipo: 'password',
    prompt: 'Password: ',
    verificar: (p) => pass !== null && p === pass,
    exito: cambiar,
    fallo: () => out('su: Authentication failure'),
  }
}

function cmdSudo(se: Sesion, args: string[], s: SimState): Efecto {
  if (!args.length) return out('usage: sudo -h | -K | -k | -V', 'usage: sudo -v [-AknS] [-g group] [-h host] [-p prompt] [-u user]', 'usage: sudo [-AbEHknPS] [-C num] [-g group] [-h host] [-p prompt] [-u user] [VAR=value] [-i|-s] [<command>]')
  if (args[0] === '-k' || args[0] === '-K') {
    se.sudoHasta = 0
    return NADA
  }
  const actual = usuarioActual(se).nombre
  const comoRoot = (): Efecto => {
    if (args[0] === '-i' || args[0] === '-s' || (args[0] === 'su' && args.length <= 2 && !args.slice(1).some((a) => !a.startsWith('-')))) {
      se.usuarios.push({ nombre: 'root', cwd: args[0] === '-s' ? usuarioActual(se).cwd : '/root' })
      return NADA
    }
    return ejecutarSimple(se, args.join(' '), s, 'root')
  }
  if (actual === 'root') return comoRoot()
  if (actual === 'sysadmin' && Date.now() < se.sudoHasta) return comoRoot()
  const pass = passwordDe(s, se.host, actual)
  const intento = (n: number, previo?: Linea[]): Efecto => ({
    tipo: 'password',
    prompt: `[sudo] password for ${actual}: `,
    previo,
    verificar: (p) => p === pass,
    exito: () => {
      if (actual !== 'sysadmin') return out(`${actual} is not in the sudoers file.  This incident will be reported.`)
      se.sudoHasta = Date.now() + 5 * 60_000
      return comoRoot()
    },
    fallo: () => (n < 3 ? intento(n + 1, ['Sorry, try again.']) : out('sudo: 3 incorrect password attempts')),
  })
  return intento(1)
}

export function completar(se: Sesion, s: SimState, texto: string): { texto: string; opciones: string[] } {
  const tokens = texto.split(/\s+/)
  const ultimo = tokens[tokens.length - 1] ?? ''
  const esComando = tokens.length === 1 || (tokens.length === 2 && tokens[0] === 'sudo')
  const u = usuarioActual(se)
  let candidatos: string[]
  let mostrar: string[]
  if (esComando) {
    candidatos = COMANDOS.filter((c) => c.startsWith(ultimo))
    mostrar = candidatos
  } else {
    const idx = ultimo.lastIndexOf('/')
    const dirArg = idx >= 0 ? ultimo.slice(0, idx + 1) : ''
    const base = idx >= 0 ? ultimo.slice(idx + 1) : ultimo
    const dirAbs = normalizarRuta(u.cwd, dirArg || '.', homeDe(u.nombre))
    const ents = listar(se.host, s.linux[se.host].archivos, dirAbs).filter((e) => e.nombre.startsWith(base) && (base.startsWith('.') || !e.oculto))
    candidatos = ents.map((e) => dirArg + e.nombre + (e.dir ? '/' : ''))
    mostrar = ents.map((e) => e.nombre + (e.dir ? '/' : ''))
  }
  if (!candidatos.length) return { texto, opciones: [] }
  const antes = tokens.slice(0, -1).join(' ')
  const unir = (x: string) => (antes ? `${antes} ${x}` : x)
  if (candidatos.length === 1) {
    const c = candidatos[0]
    return { texto: unir(c.endsWith('/') ? c : `${c} `), opciones: [] }
  }
  let comun = candidatos[0]
  for (const c of candidatos) while (!c.startsWith(comun)) comun = comun.slice(0, -1)
  return { texto: unir(comun.length > ultimo.length ? comun : ultimo), opciones: comun.length > ultimo.length ? [] : mostrar }
}
