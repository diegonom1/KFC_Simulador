// Motor de estado: recibe acciones, aplica las reglas del procedimiento, registra errores
// y evalúa los objetivos (completado, fuera de orden). Lo usan el modo guiado y el examen.
import { catalogoErrores } from '../data/errores'
import { disparadoresPregunta, obtenerPregunta } from '../data/preguntas'
import { carriers, equiposRed, hojaEtiquetado, pcRedCocina, telefonoDns, vlanDePuerto } from '../data/sucursal'
import { normalizarIp } from '../lib/ip'
import { cablesDe, cablesIniciales, puertoOcupado, type CableDef } from './cables'
import { cfgNueva, cfgVieja, ipEsperadaTelmex, textoPaso, tieneTelmex, tieneTp } from './escenario'
import { confFingerprint, confTimer, validarConf } from './linux/conf'
import { aplicarArranque, estadoCocina, ipDeStanza, parsearInterfaces, validarEth0 } from './linux/interfaces'
import { archivosIniciales } from './linux/vfs'
import { cfgIgual, modemPrincipal, objetivosAplicables, progresoFase } from './objetivos'
import { enlaces, hayEth1, nodos } from './red'
import type { Accion, EquipoId, Escenario, HostLinux, LinuxEstado, NetCfg, PuertoId, RegistroError, SimState } from './tipos'

export const VERSION_ESTADO = 3
export const DURACION = { bio: 7000, tel: 10000, imp: 4500, digi: 6000, linux: 6500, hme: 0 }

export function crearEstado(esc: Escenario): SimState {
  const ahora = Date.now()
  const linux = {} as Record<HostLinux, LinuxEstado>
  for (const h of ['pc', 'hd', 'lms'] as HostLinux[]) {
    const archivos = archivosIniciales(esc, h)
    const { red } = aplicarArranque(archivos['/etc/network/interfaces'], false)
    linux[h] = { archivos, red, encendida: true, reiniciandoHasta: null, arranques: 0 }
  }
  const v = (id: EquipoId) => cfgVieja(esc, id)
  return {
    v: VERSION_ESTADO,
    esc,
    inicio: ahora,
    fin: null,
    ahora,
    disp: {
      bio: { activa: v('bio'), pendiente: null, reiniciandoHasta: null },
      tel: { activa: v('tel'), pendiente: null, reiniciandoHasta: null, dhcp: true, dnsEstatico: false, dns1: '', dns2: '' },
      hme: { activa: v('hme'), pendiente: null, reiniciandoHasta: null, dns1: '8.8.8.8', dns2: '8.8.4.4' },
      imp: { activa: v('imp'), pendiente: null, reiniciandoHasta: null, ipv6: true, manual: false },
      digi: { activa: v('digi'), pendiente: null, reiniciandoHasta: null },
    },
    linux,
    hw: {
      corriente: true,
      tornillos: true,
      tapaAbierta: false,
      tarjetaInstalada: false,
      tarjetaAtornillada: false,
      revisoRanuras: false,
      realtek: false,
      cableEth1: false,
    },
    laptop: { modo: 'dhcp', ip: '', mascara: '', gateway: '', dns: '', wifi: null },
    cables: cablesIniciales(esc),
    etiquetas: {},
    telmexLan: carriers.telmex.ipLanInicial,
    digiPrb: false,
    libreta: {},
    pings: [],
    speedtests: [],
    errores: [],
    completados: {},
    quiz: { pendientes: [], preguntadas: [], respuestas: {} },
    eventos: [],
    seq: 1,
    marcas: {},
  }
}

// ---------------------------------------------------------------------------
// utilidades internas
// ---------------------------------------------------------------------------
function evento(n: SimState, tipo: SimState['eventos'][number]['tipo'], ref: string, texto?: string, detalle?: string) {
  n.eventos.push({ id: n.seq++, tipo, ref, texto, detalle })
  if (n.eventos.length > 80) n.eventos.splice(0, n.eventos.length - 80)
}

