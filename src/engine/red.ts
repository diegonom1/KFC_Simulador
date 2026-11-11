// Modelo de red simplificado pero coherente:
//  - Cada puerto pertenece a un "dominio" de capa 2 (switch anterior, VLAN10, VLAN40, módem, etc.).
//  - Dos equipos se ven si están en el mismo dominio, en la misma subred y encendidos.
//  - Para salir de su subred usan su gateway (router anterior, FortiGate o módem).
import { carriers, destinosValidacion, equiposRed, equiposVlan40, redVlan40 } from '../data/sucursal'
import { base24, esIpValida, esPrivada, mismaRed } from '../lib/ip'
import { cableDeEquipo, cableDeVlan40, cableEth1, cablesDe, dominioDePuerto, nombrePuerto } from './cables'
import { tieneTelmex, tieneTp } from './escenario'
import type { EquipoSimple, HostLinux, Origen, SimState } from './tipos'

export type TipoWeb = 'bio' | 'tel' | 'hme' | 'imp' | 'digi' | 'telmex' | 'ont-tp' | 'modem-extra' | 'fortigate' | 'router-viejo'

export interface Nodo {
  id: string
  nombre: string
  ip: string
  mascara: string
  dominio: string | null
  arriba: boolean
  web?: TipoWeb
  ttl: number
  rtt: [number, number]
  router?: 'viejo' | 'fortigate' | 'modem'
}

export interface Iface {
  nombre: string
  ip: string
  mascara: string
  dominio: string | null
}

export function hayEth1(s: SimState): boolean {
  return s.esc.pcRanuraPci ? s.hw.tarjetaInstalada : s.hw.realtek
}

export function enlaces(s: SimState) {
  const esc = s.esc
  const fortilink = s.cables.fga === 'sw:48'
  const tpWan = tieneTp(esc) && s.cables.tp === 'fg:wan'
  const txPort1 = esc.carriers === 'ambos' && s.cables.tx === 'fg:1'
  const txPort1Ok = txPort1 && s.telmexLan === carriers.telmex.ipLanNueva
  const txWan = esc.carriers === 'solo-telmex' && s.cables.tx === 'fg:wan'
  const txWanOk = txWan && s.telmexLan === carriers.totalplay.ipLan
  return { fortilink, tpWan, txPort1, txPort1Ok, txWan, txWanOk, internet: tpWan || txPort1 || txWanOk }
}

function primerHostLibre(base: string, desde: number, usados: Set<string>): string {
  for (let h = desde; h < 254; h++) if (!usados.has(`${base}.${h}`)) return `${base}.${h}`
  return `${base}.253`
}

function dhcpEn(s: SimState, dominio: string | null): { ip: string; mascara: string; gateway: string } | null {
  const esc = s.esc
  const m = '255.255.255.0'
  const fl = s.cables.fga === 'sw:48'
  switch (dominio) {
    case 'old': {
      const usados = new Set(Object.values(esc.ipVieja))
      return { ip: primerHostLibre(base24(esc.viejo.red), 150, usados), mascara: esc.viejo.mascara, gateway: esc.viejo.gateway }
    }
    case 'vlan10':
      return fl ? { ip: `${base24(esc.nuevo.red)}.100`, mascara: esc.nuevo.mascara, gateway: esc.nuevo.gateway } : null
    case 'vlan40':
      return fl ? { ip: '10.10.10.100', mascara: redVlan40.mascara, gateway: redVlan40.gateway } : null
    case 'modem:tp':
      return tieneTp(esc) ? { ip: `${base24(carriers.totalplay.ipLan)}.20`, mascara: m, gateway: carriers.totalplay.ipLan } : null
    case 'modem:tx':
      return tieneTelmex(esc) ? { ip: `${base24(s.telmexLan)}.64`, mascara: m, gateway: s.telmexLan } : null
    case 'modem:ex1':
      return { ip: '192.168.2.33', mascara: m, gateway: '192.168.2.1' }
    case 'modem:ex2':
      return { ip: '192.168.3.33', mascara: m, gateway: '192.168.3.1' }
    default:
      return null
  }
}

export interface ConfigLaptop {
  ip: string
  mascara: string
  gateway: string
  dominio: string | null
  medio: 'cable' | 'wifi' | null
  dhcp: boolean
  apipa: boolean
}

