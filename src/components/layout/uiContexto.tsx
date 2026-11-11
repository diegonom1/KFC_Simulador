// Contexto de interfaz del simulador: qué ventanas de equipo están abiertas y qué panel lateral.
import { createContext, useContext } from 'react'

export type VentanaId =
  | 'laptop'
  | 'pc'
  | 'hd'
  | 'lms'
  | 'rack'
  | 'bio'
  | 'tel'
  | 'hme'
  | 'imp'
  | 'digi'
  | 'sus1'
  | 'sus2'
  | 'pkd1'
  | 'pkd2'
  | 'iemp'
  | 'menu'
  | 'proveedores'
  | 'modems'

export const PRIMARIAS: VentanaId[] = ['laptop', 'pc', 'hd', 'lms', 'rack', 'modems']

export type PanelId = 'libreta' | 'hoja' | 'referencia' | 'mision' | null

export interface UiCtx {
  abrir: (id: VentanaId) => void
  cerrar: (id: VentanaId) => void
  panel: PanelId
  abrirPanel: (p: PanelId) => void
}

export const UiContext = createContext<UiCtx>({ abrir: () => {}, cerrar: () => {}, panel: null, abrirPanel: () => {} })

export function useUi() {
  return useContext(UiContext)
}
