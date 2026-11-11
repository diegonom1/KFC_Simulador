import { motion } from 'framer-motion'
import { ArrowRight, BookOpen, Cable, Compass, Cpu, FileCheck2, Globe, History, PlayCircle, RotateCcw, ShieldCheck, SquareTerminal, Timer, Trophy } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Escena } from '../components/escena/Escena'
import { Topologia } from '../components/Topologia'
import { Boton, Insignia, Modal } from '../components/ui/base'
import type { ResumenHistorial } from '../engine/calificacion'
import { objetivosAplicables } from '../engine/objetivos'
import { useSimCtx } from '../engine/SimProvider'
import type { Modo } from '../engine/tipos'
import { CLAVES, leer } from '../lib/almacen'
import { irA } from '../lib/ruta'
import { cx, fechaHora, formatoTiempo } from '../lib/util'

const CARACTERISTICAS = [
  { icono: SquareTerminal, t: 'Terminal Linux real', d: 'su, sudo, ip a, nano con Ctrl+O / Ctrl+X, ping -c 40 en tiempo real y reboot.' },
  { icono: Cable, t: 'Cableado drag & drop', d: 'Patch cords, FortiGate 40F, switch de 48 con VLANs, SW Plano, ONTs y etiquetas.' },
  { icono: Globe, t: 'Interfaces web', d: 'Biométrico, Yealink, HME 50/60, impresora, módem Telmex y speedtest en un Firefox simulado.' },
  { icono: Cpu, t: 'Hardware y BIOS', d: 'Abre la PC, instala la tarjeta en la ranura PCI o habilita la Realtek en la BIOS.' },
  { icono: ShieldCheck, t: 'Reglas que se validan', d: 'Orden correcto, respaldo de IPs, archivos revisados de verdad y errores explicados.' },
  { icono: FileCheck2, t: 'Evidencias imprimibles', d: 'IP vieja → nueva, pings 40/40, speedtest con captura y etiquetas.' },
]

