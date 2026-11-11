// Construye el escenario (guiado o examen aleatorio) y las variables para los textos.
import { idsPreguntas } from '../data/preguntas'
import {
  carriers,
  credenciales,
  equiposRed,
  equiposVlan40,
  passwordPcGerencial,
  pasos,
  pcRedCocina,
  poolExamen,
  sucursalEjemplo,
} from '../data/sucursal'
import { base24, direccionBroadcast, hostEn } from '../lib/ip'
import { barajar, crearRng, elegir, entre } from '../lib/rng'
import { plantilla } from '../lib/util'
import type { EquipoId, Escenario, NetCfg, TextoPaso } from './tipos'

const IDS: EquipoId[] = ['pc', 'hd', 'lms', 'bio', 'tel', 'hme', 'imp', 'digi']

function ipsNuevas(red: string): Record<EquipoId, string> {
  const r = {} as Record<EquipoId, string>
  for (const id of IDS) r[id] = hostEn(red, equiposRed[id].hostNuevo)
  return r
}

export function escenarioGuiado(): Escenario {
  const e = sucursalEjemplo
  const ipVieja = {} as Record<EquipoId, string>
  for (const id of IDS) ipVieja[id] = hostEn(e.segmentoViejo.red, e.hostsViejos[id])
  return {
    semilla: 312,
    modo: 'guiado',
    nombre: e.nombre,
    ceco: e.ceco,
    passwordPc: passwordPcGerencial(e.ceco),
    viejo: { ...e.segmentoViejo },
    nuevo: { ...e.segmentoNuevo },
    hmeModelo: e.hmeModelo,
    pcRanuraPci: e.pcConRanuraPci,
    carriers: e.carriers,
    modemsExtra: e.modemsExtra >= 2 ? ['ex1', 'ex2'] : e.modemsExtra === 1 ? ['ex1'] : [],
    marcaImpresora: e.marcaImpresora,
    puertoDanado: e.puertoDanado,
    ipVieja,
    ipNueva: ipsNuevas(e.segmentoNuevo.red),
    telmexPassword: e.telmexPassword,
    ssidTp: e.ssidTp,
    ssidTx: e.ssidTx,
    preguntas: [],
    creado: Date.now(),
  }
}

const ALFANUM = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function escenarioExamen(semilla: number): Escenario {
  const rng = crearRng(semilla)
  const ceco = String(entre(rng, 100, 2999))
  const tercero = elegir(rng, poolExamen.tercerOctetoViejo)
  const gwHost = elegir(rng, [1, 254])
  const viejo = { red: `192.168.${tercero}.0`, mascara: '255.255.255.0', gateway: `192.168.${tercero}.${gwHost}` }
  const a = entre(rng, poolExamen.nuevoA[0], poolExamen.nuevoA[1])
  const b = entre(rng, poolExamen.nuevoB[0], poolExamen.nuevoB[1])
  const nuevo = { red: `10.${a}.${b}.0`, mascara: '255.255.255.0', gateway: `10.${a}.${b}.1` }

  // IPs viejas: el biométrico siempre termina en .4; los demás, aleatorios sin repetir.
  const usados = new Set<number>([gwHost, 4, 0, 255])
  const ipVieja = {} as Record<EquipoId, string>
  for (const id of IDS) {
    let h = id === 'bio' ? 4 : entre(rng, 5, 249)
    while (id !== 'bio' && usados.has(h)) h = entre(rng, 5, 249)
    usados.add(h)
    ipVieja[id] = `192.168.${tercero}.${h}`
  }

  const r = rng()
  const carriersEsc = r < 0.5 ? 'ambos' : r < 0.75 ? 'solo-tp' : 'solo-telmex'
  const extras = entre(rng, 0, 2)
  const puertosAsignados = [
    ...Object.values(equiposRed).map((e) => e.puerto),
    ...equiposVlan40.map((e) => e.puerto),
    pcRedCocina.puerto,
  ]
  const puertoDanado = rng() < 0.7 ? elegir(rng, puertosAsignados) : null
  const pass = Array.from({ length: 8 }, () => ALFANUM[Math.floor(rng() * ALFANUM.length)]).join('')
  const hex = () => Math.floor(rng() * 0xffff).toString(16).toUpperCase().padStart(4, '0')

  return {
    semilla,
    modo: 'examen',
    nombre: elegir(rng, poolExamen.nombres),
    ceco,
    passwordPc: passwordPcGerencial(ceco),
    viejo,
    nuevo,
    hmeModelo: rng() < 0.5 ? 50 : 60,
    pcRanuraPci: rng() < 0.5,
    carriers: carriersEsc,
    modemsExtra: extras === 2 ? ['ex1', 'ex2'] : extras === 1 ? ['ex1'] : [],
    marcaImpresora: rng() < 0.5 ? 'hp' : 'kyocera',
    puertoDanado,
    ipVieja,
    ipNueva: ipsNuevas(nuevo.red),
    telmexPassword: pass,
    ssidTp: `TOTALPLAY-${hex()}`,
    ssidTx: `INFINITUM${hex()}`,
    preguntas: barajar(rng, idsPreguntas()).slice(0, 6),
    creado: Date.now(),
  }
}

