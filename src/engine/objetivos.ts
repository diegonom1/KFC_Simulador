// Lista de objetivos del procedimiento. El modo guiado y el modo examen usan exactamente
// estos validadores: el guiado muestra el primero pendiente; el examen solo los califica.
import { equiposConRespaldo, hojaEtiquetado, pcRedCocina, PINGS_REQUERIDOS, telefonoDns, vlanDePuerto } from '../data/sucursal'
import { esIpDeHost, mismaRed, normalizarIp } from '../lib/ip'
import { cablesDe, dominioDePuerto, type CableDef } from './cables'
import { cfgNueva, ipEsperadaTelmex, tieneTelmex, tieneTp } from './escenario'
import { confFingerprint, confTimer, validarConf } from './linux/conf'
import { estadoCocina, parsearInterfaces, validarEth0 } from './linux/interfaces'
import { condicionesSpeedtest, configLaptop, hayEth1, hostArriba } from './red'
import type { Escenario, NetCfg, SimState } from './tipos'

export interface Objetivo {
  id: string
  fase: number
  equipos: string[]
  aplica?: (esc: Escenario) => boolean
  requiere?: string[]
  valida: (s: SimState) => boolean
  guia: (s: SimState) => string[]
  progreso?: (s: SimState) => { hechos: number; total: number }
}

export const cfgIgual = (a: NetCfg | null | undefined, b: NetCfg) => !!a && a.ip === b.ip && a.mascara === b.mascara && a.gateway === b.gateway

export function laptopIpOk(s: SimState): boolean {
  const l = s.laptop
  const esc = s.esc
  if (l.modo !== 'estatica' || l.mascara !== esc.viejo.mascara) return false
  if (!esIpDeHost(l.ip, l.mascara) || !mismaRed(l.ip, esc.viejo.red, esc.viejo.mascara)) return false
  const usadas = new Set([...Object.values(esc.ipVieja), esc.viejo.gateway, ...Object.values(s.disp).map((d) => d.activa.ip)])
  return !usadas.has(l.ip)
}

export const archivo = (s: SimState, h: 'pc' | 'hd' | 'lms', ruta: string) => s.linux[h].archivos[ruta] ?? ''

export function puertosAsignados(esc: Escenario): number[] {
  return cablesDe(esc)
    .map((c) => c.puertoHoja)
    .filter((p): p is number => typeof p === 'number')
}

/** ¿El cable quedó en el puerto que dice la hoja (o en uno válido de la misma VLAN si el de la hoja está dañado)? */
export function puertoCorrecto(s: SimState, c: CableDef): boolean {
  const dest = s.cables[c.id]
  if (!dest?.startsWith('sw:') || !c.puertoHoja) return false
  const p = Number(dest.slice(3))
  if (p === s.esc.puertoDanado || p === hojaEtiquetado.fortilink) return false
  if (p === c.puertoHoja) return true
  if (c.puertoHoja === s.esc.puertoDanado) {
    return vlanDePuerto(p) === vlanDePuerto(c.puertoHoja) && !puertosAsignados(s.esc).includes(p)
  }
  return false
}

const cablesGrupo = (s: SimState, grupos: CableDef['grupo'][]) => cablesDe(s.esc).filter((c) => grupos.includes(c.grupo))
const mal = (s: SimState, grupos: CableDef['grupo'][]) => cablesGrupo(s, grupos).filter((c) => !puertoCorrecto(s, c))
const guiaCables = (ids: string[]) => [...ids.map((i) => `rack-cable-${i}`), 'rack-hoja', 'scene-rack']

export function modemPrincipal(esc: Escenario): 'tp' | 'tx' {
  return tieneTp(esc) ? 'tp' : 'tx'
}