export function configLaptop(s: SimState): ConfigLaptop {
  const puerto = s.cables.lap
  const wifiValido = s.laptop.wifi && (s.laptop.wifi === 'tp' ? tieneTp(s.esc) : tieneTelmex(s.esc)) ? s.laptop.wifi : null
  const medio: ConfigLaptop['medio'] = puerto ? 'cable' : wifiValido ? 'wifi' : null
  const dominio = puerto ? dominioDePuerto(s.esc, puerto) : wifiValido ? `modem:${wifiValido}` : null
  if (s.laptop.modo === 'estatica') {
    return { ip: s.laptop.ip, mascara: s.laptop.mascara, gateway: s.laptop.gateway, dominio, medio, dhcp: false, apipa: false }
  }
  const lease = dominio ? dhcpEn(s, dominio) : null
  if (lease) return { ...lease, dominio, medio, dhcp: true, apipa: false }
  return { ip: medio && dominio ? '169.254.37.12' : '', mascara: '255.255.0.0', gateway: '', dominio, medio, dhcp: true, apipa: !!(medio && dominio) }
}

export function interfacesDe(s: SimState, origen: Origen): Iface[] {
  if (origen === 'laptop') {
    const c = configLaptop(s)
    if (!c.ip || !esIpValida(c.ip)) return []
    return [{ nombre: c.medio === 'wifi' ? 'Wi-Fi' : 'Ethernet', ip: c.ip, mascara: c.mascara, dominio: c.dominio }]
  }
  const l = s.linux[origen]
  const dom0 = dominioDePuerto(s.esc, s.cables[cableDeEquipo(origen)])
  const r: Iface[] = []
  if (l.red.eth0) r.push({ nombre: 'eth0', ip: l.red.eth0.ip, mascara: l.red.eth0.mascara, dominio: dom0 })
  if (origen === 'pc' && l.red.eth1 && hayEth1(s)) {
    r.push({
      nombre: 'eth1',
      ip: l.red.eth1.ip,
      mascara: l.red.eth1.mascara,
      dominio: s.hw.cableEth1 ? dominioDePuerto(s.esc, s.cables[cableEth1]) : null,
    })
  }
  if (l.red.alias && l.red.eth0) r.push({ nombre: 'eth0:1', ip: l.red.alias.ip, mascara: l.red.alias.mascara, dominio: dom0 })
  return r
}

export function gatewayDe(s: SimState, origen: Origen): string {
  if (origen === 'laptop') return configLaptop(s).gateway
  return s.linux[origen].red.eth0?.gateway ?? ''
}

export function hostArriba(s: SimState, h: HostLinux): boolean {
  const l = s.linux[h]
  return l.encendida && !l.reiniciandoHasta
}

const NOMBRES_SIMPLES: Record<EquipoSimple, string> = {
  bio: equiposRed.bio.corto,
  tel: equiposRed.tel.corto,
  hme: equiposRed.hme.corto,
  imp: equiposRed.imp.corto,
  digi: equiposRed.digi.corto,
}

export function nodos(s: SimState): Nodo[] {
  const esc = s.esc
  const n: Nodo[] = []
  const dom = (cable: string) => dominioDePuerto(esc, s.cables[cable])
  for (const id of ['bio', 'tel', 'hme', 'imp', 'digi'] as EquipoSimple[]) {
    const d = s.disp[id]
    n.push({
      id,
      nombre: NOMBRES_SIMPLES[id],
      ip: d.activa.ip,
      mascara: d.activa.mascara,
      dominio: dom(cableDeEquipo(id)),
      arriba: !d.reiniciandoHasta,
      web: id,
      ttl: id === 'tel' || id === 'digi' ? 64 : 255,
      rtt: [0.4, 2.6],
    })
  }
  for (const h of ['pc', 'hd', 'lms'] as HostLinux[]) {
    for (const i of interfacesDe(s, h)) {
      n.push({ id: `${h}:${i.nombre}`, nombre: equiposRed[h].corto, ip: i.ip, mascara: i.mascara, dominio: i.dominio, arriba: hostArriba(s, h), ttl: 64, rtt: [0.15, 0.8] })
    }
  }
  for (const v of equiposVlan40) {
    n.push({ id: v.id, nombre: v.nombre, ip: v.ip, mascara: redVlan40.mascara, dominio: dom(cableDeVlan40(v.id)), arriba: true, ttl: 64, rtt: [0.5, 3.2] })
  }
  const lc = configLaptop(s)
  if (lc.ip && esIpValida(lc.ip)) n.push({ id: 'laptop', nombre: 'Laptop', ip: lc.ip, mascara: lc.mascara, dominio: lc.dominio, arriba: true, ttl: 128, rtt: [0.3, 1.1] })
  n.push({ id: 'gw-viejo', nombre: 'Router anterior', ip: esc.viejo.gateway, mascara: esc.viejo.mascara, dominio: 'old', arriba: true, web: 'router-viejo', router: 'viejo', ttl: 64, rtt: [0.5, 1.6] })
  if (s.cables.fga === 'sw:48') {
    n.push({ id: 'fg-vlan10', nombre: 'FortiGate', ip: esc.nuevo.gateway, mascara: esc.nuevo.mascara, dominio: 'vlan10', arriba: true, web: 'fortigate', router: 'fortigate', ttl: 255, rtt: [0.3, 0.9] })
    n.push({ id: 'fg-vlan40', nombre: 'FortiGate', ip: redVlan40.gateway, mascara: redVlan40.mascara, dominio: 'vlan40', arriba: true, web: 'fortigate', router: 'fortigate', ttl: 255, rtt: [0.3, 0.9] })
  }
  if (tieneTp(esc)) n.push({ id: 'modem:tp', nombre: 'ONT Totalplay', ip: carriers.totalplay.ipLan, mascara: '255.255.255.0', dominio: 'modem:tp', arriba: true, web: 'ont-tp', router: 'modem', ttl: 64, rtt: [0.6, 1.8] })
  if (tieneTelmex(esc)) n.push({ id: 'modem:tx', nombre: 'Módem Telmex', ip: s.telmexLan, mascara: '255.255.255.0', dominio: 'modem:tx', arriba: true, web: 'telmex', router: 'modem', ttl: 64, rtt: [0.6, 1.8] })
  esc.modemsExtra.forEach((ex, i) => {
    n.push({ id: `modem:${ex}`, nombre: 'Módem adicional', ip: `192.168.${i + 2}.1`, mascara: '255.255.255.0', dominio: `modem:${ex}`, arriba: true, web: 'modem-extra', router: 'modem', ttl: 64, rtt: [0.6, 1.8] })
  })
  return n
}

