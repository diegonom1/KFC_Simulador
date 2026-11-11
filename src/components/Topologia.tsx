// Diagrama animado de la topología nueva (SD-WAN) — explicación visual para inicio y referencia.
import { cx } from '../lib/util'

const NODOS = {
  tp: { x: 70, y: 60, t: 'ONT Totalplay', s: 'L5-ONT · DHCP', c: '#facc15' },
  tx: { x: 70, y: 170, t: 'Módem Telmex', s: 'L6-ONT · 192.168.0.1', c: '#facc15' },
  fg: { x: 300, y: 115, t: 'FortiGate 40F', s: 'SD-WAN', c: '#f87171' },
  sw: { x: 520, y: 115, t: 'Switch 48', s: 'puerto 48 = FortiLink', c: '#4ade80' },
  v10: { x: 720, y: 50, t: 'VLAN10', s: 'red interna', c: '#38bdf8' },
  v40: { x: 720, y: 180, t: 'VLAN40', s: 'cocina · 10.10.10.x', c: '#fb923c' },
  plano: { x: 520, y: 250, t: 'SW Plano', s: 'proveedores', c: '#9ca3af' },
  menu: { x: 300, y: 26, t: 'Switch plano', s: 'pantallas de menú', c: '#c084fc' },
} as const

const ENLACES: Array<[keyof typeof NODOS, keyof typeof NODOS, string, string]> = [
  ['tp', 'fg', 'WAN', '#facc15'],
  ['tx', 'fg', 'PORT1', '#facc15'],
  ['fg', 'sw', 'PORT-A → 48', '#4ade80'],
  ['sw', 'v10', '', '#38bdf8'],
  ['sw', 'v40', '', '#fb923c'],
  ['tp', 'menu', '', '#c084fc'],
]

export function Topologia({ className, compacta }: { className?: string; compacta?: boolean }) {
  return (
    <svg viewBox="0 0 820 330" className={cx('w-full', className)} role="img" aria-label="Topología de la red nueva">
      <defs>
        <filter id="tp-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {ENLACES.map(([a, b, t, c], i) => {
        const A = NODOS[a]
        const B = NODOS[b]
        const mx = (A.x + B.x) / 2
        const d = `M${A.x + 60},${A.y} C${mx},${A.y} ${mx},${B.y} ${B.x - 60},${B.y}`
        return (
          <g key={i}>
            <path d={d} fill="none" stroke={c} strokeOpacity={0.35} strokeWidth={2} />
            <path d={d} fill="none" stroke={c} strokeWidth={2} className="flujo" strokeOpacity={0.9} />
            <circle r={3.5} fill={c} filter="url(#tp-glow)">
              <animateMotion dur={`${1.8 + i * 0.35}s`} repeatCount="indefinite" path={d} />
            </circle>
            {t && !compacta && (
              <text x={mx} y={(A.y + B.y) / 2 - 8} fontSize={11} textAnchor="middle" fill={c} fontWeight={700}>
                {t}
              </text>
            )}
          </g>
        )
      })}
      {Object.entries(NODOS).map(([k, n]) => (
        <g key={k} transform={`translate(${n.x - 62} ${n.y - 24})`}>
          <rect width={124} height={48} rx={12} fill="#0b121b" stroke={n.c} strokeOpacity={0.7} />
          <rect width={124} height={48} rx={12} fill={n.c} fillOpacity={0.07} />
          <text x={62} y={20} fontSize={12.5} fontWeight={700} textAnchor="middle" fill="#e2e8f0">
            {n.t}
          </text>
          <text x={62} y={36} fontSize={9.5} textAnchor="middle" fill="#94a3b8">
            {n.s}
          </text>
        </g>
      ))}
    </svg>
  )
}
