/**
 * ============================================================================
 *  DATOS DE LA SUCURSAL — ARCHIVO ÚNICO DE CONFIGURACIÓN
 * ============================================================================
 *  Aquí viven TODOS los datos del simulador: IPs, credenciales, equipos,
 *  hoja de etiquetado, carriers y los textos de cada paso.
 *
 *  ⚠️  Son VALORES DE EJEMPLO para practicar. No son direcciones ni
 *      contraseñas reales. Reemplázalos libremente.
 *
 *  En los textos puedes usar variables entre llaves, por ejemplo
 *  {nueva.bio}, {vieja.pc}, {nuevo.gateway}, {ceco}, {passPc}.
 *  La lista completa está en src/engine/escenario.ts (variablesTexto).
 * ============================================================================
 */
import type { Carriers, EquipoId, MarcaImpresora, TextoPaso, Vlan40Id } from '../engine/tipos'

// ---------------------------------------------------------------------------
// Credenciales (placeholders de ejemplo, fáciles de reemplazar)
// ---------------------------------------------------------------------------
export const credenciales = {
  /** La contraseña de sesión de la PC Gerencial NO va aquí: se calcula con la regla del CECO. */
  pcGerencial: { usuarioSesion: 'tienda', sysadmin: 'demo123' },
  homeDelivery: { usuarioSesion: 'tienda', sesion: 'demo123', sysadmin: 'demo123' },
  lms: { usuarioSesion: 'tienda', sesion: 'demo123', sysadmin: 'demo123' },
  biometrico: { usuario: 'admin', password: 'demo123' },
  telefono: { usuario: 'admin', password: 'demo123' },
  hme: { perfil: 'Installer', usuario: 'installer', password: 'demo123' },
  impresora: { usuario: 'admin', password: 'demo123' },
  /** El usuario del módem Telmex siempre va en MAYÚSCULAS. La contraseña real viene en la etiqueta del módem. */
  telmex: { usuario: 'TELMEX', passwordEjemplo: 'demo4321' },
  laptop: { usuario: 'tecnico', password: 'demo123' },
}

/**
 * Regla de la contraseña de la PC Gerencial:
 *   0 + CECO + suma de los dígitos del CECO (a 2 dígitos) + r
 *   CECO 312 → 3+1+2 = 6 → "06" → 0 312 06 r → 031206r
 */
export function passwordPcGerencial(ceco: string): string {
  const suma = ceco.split('').reduce((acc, d) => acc + (Number(d) || 0), 0)
  return `0${ceco}${String(suma).padStart(2, '0')}r`
}

// ---------------------------------------------------------------------------
// Sucursal de ejemplo (la que usa el MODO GUIADO)
// ---------------------------------------------------------------------------
export const sucursalEjemplo = {
  nombre: 'Sucursal Demo Centro',
  ceco: '312',
  segmentoViejo: { red: '192.168.10.0', mascara: '255.255.255.0', gateway: '192.168.10.254' },
  segmentoNuevo: { red: '10.112.219.0', mascara: '255.255.255.0', gateway: '10.112.219.1' },
  hmeModelo: 60 as 50 | 60,
  pcConRanuraPci: true,
  carriers: 'ambos' as Carriers,
  marcaImpresora: 'hp' as MarcaImpresora,
  /** Cuántos módems "de más" aparecen en la repisa (deben quedar sin nada conectado). */
  modemsExtra: 1,
  /** Puerto del switch nuevo que viene dañado (null = ninguno). Enseña la regla "misma VLAN". */
  puertoDanado: 6 as number | null,
  telmexPassword: 'demo4321',
  ssidTp: 'TOTALPLAY-7F3A',
  ssidTx: 'INFINITUM8C21',
  /** Último octeto de la IP vieja de cada equipo (segmento viejo). */
  hostsViejos: { pc: 10, hd: 11, lms: 12, bio: 4, tel: 37, hme: 50, imp: 40, digi: 60 } as Record<EquipoId, number>,
}

// ---------------------------------------------------------------------------
// Equipos de la red interna (VLAN10). hostNuevo = último octeto en el segmento nuevo.
// pp = puerto del patch panel donde llega su nodo; puerto = puerto del switch según la hoja.
// ---------------------------------------------------------------------------
export interface EquipoDef {
  nombre: string
  corto: string
  hostNuevo: number
  pp: number
  puerto: number
  hostname?: string
}

export const equiposRed: Record<EquipoId, EquipoDef> = {
  pc: { nombre: 'PC Gerencial / Servidor', corto: 'PC Gerencial', hostNuevo: 10, pp: 1, puerto: 1, hostname: 'pc-gerencial' },
  hd: { nombre: 'Home Delivery', corto: 'Home Delivery', hostNuevo: 11, pp: 3, puerto: 2, hostname: 'home-delivery' },
  lms: { nombre: 'LMS', corto: 'LMS', hostNuevo: 12, pp: 4, puerto: 3, hostname: 'lms' },
  bio: { nombre: 'Biométrico', corto: 'Biométrico', hostNuevo: 4, pp: 5, puerto: 4 },
  tel: { nombre: 'Teléfono IP Yealink T30P', corto: 'Teléfono IP', hostNuevo: 5, pp: 6, puerto: 5 },
  hme: { nombre: 'HME (temporizador Drive-Thru)', corto: 'HME', hostNuevo: 6, pp: 7, puerto: 6 },
  imp: { nombre: 'Impresora multifuncional', corto: 'Impresora', hostNuevo: 7, pp: 8, puerto: 7 },
  digi: { nombre: 'Digi (lo administra PRB)', corto: 'Digi', hostNuevo: 8, pp: 9, puerto: 8 },
}

/** Orden en que se muestran los equipos en tablas y libreta. */
export const ordenEquipos: EquipoId[] = ['bio', 'tel', 'hme', 'imp', 'digi', 'hd', 'lms', 'pc']

