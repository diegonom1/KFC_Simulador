import { AnimatePresence, motion } from 'framer-motion'
import { Cable, CircuitBoard, Plug, Power, PowerOff, ScanSearch, Screw, Unplug, Wrench } from 'lucide-react'
import type { ReactNode } from 'react'
import { useSim } from '../../engine/SimProvider'
import type { PasoHw } from '../../engine/tipos'
import { sfx } from '../../lib/sonido'
import { cx } from '../../lib/util'

type Accion = { id: string; t: string; icono: ReactNode; activa: boolean; paso?: PasoHw; especial?: 'apagar' | 'encender'; peligro?: boolean }

export function Gabinete({ onEncender }: { onEncender?: () => void }) {
  const { s, dispatch } = useSim()
  const hw = s.hw
  const pci = s.esc.pcRanuraPci
  const encendida = s.linux.pc.encendida
  const arrancando = !!s.linux.pc.reiniciandoHasta

  const siguiente = (): string => {
    const listo = pci ? hw.tarjetaInstalada && hw.tarjetaAtornillada : hw.revisoRanuras
    if (encendida && !(listo && !hw.tapaAbierta && hw.tornillos && hw.corriente && hw.cableEth1)) return listo && hw.cableEth1 ? '' : 'apagar'
    if (!listo) {
      if (hw.corriente) return 'quitar-corriente'
      if (hw.tornillos && !hw.tapaAbierta) return 'quitar-tornillos'
      if (!hw.tapaAbierta) return 'abrir-tapa'
      if (!hw.revisoRanuras) return 'revisar-ranuras'
      if (pci && !hw.tarjetaInstalada) return 'insertar-tarjeta'
      if (pci && !hw.tarjetaAtornillada) return 'atornillar-tarjeta'
    }
    if (hw.tapaAbierta) return 'cerrar-tapa'
    if (!hw.tornillos) return 'poner-tornillos'
    if (!hw.cableEth1) return 'conectar-red-eth1'
    if (!hw.corriente) return 'poner-corriente'
    if (!encendida) return 'encender'
    return ''
  }
  const sig = siguiente()

  const acciones: Accion[] = [
    { id: 'apagar', t: 'Apagar desde el sistema', icono: <PowerOff size={15} />, activa: encendida && !arrancando, especial: 'apagar' },
    { id: 'quitar-corriente', t: 'Desconectar cable de corriente', icono: <Unplug size={15} />, activa: hw.corriente, paso: 'quitar-corriente', peligro: encendida },
    { id: 'poner-corriente', t: 'Conectar cable de corriente', icono: <Plug size={15} />, activa: !hw.corriente, paso: 'poner-corriente' },
    { id: 'quitar-tornillos', t: 'Quitar tornillos de la tapa', icono: <Screw size={15} />, activa: hw.tornillos && !hw.tapaAbierta, paso: 'quitar-tornillos' },
    { id: 'abrir-tapa', t: 'Quitar tapa lateral', icono: <Wrench size={15} />, activa: !hw.tornillos && !hw.tapaAbierta, paso: 'abrir-tapa', peligro: hw.corriente },
    { id: 'revisar-ranuras', t: 'Buscar ranura PCI libre', icono: <ScanSearch size={15} />, activa: hw.tapaAbierta, paso: 'revisar-ranuras' },
    ...(pci
      ? [
          { id: 'insertar-tarjeta', t: 'Insertar tarjeta de red', icono: <CircuitBoard size={15} />, activa: hw.tapaAbierta && hw.revisoRanuras && !hw.tarjetaInstalada, paso: 'insertar-tarjeta' as PasoHw },
          { id: 'atornillar-tarjeta', t: 'Atornillar la tarjeta', icono: <Screw size={15} />, activa: hw.tapaAbierta && hw.tarjetaInstalada && !hw.tarjetaAtornillada, paso: 'atornillar-tarjeta' as PasoHw },
        ]
      : []),
    { id: 'cerrar-tapa', t: 'Poner tapa lateral', icono: <Wrench size={15} />, activa: hw.tapaAbierta, paso: 'cerrar-tapa' },
    { id: 'poner-tornillos', t: 'Poner tornillos', icono: <Screw size={15} />, activa: !hw.tornillos && !hw.tapaAbierta, paso: 'poner-tornillos' },
    {
      id: 'conectar-red-eth1',
      t: pci ? 'Conectar cable de red a la tarjeta nueva' : 'Conectar cable de red al 2º puerto (Realtek)',
      icono: <Cable size={15} />,
      activa: !hw.cableEth1 && (!pci || hw.tarjetaInstalada),
      paso: 'conectar-red-eth1',
    },
    { id: 'desconectar-red-eth1', t: 'Desconectar cable de red eth1', icono: <Cable size={15} />, activa: hw.cableEth1, paso: 'desconectar-red-eth1' },
    { id: 'encender', t: 'Encender (botón de encendido)', icono: <Power size={15} />, activa: !encendida && hw.corriente, especial: 'encender' },
  ]

  const ejecutar = (a: Accion) => {
    if (a.especial === 'apagar') dispatch({ tipo: 'LINUX_APAGAR', host: 'pc' })
    else if (a.especial === 'encender') {
      dispatch({ tipo: 'LINUX_ENCENDER', host: 'pc' })
      sfx.arranque()
      onEncender?.()
      return
    } else if (a.paso) dispatch({ tipo: 'HW', paso: a.paso })
    if (a.paso === 'quitar-corriente' || a.paso === 'desconectar-red-eth1') sfx.desconectar()
    else if (a.paso === 'poner-corriente' || a.paso === 'conectar-red-eth1' || a.paso === 'insertar-tarjeta') sfx.conectar()
    else sfx.click()
  }

  const yCard = 286
  return (
    <div className="@container h-full min-h-0 overflow-y-auto p-3">
     <div className="flex flex-col gap-3 @3xl:h-full @3xl:flex-row">
      <div className="relative min-h-[300px] overflow-hidden rounded-xl border border-borde bg-[radial-gradient(ellipse_at_center,#172234,#0a0f17)] @3xl:flex-[3]">
        <svg viewBox="110 20 380 400" className="mx-auto h-full max-h-[460px] w-full">
          <rect x={0} y={404} width={640} height={26} fill="#3b2f2a" />
          <rect x={0} y={400} width={640} height={6} fill="#5b463d" />
          {/* cable de corriente */}
          <motion.g animate={{ x: hw.corriente ? 0 : -46 }} transition={{ type: 'spring', stiffness: 200, damping: 20 }}>
            <path d="M -10 60 C 60 60 80 76 128 76" stroke="#111" strokeWidth={9} fill="none" />
            <rect x={124} y={66} width={26} height={20} rx={3} fill="#1f2937" stroke="#4b5563" />
          </motion.g>
          {/* gabinete */}
          <rect x={150} y={36} width={300} height={366} rx={10} fill="#262c36" stroke="#3f4855" strokeWidth={2} />
          <rect x={150} y={36} width={26} height={366} fill="#1d222a" />
          <rect x={153} y={70} width={20} height={14} rx={2} fill="#0b0d10" stroke="#4b5563" />
          <text x={163} y={64} fontSize={7} fill="#9ca3af" textAnchor="middle">
            AC
          </text>
          <rect x={154} y={138} width={18} height={14} rx={2} fill="#05070b" stroke="#4b5563" />
          <text x={163} y={133} fontSize={7} fill="#9ca3af" textAnchor="middle">
            eth0
          </text>
          <rect x={154} y={162} width={18} height={14} rx={2} fill="#05070b" stroke={!pci && hw.realtek ? '#22c55e' : '#4b5563'} />
          <text x={163} y={186} fontSize={6.5} fill="#9ca3af" textAnchor="middle">
            LAN2
          </text>
          {[248, yCard, 324].map((y, i) => (
            <rect key={y} x={152} y={y - 4} width={22} height={24} rx={1} fill={pci && i === 1 && hw.tarjetaInstalada ? '#334155' : '#3f4855'} stroke="#111" />
          ))}
          {pci && hw.tarjetaInstalada && <rect x={155} y={yCard + 2} width={16} height={12} rx={1.5} fill="#05070b" stroke="#22c55e" />}
          {/* cable de red eth0 (siempre) */}
          <path d="M -10 145 C 80 145 100 145 154 145" stroke="#38bdf8" strokeWidth={6} fill="none" opacity={0.9} />
          {/* cable eth1 */}
          <AnimatePresence>
            {hw.cableEth1 && (
              <motion.path
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                exit={{ opacity: 0 }}
                d={pci ? `M -10 ${yCard + 50} C 80 ${yCard + 50} 100 ${yCard + 8} 155 ${yCard + 8}` : 'M -10 200 C 80 200 100 169 154 169'}
                stroke="#f97316"
                strokeWidth={6}
                fill="none"
              />
            )}
          </AnimatePresence>
          {/* interior */}
          <rect x={180} y={50} width={258} height={338} rx={4} fill="#0b1a12" />
          <rect x={192} y={60} width={232} height={318} rx={3} fill="#14532d" stroke="#166534" />
          <circle cx={330} cy={140} r={34} fill="#1f2937" stroke="#374151" strokeWidth={3} />
          {Array.from({ length: 8 }, (_, i) => (
            <line key={i} x1={330} y1={140} x2={330 + Math.cos((i * Math.PI) / 4) * 30} y2={140 + Math.sin((i * Math.PI) / 4) * 30} stroke="#4b5563" strokeWidth={4} />
          ))}
          {[392, 402].map((x) => (
            <rect key={x} x={x} y={92} width={6} height={110} rx={1} fill="#1e3a8a" stroke="#60a5fa" strokeOpacity={0.5} />
          ))}
          <text x={300} y={226} fontSize={9} fill="#86efac" opacity={0.7}>
            RANURAS PCI / PCIe
          </text>
          {[248, yCard, 324].map((y, i) => {
            const libre = pci && i === 1
            const resaltar = libre && hw.revisoRanuras && !hw.tarjetaInstalada
            return (
              <g key={y}>
                <rect x={200} y={y} width={190} height={14} rx={2} fill={resaltar ? '#facc15' : '#0f172a'} stroke={resaltar ? '#fde047' : '#334155'} className={resaltar ? 'led-actividad' : undefined} />
                {!libre && (
                  <g>
                    <rect x={176} y={y - 8} width={200} height={22} rx={2} fill={i === 0 ? '#7f1d1d' : '#1e3a8a'} stroke="#000" />
                    <text x={276} y={y + 7} fontSize={8} fill="#e5e7eb" textAnchor="middle">
                      {i === 0 ? 'Tarjeta de video (ocupada)' : 'Tarjeta serial (ocupada)'}
                    </text>
                  </g>
                )}
              </g>
            )
          })}
          {/* tarjeta de red */}
          {pci && (
            <motion.g initial={false} animate={{ x: hw.tarjetaInstalada ? 0 : 290, opacity: hw.tapaAbierta || hw.tarjetaInstalada ? 1 : 0 }} transition={{ type: 'spring', stiffness: 120, damping: 18 }}>
              <rect x={176} y={yCard - 10} width={180} height={26} rx={2} fill="#065f46" stroke="#022c22" />
              <rect x={290} y={yCard - 6} width={28} height={16} rx={1} fill="#111827" />
              {Array.from({ length: 12 }, (_, i) => (
                <rect key={i} x={196 + i * 7} y={yCard + 12} width={4} height={6} fill="#facc15" />
              ))}
              <text x={230} y={yCard + 6} fontSize={8} fill="#d1fae5">
                Tarjeta de red
              </text>
              <rect x={170} y={yCard - 12} width={8} height={30} fill="#9ca3af" />
              {hw.tarjetaAtornillada && <circle cx={174} cy={yCard - 14} r={4} fill="#d4d4d8" stroke="#52525b" />}
            </motion.g>
          )}
          {/* tapa lateral */}
          <motion.g initial={false} animate={{ x: hw.tapaAbierta ? 260 : 0, opacity: hw.tapaAbierta ? 0.12 : 1 }} transition={{ type: 'spring', stiffness: 110, damping: 18 }}>
            <rect x={176} y={40} width={272} height={358} rx={8} fill="#353c48" stroke="#4b5563" strokeWidth={2} />
            {Array.from({ length: 9 }, (_, i) => (
              <rect key={i} x={300} y={120 + i * 16} width={110} height={6} rx={3} fill="#232830" />
            ))}
            <text x={312} y={96} fontSize={11} fill="#9ca3af">
              PC Gerencial
            </text>
          </motion.g>
          {/* tornillos */}
          <AnimatePresence>
            {hw.tornillos &&
              [58, 380].map((y) => (
                <motion.g key={y} initial={{ scale: 0 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0, rotate: 540, opacity: 0 }} style={{ transformOrigin: `186px ${y}px` }}>
                  <circle cx={186} cy={y} r={7} fill="#d4d4d8" stroke="#52525b" strokeWidth={1.5} />
                  <line x1={181} y1={y} x2={191} y2={y} stroke="#52525b" strokeWidth={2} />
                </motion.g>
              ))}
          </AnimatePresence>
          {/* LED de encendido */}
          <circle cx={440} cy={56} r={5} fill={encendida ? '#22c55e' : '#14532d'} className={encendida ? 'led-actividad' : undefined} />
          <text x={432} y={74} fontSize={8} fill="#9ca3af" textAnchor="end">
            {encendida ? (arrancando ? 'arrancando' : 'encendida') : 'apagada'}
          </text>
          {!pci && hw.revisoRanuras && hw.tapaAbierta && (
            <g>
              <rect x={196} y={350} width={232} height={30} rx={6} fill="#7c2d12" opacity={0.9} />
              <text x={312} y={369} fontSize={10} fill="#fed7aa" textAnchor="middle">
                No hay ranura PCI libre → habilita la Realtek en la BIOS
              </text>
            </g>
          )}
        </svg>
      </div>
      <div className="flex flex-col gap-2 @3xl:flex-[2] @3xl:overflow-y-auto">
        <div className="grid grid-cols-2 gap-2 text-xs">
          {(
            [
              ['Sistema', encendida ? (arrancando ? 'Arrancando' : 'Encendido') : 'Apagado', encendida],
              ['Corriente', hw.corriente ? 'Conectada' : 'Desconectada', hw.corriente],
              ['Tapa', hw.tapaAbierta ? 'Quitada' : hw.tornillos ? 'Atornillada' : 'Sin tornillos', !hw.tapaAbierta],
              ['eth1', pci ? (hw.tarjetaInstalada ? (hw.tarjetaAtornillada ? 'Tarjeta instalada' : 'Sin atornillar') : 'Sin tarjeta') : hw.realtek ? 'Realtek habilitada' : 'Realtek deshabilitada', pci ? hw.tarjetaInstalada : hw.realtek],
            ] as const
          ).map(([t, v, ok]) => (
            <div key={t} className="rounded-lg border border-borde bg-black/20 px-2.5 py-1.5">
              <p className="text-[10px] uppercase tracking-wider text-tenue">{t}</p>
              <p className={cx('font-medium', ok ? 'text-emerald-300' : 'text-slate-300')}>{v}</p>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-1.5">
          {acciones.map((a) => (
            <button
              key={a.id}
              disabled={!a.activa}
              data-guide={a.id === sig ? 'hw-accion' : undefined}
              onClick={() => ejecutar(a)}
              className={cx(
                'flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition disabled:pointer-events-none disabled:opacity-30',
                'border-borde-2 bg-panel-3 hover:border-cyan-400/50',
              )}
            >
              <span className="text-cyan-300">{a.icono}</span>
              <span className="flex-1">{a.t}</span>
            </button>
          ))}
        </div>
        {!pci && hw.revisoRanuras && (
          <p className="rounded-lg border border-amber-400/30 bg-amber-400/10 p-2.5 text-xs text-amber-100">
            Esta PC no tiene ranura PCI libre. Al encender presiona <b>F2</b> (o F8 / F12) para entrar a la BIOS y habilitar la <b>Controladora de LAN Realtek</b>.
          </p>
        )}
      </div>
     </div>
    </div>
  )
}