export function Inicio() {
  const { s, iniciar, cerrar } = useSimCtx()
  const [confirmar, setConfirmar] = useState<Modo | null>(null)
  const historial = useMemo(() => leer<ResumenHistorial[]>(CLAVES.historial, []), [])
  const enCurso = s && !s.fin ? s : null
  const progreso = enCurso ? Object.keys(enCurso.completados).length / objetivosAplicables(enCurso.esc).length : 0

  const empezar = (m: Modo) => {
    if (enCurso) setConfirmar(m)
    else {
      iniciar(m)
      irA(m)
    }
  }

  return (
    <div className="fondo-app min-h-dvh overflow-x-hidden">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
        <div className="flex items-center gap-2.5">
          <div className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-cyan-400 to-violet-500 text-slate-950 shadow-lg shadow-cyan-500/20">
            <Compass size={20} strokeWidth={2.4} />
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">Simulador SD-WAN</p>
            <p className="text-[11px] text-tenue">Práctica de campo · sucursal</p>
          </div>
        </div>
        <Boton variante="fantasma" tam="sm" icono={<BookOpen size={15} />} onClick={() => irA('referencia')}>
          Referencia rápida
        </Boton>
      </header>

      <section className="mx-auto grid max-w-7xl items-center gap-6 px-4 pb-6 pt-2 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:pt-8">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <Insignia color="violeta" className="mb-4">
            Datos de ejemplo · todo corre en tu navegador
          </Insignia>
          <h1 className="text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl">
            Practica la migración <span className="texto-degradado whitespace-nowrap">SD-WAN</span> de una sucursal antes de ir a campo
          </h1>
          <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-slate-300">
            Recorre el procedimiento completo: IP fija en la laptop, respaldo, biométrico, teléfono, HME, impresora, terminal Linux, tarjeta de red, cableado del rack, pings de validación y speedtest.
          </p>
          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            <motion.button whileHover={{ y: -3 }} whileTap={{ scale: 0.98 }} onClick={() => empezar('guiado')} className="group relative overflow-hidden rounded-2xl border border-cyan-400/40 bg-gradient-to-br from-cyan-400/20 via-cyan-400/5 to-transparent p-5 text-left shadow-[0_20px_50px_-25px_rgb(34_211_238/0.8)]">
              <Compass className="mb-3 text-cyan-300" size={28} />
              <p className="text-lg font-semibold">Modo guiado</p>
              <p className="mt-1 text-[13px] leading-snug text-slate-300">Un panel de misión te dice qué sigue, por qué y dónde dar clic. Si te equivocas, te explica qué pasaría en la vida real.</p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-cyan-200">
                Empezar <ArrowRight size={16} className="transition group-hover:translate-x-1" />
              </span>
            </motion.button>
            <motion.button whileHover={{ y: -3 }} whileTap={{ scale: 0.98 }} onClick={() => empezar('examen')} className="group relative overflow-hidden rounded-2xl border border-amber-400/40 bg-gradient-to-br from-amber-400/20 via-rose-400/5 to-transparent p-5 text-left shadow-[0_20px_50px_-25px_rgb(251_191_36/0.7)]">
              <Timer className="mb-3 text-amber-300" size={28} />
              <p className="text-lg font-semibold">Modo examen</p>
              <p className="mt-1 text-[13px] leading-snug text-slate-300">Sucursal aleatoria (CECO, segmentos, HME 50/60, PCI o BIOS, uno o dos carriers). Sin pistas, con cronómetro y calificación.</p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-amber-200">
                Generar examen <ArrowRight size={16} className="transition group-hover:translate-x-1" />
              </span>
            </motion.button>
          </div>
          {enCurso && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="panel mt-3 flex flex-wrap items-center gap-3 p-4">
              <PlayCircle className="text-emerald-300" size={26} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">
                  Tienes una sesión en curso · modo {enCurso.esc.modo}
                </p>
                <p className="text-[12px] text-tenue">
                  {enCurso.esc.nombre} · CECO {enCurso.esc.ceco} · {Math.round(progreso * 100)}% completado
                </p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5">
                  <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400" style={{ width: `${progreso * 100}%` }} />
                </div>
              </div>
              <div className="flex gap-2">
                <Boton tam="sm" variante="exito" onClick={() => irA(enCurso.esc.modo)}>
                  Continuar
                </Boton>
                <Boton tam="sm" variante="fantasma" icono={<RotateCcw size={14} />} onClick={cerrar}>
                  Descartar
                </Boton>
              </div>
            </motion.div>
          )}
        </motion.div>
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7, delay: 0.1 }} className="relative">
          <div className="pointer-events-none absolute -inset-6 rounded-[2rem] bg-gradient-to-tr from-cyan-500/10 via-transparent to-violet-500/10 blur-2xl" />
          <div className="relative aspect-[900/545] w-full">
            <div className="absolute inset-0 flex items-center justify-center">
              <Escena decorativa className="animate-flotar" />
            </div>
          </div>
        </motion.div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
          <div className="panel p-5">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-cyan-300">Así queda la red</p>
            <h2 className="mt-1 text-xl font-semibold">Topología nueva con FortiGate y VLANs</h2>
            <Topologia className="mt-3" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            {CARACTERISTICAS.map((c, i) => (
              <motion.div key={c.t} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }} className="panel p-4">
                <c.icono className="mb-2 text-violet-300" size={20} />
                <p className="text-sm font-semibold">{c.t}</p>
                <p className="mt-1 text-[12.5px] leading-snug text-tenue">{c.d}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {historial.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-10 sm:px-6">
          <div className="panel p-5">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <History size={16} className="text-amber-300" /> Tus exámenes
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {historial
                .slice(-9)
                .reverse()
                .map((h) => (
                  <div key={h.t} className="flex items-center gap-3 rounded-xl border border-borde bg-black/20 p-3">
                    <div className={cx('grid size-12 shrink-0 place-items-center rounded-full text-lg font-bold', h.total >= 90 ? 'bg-emerald-400/15 text-emerald-200' : h.total >= 70 ? 'bg-amber-400/15 text-amber-200' : 'bg-rose-400/15 text-rose-200')}>{h.total}</div>
                    <div className="min-w-0 text-[12px]">
                      <p className="truncate font-medium text-slate-200">
                        {h.nombre} · CECO {h.ceco}
                      </p>
                      <p className="text-tenue">
                        {fechaHora(h.t)} · {formatoTiempo(h.duracion)} · {h.errores} errores
                      </p>
                    </div>
                    {h.total >= 90 && <Trophy size={16} className="ml-auto shrink-0 text-amber-300" />}
                  </div>
                ))}
            </div>
          </div>
        </section>
      )}

      <footer className="mx-auto max-w-7xl px-4 pb-8 text-center text-[11.5px] text-apagado sm:px-6">
        Simulador de práctica. IPs, contraseñas y equipos son valores de ejemplo configurables en <span className="font-mono">src/data/sucursal.ts</span>. Las marcas se mencionan solo como referencia de los equipos.
      </footer>

      <Modal abierto={!!confirmar} onCerrar={() => setConfirmar(null)} titulo="¿Empezar de nuevo?">
        <p className="text-sm text-slate-300">Tienes una sesión de modo {enCurso?.esc.modo} en curso. Si empiezas otra, se pierde ese avance.</p>
        <div className="mt-5 flex justify-end gap-2">
          <Boton variante="fantasma" onClick={() => (setConfirmar(null), enCurso && irA(enCurso.esc.modo))}>
            Continuar la actual
          </Boton>
          <Boton
            variante="primario"
            onClick={() => {
              if (!confirmar) return
              iniciar(confirmar)
              irA(confirmar)
              setConfirmar(null)
            }}
          >
            Empezar {confirmar === 'examen' ? 'examen' : 'modo guiado'}
          </Boton>
        </div>
      </Modal>
    </div>
  )
}