function error(n: SimState, codigo: string, opts: { equipo?: string; extra?: string; unaVez?: string } = {}) {
  if (opts.unaVez) {
    if (n.marcas[opts.unaVez]) return
    n.marcas[opts.unaVez] = true
  }
  const def = catalogoErrores[codigo]
  if (!def) return
  const e: RegistroError = {
    id: n.seq++,
    t: n.ahora,
    codigo,
    titulo: def.titulo,
    detalle: def.detalle,
    correccion: def.correccion,
    equipo: opts.equipo,
    leve: def.leve,
    extra: opts.extra,
  }
  n.errores.push(e)
  evento(n, 'error', codigo, def.titulo, opts.extra)
}

function hash(t: string): string {
  let h = 0
  for (let i = 0; i < t.length; i++) h = (Math.imul(31, h) + t.charCodeAt(i)) | 0
  return (h >>> 0).toString(36)
}

const nombre = (id: string) => (id in equiposRed ? equiposRed[id as EquipoId].corto : id)

function revisarRespaldo(n: SimState, equipo: EquipoId) {
  if (normalizarIp(n.libreta[equipo] ?? '') !== n.esc.ipVieja[equipo]) {
    error(n, 'SIN_RESPALDO', { equipo, unaVez: `SIN_RESPALDO:${equipo}`, extra: `${nombre(equipo)} (IP actual ${n.esc.ipVieja[equipo]})` })
  }
}

/** Valida la configuración que el usuario guardó en un equipo. Devuelve true si es la de la tabla. */
function revisarCfg(n: SimState, equipo: EquipoId, cfg: NetCfg): boolean {
  const esp = cfgNueva(n.esc, equipo)
  if (cfg.ip !== esp.ip) {
    error(n, 'IP_INCORRECTA', { equipo, extra: `${nombre(equipo)}: capturaste ${cfg.ip || '(vacío)'} y la tabla dice ${esp.ip}.`, unaVez: `IP:${equipo}:${cfg.ip}` })
    return false
  }
  if (cfg.mascara !== esp.mascara || cfg.gateway !== esp.gateway) {
    error(n, 'MASCARA_GW', {
      equipo,
      extra: `${nombre(equipo)}: máscara ${cfg.mascara || '(vacía)'} / gateway ${cfg.gateway || '(vacío)'}; deben ser ${esp.mascara} / ${esp.gateway}.`,
      unaVez: `MGW:${equipo}:${cfg.mascara}:${cfg.gateway}`,
    })
    return false
  }
  return true
}

function arrancar(n: SimState, h: HostLinux) {
  const l = n.linux[h]
  const texto = l.archivos['/etc/network/interfaces'] ?? ''
  const antes = l.red.eth0
  const { red } = aplicarArranque(texto, h === 'pc' && hayEth1(n))
  l.red = red
  l.encendida = true
  l.reiniciandoHasta = n.ahora + DURACION.linux
  l.arranques++
  const inter = parsearInterfaces(texto)
  const nueva = cfgNueva(n.esc, h)
  const vieja = cfgVieja(n.esc, h)
  const v = validarEth0(inter, nueva)
  const sigueVieja = validarEth0(inter, vieja).ok
  if (!v.ok && !sigueVieja) {
    error(n, 'INTERFACES', { equipo: h, extra: `${nombre(h)}: ${v.problemas.join(' ')}`, unaVez: `INTERFACES:${h}:${hash(texto)}` })
  }
  if (h === 'pc') {
    const ec = estadoCocina(inter, pcRedCocina)
    if (ec === 'alias-modificado' || ec === 'eth1-incorrecto') error(n, 'ALIAS_MODIFICADO', { equipo: 'pc', unaVez: 'ALIAS_MODIFICADO' })
    if ((ec === 'eth1-correcto' || ec === 'eth1-incorrecto' || ec === 'ambos') && !hayEth1(n)) {
      error(n, 'ETH1_SIN_HW', { equipo: 'pc', unaVez: `ETH1_SIN_HW:${hash(texto)}` })
    }
    if (red.eth0?.ip === nueva.ip && !cfgIgual(antes, nueva)) {
      const pend = ['bio-reinicio', 'tel-ip', 'hme-ip', 'imp-ip', 'conf-fingerprint', 'conf-timer', 'hd-reinicio', 'lms-reinicio'].filter((id) => !n.completados[id])
      if (pend.length) {
        error(n, 'PC_ANTES', { equipo: 'pc', unaVez: 'PC_ANTES', extra: `Seguían pendientes: ${pend.map((id) => textoPaso(n.esc, id).titulo).join(' · ')}` })
      }
    }
  }
}

