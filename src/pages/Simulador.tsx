import confetti from 'canvas-confetti'
import { AnimatePresence } from 'framer-motion'
import { BookOpen, ClipboardList, Fingerprint, GraduationCap, Laptop as IconoLaptop, ListChecks, Monitor, MousePointerClick, NotebookPen, Printer, Radio, Server, Timer, Tv } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { catalogoErrores } from '../data/errores'
import { fases } from '../data/sucursal'
import { Escena, estadoMarca, LeyendaEstados } from '../components/escena/Escena'
import { EquipoLinux } from '../components/equipos/EquipoLinux'
import { BiometricoFisico, DigiFisico, HmeFisico, ImpresoraPanel, InfoMenu, InfoProveedores, InfoVlan40, TelefonoFisico } from '../components/equipos/Fisicos'
import { Laptop } from '../components/escritorio/Laptop'
import { BarraSuperior } from '../components/layout/BarraSuperior'
import { HojaTrabajo, Libreta } from '../components/layout/Cajones'
import { Bitacora, MiniMapa } from '../components/layout/Laterales'
import { PanelExamen, PanelMision } from '../components/layout/PanelMision'
import { PreguntaModal } from '../components/layout/Pregunta'
import { Resaltador } from '../components/layout/Resaltador'
import { PRIMARIAS, UiContext, type PanelId, type VentanaId } from '../components/layout/uiContexto'
import { VentanaFlotante, VentanaPrimaria } from '../components/layout/Ventanas'
import { Rack } from '../components/rack/Rack'
import { ContenidoReferencia } from '../components/Referencia'
import { Boton, Cajon, Modal } from '../components/ui/base'
import { useToasts } from '../components/ui/Toasts'
import { textoPaso } from '../engine/escenario'
import { objetivoActual } from '../engine/objetivos'
import { useSim, useSimCtx } from '../engine/SimProvider'
import type { Modo, Vlan40Id } from '../engine/tipos'
import { irA } from '../lib/ruta'
import { sfx } from '../lib/sonido'

export function Simulador({ modo }: { modo: Modo }) {
  const { s, iniciar } = useSimCtx()
  const arrancado = useRef(false)
  useEffect(() => {
    if (!s && !arrancado.current) {
      arrancado.current = true
      iniciar(modo)
    }
  }, [s, modo, iniciar])

  if (!s) return <div className="fondo-app grid h-dvh place-items-center text-tenue">Preparando la sucursal…</div>
  if (s.esc.modo !== modo || s.fin) {
    return (
      <div className="fondo-app grid h-dvh place-items-center p-4">
        <div className="panel max-w-md p-6 text-center">
          <p className="text-lg font-semibold">{s.fin ? 'Esta sesión ya terminó' : `Tienes una sesión de modo ${s.esc.modo} en curso`}</p>
          <p className="mt-2 text-sm text-tenue">{s.fin ? '¿Quieres empezar una nueva?' : `Si empiezas el modo ${modo} se pierde el avance de la sesión actual.`}</p>
          <div className="mt-5 flex flex-col gap-2">
            <Boton variante="primario" onClick={() => iniciar(modo)}>
              Empezar {modo === 'examen' ? 'examen nuevo' : 'modo guiado'}
            </Boton>
            {!s.fin && <Boton onClick={() => irA(s.esc.modo)}>Continuar la sesión actual</Boton>}
            {s.fin && s.esc.modo === 'examen' && <Boton onClick={() => irA('resultados')}>Ver resultados</Boton>}
            {s.fin && <Boton onClick={() => irA('evidencias')}>Ver hoja de evidencias</Boton>}
            <Boton variante="fantasma" onClick={() => irA('inicio')}>
              Ir al inicio
            </Boton>
          </div>
        </div>
      </div>
    )
  }
  return <SimuladorActivo />
}

