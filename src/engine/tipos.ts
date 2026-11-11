// Tipos centrales del motor del simulador (modo guiado y modo examen comparten todo).

export type Modo = 'guiado' | 'examen'
export type Carriers = 'ambos' | 'solo-tp' | 'solo-telmex'
export type MarcaImpresora = 'hp' | 'kyocera'
export type HostLinux = 'pc' | 'hd' | 'lms'
export type EquipoSimple = 'bio' | 'tel' | 'hme' | 'imp' | 'digi'
export type EquipoId = HostLinux | EquipoSimple
export type Vlan40Id = 'sus1' | 'sus2' | 'pkd1' | 'pkd2' | 'iemp'
export type ModemId = 'tp' | 'tx' | 'ex1' | 'ex2'
export type Origen = HostLinux | 'laptop'

/** Identificador de puerto físico: 'sw:12', 'old:3', 'fg:wan', 'fg:a', 'fg:1', 'tp:lan1', 'pl:2', 'pp:5', 'lap' */
export type PuertoId = string

export interface Segmento {
  red: string
  mascara: string
  gateway: string
}

export interface NetCfg {
  ip: string
  mascara: string
  gateway: string
}

export interface Escenario {
  semilla: number
  modo: Modo
  nombre: string
  ceco: string
  passwordPc: string
  viejo: Segmento
  nuevo: Segmento
  hmeModelo: 50 | 60
  pcRanuraPci: boolean
  carriers: Carriers
  modemsExtra: Array<'ex1' | 'ex2'>
  marcaImpresora: MarcaImpresora
  puertoDanado: number | null
  ipVieja: Record<EquipoId, string>
  ipNueva: Record<EquipoId, string>
  telmexPassword: string
  ssidTp: string
  ssidTx: string
  preguntas: string[]
  creado: number
}

export interface DispositivoEstado {
  activa: NetCfg
  pendiente: NetCfg | null
  reiniciandoHasta: number | null
  dhcp?: boolean
  dnsEstatico?: boolean
  dns1?: string
  dns2?: string
  ipv6?: boolean
  manual?: boolean
  via?: 'web' | 'panel'
  sesionCerrada?: boolean
}

export interface RedLinux {
  eth0: NetCfg | null
  alias: { ip: string; mascara: string } | null
  eth1: { ip: string; mascara: string } | null
  fallos: string[]
}

export interface LinuxEstado {
  archivos: Record<string, string>
  red: RedLinux
  encendida: boolean
  reiniciandoHasta: number | null
  arranques: number
}

export interface HardwarePc {
  corriente: boolean
  tornillos: boolean
  tapaAbierta: boolean
  tarjetaInstalada: boolean
  tarjetaAtornillada: boolean
  revisoRanuras: boolean
  realtek: boolean
  cableEth1: boolean
}

export interface LaptopEstado {
  modo: 'dhcp' | 'estatica'
  ip: string
  mascara: string
  gateway: string
  dns: string
  wifi: 'tp' | 'tx' | null
}

export interface RegistroPing {
  id: number
  t: number
  origen: Origen
  ipOrigen: string
  iface: string
  destino: string
  enviados: number
  recibidos: number
  conteo: number | null
}

export interface RegistroSpeed {
  id: number
  t: number
  carrier: 'tp' | 'tx' | 'otro'
  conexion: 'cable' | 'wifi' | 'switch' | 'ninguna'
  valido: boolean
  motivo?: string
  ping: number
  bajada: number
  subida: number
  captura: boolean
}

export interface RegistroError {
  id: number
  t: number
  codigo: string
  titulo: string
  detalle: string
  correccion: string
  equipo?: string
  leve?: boolean
  extra?: string
}

export interface Completado {
  t: number
  fueraDeOrden: boolean
  faltaban: string[]
}

export interface Evento {
  id: number
  tipo: 'error' | 'objetivo' | 'fase' | 'aviso' | 'info' | 'quiz' | 'fin'
  ref: string
  texto?: string
  detalle?: string
}

export interface SimState {
  v: number
  esc: Escenario
  inicio: number
  fin: number | null
  ahora: number
  disp: Record<EquipoSimple, DispositivoEstado>
  linux: Record<HostLinux, LinuxEstado>
  hw: HardwarePc
  laptop: LaptopEstado
  cables: Record<string, PuertoId | null>
  etiquetas: Partial<Record<ModemId, string>>
  telmexLan: string
  digiPrb: boolean
  libreta: Partial<Record<EquipoId, string>>
  pings: RegistroPing[]
  speedtests: RegistroSpeed[]
  errores: RegistroError[]
  completados: Record<string, Completado>
  quiz: { pendientes: string[]; preguntadas: string[]; respuestas: Record<string, { opcion: number; correcta: boolean; t: number }> }
  eventos: Evento[]
  seq: number
  marcas: Record<string, boolean>
}

export type PasoHw =
  | 'quitar-corriente'
  | 'poner-corriente'
  | 'quitar-tornillos'
  | 'poner-tornillos'
  | 'abrir-tapa'
  | 'cerrar-tapa'
  | 'revisar-ranuras'
  | 'insertar-tarjeta'
  | 'atornillar-tarjeta'
  | 'conectar-red-eth1'
  | 'desconectar-red-eth1'

export type Accion =
  | { tipo: 'TICK'; ahora: number }
  | { tipo: 'LAPTOP_RED'; cfg: Partial<LaptopEstado> }
  | { tipo: 'CABLE'; cable: string; destino: PuertoId | null }
  | { tipo: 'ETIQUETA'; modem: ModemId; etiqueta: string | null }
  | { tipo: 'LIBRETA'; equipo: EquipoId; ip: string }
  | { tipo: 'BIO_GUARDAR'; cfg: NetCfg }
  | { tipo: 'BIO_REINICIAR' }
  | { tipo: 'TEL_GUARDAR'; cfg: NetCfg; estatica: boolean; dnsEstatico: boolean; dns1: string; dns2: string; reiniciar: boolean }
  | { tipo: 'TEL_REINICIAR' }
  | { tipo: 'HME_GUARDAR'; cfg: NetCfg; dns1: string; dns2: string }
  | { tipo: 'IMP_GUARDAR'; via: 'web' | 'panel'; cfg: NetCfg; ipv6: boolean; manual: boolean }
  | { tipo: 'IMP_DESCONEXION' }
  | { tipo: 'DIGI_INTENTO' }
  | { tipo: 'TELMEX_LAN'; ip: string }
  | { tipo: 'ARCHIVO'; host: HostLinux; ruta: string; contenido: string | null }
  | { tipo: 'LINUX_REINICIAR'; host: HostLinux }
  | { tipo: 'LINUX_APAGAR'; host: HostLinux }
  | { tipo: 'LINUX_ENCENDER'; host: HostLinux }
  | { tipo: 'HW'; paso: PasoHw }
  | { tipo: 'BIOS_GUARDAR'; realtek: boolean; cambiosExtra: string[] }
  | { tipo: 'PING'; registro: Omit<RegistroPing, 'id' | 't'> }
  | { tipo: 'SPEEDTEST'; registro: Omit<RegistroSpeed, 'id' | 't'> }
  | { tipo: 'SPEEDTEST_CAPTURA'; id: number }
  | { tipo: 'QUIZ'; id: string; opcion: number }
  | { tipo: 'AVISO'; codigo: string; equipo?: string; extra?: string }
  | { tipo: 'RESCATAR'; equipo: EquipoSimple }
  | { tipo: 'TERMINAR' }

export interface TextoPaso {
  titulo: string
  que: string[]
  porque: string
  buscar?: string
  pistas?: Record<string, string>
}