/** Equipos cuya IP actual hay que anotar en la libreta antes de cambiarla. */
export const equiposConRespaldo: EquipoId[] = ['bio', 'tel', 'hme', 'imp', 'hd', 'lms', 'pc']

// ---------------------------------------------------------------------------
// Equipos de cocina / KDS (VLAN40). Sus IPs NO cambian: solo se validan con ping.
// ---------------------------------------------------------------------------
export const equiposVlan40: Array<{ id: Vlan40Id; nombre: string; ip: string; pp: number; puerto: number; descripcion: string }> = [
  { id: 'sus2', nombre: 'Sus 02', ip: '10.10.10.18', pp: 11, puerto: 27, descripcion: 'Pantalla de servicio 2' },
  { id: 'sus1', nombre: 'Sus 01', ip: '10.10.10.17', pp: 10, puerto: 26, descripcion: 'Pantalla de servicio 1' },
  { id: 'pkd2', nombre: 'PKDs L2', ip: '10.10.10.95', pp: 13, puerto: 29, descripcion: 'Pantalla de cocina línea 2' },
  { id: 'pkd1', nombre: 'PKDs L1', ip: '10.10.10.93', pp: 12, puerto: 28, descripcion: 'Pantalla de cocina línea 1' },
  { id: 'iemp', nombre: 'I.Emp Delivery', ip: '10.10.10.53', pp: 14, puerto: 30, descripcion: 'Impresora de empaque Delivery' },
]

export const redVlan40 = { red: '10.10.10.0', mascara: '255.255.255.0', gateway: '10.10.10.1' }

/** Parámetros del alias eth0:1 de la PC Gerencial (red de cocina). Pasan tal cual a eth1. */
export const pcRedCocina = { ip: '10.10.10.10', mascara: '255.255.255.0', pp: 2, puerto: 25 }

// ---------------------------------------------------------------------------
// Validación final con ping -c 40 desde la PC Gerencial
// ---------------------------------------------------------------------------
export const destinosValidacion = [
  { ip: '8.8.8.8', nombre: 'Internet', tipo: 'internet' as const },
  { ip: '192.168.101.216', nombre: 'Servicio central PRB 1', tipo: 'central' as const },
  { ip: '192.168.225.81', nombre: 'Servicio central PRB 2', tipo: 'central' as const },
]
export const PINGS_REQUERIDOS = 40

// ---------------------------------------------------------------------------
// Otros cables del patch panel
// ---------------------------------------------------------------------------
export const proveedores = [
  { id: 'cctv', nombre: 'DVR de cámaras (proveedor)', corto: 'DVR', pp: 16 },
  { id: 'musica', nombre: 'Música ambiental (proveedor)', corto: 'Música', pp: 17 },
]
export const pantallasMenu = { nombre: 'Pantallas de menú (switch plano de barra)', corto: 'Menú barra', pp: 15 }

// ---------------------------------------------------------------------------
// Hoja de etiquetado del switch nuevo (48 puertos)
// ---------------------------------------------------------------------------
export const hojaEtiquetado = {
  vlans: [
    { id: 10, nombre: 'Red interna', color: '#38bdf8', desde: 1, hasta: 24 },
    { id: 40, nombre: 'Cocina / KDS', color: '#fb923c', desde: 25, hasta: 40 },
    { id: 30, nombre: 'Wi-Fi / APs', color: '#a78bfa', desde: 41, hasta: 46 },
    { id: 1, nombre: 'Administración', color: '#94a3b8', desde: 47, hasta: 47 },
  ],
  /** Puerto reservado para el PORT-A del FortiGate (FortiLink). */
  fortilink: 48,
}

export function vlanDePuerto(p: number): number | null {
  if (p === hojaEtiquetado.fortilink) return null
  return hojaEtiquetado.vlans.find((v) => p >= v.desde && p <= v.hasta)?.id ?? null
}

// ---------------------------------------------------------------------------
// Carriers
// ---------------------------------------------------------------------------
export const carriers = {
  totalplay: {
    nombre: 'Totalplay',
    corto: 'TP',
    etiqueta: 'L5-ONT',
    puertoFortigate: 'WAN',
    /** "Direccionamiento de TP" (ejemplo): IP LAN que entrega la ONT de Totalplay. */
    ipLan: '192.168.100.1',
  },
  telmex: {
    nombre: 'Telmex',
    corto: 'Telmex',
    etiqueta: 'L6-ONT',
    puertoFortigate: 'PORT1',
    ipLanInicial: '192.168.1.254',
    /** IP LAN que debe quedar en el módem Telmex cuando hay dos carriers. */
    ipLanNueva: '192.168.0.1',
  },
  /** Si solo hay Telmex: va al WAN y su LAN se configura con el direccionamiento de TP. */
  reglaSoloTelmex: { puertoFortigate: 'WAN' as const },
}

export const telefonoDns = { primario: '8.8.4.4', secundario: '8.8.8.8' }

// ---------------------------------------------------------------------------
// Datos para generar exámenes aleatorios
// ---------------------------------------------------------------------------
export const poolExamen = {
  nombres: [
    'Sucursal Plaza Norte',
    'Sucursal Av. Juárez',
    'Sucursal Las Torres',
    'Sucursal Mirador',
    'Sucursal Galerías',
    'Sucursal Centro Histórico',
    'Sucursal Río Bravo',
    'Sucursal Los Pinos',
    'Sucursal Universidad',
    'Sucursal Aeropuerto',
    'Sucursal Insurgentes',
    'Sucursal Valle Oriente',
  ],
  /** Tercer octeto posible del segmento viejo 192.168.X.0/24 */
  tercerOctetoViejo: [2, 10, 20, 30, 50, 80, 150, 200],
  /** Rango del segundo y tercer octeto del segmento nuevo 10.A.B.0/24 */
  nuevoA: [100, 140] as [number, number],
  nuevoB: [1, 254] as [number, number],
}