export const tieneTp = (esc: Escenario) => esc.carriers !== 'solo-telmex'
export const tieneTelmex = (esc: Escenario) => esc.carriers !== 'solo-tp'

/** IP LAN que debe quedar en el módem Telmex según el número de carriers. */
export function ipEsperadaTelmex(esc: Escenario): string {
  return esc.carriers === 'solo-telmex' ? carriers.totalplay.ipLan : carriers.telmex.ipLanNueva
}

export function cfgNueva(esc: Escenario, id: EquipoId): NetCfg {
  return { ip: esc.ipNueva[id], mascara: esc.nuevo.mascara, gateway: esc.nuevo.gateway }
}

export function cfgVieja(esc: Escenario, id: EquipoId): NetCfg {
  return { ip: esc.ipVieja[id], mascara: esc.viejo.mascara, gateway: esc.viejo.gateway }
}

export function variablesTexto(esc: Escenario): Record<string, string> {
  const v: Record<string, string> = {
    nombre: esc.nombre,
    ceco: esc.ceco,
    passPc: esc.passwordPc,
    'viejo.red': esc.viejo.red,
    'viejo.mascara': esc.viejo.mascara,
    'viejo.gateway': esc.viejo.gateway,
    'viejo.base': base24(esc.viejo.red),
    'nuevo.red': esc.nuevo.red,
    'nuevo.mascara': esc.nuevo.mascara,
    'nuevo.gateway': esc.nuevo.gateway,
    'nuevo.base': base24(esc.nuevo.red),
    'nuevo.broadcast': direccionBroadcast(esc.nuevo.red, esc.nuevo.mascara) ?? '',
    'hme.modelo': String(esc.hmeModelo),
    'tp.ip': carriers.totalplay.ipLan,
    'tx.ipInicial': carriers.telmex.ipLanInicial,
    'tx.ipNueva': ipEsperadaTelmex(esc),
    'eth1.ip': pcRedCocina.ip,
    'eth1.mascara': pcRedCocina.mascara,
    'puerto.eth1': String(pcRedCocina.puerto),
    danado: esc.puertoDanado ? String(esc.puertoDanado) : '(ninguno)',
    'cred.sysadmin': credenciales.pcGerencial.sysadmin,
    'cred.bio.usuario': credenciales.biometrico.usuario,
    'cred.bio.password': credenciales.biometrico.password,
    'cred.tel.usuario': credenciales.telefono.usuario,
    'cred.tel.password': credenciales.telefono.password,
    'cred.hme.usuario': credenciales.hme.usuario,
    'cred.hme.password': credenciales.hme.password,
    'cred.imp.usuario': credenciales.impresora.usuario,
    'cred.imp.password': credenciales.impresora.password,
    'cred.hd.sesion': credenciales.homeDelivery.sesion,
    'cred.lms.sesion': credenciales.lms.sesion,
  }
  for (const id of IDS) {
    v[`vieja.${id}`] = esc.ipVieja[id]
    v[`nueva.${id}`] = esc.ipNueva[id]
    v[`puerto.${id}`] = String(equiposRed[id].puerto)
  }
  return v
}

function claveVariante(esc: Escenario, variantes: Record<string, unknown>): string | null {
  const candidatas = [esc.hmeModelo === 50 ? 'hme50' : 'hme60', esc.pcRanuraPci ? 'pci' : 'bios', esc.carriers]
  return candidatas.find((c) => c in variantes) ?? null
}

/** Texto final de un paso para este escenario (variante elegida + variables reemplazadas). */
export function textoPaso(esc: Escenario, id: string): TextoPaso {
  const base = pasos[id]
  if (!base) return { titulo: id, que: [], porque: '' }
  let t: TextoPaso = { titulo: base.titulo, que: base.que, porque: base.porque, buscar: base.buscar, pistas: base.pistas }
  if (base.variantes) {
    const k = claveVariante(esc, base.variantes)
    if (k) {
      const v = base.variantes[k]
      t = { ...t, ...v, pistas: { ...(t.pistas ?? {}), ...(v.pistas ?? {}) } }
    }
  }
  const vars = variablesTexto(esc)
  const p = (x: string) => plantilla(x, vars)
  const pistas: Record<string, string> = {}
  for (const [k, val] of Object.entries(t.pistas ?? {})) pistas[k] = p(val)
  return { titulo: p(t.titulo), que: t.que.map(p), porque: p(t.porque), buscar: t.buscar ? p(t.buscar) : undefined, pistas }
}
