// Preguntas teóricas de opción múltiple que se intercalan en el modo examen.
import type { Escenario } from '../engine/tipos'
import { passwordPcGerencial } from './sucursal'

export interface Pregunta {
  id: string
  texto: string
  opciones: string[]
  correcta: number
  explicacion: string
}

type Fabrica = (esc: Escenario) => Pregunta

const fijas: Pregunta[] = [
  {
    id: 'tp-puerto',
    texto: '¿En qué puerto del FortiGate va el enlace de Totalplay?',
    opciones: ['PORT1', 'WAN', 'PORT-A', 'Puerto 48 del switch'],
    correcta: 1,
    explicacion: 'Totalplay siempre va al WAN; Telmex al PORT1.',
  },
  {
    id: 'telmex-puerto',
    texto: 'Con dos carriers, ¿a qué puerto del FortiGate se conecta Telmex?',
    opciones: ['WAN', 'PORT-A', 'PORT1', 'Cualquier LAN'],
    correcta: 2,
    explicacion: 'Telmex va al PORT1 y queda en DHCP.',
  },
  {
    id: 'porta',
    texto: '¿A dónde se conecta el PORT-A del FortiGate?',
    opciones: ['Al puerto 1 del switch', 'Al SW Plano', 'Al puerto 48 del switch', 'A la ONT de Totalplay'],
    correcta: 2,
    explicacion: 'PORT-A → puerto 48 del switch (FortiLink).',
  },
  {
    id: 'pc-final',
    texto: '¿Por qué la PC Gerencial se actualiza al final?',
    opciones: [
      'Porque es la más lenta en reiniciar',
      'Porque desde ella se configuran los demás: si cambia antes se pierde el acceso',
      'Porque PRB la configura de forma remota',
      'No importa el orden',
    ],
    correcta: 1,
    explicacion: 'Si la cambias antes, queda en otro segmento y ya no alcanza a los equipos pendientes.',
  },
  {
    id: 'etiqueta-tx',
    texto: '¿Qué etiqueta lleva el módem de Telmex?',
    opciones: ['L5-ONT', 'L6-ONT', 'WAN2', 'TX-01'],
    correcta: 1,
    explicacion: 'Totalplay L5-ONT, Telmex L6-ONT.',
  },
  {
    id: 'telmex-ip',
    texto: 'Con dos carriers, ¿qué IP LAN debe quedar en el módem Telmex?',
    opciones: ['192.168.1.254', '192.168.0.1', '10.10.10.1', 'La .1 del segmento nuevo'],
    correcta: 1,
    explicacion: 'Se cambia de 192.168.1.254 a 192.168.0.1.',
  },
  {
    id: 'interfaces-valores',
    texto: 'En /etc/network/interfaces, ¿qué valores de eth0 se actualizan?',
    opciones: [
      'Solo address',
      'address y gateway',
      'address, netmask, network, broadcast y gateway',
      'Todo, incluyendo eth0:1',
    ],
    correcta: 2,
    explicacion: 'Son cinco valores, y eth0:1 no se toca (salvo sustituirlo por eth1).',
  },
  {
    id: 'conf-cambio',
    texto: '¿Qué se cambia en fingerprint.conf y timer.conf?',
    opciones: ['Solo la IP', 'IP, usuario y contraseña', 'El puerto y la IP', 'Nada, se regeneran solos'],
    correcta: 0,
    explicacion: 'Solo la línea IP=. Cambiar usuario o contraseña es un error.',
  },
  {
    id: 'puerto-danado',
    texto: 'El puerto que indica la hoja de etiquetado está dañado. ¿Qué haces?',
    opciones: [
      'Lo conecto al SW Plano',
      'Lo conecto en cualquier puerto libre de la misma VLAN',
      'Lo dejo desconectado',
      'Lo conecto en el puerto 48',
    ],
    correcta: 1,
    explicacion: 'Regla: si no se puede el puerto de la hoja, cualquier puerto de la misma VLAN.',
  },
  {
    id: 'ping-esperado',
    texto: '¿Qué resultado esperas de ping -c 40 a un equipo bien configurado?',
    opciones: ['40 transmitted, 20 received', '40 transmitted, 40 received, 0% packet loss', '100% packet loss', 'Destination Host Unreachable'],
    correcta: 1,
    explicacion: '40/40 y 0% de pérdida.',
  },
  {
    id: 'hme-campos',
    texto: 'En el HME, dentro de Control Unit Network, ¿qué campos cambias?',
    opciones: ['Todos', 'Solo IP Address y Gateway', 'Solo la máscara', 'IP, máscara y DNS'],
    correcta: 1,
    explicacion: 'Solo IP Address y Gateway; en el modelo 60 no requiere reinicio.',
  },
  {
    id: 'dns-yealink',
    texto: '¿Qué DNS se configuran en el teléfono Yealink?',
    opciones: ['8.8.8.8 primario y 1.1.1.1 secundario', '8.8.4.4 primario y 8.8.8.8 secundario', 'El gateway como DNS', 'Ninguno, queda en DHCP'],
    correcta: 1,
    explicacion: 'Static DNS On: primario 8.8.4.4 y secundario 8.8.8.8.',
  },
  {
    id: 'speedtest',
    texto: '¿Cómo debe estar conectada la laptop para el speedtest?',
    opciones: [
      'Por Wi-Fi del módem',
      'Por cable al switch de la tienda',
      'Por cable directo al módem, sin otros equipos usando la red',
      'Desde la PC Gerencial',
    ],
    correcta: 2,
    explicacion: 'Cable directo al módem y nadie más usando el enlace.',
  },
  {
    id: 'digi',
    texto: '¿Quién configura el Digi?',
    opciones: ['El técnico en sitio', 'El gerente de la tienda', 'PRB de forma remota', 'Se configura solo por DHCP'],
    correcta: 2,
    explicacion: 'Lo configura PRB; tú solo validas que responda.',
  },
  {
    id: 'bios-realtek',
    texto: 'Si la PC Gerencial no tiene ranura PCI, ¿qué habilitas en la BIOS?',
    opciones: ['Arranque por red (PXE)', 'Controladora de LAN Realtek', 'Modo AHCI', 'Wake on LAN'],
    correcta: 1,
    explicacion: 'Opciones avanzadas → Configuración de dispositivos incluidos → Controladora de LAN Realtek → Habilitado.',
  },
  {
    id: 'proveedores',
    texto: '¿A dónde se reconectan los equipos de proveedores?',
    opciones: ['Al puerto 47 del switch', 'Al SW Plano', 'Al PORT1 del FortiGate', 'A la ONT de Telmex'],
    correcta: 1,
    explicacion: 'Al SW Plano, sin asignación fija de puertos.',
  },
  {
    id: 'modem-extra',
    texto: '¿Qué haces con los módems adicionales?',
    opciones: ['Los conecto al SW Plano', 'Los dejo sin nada conectado', 'Los conecto al PORT1', 'Los etiqueto como L7-ONT'],
    correcta: 1,
    explicacion: 'Deben quedar sin nada conectado.',
  },
  {
    id: 'libreta',
    texto: '¿Para qué anotas la IP actual de cada equipo antes de cambiarla?',
    opciones: ['Para el inventario de PRB', 'Para poder hacer rollback si algo falla', 'Para el speedtest', 'No hace falta'],
    correcta: 1,
    explicacion: 'Es el respaldo para regresar el equipo a como estaba.',
  },
]

