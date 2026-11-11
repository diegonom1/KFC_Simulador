import { HardDrive, Monitor } from 'lucide-react'
import { useState } from 'react'
import type { HostLinux } from '../../engine/tipos'
import { cx } from '../../lib/util'
import { EscritorioLinux } from '../escritorio/EscritorioLinux'
import { Gabinete } from '../hardware/Gabinete'

/** PC Gerencial / Home Delivery / LMS: monitor con escritorio y (solo PC Gerencial) el gabinete. */
export function EquipoLinux({ host }: { host: HostLinux }) {
  const [tab, setTab] = useState<'pantalla' | 'gabinete'>('pantalla')
  return (
    <div className="flex h-full min-h-0 flex-col">
      {host === 'pc' && (
        <div className="flex gap-1 border-b border-borde bg-panel-2/60 px-3 pt-2">
          {(
            [
              ['pantalla', 'Pantalla', <Monitor key="m" size={14} />],
              ['gabinete', 'Gabinete (hardware)', <HardDrive key="h" size={14} />],
            ] as const
          ).map(([id, t, ic]) => (
            <button
              key={id}
              data-guide={id === 'gabinete' && tab !== 'gabinete' ? 'hw-tab' : undefined}
              onClick={() => setTab(id)}
              className={cx('inline-flex items-center gap-2 rounded-t-lg border border-b-0 px-3 py-1.5 text-xs font-medium', tab === id ? 'border-borde-2 bg-panel-3 text-tinta' : 'border-transparent text-tenue hover:text-tinta')}
            >
              {ic}
              {t}
            </button>
          ))}
        </div>
      )}
      <div className="min-h-0 flex-1 p-2 sm:p-3">
        {tab === 'pantalla' ? (
          <div className="flex h-full flex-col items-center">
            <div className="relative h-full w-full max-w-[1200px] rounded-2xl border-[10px] border-[#1a1d22] bg-black shadow-[0_0_0_1px_#2b3038,0_20px_60px_-20px_rgb(0_0_0/0.9)]">
              <div className="absolute inset-0 overflow-hidden rounded-md">
                <EscritorioLinux host={host} />
              </div>
            </div>
          </div>
        ) : (
          <Gabinete onEncender={() => setTab('pantalla')} />
        )}
      </div>
    </div>
  )
}