/** Reglas de cableado: devuelve el código de error (o null) para un cable en un puerto. */
export function problemaCable(esc: Escenario, def: CableDef, destino: PuertoId | null): { codigo: string; extra: string } | null {
  const [eq, num] = (destino ?? '').split(':')
  if (destino && (eq === 'ex1' || eq === 'ex2') && def.grupo !== 'extra') {
    return { codigo: 'MODEM_EXTRA', extra: `${def.nombre} quedó conectado a un módem adicional.` }
  }
  switch (def.grupo) {
    case 'interna':
    case 'cocina':
    case 'eth1': {
      if (eq !== 'sw' || !def.puertoHoja) return null
      const p = Number(num)
      const vEsp = vlanDePuerto(def.puertoHoja)
      if (p === hojaEtiquetado.fortilink) return { codigo: 'PUERTO_FORTILINK', extra: `${def.nombre} en el puerto 48.` }
      if (p === esc.puertoDanado) return { codigo: 'PUERTO_DANADO', extra: `El puerto ${p} está dañado (sin enlace).` }
      const vp = vlanDePuerto(p)
      if (vp !== vEsp) return { codigo: 'VLAN_INCORRECTA', extra: `${def.nombre} va en VLAN${vEsp} (puerto ${def.puertoHoja}); el puerto ${p} es VLAN${vp}.` }
      return null
    }
    case 'proveedor':
      if (eq === 'sw' || eq === 'fg') return { codigo: 'PROVEEDOR_RED', extra: `${def.nombre} conectado a la red de la tienda.` }
      return null
    case 'extra':
      if (destino && eq !== 'old') return { codigo: 'MODEM_EXTRA', extra: `${def.nombre} conectado a ${eq === 'sw' ? 'el switch nuevo' : eq === 'fg' ? 'el FortiGate' : 'otro equipo'}.` }
      return null
    case 'wan': {
      if (eq !== 'fg') return null
      const esperado = def.id === 'tp' ? 'wan' : esc.carriers === 'solo-telmex' ? 'wan' : '1'
      if (num !== esperado) {
        const nom = (x: string) => (x === 'wan' ? 'WAN' : x === 'a' ? 'PORT-A' : `PORT${x}`)
        return { codigo: 'WAN_INCORRECTO', extra: `${def.nombre} va al ${nom(esperado)} y lo pusiste en ${nom(num)}.` }
      }
      return null
    }
    case 'fortilink':
      if (eq === 'sw' && Number(num) !== hojaEtiquetado.fortilink) return { codigo: 'FORTILINK_INCORRECTO', extra: `PORT-A en el puerto ${num}.` }
      if (eq && eq !== 'sw') return { codigo: 'FORTILINK_INCORRECTO', extra: 'PORT-A debe ir al puerto 48 del switch.' }
      return null
    default:
      return null
  }
}