export const validadoresCableado: Record<string, (s: SimState) => boolean> = {
  'cab-wan': (s) => {
    const c = s.esc.carriers
    if (c === 'ambos') return s.cables.tp === 'fg:wan' && s.cables.tx === 'fg:1'
    if (c === 'solo-tp') return s.cables.tp === 'fg:wan'
    return s.cables.tx === 'fg:wan'
  },
  'cab-forti-sw': (s) => s.cables.fga === `sw:${hojaEtiquetado.fortilink}`,
  'cab-vlan10': (s) => mal(s, ['interna']).length === 0,
  'cab-vlan40': (s) => mal(s, ['cocina', 'eth1']).length === 0,
  'cab-proveedores': (s) => cablesGrupo(s, ['proveedor']).every((c) => s.cables[c.id]?.startsWith('pl:')),
  'cab-pantallas': (s) => cablesGrupo(s, ['pantallas']).every((c) => s.cables[c.id]?.startsWith(`${modemPrincipal(s.esc)}:`)),
  'cab-extra': (s) =>
    s.esc.modemsExtra.every((ex) => s.cables[ex] === null) && !Object.values(s.cables).some((d) => d?.startsWith('ex1:') || d?.startsWith('ex2:')),
}

function pingOk(s: SimState, destino: string, iface?: string): boolean {
  return s.pings.some(
    (p) =>
      p.origen === 'pc' &&
      p.destino === destino &&
      p.conteo === PINGS_REQUERIDOS &&
      p.enviados === PINGS_REQUERIDOS &&
      p.recibidos === PINGS_REQUERIDOS &&
      (iface ? p.iface === iface : p.ipOrigen === s.esc.ipNueva.pc),
  )
}

const guiaTerminal = (host: 'pc' | 'hd' | 'lms') => ['nano-editor', 'term-input', 'desk-auth', 'desk-terminal', `scene-${host}`]
const guiaWeb = (...propios: string[]) => [...propios, 'browser-url', 'desk-firefox', 'lap-firefox', 'scene-laptop']

function cablesEnModem(s: SimState, m: 'tp' | 'tx'): string[] {
  return cablesDe(s.esc)
    .filter((d) => d.id !== 'lap' && ((d.desde.startsWith(`${m}:`) && s.cables[d.id]) || s.cables[d.id]?.startsWith(`${m}:`)))
    .map((d) => d.id)
}

function guiaSpeed(m: 'tp' | 'tx') {
  return (s: SimState) => {
    const c = condicionesSpeedtest(s, 'laptop')
    if (c.carrier !== m || c.conexion !== 'cable') return ['rack-cable-lap', 'lap-cable', 'lap-wifi', 'scene-rack']
    if (c.otros.length) return [...cablesEnModem(s, m).map((i) => `rack-cable-${i}`), 'scene-rack']
    return ['speed-captura', 'speed-go', 'browser-url', 'lap-firefox', 'scene-laptop']
  }
}