export type Ruta =
  | { tipo: 'ok'; nodo: Nodo; desde: Iface; dup: boolean; remoto: boolean }
  | { tipo: 'local'; desde?: Iface }
  | { tipo: 'inalcanzable'; desde: Iface }
  | { tipo: 'timeout'; desde: Iface }
  | { tipo: 'sin-red' }
  | { tipo: 'apagado' }

const CENTRALES = new Set(destinosValidacion.filter((d) => d.tipo === 'central').map((d) => d.ip))

export function resolver(s: SimState, origen: Origen, destino: string): Ruta {
  if (origen !== 'laptop' && !hostArriba(s, origen)) return { tipo: 'apagado' }
  if (!esIpValida(destino)) return { tipo: 'sin-red' }
  if (destino.startsWith('127.')) return { tipo: 'local' }
  const ifaces = interfacesDe(s, origen)
  const propia = ifaces.find((i) => i.ip === destino)
  if (propia) return { tipo: 'local', desde: propia }
  if (!ifaces.length) return { tipo: 'sin-red' }
  const todos = nodos(s)
  const prefijoOrigen = origen === 'laptop' ? 'laptop' : `${origen}:`
  const ajenos = todos.filter((nd) => !nd.id.startsWith(prefijoOrigen))

  const directa = ifaces.find((i) => mismaRed(i.ip, destino, i.mascara))
  if (directa) {
    if (!directa.dominio) return { tipo: 'inalcanzable', desde: directa }
    const cand = ajenos.filter((nd) => nd.dominio === directa.dominio && nd.ip === destino && nd.arriba)
    if (!cand.length) return { tipo: 'inalcanzable', desde: directa }
    const conflictoPropio = ajenos.some((nd) => nd.dominio === directa.dominio && nd.ip === directa.ip)
    return { tipo: 'ok', nodo: cand[0], desde: directa, dup: cand.length > 1 || conflictoPropio, remoto: false }
  }

  const gw = gatewayDe(s, origen)
  if (!gw || !esIpValida(gw)) return { tipo: 'sin-red' }
  const ifGw = ifaces.find((i) => mismaRed(i.ip, gw, i.mascara))
  if (!ifGw) return { tipo: 'sin-red' }
  if (!ifGw.dominio) return { tipo: 'inalcanzable', desde: ifGw }
  const router = ajenos.find((nd) => nd.dominio === ifGw.dominio && nd.ip === gw && nd.router && nd.arriba)
  if (!router) return { tipo: 'inalcanzable', desde: ifGw }
  const internet = !esPrivada(destino)
  const central = CENTRALES.has(destino)
  const remoto: Nodo = {
    id: 'remoto',
    nombre: destino,
    ip: destino,
    mascara: '',
    dominio: null,
    arriba: true,
    ttl: internet ? 117 : 59,
    rtt: internet ? [17, 31] : [36, 58],
  }
  const conflictoPropio = ajenos.some((nd) => nd.dominio === ifGw.dominio && nd.ip === ifGw.ip)
  const ok = { tipo: 'ok' as const, nodo: remoto, desde: ifGw, dup: conflictoPropio, remoto: true }
  if (router.router === 'viejo') return internet || central ? ok : { tipo: 'timeout', desde: ifGw }
  if (router.router === 'fortigate') return (internet || central) && enlaces(s).internet ? ok : { tipo: 'timeout', desde: ifGw }
  if (router.router === 'modem') return internet ? ok : { tipo: 'timeout', desde: ifGw }
  return { tipo: 'timeout', desde: ifGw }
}