// ---------------------------------------------------------------------------
// Fases del procedimiento (orden correcto)
// ---------------------------------------------------------------------------
export const fases = [
  { n: 1, titulo: 'Preparar la laptop', corto: 'Laptop' },
  { n: 2, titulo: 'Respaldo: anotar IPs actuales', corto: 'Respaldo' },
  { n: 3, titulo: 'Reconfigurar equipos', corto: 'Equipos' },
  { n: 4, titulo: 'Sincronizar la PC Gerencial', corto: 'Sincronizar' },
  { n: 5, titulo: 'Home Delivery y LMS', corto: 'HD / LMS' },
  { n: 6, titulo: 'PC Gerencial (siempre al final)', corto: 'PC Gerencial' },
  { n: 7, titulo: 'Tarjeta de red / BIOS', corto: 'Tarjeta' },
  { n: 8, titulo: 'Interconexión física y etiquetado', corto: 'Física' },
  { n: 9, titulo: 'Validación con ping -c 40', corto: 'Ping' },
  { n: 10, titulo: 'Speedtest y evidencias', corto: 'Speedtest' },
]

// ---------------------------------------------------------------------------
// Textos de cada paso (modo guiado). "variantes" se elige según el escenario:
// hme50 / hme60, pci / bios, ambos / solo-tp / solo-telmex.
// ---------------------------------------------------------------------------
export const pasos: Record<string, TextoPaso & { variantes?: Record<string, Partial<TextoPaso>> }> = {
  'laptop-ip': {
    titulo: 'Ponle IP fija a la laptop',
    que: [
      'Haz clic en la laptop del técnico (en la oficina, junto al rack).',
      'Abre "Configuración de red" en la barra de tareas.',
      'Elige "Usar la siguiente dirección IP" y captura una IP LIBRE del segmento actual {viejo.red}, máscara {viejo.mascara} y puerta de enlace {viejo.gateway}.',
      'Ejemplo de IP libre: {viejo.base}.200 (ningún equipo la usa).',
    ],
    porque:
      'Los equipos todavía viven en el segmento viejo. Tu laptop tiene que estar en ese mismo segmento y con la misma máscara para abrir sus páginas. Si repites una IP que ya usa otro equipo habrá conflicto y nada va a cargar.',
    buscar: 'El ícono de red de la barra de tareas de la laptop.',
    pistas: {
      'lap-ipv4': 'Marca "Usar la siguiente dirección IP", llena IP, máscara y puerta de enlace, y da Aceptar.',
      'lap-red': 'Abre la configuración de red de la laptop.',
      'scene-laptop': 'Haz clic en la laptop del técnico.',
    },
  },
  'laptop-cable': {
    titulo: 'Conecta la laptop al switch',
    que: [
      'Abre el rack (clic en el gabinete de la oficina).',
      'Arrastra el conector BLANCO del cable de la laptop a un puerto libre del switch anterior (por ejemplo el 20), que es donde todavía están los equipos.',
    ],
    porque: 'Con IP fija pero sin cable no hay comunicación. La laptop debe quedar en la misma red física que los equipos que vas a configurar.',
    buscar: 'El cable blanco que sale de la laptop, a la derecha del rack.',
    pistas: {
      'rack-cable-lap': 'Arrastra este conector a un puerto libre del switch anterior (abajo del rack).',
      'lap-cable': 'También puedes elegir aquí a dónde va el cable.',
      'scene-rack': 'Abre el rack.',
    },
  },
  libreta: {
    titulo: 'Anota la IP actual de cada equipo',
    que: [
      'Abre la Libreta (botón de arriba). Ahí ya viene la IP nueva de cada equipo.',
      'Busca la IP actual de cada uno y anótala:',
      '• PC Gerencial, Home Delivery y LMS: abre su terminal (Ctrl+T) y escribe ip a.',
      '• Biométrico: termina en .4 (también aparece en fingerprint.conf).',
      '• Teléfono: en su pantalla, Menú → Status.',
      '• HME: en /ph/timer/etc/timer.conf de la PC Gerencial (cat).',
      '• Impresora: en su panel, Ajustes → TCP/IP.',
    ],
    porque:
      'Es tu plan de regreso (rollback). Si algo falla después del cambio, necesitas saber a qué IP regresar cada equipo. Cambiar un equipo sin haberlo anotado cuenta como error.',
    buscar: 'El botón "Libreta" en la barra superior.',
    pistas: { 'libreta-btn': 'Abre la libreta y llena la columna "IP actual".', 'libreta-btn-mision': 'Abre la libreta.', 'libreta-btn-movil': 'Abre el menú y luego la libreta.' },
  },
  'bio-ip': {
    titulo: 'Biométrico: cambia la IP',
    que: [
      'Abre Firefox (en la laptop o en la PC Gerencial) y escribe la IP actual del biométrico: {vieja.bio}.',
      'Inicia sesión: usuario {cred.bio.usuario}, contraseña {cred.bio.password}.',
      'Menú lateral: Setting → TCP/IP.',
      'IP Address {nueva.bio}, Subnet Mask {nuevo.mascara}, Default Gateway {nuevo.gateway} → OK.',
    ],
    porque: 'El biométrico (checador) debe quedar en el segmento nuevo para que la PC Gerencial siga leyendo las checadas.',
    buscar: 'La barra de direcciones de Firefox y luego el menú lateral del biométrico.',
    pistas: {
      'bio-form': 'Captura los tres valores del segmento nuevo y da OK.',
      'bio-menu-tcpip': 'Entra a TCP/IP.',
      'bio-menu-setting': 'Despliega Setting.',
      'bio-login': 'Usuario {cred.bio.usuario} / contraseña {cred.bio.password}.',
      'browser-url': 'Escribe {vieja.bio} y presiona Enter.',
      'desk-firefox': 'Abre Firefox.',
      'lap-firefox': 'Abre Firefox en la laptop.',
      'scene-laptop': 'Usa la laptop (o la PC Gerencial) para entrar a su página.',
    },
  },
  'bio-reinicio': {
    titulo: 'Biométrico: reinícialo',
    que: ['En el mismo menú: Terminal → Reboot.', 'Al reiniciar, la página deja de responder en la IP vieja. Es normal: ya está en {nueva.bio}.'],
    porque: 'El biométrico guarda la IP nueva pero la aplica hasta reiniciar.',
    buscar: 'Menú lateral → Terminal → Reboot.',
    pistas: {
      'bio-reboot-btn': 'Confirma el reinicio.',
      'bio-menu-reboot': 'Entra a Reboot.',
      'bio-menu-terminal': 'Despliega Terminal.',
      'bio-login': 'Si cerraste sesión, vuelve a entrar.',
      'browser-url': 'Abre otra vez {vieja.bio}.',
    },
  },
  'tel-ip': {
    titulo: 'Teléfono Yealink: IP estática y DNS',
    que: [
      'Si no tienes su IP, mírala en la pantalla del teléfono: Menu → Status.',
      'En Firefox abre esa IP ({vieja.tel}) e inicia sesión ({cred.tel.usuario} / {cred.tel.password}).',
      'Pestaña Network → Basic → IPv4 Config: Static IP Address.',
      'IP {nueva.tel}, máscara {nuevo.mascara}, gateway {nuevo.gateway}.',
      'Static DNS: On — primario 8.8.4.4, secundario 8.8.8.8 → Save → confirma el reinicio.',
    ],
    porque: 'El teléfono venía con la IP vieja. En la red nueva debe quedar fijo y con DNS públicos para registrarse a la central.',
    buscar: 'La pantallita del teléfono para ver su IP; luego la pestaña Network de su página.',
    pistas: {
      'tel-reboot-ok': 'Acepta el reinicio para aplicar.',
      'tel-form': 'Static IP Address, los tres valores, Static DNS On con 8.8.4.4 y 8.8.8.8, y Save.',
      'tel-sub-basic': 'Entra a Basic.',
      'tel-tab-network': 'Abre la pestaña Network.',
      'tel-login': 'Usuario {cred.tel.usuario} / contraseña {cred.tel.password}.',
      'browser-url': 'Escribe {vieja.tel} y Enter.',
      'tel-tecla-menu': 'Presiona Menu y luego Status para ver la IP.',
      'desk-firefox': 'Abre Firefox.',
      'lap-firefox': 'Abre Firefox en la laptop.',
      'scene-tel': 'Abre el teléfono para ver su IP en pantalla.',
    },
  },
  'hme-ip': {
    titulo: 'HME (modelo {hme.modelo}): IP y gateway',
    que: [],
    porque:
      'El HME (temporizador del Drive-Thru) manda sus tiempos a la PC Gerencial. Solo se cambian IP y gateway: la máscara y los DNS se quedan igual.',
    buscar: 'En Firefox, la página del HME en {vieja.hme}.',
    variantes: {
      hme60: {
        que: [
          'En Firefox abre la IP actual del HME: {vieja.hme}.',
          'En el Dashboard da clic al ícono de hamburguesa (arriba a la izquierda).',
          'Perfil Installer + contraseña {cred.hme.password}.',
          'Network → Local Network.',
          'En Control Unit Network cambia SOLO IP Address ({nueva.hme}) y Gateway ({nuevo.gateway}) → Save. No requiere reinicio.',
        ],
        pistas: {
          'hme60-form': 'Cambia solo IP Address y Gateway y guarda.',
          'hme60-local': 'Entra a Local Network.',
          'hme60-network': 'Despliega Network.',
          'hme60-installer': 'Elige Installer y escribe la contraseña.',
          'hme60-burger': 'Abre el menú (hamburguesa).',
          'browser-url': 'Escribe {vieja.hme} y Enter.',
          'desk-firefox': 'Abre Firefox.',
          'lap-firefox': 'Abre Firefox en la laptop.',
          'scene-laptop': 'Usa la laptop o la PC Gerencial.',
        },
      },
      hme50: {
        que: [
          'En Firefox abre la IP actual del HME: {vieja.hme}.',
          'Ícono de engrane → Settings… → Installer → Security.',
          'Usuario {cred.hme.usuario} + contraseña {cred.hme.password} → LOG IN.',
          'Pestaña Control Unit Network → EDIT.',
          'Cambia IP ({nueva.hme}) y Gateway ({nuevo.gateway}) → APPLY.',
        ],
        pistas: {
          'hme50-form': 'Cambia IP y Gateway y aplica.',
          'hme50-edit': 'Da clic en EDIT.',
          'hme50-tab-cun': 'Abre la pestaña Control Unit Network.',
          'hme50-login': 'Usuario {cred.hme.usuario} / contraseña {cred.hme.password} → LOG IN.',
          'hme50-security': 'Entra a Security.',
          'hme50-installer': 'Despliega Installer.',
          'hme50-settings': 'Entra a Settings…',
          'hme50-gear': 'Da clic en el engrane.',
          'browser-url': 'Escribe {vieja.hme} y Enter.',
          'desk-firefox': 'Abre Firefox.',
          'lap-firefox': 'Abre Firefox en la laptop.',
          'scene-laptop': 'Usa la laptop o la PC Gerencial.',
        },
      },
    },
  },
  'imp-ip': {
    titulo: 'Impresora: IP manual',
    que: [
      'Opción A (web): en Firefox abre {vieja.imp} → inicia sesión ({cred.imp.usuario} / {cred.imp.password}).',
      'Configuración → Configuración de red.',
      'Deshabilita TCP/IPv6 si está activo.',
      'TCP/IPv4 en modo Manualmente: dirección {nueva.imp}, máscara {nuevo.mascara}, gateway {nuevo.gateway} → Guardar → Desconexión.',
      'Opción B (display físico de la impresora): Ajustes → TCP/IP → Cambiar → IP → Guardar.',
    ],
    porque: 'La impresora recibe trabajos de la PC Gerencial por red. Con IP manual en el segmento nuevo no cambia de dirección sola.',
    buscar: 'La página de la impresora o su pantalla táctil.',
    pistas: {
      'imp-desconexion': 'Da clic en Desconexión para aplicar y cerrar sesión.',
      'imp-form': 'Desactiva IPv6, modo Manualmente con los tres valores y Guardar.',
      'imp-menu-red': 'Entra a Configuración de red.',
      'imp-menu-config': 'Abre Configuración.',
      'imp-login': 'Usuario {cred.imp.usuario} / contraseña {cred.imp.password}.',
      'imp-panel-form': 'Captura IP, máscara y gateway y Guardar.',
      'imp-panel-cambiar': 'Toca Cambiar.',
      'imp-panel-tcpip': 'Toca TCP/IP.',
      'imp-panel-ajustes': 'Toca Ajustes.',
      'browser-url': 'Escribe {vieja.imp} y Enter.',
      'desk-firefox': 'Abre Firefox.',
      'lap-firefox': 'Abre Firefox en la laptop.',
      'scene-imp': 'O usa el display de la impresora.',
    },
  },
  'conf-fingerprint': {
    titulo: 'PC Gerencial: actualiza fingerprint.conf',
    que: [
      'Abre la PC Gerencial y la terminal con Ctrl+T. La contraseña de sesión sale de la regla del CECO: {passPc}.',
      'su - sysadmin (contraseña {cred.sysadmin})',
      'nano /ph/fingerprint/etc/fingerprint.conf',
      'Cambia SOLO la línea IP= por {nueva.bio}. No toques usuario ni contraseña.',
      'Guarda con Ctrl+O y Enter; sal con Ctrl+X.',
    ],
    porque: 'La PC Gerencial lee las checadas del biométrico usando esta IP. Si no la actualizas, deja de recibir registros de asistencia.',
    buscar: 'La terminal de la PC Gerencial.',
    pistas: {
      'nano-editor': 'Cambia la IP en la línea IP= y guarda con Ctrl+O, Enter, Ctrl+X.',
      'term-input': 'su - sysadmin y luego nano /ph/fingerprint/etc/fingerprint.conf',
      'desk-auth': 'Contraseña de sesión: {passPc}',
      'desk-terminal': 'Abre la terminal (Ctrl+T).',
      'scene-pc': 'Abre la PC Gerencial.',
    },
  },
  'conf-timer': {
    titulo: 'PC Gerencial: actualiza timer.conf',
    que: [
      'En la misma terminal: nano /ph/timer/etc/timer.conf',
      'Cambia SOLO la línea IP= por {nueva.hme}. Usuario y contraseña se quedan igual.',
      'Ctrl+O, Enter, Ctrl+X.',
    ],
    porque: 'Con esta IP la PC Gerencial recibe los tiempos del Drive-Thru desde el HME.',
    buscar: 'La terminal de la PC Gerencial.',
    pistas: {
      'nano-editor': 'Cambia la IP en la línea IP= y guarda.',
      'term-input': 'nano /ph/timer/etc/timer.conf',
      'desk-auth': 'Contraseña de sesión: {passPc}',
      'desk-terminal': 'Abre la terminal (Ctrl+T).',
      'scene-pc': 'Abre la PC Gerencial.',
    },
  },
  'hd-archivo': {
    titulo: 'Home Delivery: edita /etc/network/interfaces',
    que: [
      'Abre Home Delivery y su terminal (Ctrl+T). Contraseña de sesión: {cred.hd.sesion}.',
      'su - sysadmin → sudo nano /etc/network/interfaces',
      'En el bloque de eth0 actualiza los cinco valores:',
      'address {nueva.hd} · netmask {nuevo.mascara} · network {nuevo.red} · broadcast {nuevo.broadcast} · gateway {nuevo.gateway}',
      'Ctrl+O, Enter, Ctrl+X.',
    ],
    porque: 'Así queda la IP fija de Home Delivery en el segmento nuevo. network y broadcast deben ser coherentes con la máscara.',
    buscar: 'La terminal de Home Delivery.',
    pistas: {
      'nano-editor': 'Actualiza address, netmask, network, broadcast y gateway de eth0.',
      'term-input': 'su - sysadmin y luego sudo nano /etc/network/interfaces',
      'desk-auth': 'Contraseña de sesión: {cred.hd.sesion}',
      'desk-terminal': 'Abre la terminal (Ctrl+T).',
      'scene-hd': 'Abre Home Delivery.',
    },
  },
  'hd-reinicio': {
    titulo: 'Home Delivery: reinicia y valida',
    que: ['sudo reboot', 'Cuando vuelva, abre la terminal y valida con ip a que eth0 tenga {nueva.hd}.'],
    porque: 'La IP del archivo se aplica al arrancar. ip a confirma que quedó bien.',
    buscar: 'La terminal de Home Delivery.',
    pistas: { 'term-input': 'Escribe sudo reboot', 'desk-terminal': 'Abre la terminal.', 'scene-hd': 'Abre Home Delivery.' },
  },
  'lms-archivo': {
    titulo: 'LMS: edita /etc/network/interfaces',
    que: [
      'Abre LMS y su terminal (Ctrl+T). Contraseña de sesión: {cred.lms.sesion}.',
      'su - sysadmin → sudo nano /etc/network/interfaces',
      'eth0: address {nueva.lms} · netmask {nuevo.mascara} · network {nuevo.red} · broadcast {nuevo.broadcast} · gateway {nuevo.gateway}',
      'Ctrl+O, Enter, Ctrl+X.',
    ],
    porque: 'Mismo procedimiento que Home Delivery: se repite en cada equipo Linux.',
    buscar: 'La terminal de LMS.',
    pistas: {
      'nano-editor': 'Actualiza los cinco valores de eth0.',
      'term-input': 'su - sysadmin y luego sudo nano /etc/network/interfaces',
      'desk-auth': 'Contraseña de sesión: {cred.lms.sesion}',
      'desk-terminal': 'Abre la terminal (Ctrl+T).',
      'scene-lms': 'Abre LMS.',
    },
  },
  'lms-reinicio': {
    titulo: 'LMS: reinicia y valida',
    que: ['sudo reboot', 'Valida con ip a que eth0 tenga {nueva.lms}.'],
    porque: 'La IP se aplica al arrancar.',
    buscar: 'La terminal de LMS.',
    pistas: { 'term-input': 'Escribe sudo reboot', 'desk-terminal': 'Abre la terminal.', 'scene-lms': 'Abre LMS.' },
  },
  'pc-archivo': {
    titulo: 'PC Gerencial: edita /etc/network/interfaces',
    que: [
      'Ahora sí, la PC Gerencial (siempre al final).',
      'su - sysadmin → sudo nano /etc/network/interfaces',
      'eth0: address {nueva.pc} · netmask {nuevo.mascara} · network {nuevo.red} · broadcast {nuevo.broadcast} · gateway {nuevo.gateway}',
      'NO toques el bloque eth0:1 (red de cocina).',
      'Ctrl+O, Enter, Ctrl+X.',
    ],
    porque: 'Desde la PC Gerencial configuraste lo demás; si la cambias antes, pierdes el acceso a los equipos que siguen en el segmento viejo.',
    buscar: 'La terminal de la PC Gerencial.',
    pistas: {
      'nano-editor': 'Actualiza los cinco valores de eth0 sin tocar eth0:1.',
      'term-input': 'su - sysadmin y luego sudo nano /etc/network/interfaces',
      'desk-auth': 'Contraseña de sesión: {passPc}',
      'desk-terminal': 'Abre la terminal (Ctrl+T).',
      'scene-pc': 'Abre la PC Gerencial.',
    },
  },
  'pc-reinicio': {
    titulo: 'PC Gerencial: reinicia y valida',
    que: ['sudo reboot', 'Valida con ip a: eth0 con {nueva.pc} y eth0:1 con {eth1.ip}.'],
    porque: 'La IP nueva se aplica al arrancar.',
    buscar: 'La terminal de la PC Gerencial.',
    pistas: { 'term-input': 'Escribe sudo reboot', 'desk-terminal': 'Abre la terminal.', 'scene-pc': 'Abre la PC Gerencial.' },
  },
  'nic-hw': {
    titulo: 'Tarjeta de red de la PC Gerencial',
    que: [],
    porque: 'Con SD-WAN la red de cocina (VLAN40) va separada en el switch: la PC necesita un segundo puerto físico (eth1) conectado a un puerto VLAN40.',
    buscar: 'La pestaña "Gabinete" de la PC Gerencial.',
    variantes: {
      pci: {
        que: [
          'Apaga la PC desde el sistema (botón de apagado del escritorio).',
          'Pestaña Gabinete: desconecta el cable de corriente.',
          'Quita los tornillos y abre la tapa lateral.',
          'Busca la ranura PCI libre, inserta la tarjeta y atorníllala.',
          'Cierra la tapa, pon los tornillos, conecta la corriente y el cable de red en la tarjeta nueva. Enciende.',
        ],
      },
      bios: {
        que: [
          'Apaga la PC, desconecta la corriente y abre la tapa para buscar ranura PCI: esta PC no tiene ranura libre.',
          'Cierra, conecta la corriente y enciende. En el arranque presiona F2 (o F8 / F12).',
          'Opciones avanzadas → Configuración de dispositivos incluidos → Controladora de LAN Realtek → Habilitado.',
          'F10 para guardar y salir.',
          'Conecta el cable de red al segundo puerto (Realtek) de la PC.',
        ],
      },
    },
    pistas: {
      'bios-pantalla': 'Navega con las flechas: Opciones avanzadas → Configuración de dispositivos incluidos → Controladora de LAN Realtek.',
      'post-teclas': 'Presiona F2, F8 o F12 ahora.',
      'hw-accion': 'Sigue el siguiente paso del gabinete.',
      'hw-tab': 'Abre la pestaña Gabinete.',
      'desk-apagar': 'Primero apaga la PC desde el sistema.',
      'scene-pc': 'Abre la PC Gerencial.',
    },
  },
  'pc-eth1': {
    titulo: 'PC Gerencial: cambia eth0:1 por eth1',
    que: [
      'sudo nano /etc/network/interfaces',
      'En "auto eth0:1" e "iface eth0:1 inet static" cambia eth0:1 por eth1.',
      'Conserva sus parámetros: address {eth1.ip} y netmask {eth1.mascara}.',
      'Ctrl+O, Enter, Ctrl+X → sudo reboot → ip a debe mostrar eth1 con {eth1.ip}.',
    ],
    porque: 'La red de cocina ahora llega por la tarjeta nueva (eth1), ya no como alias de eth0.',
    buscar: 'La terminal de la PC Gerencial.',
    pistas: {
      'nano-editor': 'Cambia eth0:1 por eth1 en las dos líneas, conserva address y netmask.',
      'term-input': 'sudo nano /etc/network/interfaces (y después sudo reboot)',
      'desk-auth': 'Contraseña de sesión: {passPc}',
      'desk-terminal': 'Abre la terminal.',
      'scene-pc': 'Abre la PC Gerencial.',
    },
  },
  'cab-wan': {
    titulo: 'Enlaces al FortiGate',
    que: [],
    porque: 'El FortiGate espera cada enlace en su puerto: así funcionan el SD-WAN y el respaldo entre carriers. Los dos quedan en DHCP.',
    buscar: 'En el rack: los cables amarillos que salen de las ONT.',
    variantes: {
      ambos: { que: ['Totalplay (TP) → puerto WAN del FortiGate.', 'Telmex → PORT1 del FortiGate.', 'Ambos quedan en DHCP.'] },
      'solo-tp': { que: ['Solo hay Totalplay: su cable va al puerto WAN del FortiGate (DHCP).'] },
      'solo-telmex': { que: ['Solo hay Telmex: es el enlace principal, va al puerto WAN del FortiGate (DHCP).'] },
    },
    pistas: { 'rack-cable-tp': 'Este cable va al WAN.', 'rack-cable-tx': 'Este cable va al PORT1 (o al WAN si es el único carrier).', 'scene-rack': 'Abre el rack.' },
  },
  'cab-forti-sw': {
    titulo: 'FortiGate PORT-A → switch puerto 48',
    que: ['Arrastra el cable verde del puerto A del FortiGate al puerto 48 del switch nuevo.'],
    porque: 'Ese es el enlace FortiLink: por ahí el FortiGate administra el switch y le da salida a todas las VLAN.',
    buscar: 'El cable verde del puerto A del FortiGate.',
    pistas: { 'rack-cable-fga': 'Llévalo al puerto 48 (abajo a la derecha del switch nuevo).', 'scene-rack': 'Abre el rack.' },
  },
  'cab-vlan10': {
    titulo: 'Equipos de la red interna al switch nuevo',
    que: [
      'Abre la Hoja de etiquetado del rack.',
      'Mueve cada cable azul del switch anterior al puerto que indica la hoja (VLAN10).',
      'El puerto {danado} está dañado: si te toca, usa otro puerto libre de la misma VLAN.',
    ],
    porque: 'Cada puerto tiene una VLAN. Si conectas un equipo en otra VLAN queda en otra red y no se comunica.',
    buscar: 'Los cables azules y la hoja de etiquetado.',
    pistas: { 'rack-hoja': 'Revisa la hoja de etiquetado.', 'scene-rack': 'Abre el rack.' },
  },
  'cab-vlan40': {
    titulo: 'Cocina / KDS (VLAN40) al switch nuevo',
    que: [
      'Mueve los cables naranjas (Sus, PKDs, I.Emp Delivery) a sus puertos VLAN40 según la hoja.',
      'El jack 2 (PC Gerencial · eth1) va al puerto {puerto.eth1}.',
    ],
    porque: 'La red de cocina va separada en la VLAN40; la PC Gerencial la alcanza por su tarjeta eth1.',
    buscar: 'Los cables naranjas del patch panel.',
    pistas: { 'rack-hoja': 'Revisa la hoja de etiquetado.', 'scene-rack': 'Abre el rack.' },
  },
  'cab-proveedores': {
    titulo: 'Proveedores al SW Plano',
    que: ['Los cables grises (DVR, música) van a cualquier puerto del SW Plano. No tiene asignación fija.'],
    porque: 'Los equipos de proveedores no entran a la red de la tienda: van al switch no administrable.',
    buscar: 'El SW Plano (switch chico debajo del switch nuevo).',
    pistas: { 'scene-rack': 'Abre el rack.' },
  },
  'cab-pantallas': {
    titulo: 'Pantallas de menú → ONT',
    que: ['El cable morado (switch plano de las pantallas de la barra) va a un puerto LAN libre de la ONT principal.'],
    porque: 'Las pantallas de menú solo necesitan internet: se conectan a la ONT mediante su switch plano, fuera de la red de la tienda.',
    buscar: 'El cable morado del patch panel.',
    pistas: { 'rack-cable-pp15': 'Llévalo a un LAN libre de la ONT principal.', 'scene-rack': 'Abre el rack.' },
  },
  'cab-extra': {
    titulo: 'Módems adicionales sin nada conectado',
    que: ['Desconecta cualquier cable de los módems adicionales (arrastra el conector fuera y suéltalo).'],
    porque: 'Un módem de más conectado puede repartir IPs o crear una salida paralela que rompa la red nueva.',
    buscar: 'Los módems marcados como "adicional" en la repisa.',
    pistas: { 'rack-cable-ex1': 'Arrastra este conector fuera del switch y suéltalo.', 'rack-cable-ex2': 'Desconéctalo también.', 'scene-rack': 'Abre el rack.' },
  },
  'telmex-ip': {
    titulo: 'Cambia la IP del módem Telmex',
    que: [],
    porque: 'La plantilla del FortiGate espera el enlace de Telmex en ese segmento. Si se queda con la IP de fábrica, el enlace no levanta como debe.',
    buscar: 'La laptop conectada por cable al módem Telmex.',
    variantes: {
      ambos: {
        que: [
          'Conecta la laptop por cable a un LAN libre del módem Telmex y ponla en DHCP ("Obtener una dirección IP automáticamente").',
          'Firefox → 192.168.1.254 → usuario TELMEX (mayúsculas) y la contraseña de la etiqueta del módem.',
          'Configuración LAN → IP {tx.ipNueva} → Aplicar.',
        ],
      },
      'solo-telmex': {
        que: [
          'Conecta la laptop por cable al módem Telmex en DHCP.',
          'Firefox → 192.168.1.254 → usuario TELMEX y la contraseña de la etiqueta.',
          'Solo hay un carrier: configura el módem con el direccionamiento de TP → IP {tx.ipNueva} → Aplicar.',
        ],
      },
    },
    pistas: {
      'tx-form': 'Cambia la IP del módem y aplica.',
      'tx-menu-lan': 'Abre Configuración LAN.',
      'tx-login': 'Usuario TELMEX y la contraseña de la etiqueta del módem.',
      'browser-url': 'Escribe 192.168.1.254 y Enter.',
      'lap-firefox': 'Abre Firefox en la laptop.',
      'lap-ipv4': 'Pon la laptop en "Obtener una dirección IP automáticamente".',
      'rack-cable-lap': 'Conecta la laptop a un LAN libre del módem Telmex.',
      'scene-laptop': 'Usa la laptop.',
    },
  },
  etiquetas: {
    titulo: 'Etiqueta los módems',
    que: ['En el rack, da clic en la etiqueta de cada módem:', 'Totalplay → L5-ONT', 'Telmex → L6-ONT'],
    porque: 'Las etiquetas permiten que soporte remoto identifique cada enlace sin adivinar.',
    buscar: 'El recuadro "Sin etiqueta" de cada módem en la repisa.',
    pistas: { 'rack-etiqueta-tp': 'Ponle L5-ONT.', 'rack-etiqueta-tx': 'Ponle L6-ONT.', 'scene-rack': 'Abre el rack.' },
  },
  'ping-internet': {
    titulo: 'Ping a Internet',
    que: ['Desde la terminal de la PC Gerencial: ping -c 40 8.8.8.8', 'Debe terminar con 40 received y 0% packet loss.'],
    porque: 'Confirma que la PC sale a internet por el FortiGate.',
    buscar: 'La terminal de la PC Gerencial.',
    pistas: { 'term-input': 'ping -c 40 8.8.8.8', 'desk-terminal': 'Abre la terminal.', 'scene-pc': 'Abre la PC Gerencial.' },
  },
  'ping-centrales': {
    titulo: 'Ping a servicios centrales de PRB',
    que: ['ping -c 40 192.168.101.216', 'ping -c 40 192.168.225.81', 'Ambos con 0% packet loss.'],
    porque: 'Son los servicios centrales con los que la tienda reporta ventas y operación.',
    buscar: 'La terminal de la PC Gerencial.',
    pistas: { 'term-input': 'ping -c 40 192.168.101.216', 'desk-terminal': 'Abre la terminal.', 'scene-pc': 'Abre la PC Gerencial.' },
  },
  'ping-equipos': {
    titulo: 'Ping a cada equipo reconfigurado',
    que: [
      'ping -c 40 a la IP nueva de cada equipo:',
      'Biométrico {nueva.bio} · Teléfono {nueva.tel} · HME {nueva.hme} · Impresora {nueva.imp}',
      'Digi {nueva.digi} · Home Delivery {nueva.hd} · LMS {nueva.lms}',
    ],
    porque: 'Así compruebas que cada equipo quedó con su IP nueva, en su puerto y en su VLAN.',
    buscar: 'La terminal de la PC Gerencial.',
    pistas: { 'term-input': 'ping -c 40 {nueva.bio} (y así con cada equipo)', 'desk-terminal': 'Abre la terminal.', 'scene-pc': 'Abre la PC Gerencial.' },
  },
  'ping-vlan40': {
    titulo: 'Ping a la VLAN40 (cocina)',
    que: ['ping -c 40 a: Sus 02 10.10.10.18 · Sus 01 10.10.10.17 · PKDs L2 10.10.10.95 · PKDs L1 10.10.10.93 · I.Emp Delivery 10.10.10.53'],
    porque: 'Confirma que eth1 y los puertos VLAN40 quedaron bien.',
    buscar: 'La terminal de la PC Gerencial.',
    pistas: { 'term-input': 'ping -c 40 10.10.10.18 (y los demás)', 'desk-terminal': 'Abre la terminal.', 'scene-pc': 'Abre la PC Gerencial.' },
  },
  'speed-tp': {
    titulo: 'Speedtest de Totalplay',
    que: [
      'Conecta la laptop POR CABLE a un LAN del ONT Totalplay y apaga el Wi-Fi.',
      'Desconecta temporalmente lo demás que esté conectado a ese módem (FortiGate, pantallas): nadie más debe usar la red.',
      'Firefox → speedtest.net → GO → registra ping, descarga y carga → Tomar captura.',
    ],
    porque: 'Es la evidencia de la velocidad real del enlace. Por Wi-Fi o con otros equipos usando la red el resultado no es válido.',
    buscar: 'La laptop y la página de speedtest.',
    pistas: {
      'speed-captura': 'Toma la captura como evidencia.',
      'speed-go': 'Presiona GO.',
      'browser-url': 'Escribe speedtest.net',
      'rack-cable-lap': 'Conecta la laptop a un LAN de la ONT Totalplay.',
      'lap-firefox': 'Abre Firefox en la laptop.',
      'scene-laptop': 'Usa la laptop.',
    },
  },
  'speed-telmex': {
    titulo: 'Speedtest de Telmex',
    que: [
      'Conecta la laptop por cable a un LAN del módem Telmex (Wi-Fi apagado).',
      'Desconecta temporalmente el FortiGate de ese módem.',
      'speedtest.net → GO → Tomar captura.',
    ],
    porque: 'Cada enlace lleva su propia evidencia de velocidad.',
    buscar: 'La laptop y la página de speedtest.',
    pistas: {
      'speed-captura': 'Toma la captura como evidencia.',
      'speed-go': 'Presiona GO.',
      'browser-url': 'Escribe speedtest.net',
      'rack-cable-lap': 'Conecta la laptop a un LAN del módem Telmex.',
      'lap-firefox': 'Abre Firefox en la laptop.',
      'scene-laptop': 'Usa la laptop.',
    },
  },
  reconexion: {
    titulo: 'Deja todo reconectado',
    que: [
      'Regresa los enlaces al FortiGate (WAN / PORT1) y las pantallas a la ONT.',
      'Revisa que todo coincida con la hoja de etiquetado.',
      'Al final, genera la hoja de evidencias.',
    ],
    porque: 'Si te vas con un enlace desconectado, la tienda queda sin respaldo de internet.',
    buscar: 'El rack.',
    pistas: { 'scene-rack': 'Abre el rack y reconecta.' },
  },
}

export const bienvenidaGuiado = {
  titulo: 'Bienvenido al modo guiado',
  texto:
    'Vas a migrar la {nombre} (CECO {ceco}) del segmento {viejo.red}/24 al {nuevo.red}/24. Este panel te dice qué sigue, por qué se hace y dónde buscar en la pantalla. Lo que tienes que tocar se ilumina con un anillo.',
}
