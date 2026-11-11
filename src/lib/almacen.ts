// Acceso seguro a localStorage: en modo privado o con almacenamiento bloqueado
// las llamadas pueden lanzar excepciones, así que todo va envuelto en try/catch.

export function leer<T>(clave: string, porDefecto: T): T {
  try {
    const v = window.localStorage.getItem(clave)
    return v ? (JSON.parse(v) as T) : porDefecto
  } catch {
    return porDefecto
  }
}

export function guardar(clave: string, valor: unknown): void {
  try {
    window.localStorage.setItem(clave, JSON.stringify(valor))
  } catch {
    /* sin almacenamiento disponible: el simulador sigue funcionando en memoria */
  }
}

export function borrar(clave: string): void {
  try {
    window.localStorage.removeItem(clave)
  } catch {
    /* nada */
  }
}

export const CLAVES = {
  sesion: 'sdwan-sim.sesion.v1',
  historial: 'sdwan-sim.historial.v1',
  ajustes: 'sdwan-sim.ajustes.v1',
  ultimoResultado: 'sdwan-sim.resultado.v1',
  tecnico: 'sdwan-sim.tecnico.v1',
} as const