export type ResultadoWeb =
  | { tipo: 'pagina'; web: TipoWeb; nodo: Nodo; host: string }
  | { tipo: 'internet'; sitio: 'speedtest' | 'buscador'; host: string }
  | { tipo: 'rechazada'; host: string }
  | { tipo: 'timeout'; host: string }
  | { tipo: 'dns'; host: string }
  | { tipo: 'sin-red'; host: string }

const SITIOS: Record<string, 'speedtest' | 'buscador'> = {
  'speedtest.net': 'speedtest',
  'www.speedtest.net': 'speedtest',
  speedtest: 'speedtest',
  'fast.com': 'speedtest',
  'google.com': 'buscador',
  'www.google.com': 'buscador',
  'google.com.mx': 'buscador',
  'www.google.com.mx': 'buscador',
}

export function hostDeUrl(url: string): string {
  return url
    .trim()
    .replace(/^[a-z]+:\/\//i, '')
    .split(/[/?#]/)[0]
    .split(':')[0]
    .toLowerCase()
}

export function abrirUrl(s: SimState, origen: Origen, url: string): ResultadoWeb {
  const host = hostDeUrl(url)
  if (!host) return { tipo: 'dns', host }
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    if (!esIpValida(host)) return { tipo: 'dns', host }
    const r = resolver(s, origen, host)
    if (r.tipo === 'sin-red' || r.tipo === 'apagado') return { tipo: 'sin-red', host }
    if (r.tipo === 'ok') {
      if (r.dup) return { tipo: 'timeout', host }
      if (r.remoto) return { tipo: 'rechazada', host }
      if (r.nodo.web) return { tipo: 'pagina', web: r.nodo.web, nodo: r.nodo, host }
      return { tipo: 'rechazada', host }
    }
    if (r.tipo === 'local') return { tipo: 'rechazada', host }
    return { tipo: 'timeout', host }
  }
  const dnsOk = resolver(s, origen, '8.8.8.8')
  if (dnsOk.tipo !== 'ok' || dnsOk.dup) {
    if (interfacesDe(s, origen).length === 0) return { tipo: 'sin-red', host }
    return { tipo: 'dns', host }
  }
  const sitio = SITIOS[host]
  if (sitio) return { tipo: 'internet', sitio, host }
  return { tipo: 'dns', host }
}

export interface CondicionSpeed {
  carrier: 'tp' | 'tx' | 'otro'
  conexion: 'cable' | 'wifi' | 'switch' | 'ninguna'
  valido: boolean
  motivo?: string
  otros: string[]
}

export function conectadosAModem(s: SimState, m: 'tp' | 'tx'): string[] {
  const r: string[] = []
  for (const d of cablesDe(s.esc)) {
    if (d.id === 'lap') continue
    const destino = s.cables[d.id]
    if (d.desde.startsWith(`${m}:`) && destino) r.push(nombrePuerto(destino).split(' · ')[0])
    else if (destino?.startsWith(`${m}:`)) r.push(d.corto)
  }
  return r
}

export function condicionesSpeedtest(s: SimState, origen: Origen): CondicionSpeed {
  if (origen !== 'laptop') return { carrier: 'otro', conexion: 'switch', valido: false, motivo: 'PRUEBA_PC', otros: [] }
  const c = configLaptop(s)
  if (!c.medio) return { carrier: 'otro', conexion: 'ninguna', valido: false, motivo: 'SPEEDTEST_NO_DIRECTO', otros: [] }
  if (c.medio === 'wifi') {
    const carrier = s.laptop.wifi === 'tx' ? 'tx' : 'tp'
    return { carrier, conexion: 'wifi', valido: false, motivo: 'WIFI_SPEEDTEST', otros: [] }
  }
  if (c.dominio === 'modem:tp' || c.dominio === 'modem:tx') {
    const carrier = c.dominio === 'modem:tp' ? 'tp' : 'tx'
    const otros = conectadosAModem(s, carrier)
    if (otros.length) return { carrier, conexion: 'cable', valido: false, motivo: 'SPEEDTEST_COMPARTIDO', otros }
    return { carrier, conexion: 'cable', valido: true, otros: [] }
  }
  return { carrier: 'otro', conexion: 'switch', valido: false, motivo: 'SPEEDTEST_NO_DIRECTO', otros: [] }
}