export const OBJETIVOS: Objetivo[] = [
  // ---------------- Fase 1
  {
    id: 'laptop-ip',
    fase: 1,
    equipos: ['laptop'],
    valida: laptopIpOk,
    guia: () => ['lap-ipv4', 'lap-red', 'scene-laptop'],
  },
  {
    id: 'laptop-cable',
    fase: 1,
    equipos: ['laptop'],
    valida: (s) => ['old', 'vlan10'].includes(dominioDePuerto(s.esc, s.cables.lap) ?? ''),
    guia: () => ['rack-cable-lap', 'lap-cable', 'scene-rack'],
  },
  // ---------------- Fase 2
  {
    id: 'libreta',
    fase: 2,
    equipos: [],
    valida: (s) => equiposConRespaldo.every((id) => normalizarIp(s.libreta[id] ?? '') === s.esc.ipVieja[id]),
    guia: () => ['libreta-btn', 'libreta-btn-mision', 'libreta-btn-movil'],
    progreso: (s) => ({
      hechos: equiposConRespaldo.filter((id) => normalizarIp(s.libreta[id] ?? '') === s.esc.ipVieja[id]).length,
      total: equiposConRespaldo.length,
    }),
  },
  // ---------------- Fase 3
  {
    id: 'bio-ip',
    fase: 3,
    equipos: ['bio'],
    valida: (s) => cfgIgual(s.disp.bio.pendiente ?? s.disp.bio.activa, cfgNueva(s.esc, 'bio')),
    guia: () => guiaWeb('bio-form', 'bio-menu-tcpip', 'bio-menu-setting', 'bio-login'),
  },
  {
    id: 'bio-reinicio',
    fase: 3,
    equipos: ['bio'],
    requiere: ['bio-ip'],
    valida: (s) => cfgIgual(s.disp.bio.activa, cfgNueva(s.esc, 'bio')) && !s.disp.bio.reiniciandoHasta,
    guia: () => guiaWeb('bio-reboot-btn', 'bio-menu-reboot', 'bio-menu-terminal', 'bio-login'),
  },
  {
    id: 'tel-ip',
    fase: 3,
    equipos: ['tel'],
    valida: (s) => {
      const d = s.disp.tel
      return cfgIgual(d.activa, cfgNueva(s.esc, 'tel')) && !d.dhcp && !!d.dnsEstatico && d.dns1 === telefonoDns.primario && d.dns2 === telefonoDns.secundario && !d.reiniciandoHasta
    },
    guia: () => [...guiaWeb('tel-reboot-ok', 'tel-form', 'tel-sub-basic', 'tel-tab-network', 'tel-login').slice(0, -3), 'tel-tecla-menu', 'desk-firefox', 'lap-firefox', 'scene-tel'],
  },
  {
    id: 'hme-ip',
    fase: 3,
    equipos: ['hme'],
    valida: (s) => cfgIgual(s.disp.hme.activa, cfgNueva(s.esc, 'hme')),
    guia: (s) =>
      s.esc.hmeModelo === 60
        ? guiaWeb('hme60-form', 'hme60-local', 'hme60-network', 'hme60-installer', 'hme60-burger')
        : guiaWeb('hme50-form', 'hme50-edit', 'hme50-tab-cun', 'hme50-login', 'hme50-security', 'hme50-installer', 'hme50-settings', 'hme50-gear'),
  },
  {
    id: 'imp-ip',
    fase: 3,
    equipos: ['imp'],
    valida: (s) => {
      const d = s.disp.imp
      return cfgIgual(d.activa, cfgNueva(s.esc, 'imp')) && !!d.manual && (d.via === 'panel' || (!d.ipv6 && !!d.sesionCerrada)) && !d.reiniciandoHasta
    },
    guia: () => [
      'imp-desconexion',
      'imp-form',
      'imp-menu-red',
      'imp-menu-config',
      'imp-login',
      'imp-panel-form',
      'imp-panel-cambiar',
      'imp-panel-tcpip',
      'imp-panel-ajustes',
      'browser-url',
      'desk-firefox',
      'lap-firefox',
      'scene-imp',
    ],
  },
  // ---------------- Fase 4
  {
    id: 'conf-fingerprint',
    fase: 4,
    equipos: ['pc', 'bio'],
    requiere: ['bio-reinicio'],
    valida: (s) => {
      const v = validarConf(archivo(s, 'pc', '/ph/fingerprint/etc/fingerprint.conf'), confFingerprint(s.esc.ipVieja.bio), s.esc.ipNueva.bio)
      return v.ipOk && !v.credencialesCambiadas && v.otrosCambios.length === 0
    },
    guia: () => guiaTerminal('pc'),
  },
  {
    id: 'conf-timer',
    fase: 4,
    equipos: ['pc', 'hme'],
    requiere: ['hme-ip'],
    valida: (s) => {
      const v = validarConf(archivo(s, 'pc', '/ph/timer/etc/timer.conf'), confTimer(s.esc.ipVieja.hme, s.esc.ceco), s.esc.ipNueva.hme)
      return v.ipOk && !v.credencialesCambiadas && v.otrosCambios.length === 0
    },
    guia: () => guiaTerminal('pc'),
  },
  // ---------------- Fase 5
  ...(['hd', 'lms'] as const).flatMap((h): Objetivo[] => [
    {
      id: `${h}-archivo`,
      fase: 5,
      equipos: [h],
      requiere: ['bio-reinicio', 'tel-ip', 'hme-ip', 'imp-ip'],
      valida: (s) => validarEth0(parsearInterfaces(archivo(s, h, '/etc/network/interfaces')), cfgNueva(s.esc, h)).ok,
      guia: () => guiaTerminal(h),
    },
    {
      id: `${h}-reinicio`,
      fase: 5,
      equipos: [h],
      requiere: [`${h}-archivo`],
      valida: (s) => cfgIgual(s.linux[h].red.eth0, cfgNueva(s.esc, h)) && hostArriba(s, h),
      guia: () => guiaTerminal(h),
    },
  ]),
  // ---------------- Fase 6
  {
    id: 'pc-archivo',
    fase: 6,
    equipos: ['pc'],
    requiere: ['bio-reinicio', 'tel-ip', 'hme-ip', 'imp-ip', 'conf-fingerprint', 'conf-timer', 'hd-reinicio', 'lms-reinicio'],
    valida: (s) => {
      const inter = parsearInterfaces(archivo(s, 'pc', '/etc/network/interfaces'))
      const ec = estadoCocina(inter, pcRedCocina)
      return validarEth0(inter, cfgNueva(s.esc, 'pc')).ok && (ec === 'alias-intacto' || ec === 'eth1-correcto')
    },
    guia: () => guiaTerminal('pc'),
  },
  {
    id: 'pc-reinicio',
    fase: 6,
    equipos: ['pc'],
    requiere: ['bio-reinicio', 'tel-ip', 'hme-ip', 'imp-ip', 'conf-fingerprint', 'conf-timer', 'hd-reinicio', 'lms-reinicio', 'pc-archivo'],
    valida: (s) => cfgIgual(s.linux.pc.red.eth0, cfgNueva(s.esc, 'pc')) && hostArriba(s, 'pc'),
    guia: () => guiaTerminal('pc'),
  },
  // ---------------- Fase 7
  {
    id: 'nic-hw',
    fase: 7,
    equipos: ['pc'],
    valida: (s) => {
      const hw = s.hw
      const montado = !hw.tapaAbierta && hw.tornillos && hw.corriente && s.linux.pc.encendida
      if (s.esc.pcRanuraPci) return hw.tarjetaInstalada && hw.tarjetaAtornillada && hw.cableEth1 && montado
      return hw.realtek && hw.cableEth1 && montado
    },
    guia: () => ['bios-pantalla', 'post-teclas', 'hw-accion', 'hw-tab', 'scene-pc'],
  },
  {
    id: 'pc-eth1',
    fase: 7,
    equipos: ['pc'],
    requiere: ['nic-hw'],
    valida: (s) => {
      const r = s.linux.pc.red
      const inter = parsearInterfaces(archivo(s, 'pc', '/etc/network/interfaces'))
      return (
        hayEth1(s) &&
        !!r.eth1 &&
        r.eth1.ip === pcRedCocina.ip &&
        r.eth1.mascara === pcRedCocina.mascara &&
        !r.alias &&
        estadoCocina(inter, pcRedCocina) === 'eth1-correcto' &&
        hostArriba(s, 'pc')
      )
    },
    guia: () => guiaTerminal('pc'),
  },
  // ---------------- Fase 8
  {
    id: 'cab-wan',
    fase: 8,
    equipos: ['rack', 'tp', 'tx'],
    requiere: ['pc-reinicio'],
    valida: validadoresCableado['cab-wan'],
    guia: (s) => {
      const ids: string[] = []
      const c = s.esc.carriers
      if (c !== 'solo-telmex' && s.cables.tp !== 'fg:wan') ids.push('tp')
      if (c === 'ambos' && s.cables.tx !== 'fg:1') ids.push('tx')
      if (c === 'solo-telmex' && s.cables.tx !== 'fg:wan') ids.push('tx')
      return [...ids.map((i) => `rack-cable-${i}`), 'scene-rack']
    },
  },
  {
    id: 'cab-forti-sw',
    fase: 8,
    equipos: ['rack'],
    requiere: ['pc-reinicio'],
    valida: validadoresCableado['cab-forti-sw'],
    guia: () => ['rack-cable-fga', 'scene-rack'],
  },
  {
    id: 'cab-vlan10',
    fase: 8,
    equipos: ['rack'],
    requiere: ['pc-reinicio'],
    valida: validadoresCableado['cab-vlan10'],
    guia: (s) => guiaCables(mal(s, ['interna']).map((c) => c.id)),
    progreso: (s) => {
      const t = cablesGrupo(s, ['interna'])
      return { hechos: t.length - mal(s, ['interna']).length, total: t.length }
    },
  },
  {
    id: 'cab-vlan40',
    fase: 8,
    equipos: ['rack', 'vlan40'],
    requiere: ['pc-reinicio'],
    valida: validadoresCableado['cab-vlan40'],
    guia: (s) => guiaCables(mal(s, ['cocina', 'eth1']).map((c) => c.id)),
    progreso: (s) => {
      const t = cablesGrupo(s, ['cocina', 'eth1'])
      return { hechos: t.length - mal(s, ['cocina', 'eth1']).length, total: t.length }
    },
  },
  {
    id: 'cab-proveedores',
    fase: 8,
    equipos: ['rack'],
    valida: validadoresCableado['cab-proveedores'],
    guia: (s) => guiaCables(cablesGrupo(s, ['proveedor']).filter((c) => !s.cables[c.id]?.startsWith('pl:')).map((c) => c.id)),
  },
  {
    id: 'cab-pantallas',
    fase: 8,
    equipos: ['rack'],
    valida: validadoresCableado['cab-pantallas'],
    guia: () => ['rack-cable-pp15', 'scene-rack'],
  },
  {
    id: 'cab-extra',
    fase: 8,
    equipos: ['rack'],
    aplica: (esc) => esc.modemsExtra.length > 0,
    valida: validadoresCableado['cab-extra'],
    guia: (s) => [...s.esc.modemsExtra.filter((ex) => s.cables[ex] !== null).map((ex) => `rack-cable-${ex}`), 'scene-rack'],
  },
  {
    id: 'telmex-ip',
    fase: 8,
    equipos: ['tx'],
    aplica: tieneTelmex,
    valida: (s) => s.telmexLan === ipEsperadaTelmex(s.esc),
    guia: (s) => {
      const lc = configLaptop(s)
      if (lc.dominio !== 'modem:tx') return ['rack-cable-lap', 'lap-cable', 'scene-rack']
      if (!(lc.ip && mismaRed(lc.ip, s.telmexLan, lc.mascara))) return ['lap-ipv4', 'lap-red', 'scene-laptop']
      return ['tx-form', 'tx-menu-lan', 'tx-login', 'browser-url', 'lap-firefox', 'scene-laptop']
    },
  },
  {
    id: 'etiquetas',
    fase: 8,
    equipos: ['tp', 'tx'],
    valida: (s) =>
      (!tieneTp(s.esc) || s.etiquetas.tp === 'L5-ONT') &&
      (!tieneTelmex(s.esc) || s.etiquetas.tx === 'L6-ONT') &&
      !s.esc.modemsExtra.some((ex) => s.etiquetas[ex]),
    guia: (s) => [
      ...(tieneTp(s.esc) && s.etiquetas.tp !== 'L5-ONT' ? ['rack-etiqueta-tp'] : []),
      ...(tieneTelmex(s.esc) && s.etiquetas.tx !== 'L6-ONT' ? ['rack-etiqueta-tx'] : []),
      'scene-rack',
    ],
  },
  // ---------------- Fase 9
  {
    id: 'ping-internet',
    fase: 9,
    equipos: ['pc'],
    requiere: ['pc-reinicio', 'cab-wan', 'cab-forti-sw', 'cab-vlan10'],
    valida: (s) => pingOk(s, '8.8.8.8'),
    guia: () => guiaTerminal('pc'),
  },
  {
    id: 'ping-centrales',
    fase: 9,
    equipos: ['pc'],
    requiere: ['pc-reinicio', 'cab-wan', 'cab-forti-sw', 'cab-vlan10'],
    valida: (s) => pingOk(s, '192.168.101.216') && pingOk(s, '192.168.225.81'),
    guia: () => guiaTerminal('pc'),
  },
  {
    id: 'ping-equipos',
    fase: 9,
    equipos: ['bio', 'tel', 'hme', 'imp', 'digi', 'hd', 'lms'],
    requiere: ['pc-reinicio', 'cab-vlan10'],
    valida: (s) => (['bio', 'tel', 'hme', 'imp', 'digi', 'hd', 'lms'] as const).every((id) => pingOk(s, s.esc.ipNueva[id])),
    guia: () => guiaTerminal('pc'),
    progreso: (s) => ({
      hechos: (['bio', 'tel', 'hme', 'imp', 'digi', 'hd', 'lms'] as const).filter((id) => pingOk(s, s.esc.ipNueva[id])).length,
      total: 7,
    }),
  },
  {
    id: 'ping-vlan40',
    fase: 9,
    equipos: ['vlan40'],
    requiere: ['pc-eth1', 'cab-vlan40'],
    valida: (s) => ['10.10.10.18', '10.10.10.17', '10.10.10.95', '10.10.10.93', '10.10.10.53'].every((ip) => pingOk(s, ip, 'eth1')),
    guia: () => guiaTerminal('pc'),
    progreso: (s) => ({
      hechos: ['10.10.10.18', '10.10.10.17', '10.10.10.95', '10.10.10.93', '10.10.10.53'].filter((ip) => pingOk(s, ip, 'eth1')).length,
      total: 5,
    }),
  },
  // ---------------- Fase 10
  {
    id: 'speed-tp',
    fase: 10,
    equipos: ['tp', 'laptop'],
    aplica: tieneTp,
    requiere: ['ping-internet'],
    valida: (s) => s.speedtests.some((r) => r.carrier === 'tp' && r.valido && r.captura),
    guia: guiaSpeed('tp'),
  },
  {
    id: 'speed-telmex',
    fase: 10,
    equipos: ['tx', 'laptop'],
    aplica: tieneTelmex,
    requiere: ['ping-internet'],
    valida: (s) => s.speedtests.some((r) => r.carrier === 'tx' && r.valido && r.captura),
    guia: guiaSpeed('tx'),
  },
  {
    id: 'reconexion',
    fase: 10,
    equipos: ['rack'],
    requiere: ['speed-tp', 'speed-telmex'],
    valida: (s) =>
      Object.entries(validadoresCableado)
        .filter(([id]) => id !== 'cab-extra' || s.esc.modemsExtra.length > 0)
        .every(([, f]) => f(s)) &&
      (s.esc.carriers === 'solo-telmex' || s.speedtests.some((r) => r.carrier === 'tp' && r.valido && r.captura)) &&
      (s.esc.carriers === 'solo-tp' || s.speedtests.some((r) => r.carrier === 'tx' && r.valido && r.captura)),
    guia: (s) => {
      const ids = new Set<string>()
      for (const c of cablesDe(s.esc)) {
        if (c.id === 'lap') continue
        if (c.puertoHoja && !puertoCorrecto(s, c)) ids.add(c.id)
      }
      if (!validadoresCableado['cab-wan'](s)) ['tp', 'tx'].forEach((i) => ids.add(i))
      if (!validadoresCableado['cab-pantallas'](s)) ids.add('pp15')
      return [...[...ids].map((i) => `rack-cable-${i}`), 'scene-rack']
    },
  },
]