function revisarCableado(n: SimState, final: boolean) {
  for (const def of cablesDe(n.esc)) {
    const dest = n.cables[def.id]
    if (final) {
      // Al entregar: lo que no está donde debe
      let mal: string | null = null
      if ((def.grupo === 'interna' || def.grupo === 'cocina' || def.grupo === 'eth1') && def.puertoHoja) {
        const p = dest?.startsWith('sw:') ? Number(dest.slice(3)) : null
        const okHoja = p === def.puertoHoja && p !== n.esc.puertoDanado
        const okAlterno = def.puertoHoja === n.esc.puertoDanado && p !== null && p !== n.esc.puertoDanado && vlanDePuerto(p) === vlanDePuerto(def.puertoHoja)
        if (!okHoja && !okAlterno) mal = `${def.nombre}: quedó en ${dest ?? 'ningún puerto'}; la hoja dice puerto ${def.puertoHoja}.`
      } else if (def.grupo === 'proveedor' && !dest?.startsWith('pl:')) mal = `${def.nombre}: debe ir al SW Plano.`
      else if (def.grupo === 'extra' && dest) mal = `${def.nombre}: debe quedar sin nada conectado.`
      else if (def.grupo === 'pantallas' && !dest?.startsWith(`${modemPrincipal(n.esc)}:`)) mal = 'Pantallas de menú: deben ir a la ONT principal.'
      else if (def.grupo === 'fortilink' && dest !== 'sw:48') mal = 'PORT-A: debe ir al puerto 48 del switch.'
      else if (def.id === 'tp' && dest !== 'fg:wan') mal = 'Totalplay: debe ir al WAN del FortiGate.'
      else if (def.id === 'tx' && dest !== (n.esc.carriers === 'solo-telmex' ? 'fg:wan' : 'fg:1')) mal = `Telmex: debe ir al ${n.esc.carriers === 'solo-telmex' ? 'WAN' : 'PORT1'} del FortiGate.`
      if (mal) error(n, 'CABLEADO_FINAL', { extra: mal, unaVez: `FINAL:${def.id}` })
    } else if (dest) {
      const p = problemaCable(n.esc, def, dest)
      if (p) error(n, p.codigo, { extra: p.extra, unaVez: `${p.codigo}:${def.id}:${dest}` })
    }
  }
}

function etiquetaEsperada(modem: string): string | null {
  return modem === 'tp' ? carriers.totalplay.etiqueta : modem === 'tx' ? carriers.telmex.etiqueta : null
}

// ---------------------------------------------------------------------------
// evaluación de objetivos
// ---------------------------------------------------------------------------
function evaluar(n: SimState) {
  const aplicables = objetivosAplicables(n.esc)
  const ids = new Set(aplicables.map((o) => o.id))
  // El Digi lo reconfigura PRB cuando la tienda ya quedó en línea con el equipo nuevo.
  const digiCable = n.cables[`pp${equiposRed.digi.pp}`]
  if (!n.digiPrb && digiCable?.startsWith('sw:') && vlanDePuerto(Number(digiCable.slice(3))) === 10 && Number(digiCable.slice(3)) !== n.esc.puertoDanado && enlaces(n).internet && enlaces(n).fortilink) {
    n.digiPrb = true
    n.disp.digi.activa = cfgNueva(n.esc, 'digi')
    n.disp.digi.reiniciandoHasta = n.ahora + DURACION.digi
    evento(n, 'info', 'digi', 'PRB reconfiguró el Digi de forma remota', `Nueva IP: ${n.esc.ipNueva.digi}. Valídalo con ping al final.`)
  }
  for (const o of aplicables) {
    if (n.completados[o.id] || !o.valida(n)) continue
    const faltaban = (o.requiere ?? []).filter((r) => ids.has(r) && !n.completados[r])
    n.completados[o.id] = { t: n.ahora, fueraDeOrden: faltaban.length > 0, faltaban }
    evento(n, 'objetivo', o.id, textoPaso(n.esc, o.id).titulo)
    const pf = progresoFase(n, o.fase)
    if (pf.hechos === pf.total) evento(n, 'fase', String(o.fase))
    if (n.esc.modo === 'examen' && disparadoresPregunta.includes(o.id)) {
      const sig = n.esc.preguntas.find((q) => !n.quiz.preguntadas.includes(q))
      if (sig) {
        n.quiz.preguntadas.push(sig)
        n.quiz.pendientes.push(sig)
        evento(n, 'quiz', sig)
      }
    }
  }
  if (aplicables.every((o) => n.completados[o.id]) && !n.marcas.TODO_COMPLETO) {
    n.marcas.TODO_COMPLETO = true
    evento(n, 'fin', 'completo', '¡Completaste todos los objetivos!')
  }
}

