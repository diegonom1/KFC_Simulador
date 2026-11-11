import { AnimatePresence, motion } from 'framer-motion'
import { Folder, Globe, Keyboard, LockKeyhole, Network, Power, SquareTerminal, Volume2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { credenciales, equiposRed } from '../../data/sucursal'
import { aplicarArranque } from '../../engine/linux/interfaces'
import { DURACION } from '../../engine/motor'
import { hayEth1 } from '../../engine/red'
import { useSim } from '../../engine/SimProvider'
import type { HostLinux } from '../../engine/tipos'
import { sfx } from '../../lib/sonido'
import { cx } from '../../lib/util'
import { Bios } from '../hardware/Bios'
import { Navegador } from '../navegador/Navegador'
import { Terminal } from '../terminal/Terminal'
import { Kbd } from '../ui/base'
import { Ventana } from './Ventana'

const autenticado = new Map<HostLinux, { hasta: number; arranque: number }>()
const POST_MS = 2600

function useAhora(activo: boolean) {
  const [t, setT] = useState(() => Date.now())
  useEffect(() => {
    if (!activo) return
    const id = window.setInterval(() => setT(Date.now()), 120)
    return () => window.clearInterval(id)
  }, [activo])
  return t
}

function passwordSesion(host: HostLinux, passPc: string) {
  return host === 'pc' ? passPc : host === 'hd' ? credenciales.homeDelivery.sesion : credenciales.lms.sesion
}

export function EscritorioLinux({ host }: { host: HostLinux }) {
  const { s, dispatch } = useSim()
  const l = s.linux[host]
  const [enBios, setEnBios] = useState(false)
  const ahora = useAhora(!!l.reiniciandoHasta)
  const [ventanas, setVentanas] = useState<Array<'terminal' | 'firefox'>>([])
  const [foco, setFoco] = useState<'terminal' | 'firefox' | null>(null)
  const [auth, setAuth] = useState(false)
  const [menuPower, setMenuPower] = useState(false)

  const transcurrido = l.reiniciandoHasta ? DURACION.linux - (l.reiniciandoHasta - ahora) : Infinity
  const pantalla = enBios ? 'bios' : !l.encendida ? 'apagada' : l.reiniciandoHasta ? (transcurrido < POST_MS ? 'post' : 'arranque') : 'escritorio'

  useEffect(() => {
    if (pantalla !== 'escritorio') {
      setVentanas([])
      setAuth(false)
    }
  }, [pantalla])

  const abrirTerminal = () => {
    if (ventanas.includes('terminal')) {
      setFoco('terminal')
      return
    }
    const a = autenticado.get(host)
    if (a && a.arranque === l.arranques && a.hasta > Date.now()) {
      setVentanas((v) => [...v, 'terminal'])
      setFoco('terminal')
    } else setAuth(true)
  }

  const abrirFirefox = () => {
    if (!ventanas.includes('firefox')) setVentanas((v) => [...v, 'firefox'])
    setFoco('firefox')
  }

  const abrirRef = useRef(abrirTerminal)
  abrirRef.current = abrirTerminal
  useEffect(() => {
    if (pantalla !== 'escritorio') return
    const f = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 't' && (e.ctrlKey || e.altKey) && !e.shiftKey) {
        e.preventDefault()
        abrirRef.current()
      }
    }
    window.addEventListener('keydown', f)
    return () => window.removeEventListener('keydown', f)
  }, [pantalla])

  const entrarBios = () => {
    sfx.click()
    dispatch({ tipo: 'LINUX_APAGAR', host })
    setEnBios(true)
  }

  // Teclas F2 / F8 / F12 durante el POST
  useEffect(() => {
    if (pantalla !== 'post') return
    const f = (e: KeyboardEvent) => {
      if (['F2', 'F8', 'F12'].includes(e.key)) {
        e.preventDefault()
        entrarBios()
      }
    }
    window.addEventListener('keydown', f)
    return () => window.removeEventListener('keydown', f)
  })

  const log = useMemo(() => aplicarArranque(l.archivos['/etc/network/interfaces'] ?? '', host === 'pc' && hayEth1(s)).log, [l.archivos, host, s])

  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      {pantalla === 'apagada' && (
        <div className="grid h-full place-items-center text-center">
          <div>
            <p className="mb-3 text-sm text-slate-500">El equipo está apagado</p>
            <button
              data-guide={host === 'pc' && !s.hw.corriente ? undefined : 'pc-encender'}
              disabled={host === 'pc' && !s.hw.corriente}
              onClick={() => {
                dispatch({ tipo: 'LINUX_ENCENDER', host })
                sfx.arranque()
              }}
              className="inline-flex items-center gap-2 rounded-full border border-slate-600 px-5 py-2 text-sm text-slate-200 hover:border-emerald-400 hover:text-emerald-300 disabled:opacity-40"
            >
              <Power size={16} /> Encender
            </button>
            {host === 'pc' && !s.hw.corriente && <p className="mt-2 text-xs text-amber-300">Sin corriente: conecta el cable en la pestaña Gabinete.</p>}
          </div>
        </div>
      )}
      {pantalla === 'post' && (
        <div className="flex h-full flex-col justify-between p-6 font-mono text-[13px] text-slate-200">
          <div className="space-y-1">
            <p className="text-lg font-bold text-white">{equiposRed[host].corto} · BIOS v2.18</p>
            <p>Procesador: Intel Core i5-7500 @ 3.40GHz</p>
            <p>Memoria: 8192 MB ........ OK</p>
            <p>SATA 0: WDC WD5000AAKX 500 GB</p>
            {host === 'pc' && hayEth1(s) && <p>LAN 2: {s.esc.pcRanuraPci ? 'PCI Gigabit Ethernet' : 'Realtek RTL8111'} ........ detectada</p>}
          </div>
          <div data-guide={host === 'pc' ? 'post-teclas' : undefined} className="flex flex-wrap gap-3">
            {(
              [
                ['F2', 'Configuración (BIOS)'],
                ['F8', 'Opciones de arranque'],
                ['F12', 'Menú de arranque'],
              ] as const
            ).map(([k, t]) => (
              <button key={k} onClick={entrarBios} className="rounded border border-slate-600 px-3 py-1 hover:bg-white/10">
                &lt;{k}&gt; {t}
              </button>
            ))}
          </div>
        </div>
      )}
      {pantalla === 'arranque' && (
        <div className="h-full overflow-hidden p-3 font-mono text-[12px] leading-5 text-slate-300">
          {log.slice(0, Math.max(1, Math.ceil(((transcurrido - POST_MS) / (DURACION.linux - POST_MS)) * log.length))).map((x, i) => (
            <p key={i}>
              {x.estado === 'ok' && <span className="text-[#8ae234]">[  OK  ] </span>}
              {x.estado === 'fail' && <span className="text-[#ef2929]">[FAILED] </span>}
              {x.estado === 'warn' && <span className="text-[#fce94f]">[ WARN ] </span>}
              {x.t}
            </p>
          ))}
        </div>
      )}
      {pantalla === 'bios' && (
        <Bios
          pci={s.esc.pcRanuraPci}
          realtekInicial={s.hw.realtek}
          onSalir={(r) => {
            setEnBios(false)
            if (r.guardar) dispatch({ tipo: 'BIOS_GUARDAR', realtek: r.realtek, cambiosExtra: r.cambiosExtra })
            else dispatch({ tipo: 'LINUX_ENCENDER', host })
          }}
        />
      )}
      {pantalla === 'escritorio' && (
        <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_80%_100%,#e95420_0%,#c34113_18%,#77216f_45%,#2c001e_80%)]">
          <div className="absolute inset-x-0 top-0 z-30 flex h-7 items-center justify-between bg-black/85 px-3 text-[12px] text-slate-200">
            <span className="font-medium">Actividades</span>
            <span className="hidden sm:inline">mar 10 nov · 10:31</span>
            <div className="flex items-center gap-2.5">
              <button onClick={abrirTerminal} className="hidden items-center gap-1 rounded bg-white/10 px-1.5 py-0.5 hover:bg-white/20 sm:inline-flex" title="En la PC real: Ctrl + T. Tu navegador reserva Ctrl+T, aquí usa este botón o Alt+T.">
                <Keyboard size={12} /> <span className="font-mono">Ctrl+T</span>
              </button>
              <Network size={13} />
              <Volume2 size={13} />
              <div className="relative">
                <button data-guide="desk-apagar" onClick={() => setMenuPower((v) => !v)} className="rounded p-0.5 hover:bg-white/10" aria-label="Menú de apagado">
                  <Power size={13} />
                </button>
                {menuPower && (
                  <div className="absolute right-0 top-6 w-44 rounded-lg border border-white/10 bg-[#2d2d2d] py-1 shadow-xl">
                    <button
                      onClick={() => {
                        setMenuPower(false)
                        dispatch({ tipo: 'LINUX_APAGAR', host })
                      }}
                      className="block w-full px-3 py-1.5 text-left hover:bg-white/10"
                    >
                      Apagar…
                    </button>
                    <button
                      onClick={() => {
                        setMenuPower(false)
                        dispatch({ tipo: 'LINUX_REINICIAR', host })
                      }}
                      className="block w-full px-3 py-1.5 text-left hover:bg-white/10"
                    >
                      Reiniciar…
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 top-7 z-20 flex w-14 flex-col items-center gap-2 bg-black/60 py-3">
            <BotonDock guia="desk-firefox" titulo="Firefox" onClick={abrirFirefox} activo={ventanas.includes('firefox')}>
              <Globe size={24} className="text-orange-300" />
            </BotonDock>
            <BotonDock guia="desk-terminal" titulo="Terminal (Ctrl+T)" onClick={abrirTerminal} activo={ventanas.includes('terminal')}>
              <SquareTerminal size={24} className="text-slate-200" />
            </BotonDock>
            <BotonDock titulo="Archivos" onClick={() => {}}>
              <Folder size={24} className="text-amber-200/80" />
            </BotonDock>
          </div>
          <div className="pointer-events-none absolute bottom-6 right-6 text-right text-white/80">
            <p className="text-xl font-semibold drop-shadow">{equiposRed[host].corto}</p>
            <p className="text-xs">{equiposRed[host].hostname} · Ubuntu 18.04</p>
            {ventanas.length === 0 && (
              <p className="mt-2 inline-flex items-center gap-1 rounded bg-black/40 px-2 py-1 text-[11px]">
                Abre la terminal con <Kbd className="!text-[10px]">Ctrl</Kbd>+<Kbd className="!text-[10px]">T</Kbd> o el ícono del dock
              </p>
            )}
          </div>
          <div className="absolute bottom-0 left-14 right-0 top-7">
            {ventanas.includes('terminal') && (
              <Ventana
                titulo={`Terminal · ${equiposRed[host].hostname}`}
                icono={<SquareTerminal size={13} />}
                estilo="ubuntu"
                inicial={{ x: 24, y: 18, w: 760, h: 440 }}
                z={foco === 'terminal' ? 20 : 10}
                onFoco={() => setFoco('terminal')}
                onCerrar={() => setVentanas((v) => v.filter((x) => x !== 'terminal'))}
              >
                <Terminal host={host} onCerrar={() => setVentanas((v) => v.filter((x) => x !== 'terminal'))} />
              </Ventana>
            )}
            {ventanas.includes('firefox') && (
              <Ventana
                titulo="Mozilla Firefox"
                icono={<Globe size={13} />}
                estilo="ubuntu"
                inicial={{ x: 60, y: 30, w: 860, h: 520 }}
                z={foco === 'firefox' ? 20 : 10}
                onFoco={() => setFoco('firefox')}
                onCerrar={() => setVentanas((v) => v.filter((x) => x !== 'firefox'))}
              >
                <Navegador origen={host} />
              </Ventana>
            )}
          </div>
          <AnimatePresence>
            {auth && (
              <DialogoAuth
                host={host}
                esperado={passwordSesion(host, s.esc.passwordPc)}
                onCancelar={() => setAuth(false)}
                onOk={() => {
                  autenticado.set(host, { hasta: Date.now() + 10 * 60_000, arranque: l.arranques })
                  setAuth(false)
                  setVentanas((v) => [...v, 'terminal'])
                  setFoco('terminal')
                }}
              />
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}

function BotonDock({ children, titulo, onClick, activo, guia }: { children: ReactNode; titulo: string; onClick: () => void; activo?: boolean; guia?: string }) {
  return (
    <button data-guide={guia} title={titulo} onClick={onClick} className="relative grid size-11 place-items-center rounded-xl transition hover:bg-white/15">
      {children}
      {activo && <span className="absolute -left-1.5 top-1/2 size-1.5 -translate-y-1/2 rounded-full bg-[#e95420]" />}
    </button>
  )
}

function DialogoAuth({ host, esperado, onOk, onCancelar }: { host: HostLinux; esperado: string; onOk: () => void; onCancelar: () => void }) {
  const [p, setP] = useState('')
  const [error, setError] = useState(false)
  const [sacudir, setSacudir] = useState(0)
  return (
    <motion.div className="absolute inset-0 z-40 grid place-items-center bg-black/50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.form
        data-guide="desk-auth"
        key={sacudir}
        initial={{ scale: 0.95 }}
        animate={sacudir ? { x: [0, -10, 10, -6, 6, 0], scale: 1 } : { scale: 1 }}
        transition={{ duration: 0.35 }}
        onSubmit={(e) => {
          e.preventDefault()
          if (p === esperado) onOk()
          else {
            setError(true)
            setP('')
            setSacudir((x) => x + 1)
            sfx.error()
          }
        }}
        className="w-[min(380px,92%)] rounded-xl border border-white/10 bg-[#353535] p-5 text-center text-slate-100 shadow-2xl"
      >
        <LockKeyhole className="mx-auto mb-2 text-slate-300" size={30} />
        <p className="font-semibold">Autenticación necesaria</p>
        <p className="mt-1 text-xs text-slate-300">Se requiere la contraseña de sesión para abrir la terminal en {equiposRed[host].corto}.</p>
        <div className="mx-auto mt-3 flex w-fit items-center gap-2 rounded-full bg-black/30 px-3 py-1 text-sm">
          <span className="grid size-6 place-items-center rounded-full bg-[#e95420] text-xs font-bold">{credenciales.pcGerencial.usuarioSesion[0].toUpperCase()}</span>
          {credenciales.pcGerencial.usuarioSesion}
        </div>
        <input autoFocus type="password" value={p} onChange={(e) => setP(e.target.value)} placeholder="Contraseña" className="mt-3 w-full rounded-md border border-white/15 bg-black/30 px-3 py-2 text-sm outline-none focus:border-[#e95420]" />
        {error && <p className="mt-2 text-xs text-rose-300">Lo sentimos, eso no funcionó. Inténtelo de nuevo.</p>}
        <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
          <button type="button" onClick={onCancelar} className="rounded-md bg-white/10 py-1.5 hover:bg-white/15">
            Cancelar
          </button>
          <button className={cx('rounded-md bg-[#e95420] py-1.5 font-semibold hover:brightness-110')}>Autenticar</button>
        </div>
      </motion.form>
    </motion.div>
  )
}