const dinamicas: Fabrica[] = [
  (esc) => {
    // CECO distinto al del examen para no regalar la contraseña
    const ceco = String(((Number(esc.ceco) * 7 + 113) % 900) + 100)
    const ok = passwordPcGerencial(ceco)
    const suma = ceco.split('').reduce((a, d) => a + Number(d), 0)
    const opciones = [ok, `${ceco}${suma}r`, `0${ceco}${suma}`, `0${ceco}${String(suma + 1).padStart(2, '0')}r`]
    return {
      id: 'pass-ceco',
      texto: `Con la regla de la PC Gerencial, ¿cuál es la contraseña para el CECO ${ceco}?`,
      opciones,
      correcta: 0,
      explicacion: `0 + ${ceco} + ${String(suma).padStart(2, '0')} + r = ${ok}`,
    }
  },
  (esc) => {
    const base = esc.nuevo.red.split('.').slice(0, 3).join('.')
    return {
      id: 'broadcast',
      texto: `Para el segmento ${esc.nuevo.red} con máscara 255.255.255.0, ¿cuál es el broadcast?`,
      opciones: [`${base}.0`, `${base}.1`, `${base}.255`, '255.255.255.255'],
      correcta: 2,
      explicacion: `Con /24 el broadcast es la .255: ${base}.255. La .0 es el network.`,
    }
  },
]

/** Mezcla determinista: rota las opciones para que la correcta no quede siempre en el mismo lugar. */
function rotar(p: Pregunta, n: number): Pregunta {
  const k = n % p.opciones.length
  const opciones = [...p.opciones.slice(k), ...p.opciones.slice(0, k)]
  const correcta = (p.correcta - k + p.opciones.length) % p.opciones.length
  return { ...p, opciones, correcta }
}

export function idsPreguntas(): string[] {
  return [...fijas.map((p) => p.id), 'pass-ceco', 'broadcast']
}

export function obtenerPregunta(id: string, esc: Escenario): Pregunta | null {
  const f = fijas.find((p) => p.id === id)
  const p = f ?? (id === 'pass-ceco' ? dinamicas[0](esc) : id === 'broadcast' ? dinamicas[1](esc) : null)
  if (!p) return null
  return rotar(p, esc.semilla + id.length)
}

/** Momentos del examen en los que aparece una pregunta (al completar estos objetivos). */
export const disparadoresPregunta = ['laptop-ip', 'libreta', 'imp-ip', 'pc-reinicio', 'cab-wan', 'ping-internet']