function tick(s: SimState, ahora: number): SimState {
  const vence = (t: number | null) => t !== null && ahora >= t
  const hay = Object.values(s.disp).some((d) => vence(d.reiniciandoHasta)) || Object.values(s.linux).some((l) => vence(l.reiniciandoHasta))
  if (!hay) return s
  const n: SimState = structuredClone(s)
  n.ahora = ahora
  for (const d of Object.values(n.disp)) {
    if (vence(d.reiniciandoHasta)) {
      if (d.pendiente) {
        d.activa = d.pendiente
        d.pendiente = null
      }
      d.reiniciandoHasta = null
    }
  }
  for (const l of Object.values(n.linux)) if (vence(l.reiniciandoHasta)) l.reiniciandoHasta = null
  evaluar(n)
  return n
}

// ---------------------------------------------------------------------------
// reductor
// ---------------------------------------------------------------------------
export function reducir(s: SimState, a: Accion): SimState {
  if (a.tipo === 'TICK') return tick(s, a.ahora)
  if (s.fin && a.tipo !== 'QUIZ' && a.tipo !== 'SPEEDTEST_CAPTURA') return s
  const n: SimState = structuredClone(s)
  n.ahora = Date.now()
  aplicar(n, a)
  evaluar(n)
  return n
}

function aplicar(n: SimState, a: Accion) {
  const esc = n.esc
  switch (a.tipo) {
    case 'LAPTOP_RED': {
      n.laptop = { ...n.laptop, ...a.cfg }
      const l = n.laptop
      if (a.cfg.modo === 'estatica' || a.cfg.ip !== undefined) {
        if (l.modo === 'estatica' && l.ip) {
          // Repetida = la usa algún equipo que existe ahora mismo en la red (equipos, PCs, gateways, módems, cocina).
          const duenio = nodos(n).find((nd) => nd.id !== 'laptop' && nd.ip === l.ip)
          if (duenio) error(n, 'IP_DUPLICADA', { equipo: 'laptop', extra: `La IP ${l.ip} ya la usa ${duenio.nombre}.`, unaVez: `DUP:${l.ip}` })
          else if (!n.completados['laptop-ip'] && esc.modo === 'guiado') {
            const base = esc.viejo.red.split('.').slice(0, 3).join('.')
            if (!l.ip.startsWith(base + '.') || l.mascara !== esc.viejo.mascara) {
              error(n, 'IP_FUERA_SEGMENTO', { equipo: 'laptop', extra: `${l.ip} / ${l.mascara}: los equipos están en ${esc.viejo.red} / ${esc.viejo.mascara}.`, unaVez: `FUERA:${l.ip}:${l.mascara}` })
            }
          }
        }
      }
      break
    }
    case 'CABLE': {
      const defs = cablesDe(esc)
      const def = defs.find((d) => d.id === a.cable)
      if (!def) break
      if (a.destino && puertoOcupado(n.cables, defs, a.destino, a.cable)) break
      n.cables[a.cable] = a.destino
      if (esc.modo === 'guiado' && a.destino) {
        const p = problemaCable(esc, def, a.destino)
        if (p) error(n, p.codigo, { extra: p.extra, unaVez: `${p.codigo}:${def.id}:${a.destino}` })
        else if (def.puertoHoja && a.destino.startsWith('sw:')) {
          const pn = Number(a.destino.slice(3))
          if (pn !== def.puertoHoja && def.puertoHoja !== esc.puertoDanado) {
            evento(n, 'aviso', 'hoja', `La hoja dice puerto ${def.puertoHoja}`, `${def.nombre} va en el puerto ${def.puertoHoja} de la hoja de etiquetado. Solo se usa otro de la misma VLAN si ese no se puede.`)
          }
        }
      }
      break
    }
    case 'ETIQUETA': {
      if (a.etiqueta) n.etiquetas[a.modem] = a.etiqueta
      else delete n.etiquetas[a.modem]
      if (esc.modo === 'guiado' && a.etiqueta && a.etiqueta !== etiquetaEsperada(a.modem)) {
        error(n, 'ETIQUETA', { equipo: a.modem, extra: `Pusiste ${a.etiqueta} en ${a.modem === 'tp' ? 'Totalplay' : a.modem === 'tx' ? 'Telmex' : 'un módem adicional'}.`, unaVez: `ETQ:${a.modem}:${a.etiqueta}` })
      }
      break
    }
    case 'LIBRETA':
      n.libreta[a.equipo] = a.ip.trim()
      break
    case 'BIO_GUARDAR': {
      if (cfgIgual(a.cfg, n.disp.bio.activa)) break
      revisarRespaldo(n, 'bio')
      revisarCfg(n, 'bio', a.cfg)
      n.disp.bio.pendiente = { ...a.cfg }
      break
    }
    case 'BIO_REINICIAR':
      n.disp.bio.reiniciandoHasta = n.ahora + DURACION.bio
      break
    case 'TEL_GUARDAR': {
      const d = n.disp.tel
      if (a.estatica) {
        if (!cfgIgual(a.cfg, d.activa)) {
          revisarRespaldo(n, 'tel')
          revisarCfg(n, 'tel', a.cfg)
        }
        d.pendiente = { ...a.cfg }
      }
      d.dhcp = !a.estatica
      d.dnsEstatico = a.dnsEstatico
      d.dns1 = a.dns1.trim()
      d.dns2 = a.dns2.trim()
      if (a.estatica && (!a.dnsEstatico || d.dns1 !== telefonoDns.primario || d.dns2 !== telefonoDns.secundario)) {
        error(n, 'DNS_TEL', { equipo: 'tel', extra: `Static DNS ${a.dnsEstatico ? 'On' : 'Off'} · ${d.dns1 || '—'} / ${d.dns2 || '—'}`, unaVez: `DNS:${a.dnsEstatico}:${d.dns1}:${d.dns2}` })
      }
      if (a.reiniciar) d.reiniciandoHasta = n.ahora + DURACION.tel
      break
    }
    case 'TEL_REINICIAR':
      n.disp.tel.reiniciandoHasta = n.ahora + DURACION.tel
      break
    case 'HME_GUARDAR': {
      const d = n.disp.hme
      const original = cfgVieja(esc, 'hme')
      if (a.cfg.mascara !== original.mascara || a.dns1 !== d.dns1 || a.dns2 !== d.dns2) {
        error(n, 'HME_CAMPOS', { equipo: 'hme', extra: 'Cambiaste máscara o DNS.', unaVez: `HME:${a.cfg.mascara}:${a.dns1}:${a.dns2}` })
      }
      if (!cfgIgual(a.cfg, d.activa)) {
        revisarRespaldo(n, 'hme')
        const esp = cfgNueva(esc, 'hme')
        if (a.cfg.ip !== esp.ip) revisarCfg(n, 'hme', a.cfg)
        else if (a.cfg.gateway !== esp.gateway) revisarCfg(n, 'hme', { ...a.cfg, mascara: esp.mascara })
      }
      d.activa = { ...a.cfg }
      d.dns1 = a.dns1
      d.dns2 = a.dns2
      break
    }
    case 'IMP_GUARDAR': {
      const d = n.disp.imp
      if (!cfgIgual(a.cfg, d.activa)) {
        revisarRespaldo(n, 'imp')
        revisarCfg(n, 'imp', a.cfg)
      }
      d.manual = a.manual
      d.via = a.via
      if (a.via === 'web') {
        d.ipv6 = a.ipv6
        d.pendiente = { ...a.cfg }
        d.sesionCerrada = false
      } else {
        d.activa = { ...a.cfg }
        d.pendiente = null
        d.reiniciandoHasta = n.ahora + DURACION.imp
      }
      break
    }
    case 'IMP_DESCONEXION': {
      const d = n.disp.imp
      d.sesionCerrada = true
      if (d.pendiente) {
        d.activa = d.pendiente
        d.pendiente = null
        d.reiniciandoHasta = n.ahora + DURACION.imp
      }
      break
    }
    case 'DIGI_INTENTO':
      error(n, 'DIGI', { equipo: 'digi', unaVez: 'DIGI' })
      break
    case 'TELMEX_LAN': {
      if (!tieneTelmex(esc)) break
      const esperada = ipEsperadaTelmex(esc)
      if (a.ip !== esperada) error(n, 'TELMEX_IP', { equipo: 'tx', extra: `Pusiste ${a.ip}; debe ser ${esperada}.`, unaVez: `TXIP:${a.ip}` })
      n.telmexLan = a.ip
      break
    }
    case 'ARCHIVO': {
      const l = n.linux[a.host]
      if (a.contenido === null) {
        delete l.archivos[a.ruta]
        break
      }
      l.archivos[a.ruta] = a.contenido
      if (a.ruta === '/etc/network/interfaces') {
        const inter = parsearInterfaces(a.contenido)
        const addr = ipDeStanza(inter.ifaces.eth0)?.ip
        if (addr && addr !== esc.ipVieja[a.host]) revisarRespaldo(n, a.host)
        if (a.host === 'pc') {
          const ec = estadoCocina(inter, pcRedCocina)
          if (ec === 'alias-modificado' || ec === 'eth1-incorrecto') error(n, 'ALIAS_MODIFICADO', { equipo: 'pc', unaVez: 'ALIAS_MODIFICADO' })
        }
      }
      const fp = '/ph/fingerprint/etc/fingerprint.conf'
      const tm = '/ph/timer/etc/timer.conf'
      if (a.host === 'pc' && (a.ruta === fp || a.ruta === tm)) {
        const esBio = a.ruta === fp
        const original = esBio ? confFingerprint(esc.ipVieja.bio) : confTimer(esc.ipVieja.hme, esc.ceco)
        const esperada = esBio ? esc.ipNueva.bio : esc.ipNueva.hme
        const vieja = esBio ? esc.ipVieja.bio : esc.ipVieja.hme
        const v = validarConf(a.contenido, original, esperada)
        const archivoNombre = esBio ? 'fingerprint.conf' : 'timer.conf'
        if (v.credencialesCambiadas) error(n, 'CONF_CREDENCIALES', { equipo: esBio ? 'bio' : 'hme', extra: archivoNombre, unaVez: `CONFCRED:${a.ruta}` })
        if (!v.ipOk && v.ip !== vieja) error(n, 'CONF_IP', { equipo: esBio ? 'bio' : 'hme', extra: `${archivoNombre}: IP=${v.ip || '(vacío)'}; debe ser ${esperada}.`, unaVez: `CONFIP:${a.ruta}:${v.ip}` })
      }
      break
    }
    case 'LINUX_REINICIAR':
      arrancar(n, a.host)
      break
    case 'LINUX_APAGAR':
      n.linux[a.host].encendida = false
      n.linux[a.host].reiniciandoHasta = null
      break
    case 'LINUX_ENCENDER':
      if (a.host === 'pc' && !n.hw.corriente) break
      arrancar(n, a.host)
      break
    case 'HW': {
      const hw = n.hw
      const encendida = n.linux.pc.encendida
      switch (a.paso) {
        case 'quitar-corriente':
          if (encendida) {
            error(n, 'APAGADO_BRUSCO', { equipo: 'pc', unaVez: 'APAGADO_BRUSCO' })
            n.linux.pc.encendida = false
            n.linux.pc.reiniciandoHasta = null
          }
          hw.corriente = false
          break
        case 'poner-corriente':
          hw.corriente = true
          break
        case 'quitar-tornillos':
          hw.tornillos = false
          break
        case 'poner-tornillos':
          if (!hw.tapaAbierta) hw.tornillos = true
          break
        case 'abrir-tapa':
          if (hw.tornillos) break
          if (hw.corriente || encendida) error(n, 'ELECTRICO', { equipo: 'pc', unaVez: 'ELECTRICO' })
          hw.tapaAbierta = true
          break
        case 'cerrar-tapa':
          if (hw.tarjetaInstalada && !hw.tarjetaAtornillada) error(n, 'TARJETA_SIN_TORNILLO', { equipo: 'pc', unaVez: 'TARJETA_SIN_TORNILLO' })
          hw.tapaAbierta = false
          break
        case 'revisar-ranuras':
          hw.revisoRanuras = true
          break
        case 'insertar-tarjeta':
          if (!hw.tapaAbierta || !esc.pcRanuraPci) break
          if (hw.corriente) error(n, 'ELECTRICO', { equipo: 'pc', unaVez: 'ELECTRICO' })
          hw.tarjetaInstalada = true
          break
        case 'atornillar-tarjeta':
          if (hw.tarjetaInstalada) hw.tarjetaAtornillada = true
          break
        case 'conectar-red-eth1':
          if (esc.pcRanuraPci && !hw.tarjetaInstalada) break
          hw.cableEth1 = true
          break
        case 'desconectar-red-eth1':
          hw.cableEth1 = false
          break
      }
      break
    }
    case 'BIOS_GUARDAR':
      if (!esc.pcRanuraPci) n.hw.realtek = a.realtek
      if (a.cambiosExtra.length) error(n, 'BIOS_EXTRA', { equipo: 'pc', extra: a.cambiosExtra.join(', '), unaVez: `BIOS:${a.cambiosExtra.join('|')}` })
      arrancar(n, 'pc')
      break
    case 'PING':
      n.pings.push({ ...a.registro, id: n.seq++, t: n.ahora })
      if (n.pings.length > 400) n.pings.splice(0, n.pings.length - 400)
      break
    case 'SPEEDTEST': {
      n.speedtests.push({ ...a.registro, id: n.seq++, t: n.ahora })
      if (!a.registro.valido && a.registro.motivo) error(n, a.registro.motivo, { equipo: 'laptop', unaVez: `SPEED:${a.registro.motivo}:${a.registro.carrier}` })
      break
    }
    case 'SPEEDTEST_CAPTURA': {
      const r = n.speedtests.find((x) => x.id === a.id)
      if (r) r.captura = true
      break
    }
    case 'QUIZ': {
      const p = obtenerPregunta(a.id, esc)
      if (!p) break
      n.quiz.respuestas[a.id] = { opcion: a.opcion, correcta: a.opcion === p.correcta, t: n.ahora }
      n.quiz.pendientes = n.quiz.pendientes.filter((q) => q !== a.id)
      break
    }
    case 'AVISO':
      error(n, a.codigo, { equipo: a.equipo, extra: a.extra, unaVez: `AVISO:${a.codigo}:${a.extra ?? ''}` })
      break
    case 'RESCATAR': {
      const d = n.disp[a.equipo]
      d.activa = cfgVieja(esc, a.equipo)
      d.pendiente = null
      d.reiniciandoHasta = n.ahora + 3000
      if (a.equipo === 'tel') d.dhcp = true
      error(n, 'RESCATE', { equipo: a.equipo, extra: nombre(a.equipo) })
      break
    }
    case 'TERMINAR': {
      if (esc.modo === 'examen') {
        revisarCableado(n, true)
        for (const m of ['tp', 'tx', 'ex1', 'ex2'] as const) {
          const et = n.etiquetas[m]
          const esp = etiquetaEsperada(m)
          const existe = m === 'tp' ? tieneTp(esc) : m === 'tx' ? tieneTelmex(esc) : esc.modemsExtra.includes(m)
          if (existe && et && et !== esp) error(n, 'ETIQUETA', { equipo: m, extra: `${et} en ${m === 'tp' ? 'Totalplay' : m === 'tx' ? 'Telmex' : 'módem adicional'}.`, unaVez: `ETQF:${m}` })
        }
      }
      n.fin = n.ahora
      evento(n, 'fin', 'terminar')
      break
    }
  }
}

/** Restablece los cables a como estaban al inicio (útil para practicar el cableado de nuevo). */
export function cablesDeInicio(esc: Escenario) {
  return cablesIniciales(esc)
}

export { revisarCableado }
