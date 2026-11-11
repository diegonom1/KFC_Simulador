import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, type ReactNode } from 'react'
import { CLAVES, borrar, guardar, leer } from '../lib/almacen'
import { escenarioExamen, escenarioGuiado } from './escenario'
import { crearEstado, reducir, VERSION_ESTADO } from './motor'
import type { Accion, Modo, SimState } from './tipos'
import { nuevaSemilla } from '../lib/rng'

interface Ctx {
  s: SimState | null
  dispatch: (a: Accion) => void
  iniciar: (modo: Modo) => void
  reiniciar: () => void
  cerrar: () => void
}

const SimCtx = createContext<Ctx | null>(null)

type AccionRaiz = Accion | { tipo: '__CARGAR'; estado: SimState | null }

function raiz(s: SimState | null, a: AccionRaiz): SimState | null {
  if (a.tipo === '__CARGAR') return a.estado
  if (!s) return s
  return reducir(s, a)
}

function cargarGuardado(): SimState | null {
  const g = leer<SimState | null>(CLAVES.sesion, null)
  if (!g || g.v !== VERSION_ESTADO || !g.esc) return null
  return g
}

export function SimProvider({ children }: { children: ReactNode }) {
  const [s, dispatchRaiz] = useReducer(raiz, null, cargarGuardado)
  const temporizador = useRef<number | null>(null)

  // Persistencia (con pequeño retraso para no escribir en cada tecla).
  useEffect(() => {
    if (temporizador.current) window.clearTimeout(temporizador.current)
    temporizador.current = window.setTimeout(() => {
      if (s) guardar(CLAVES.sesion, s)
    }, 350)
    return () => {
      if (temporizador.current) window.clearTimeout(temporizador.current)
    }
  }, [s])

  // Reloj del simulador: termina reinicios pendientes.
  const activo = !!s && !s.fin
  useEffect(() => {
    if (!activo) return
    const id = window.setInterval(() => dispatchRaiz({ tipo: 'TICK', ahora: Date.now() }), 500)
    return () => window.clearInterval(id)
  }, [activo])

  const dispatch = useCallback((a: Accion) => dispatchRaiz(a), [])
  const iniciar = useCallback((modo: Modo) => {
    const esc = modo === 'guiado' ? escenarioGuiado() : escenarioExamen(nuevaSemilla())
    dispatchRaiz({ tipo: '__CARGAR', estado: crearEstado(esc) })
  }, [])
  const reiniciar = useCallback(() => {
    if (!s) return
    const esc = s.esc.modo === 'guiado' ? escenarioGuiado() : escenarioExamen(nuevaSemilla())
    dispatchRaiz({ tipo: '__CARGAR', estado: crearEstado(esc) })
  }, [s])
  const cerrar = useCallback(() => {
    borrar(CLAVES.sesion)
    dispatchRaiz({ tipo: '__CARGAR', estado: null })
  }, [])

  const valor = useMemo(() => ({ s, dispatch, iniciar, reiniciar, cerrar }), [s, dispatch, iniciar, reiniciar, cerrar])
  return <SimCtx.Provider value={valor}>{children}</SimCtx.Provider>
}

export function useSimCtx(): Ctx {
  const c = useContext(SimCtx)
  if (!c) throw new Error('SimProvider faltante')
  return c
}

/** Para componentes que solo existen dentro de una sesión activa. */
export function useSim(): { s: SimState; dispatch: (a: Accion) => void } {
  const { s, dispatch } = useSimCtx()
  if (!s) throw new Error('No hay sesión activa')
  return { s, dispatch }
}