export const objetivoPorId = Object.fromEntries(OBJETIVOS.map((o) => [o.id, o])) as Record<string, Objetivo>

export function aplicaObjetivo(id: string, esc: Escenario): boolean {
  const o = objetivoPorId[id]
  return !!o && (!o.aplica || o.aplica(esc))
}

export function objetivosAplicables(esc: Escenario): Objetivo[] {
  return OBJETIVOS.filter((o) => !o.aplica || o.aplica(esc))
}

export function objetivoActual(s: SimState): Objetivo | null {
  return objetivosAplicables(s.esc).find((o) => !s.completados[o.id]) ?? null
}

export function progresoFase(s: SimState, fase: number) {
  const os = objetivosAplicables(s.esc).filter((o) => o.fase === fase)
  const hechos = os.filter((o) => s.completados[o.id]).length
  return { hechos, total: os.length }
}

/** Estado de cada equipo para el mini mapa. */
export type EstadoEquipo = 'ok' | 'error' | 'pendiente' | 'parcial'

export function estadoEquipo(s: SimState, equipo: string): EstadoEquipo {
  const os = objetivosAplicables(s.esc).filter((o) => o.equipos.includes(equipo))
  if (equipo === 'digi') {
    const okDigi = s.digiPrb && s.pings.some((p) => p.origen === 'pc' && p.destino === s.esc.ipNueva.digi && p.recibidos === PINGS_REQUERIDOS && p.conteo === PINGS_REQUERIDOS)
    if (s.errores.some((e) => e.equipo === 'digi') && !okDigi) return 'error'
    return okDigi ? 'ok' : s.digiPrb ? 'parcial' : 'pendiente'
  }
  if (!os.length) return 'pendiente'
  const hechos = os.filter((o) => s.completados[o.id]).length
  const conError = s.errores.some((e) => e.equipo === equipo)
  if (hechos === os.length) return 'ok'
  if (conError) return 'error'
  return hechos > 0 ? 'parcial' : 'pendiente'
}