const ICONOS: Record<string, ReactNode> = {
  laptop: <IconoLaptop size={17} />,
  pc: <Monitor size={17} />,
  hd: <Monitor size={17} />,
  lms: <GraduationCap size={17} />,
  rack: <Server size={17} />,
  modems: <Server size={17} />,
  bio: <Fingerprint size={15} />,
  tel: <Monitor size={15} />,
  imp: <Printer size={15} />,
  hme: <Timer size={15} />,
  digi: <Radio size={15} />,
}

function SimuladorActivo() {
  const { s, dispatch } = useSim()
  const { mostrar } = useToasts()
  const examen = s.esc.modo === 'examen'
  const [primaria, setPrimaria] = useState<VentanaId | null>(null)
  const [flotantes, setFlotantes] = useState<Array<{ id: VentanaId; z: number }>>([])
  const zTop = useRef(40)
  const [panel, setPanel] = useState<PanelId>(null)
  const [confirmar, setConfirmar] = useState(false)
  const areaRef = useRef<HTMLDivElement>(null)
  const actual = objetivoActual(s)

  const abrir = useCallback((id: VentanaId) => {
    sfx.click()
    if (PRIMARIAS.includes(id)) {
      setPrimaria(id === 'modems' ? 'rack' : id)
      return
    }
    zTop.current += 1
    const z = zTop.current
    setFlotantes((f) => (f.some((x) => x.id === id) ? f.map((x) => (x.id === id ? { ...x, z } : x)) : [...f.slice(-2), { id, z }]))
  }, [])
  const cerrar = useCallback((id: VentanaId) => {
    if (PRIMARIAS.includes(id)) setPrimaria(null)
    else setFlotantes((f) => f.filter((x) => x.id !== id))
  }, [])
  const ui = useMemo(() => ({ abrir, cerrar, panel, abrirPanel: setPanel }), [abrir, cerrar, panel])

  // Eventos del motor → avisos, sonidos y confeti
  const visto = useRef(s.seq)
  useEffect(() => {
    const nuevos = s.eventos.filter((e) => e.id >= visto.current)
    if (!nuevos.length) return
    visto.current = s.seq
    for (const e of nuevos) {
      if (e.tipo === 'info') {
        mostrar({ tipo: 'info', titulo: e.texto ?? 'Aviso', texto: e.detalle })
        sfx.aviso()
      }
      if (examen) {
        if (e.tipo === 'fin' && e.ref === 'completo') mostrar({ tipo: 'logro', titulo: 'Completaste todos los objetivos', texto: 'Cuando quieras, entrega el examen.' })
        continue
      }
      if (e.tipo === 'objetivo') {
        mostrar({ tipo: 'exito', titulo: `✓ ${e.texto ?? textoPaso(s.esc, e.ref).titulo}`, duracion: 3500 })
        sfx.exito()
      } else if (e.tipo === 'fase') {
        const f = fases[Number(e.ref) - 1]
        mostrar({ tipo: 'logro', titulo: `¡Fase ${f.n} completa!`, texto: f.titulo })
        sfx.logro()
        void confetti({ particleCount: 70, spread: 70, origin: { y: 0.25 }, colors: ['#22d3ee', '#a78bfa', '#34d399', '#fbbf24'] })
      } else if (e.tipo === 'error') {
        const def = catalogoErrores[e.ref]
        mostrar({ tipo: def?.leve ? 'aviso' : 'error', titulo: e.texto ?? 'Error', texto: e.detalle ? `${e.detalle} ${def?.detalle ?? ''}` : def?.detalle, correccion: def?.correccion })
        sfx.error()
      } else if (e.tipo === 'aviso') {
        mostrar({ tipo: 'aviso', titulo: e.texto ?? 'Aviso', texto: e.detalle })
        sfx.aviso()
      } else if (e.tipo === 'fin' && e.ref === 'completo') {
        sfx.logro()
        const fin = Date.now() + 1800
        const lluvia = () => {
          void confetti({ particleCount: 6, angle: 60, spread: 60, origin: { x: 0 }, colors: ['#22d3ee', '#a78bfa', '#34d399'] })
          void confetti({ particleCount: 6, angle: 120, spread: 60, origin: { x: 1 }, colors: ['#fbbf24', '#fb7185', '#22d3ee'] })
          if (Date.now() < fin) requestAnimationFrame(lluvia)
        }
        lluvia()
      }
    }
  }, [s.eventos, s.seq, s.esc, examen, mostrar])

  const terminar = () => {
    dispatch({ tipo: 'TERMINAR' })
    setConfirmar(false)
    window.setTimeout(() => irA(examen ? 'resultados' : 'evidencias'), 50)
  }

  const primariaInfo = (id: VentanaId): { titulo: string; sub?: string; contenido: ReactNode } => {
    switch (id) {
      case 'laptop':
        return { titulo: 'Laptop del técnico', sub: 'Windows · red, cable y Firefox', contenido: <Laptop /> }
      case 'pc':
        return { titulo: 'PC Gerencial / Servidor', sub: 'Ubuntu 18.04 · Ctrl+T abre la terminal', contenido: <EquipoLinux host="pc" /> }
      case 'hd':
        return { titulo: 'Home Delivery', sub: 'Ubuntu 18.04 · Ctrl+T abre la terminal', contenido: <EquipoLinux host="hd" /> }
      case 'lms':
        return { titulo: 'LMS', sub: 'Ubuntu 18.04 · Ctrl+T abre la terminal', contenido: <EquipoLinux host="lms" /> }
      default:
        return { titulo: 'Rack de comunicaciones', sub: 'ONT / módems, patch panel, FortiGate, switches', contenido: <Rack /> }
    }
  }

  const flotanteInfo = (id: VentanaId): { titulo: string; contenido: ReactNode; ancho?: number } => {
    switch (id) {
      case 'tel':
        return { titulo: 'Teléfono IP Yealink T30P', contenido: <TelefonoFisico />, ancho: 340 }
      case 'bio':
        return { titulo: 'Biométrico (checador)', contenido: <BiometricoFisico />, ancho: 290 }
      case 'imp':
        return { titulo: 'Impresora · display', contenido: <ImpresoraPanel />, ancho: 380 }
      case 'hme':
        return { titulo: 'HME · temporizador Drive-Thru', contenido: <HmeFisico /> }
      case 'digi':
        return { titulo: 'Digi', contenido: <DigiFisico /> }
      case 'menu':
        return { titulo: 'Pantallas de menú', contenido: <InfoMenu /> }
      case 'proveedores':
        return { titulo: 'Proveedores', contenido: <InfoProveedores /> }
      default:
        return { titulo: 'Cocina · VLAN40', contenido: <InfoVlan40 id={id as Vlan40Id} /> }
    }
  }

  const estadoPrimaria = primaria ? estadoMarca(s, primaria) : 'pendiente'
  const p = primaria ? primariaInfo(primaria) : null

  return (
    <UiContext.Provider value={ui}>
      <div className="fondo-app flex h-dvh flex-col overflow-hidden">
        <BarraSuperior onTerminar={() => setConfirmar(true)} />
        <div className="flex min-h-0 flex-1">
          <aside className="hidden w-[340px] shrink-0 border-r border-borde bg-panel/40 lg:block">{examen ? <PanelExamen onEntregar={() => setConfirmar(true)} /> : <PanelMision actual={actual} onTerminar={() => setConfirmar(true)} />}</aside>
          <main ref={areaRef} className="relative min-w-0 flex-1 overflow-hidden">
            <div className="absolute inset-0 flex flex-col">
              <div className="flex items-center justify-between gap-2 px-4 pt-3">
                <p className="flex items-center gap-1.5 text-[12px] text-tenue">
                  <MousePointerClick size={14} className="text-cyan-300" /> Haz clic en un equipo para trabajar en él
                </p>
                <LeyendaEstados className="hidden sm:flex" />
              </div>
              <div className="flex min-h-0 flex-1 items-center justify-center p-2">
                <Escena s={s} onAbrir={abrir} />
              </div>
            </div>
            <AnimatePresence>
              {p && primaria && (
                <VentanaPrimaria
                  key={primaria}
                  titulo={p.titulo}
                  subtitulo={p.sub}
                  icono={ICONOS[primaria]}
                  estado={{ t: estadoPrimaria === 'ok' ? 'Listo' : estadoPrimaria === 'error' ? 'Con error' : estadoPrimaria === 'parcial' ? 'En progreso' : 'Pendiente', c: estadoPrimaria === 'ok' ? 'verde' : estadoPrimaria === 'error' ? 'rojo' : estadoPrimaria === 'parcial' ? 'ambar' : 'gris' }}
                  onCerrar={() => setPrimaria(null)}
                >
                  {p.contenido}
                </VentanaPrimaria>
              )}
            </AnimatePresence>
            <AnimatePresence>
              {flotantes.map((f, i) => {
                const info = flotanteInfo(f.id)
                return (
                  <VentanaFlotante
                    key={f.id}
                    titulo={info.titulo}
                    icono={ICONOS[f.id] ?? <Tv size={15} />}
                    indice={i}
                    z={f.z}
                    ancho={info.ancho}
                    limites={areaRef}
                    onFoco={() => {
                      zTop.current += 1
                      const z = zTop.current
                      setFlotantes((x) => x.map((y) => (y.id === f.id ? { ...y, z } : y)))
                    }}
                    onCerrar={() => cerrar(f.id)}
                  >
                    {info.contenido}
                  </VentanaFlotante>
                )
              })}
            </AnimatePresence>
          </main>
          <aside className="hidden w-[300px] shrink-0 flex-col gap-3 border-l border-borde bg-panel/40 p-3 2xl:flex">
            <MiniMapa />
            <Bitacora />
          </aside>
        </div>

        {!examen && <Resaltador objetivo={actual} />}
        {examen && <PreguntaModal />}

        <Cajon abierto={panel === 'libreta'} onCerrar={() => setPanel(null)} titulo="Libreta de respaldo" icono={<NotebookPen size={18} className="text-amber-300" />}>
          <Libreta />
        </Cajon>
        <Cajon abierto={panel === 'hoja'} onCerrar={() => setPanel(null)} titulo="Hoja de trabajo" icono={<ClipboardList size={18} className="text-cyan-300" />}>
          <HojaTrabajo />
        </Cajon>
        <Cajon abierto={panel === 'referencia'} onCerrar={() => setPanel(null)} titulo="Referencia rápida" icono={<BookOpen size={18} className="text-violet-300" />} ancho="w-[min(720px,100vw)]">
          <ContenidoReferencia />
        </Cajon>
        <Cajon abierto={panel === 'mision'} onCerrar={() => setPanel(null)} titulo={examen ? 'Examen' : 'Misión'} icono={<ListChecks size={18} className="text-cyan-300" />} ancho="w-[min(420px,100vw)]">
          <div className="-m-5">{examen ? <PanelExamen onEntregar={() => (setPanel(null), setConfirmar(true))} /> : <PanelMision actual={actual} onTerminar={() => (setPanel(null), setConfirmar(true))} />}</div>
        </Cajon>

        <Modal abierto={confirmar} onCerrar={() => setConfirmar(false)} titulo={examen ? '¿Entregar el examen?' : '¿Terminar la práctica?'}>
          <p className="text-sm text-slate-300">
            {examen
              ? 'Se detiene el cronómetro y se califica lo que hiciste, lo que faltó y lo que quedó fuera de orden. Las preguntas sin responder cuentan como incorrectas.'
              : 'Se cierra la práctica y verás tu hoja de evidencias para imprimir.'}
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <Boton variante="fantasma" onClick={() => setConfirmar(false)}>
              Seguir trabajando
            </Boton>
            <Boton variante="primario" onClick={terminar}>
              {examen ? 'Entregar y calificar' : 'Terminar'}
            </Boton>
          </div>
        </Modal>
      </div>
    </UiContext.Provider>
  )
}
