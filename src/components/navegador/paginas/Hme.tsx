import { motion } from 'framer-motion'
import { Car, ChevronRight, Menu, Settings, X } from 'lucide-react'
import { useState } from 'react'
import { credenciales } from '../../../data/sucursal'
import { useSim } from '../../../engine/SimProvider'
import { cx } from '../../../lib/util'
import { CampoWeb, Vigilante, type PropsPagina } from '../comun'

const CARRILES = [
  { n: 'Lane 1', prom: '02:58', meta: '03:00', autos: 47, pct: 0.93 },
  { n: 'Lane 2', prom: '03:21', meta: '03:00', autos: 31, pct: 1.07 },
]

// ---------------------------------------------------------------------------
// HME modelo 60 (ZOOM Nitro)
// ---------------------------------------------------------------------------
export function PaginaHme60({ host, origen, navegar }: PropsPagina) {
  const { s, dispatch } = useSim()
  const d = s.disp.hme
  const [menu, setMenu] = useState(false)
  const [perfil, setPerfil] = useState<'manager' | 'installer'>('manager')
  const [pass, setPass] = useState('')
  const [instalador, setInstalador] = useState(false)
  const [err, setErr] = useState('')
  const [redAbierta, setRedAbierta] = useState(false)
  const [vista, setVista] = useState<'dash' | 'local'>('dash')
  const [ip, setIp] = useState(d.activa.ip)
  const [mascara, setMascara] = useState(d.activa.mascara)
  const [gw, setGw] = useState(d.activa.gateway)
  const [dns1, setDns1] = useState(d.dns1 ?? '')
  const [dns2, setDns2] = useState(d.dns2 ?? '')
  const [guardado, setGuardado] = useState(false)

  return (
    <Vigilante origen={origen} host={host} web="hme" navegar={navegar}>
      <div className="relative flex h-full min-h-0 flex-col bg-[#0f1720] font-sans text-slate-100">
        <header className="flex items-center gap-3 border-b border-white/10 bg-[#111c27] px-3 py-2.5">
          <button data-guide="hme60-burger" onClick={() => setMenu(true)} className="rounded p-1.5 hover:bg-white/10" aria-label="Menú">
            <Menu size={20} />
          </button>
          <p className="font-semibold tracking-wide">
            ZOOM Nitro <span className="text-xs font-normal text-slate-400">· Drive-Thru Timer</span>
          </p>
          <span className="ml-auto text-xs text-slate-400">{instalador ? 'Installer' : 'Store Manager'} · 10:31</span>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto p-4">
          {vista === 'dash' && (
            <div className="space-y-4">
              <p className="text-xs uppercase tracking-widest text-slate-400">Dashboard · Today</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {CARRILES.map((c) => (
                  <div key={c.n} className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold">{c.n}</p>
                      <Car size={16} className="text-slate-400" />
                    </div>
                    <p className={cx('mt-2 text-3xl font-bold tabular-nums', c.pct > 1 ? 'text-rose-300' : 'text-emerald-300')}>{c.prom}</p>
                    <p className="text-xs text-slate-400">
                      Avg service time · goal {c.meta} · {c.autos} cars
                    </p>
                    <div className="mt-3 h-1.5 rounded-full bg-white/10">
                      <div className={cx('h-full rounded-full', c.pct > 1 ? 'bg-rose-400' : 'bg-emerald-400')} style={{ width: `${Math.min(100, c.pct * 80)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex h-24 items-end gap-1 rounded-xl border border-white/10 bg-white/5 p-3">
                {[30, 42, 55, 61, 48, 70, 82, 64, 51, 39, 44, 58].map((h, i) => (
                  <div key={i} className="flex-1 rounded-t bg-cyan-400/60" style={{ height: `${h}%` }} />
                ))}
              </div>
            </div>
          )}
          {vista === 'local' && (
            <div data-guide="hme60-form" className="max-w-xl rounded-xl border border-white/10 bg-white/5 p-5">
              <p className="mb-1 text-xs uppercase tracking-widest text-slate-400">Network › Local Network</p>
              <h3 className="mb-3 text-lg font-semibold">Control Unit Network</h3>
              {(
                [
                  ['IP Address', ip, setIp],
                  ['Subnet Mask', mascara, setMascara],
                  ['Gateway', gw, setGw],
                  ['DNS 1', dns1, setDns1],
                  ['DNS 2', dns2, setDns2],
                ] as const
              ).map(([e, v, f]) => (
                <label key={e} className="flex items-center gap-3 py-1.5 text-sm">
                  <span className="w-32 text-slate-300">{e}</span>
                  <input value={v} onChange={(x) => f(x.target.value)} spellCheck={false} className="w-52 rounded-md border border-white/15 bg-black/30 px-2.5 py-1.5 font-mono text-[13px] outline-none focus:border-cyan-400" />
                </label>
              ))}
              <button
                onClick={() => {
                  dispatch({ tipo: 'HME_GUARDAR', cfg: { ip: ip.trim(), mascara: mascara.trim(), gateway: gw.trim() }, dns1: dns1.trim(), dns2: dns2.trim() })
                  setGuardado(true)
                }}
                className="mt-3 rounded-md bg-cyan-500 px-5 py-1.5 text-sm font-semibold text-slate-950 hover:bg-cyan-400"
              >
                Save
              </button>
              {guardado && <p className="mt-3 text-sm text-emerald-300">Network settings saved. No reboot required.</p>}
            </div>
          )}
        </main>
        {menu && (
          <div className="absolute inset-0 z-10 flex">
            <motion.aside initial={{ x: -280 }} animate={{ x: 0 }} className="flex h-full w-72 flex-col border-r border-white/10 bg-[#0c141d] p-3 shadow-2xl">
              <div className="mb-3 flex items-center justify-between">
                <p className="font-semibold">Menu</p>
                <button onClick={() => setMenu(false)} className="rounded p-1 hover:bg-white/10" aria-label="Cerrar menú">
                  <X size={16} />
                </button>
              </div>
              {!instalador ? (
                <div className="space-y-2 text-sm">
                  <p className="text-xs uppercase tracking-widest text-slate-400">Profile</p>
                  {(['manager', 'installer'] as const).map((p) => (
                    <button key={p} data-guide={p === 'installer' && perfil !== 'installer' ? 'hme60-installer' : undefined} onClick={() => setPerfil(p)} className={cx('block w-full rounded-lg border px-3 py-2 text-left', perfil === p ? 'border-cyan-400 bg-cyan-400/10' : 'border-white/10 hover:bg-white/5')}>
                      {p === 'manager' ? 'Store Manager' : 'Installer'}
                    </button>
                  ))}
                  {perfil === 'installer' && (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault()
                        if (pass === credenciales.hme.password) {
                          setInstalador(true)
                          setErr('')
                        } else setErr('Invalid password')
                      }}
                      className="space-y-2 pt-1"
                      data-guide="hme60-installer"
                    >
                      <input type="password" placeholder="Installer password" value={pass} onChange={(e) => setPass(e.target.value)} className="w-full rounded-md border border-white/15 bg-black/30 px-2.5 py-1.5" />
                      {err && <p className="text-xs text-rose-300">{err}</p>}
                      <button className="w-full rounded-md bg-cyan-500 py-1.5 font-semibold text-slate-950">Sign in</button>
                    </form>
                  )}
                </div>
              ) : (
                <nav className="space-y-1 text-sm">
                  <button onClick={() => (setVista('dash'), setMenu(false))} className="block w-full rounded-lg px-3 py-2 text-left hover:bg-white/5">
                    Dashboard
                  </button>
                  <button className="block w-full rounded-lg px-3 py-2 text-left text-slate-400">Reports</button>
                  <button className="block w-full rounded-lg px-3 py-2 text-left text-slate-400">Settings</button>
                  <button data-guide="hme60-network" onClick={() => setRedAbierta((v) => !v)} className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left hover:bg-white/5">
                    Network <ChevronRight size={14} className={cx('transition', redAbierta && 'rotate-90')} />
                  </button>
                  {redAbierta && (
                    <div className="ml-3 border-l border-white/10 pl-2">
                      <button data-guide="hme60-local" onClick={() => (setVista('local'), setMenu(false))} className="block w-full rounded-lg px-3 py-1.5 text-left hover:bg-white/5">
                        Local Network
                      </button>
                      <button className="block w-full rounded-lg px-3 py-1.5 text-left text-slate-400">Wireless</button>
                      <button className="block w-full rounded-lg px-3 py-1.5 text-left text-slate-400">Remote Access</button>
                    </div>
                  )}
                </nav>
              )}
            </motion.aside>
            <div className="flex-1 bg-black/40" onClick={() => setMenu(false)} />
          </div>
        )}
      </div>
    </Vigilante>
  )
}

// ---------------------------------------------------------------------------
// HME modelo 50 (ZOOM)
// ---------------------------------------------------------------------------
export function PaginaHme50({ host, origen, navegar }: PropsPagina) {
  const { s, dispatch } = useSim()
  const d = s.disp.hme
  const [gear, setGear] = useState(false)
  const [vista, setVista] = useState<'resumen' | 'settings'>('resumen')
  const [installerAbierto, setInstallerAbierto] = useState(false)
  const [seccion, setSeccion] = useState<string | null>(null)
  const [u, setU] = useState('')
  const [p, setP] = useState('')
  const [err, setErr] = useState('')
  const [sesion, setSesion] = useState(false)
  const [tab, setTab] = useState<'cun' | 'wireless' | 'base'>('cun')
  const [editando, setEditando] = useState(false)
  const [ip, setIp] = useState(d.activa.ip)
  const [mascara, setMascara] = useState(d.activa.mascara)
  const [gw, setGw] = useState(d.activa.gateway)
  const [msg, setMsg] = useState('')

  return (
    <Vigilante origen={origen} host={host} web="hme" navegar={navegar}>
      <div className="web-claro relative flex h-full min-h-0 flex-col bg-[#e9ecef] text-[13px]">
        <header className="flex items-center justify-between bg-gradient-to-b from-[#4a4f57] to-[#2f3338] px-4 py-2 text-white">
          <p className="font-bold">
            ZOOM™ <span className="font-normal text-slate-300">Drive-Thru Timer</span>
          </p>
          <div className="relative">
            <button data-guide="hme50-gear" onClick={() => setGear((g) => !g)} className="rounded p-1 hover:bg-white/10" aria-label="Configuración">
              <Settings size={18} />
            </button>
            {gear && (
              <div className="absolute right-0 top-8 z-10 w-40 rounded border border-slate-300 bg-white py-1 text-slate-800 shadow-lg">
                <button
                  data-guide="hme50-settings"
                  onClick={() => {
                    setVista('settings')
                    setGear(false)
                  }}
                  className="block w-full px-3 py-1.5 text-left hover:bg-slate-100"
                >
                  Settings…
                </button>
                <button onClick={() => setGear(false)} className="block w-full px-3 py-1.5 text-left text-slate-400">
                  Reports…
                </button>
                <button onClick={() => setGear(false)} className="block w-full px-3 py-1.5 text-left text-slate-400">
                  About
                </button>
              </div>
            )}
          </div>
        </header>
        {vista === 'resumen' ? (
          <main className="p-5">
            <h3 className="mb-2 font-bold text-slate-700">Lane Summary</h3>
            <table className="w-full max-w-lg border border-slate-300 bg-white">
              <thead className="bg-slate-200 text-left">
                <tr>
                  <th className="px-3 py-1.5">Lane</th>
                  <th className="px-3 py-1.5">Avg Time</th>
                  <th className="px-3 py-1.5">Cars</th>
                </tr>
              </thead>
              <tbody>
                {CARRILES.map((c) => (
                  <tr key={c.n} className="border-t border-slate-200">
                    <td className="px-3 py-1.5">{c.n}</td>
                    <td className={cx('px-3 py-1.5 font-mono', c.pct > 1 && 'text-red-600')}>{c.prom}</td>
                    <td className="px-3 py-1.5">{c.autos}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </main>
        ) : (
          <div className="flex min-h-0 flex-1">
            <aside className="w-44 shrink-0 border-r border-slate-300 bg-white py-2">
              <button onClick={() => setVista('resumen')} className="block w-full px-3 py-1 text-left text-blue-700 hover:underline">
                ‹ Back
              </button>
              <button data-guide="hme50-installer" onClick={() => setInstallerAbierto((v) => !v)} className="mt-1 block w-full px-3 py-1.5 text-left font-semibold hover:bg-slate-100">
                {installerAbierto ? '▾' : '▸'} Installer
              </button>
              {installerAbierto && (
                <div className="pl-5">
                  {['Security', 'Store', 'Timer', 'Display'].map((x) => (
                    <button key={x} data-guide={x === 'Security' ? 'hme50-security' : undefined} onClick={() => setSeccion(x)} className={cx('block w-full px-2 py-1 text-left', seccion === x ? 'bg-[#2f3338] text-white' : 'hover:bg-slate-100')}>
                      {x}
                    </button>
                  ))}
                </div>
              )}
            </aside>
            <main className="min-w-0 flex-1 overflow-y-auto p-5">
              {seccion !== 'Security' && <p className="text-slate-500">Select Installer › Security to configure the Control Unit.</p>}
              {seccion === 'Security' && !sesion && (
                <form
                  data-guide="hme50-login"
                  onSubmit={(e) => {
                    e.preventDefault()
                    if (u === credenciales.hme.usuario && p === credenciales.hme.password) setSesion(true)
                    else setErr('Invalid installer name or password.')
                  }}
                  className="max-w-sm rounded border border-slate-300 bg-white p-4"
                >
                  <p className="mb-3 font-bold">Installer Log In</p>
                  <CampoWeb etiqueta="User Name" valor={u} onCambio={setU} ancho="w-40" />
                  <CampoWeb etiqueta="Password" valor={p} onCambio={setP} tipo="password" ancho="w-40" />
                  {err && <p className="text-xs text-red-600">{err}</p>}
                  <div className="mt-2 text-right">
                    <button className="rounded bg-[#2f3338] px-4 py-1 font-bold text-white">LOG IN</button>
                  </div>
                </form>
              )}
              {seccion === 'Security' && sesion && (
                <div className="max-w-xl">
                  <div className="flex border-b border-slate-300">
                    {(
                      [
                        ['cun', 'Control Unit Network'],
                        ['wireless', 'Wireless'],
                        ['base', 'Base Station'],
                      ] as const
                    ).map(([id, t]) => (
                      <button key={id} data-guide={id === 'cun' ? 'hme50-tab-cun' : undefined} onClick={() => setTab(id)} className={cx('-mb-px border border-transparent px-3 py-1.5', tab === id && 'border-slate-300 border-b-[#e9ecef] bg-[#e9ecef] font-semibold')}>
                        {t}
                      </button>
                    ))}
                  </div>
                  {tab === 'cun' ? (
                    <div className="rounded-b border border-t-0 border-slate-300 bg-white p-4" data-guide={editando ? 'hme50-form' : undefined}>
                      <CampoWeb etiqueta="IP Address" valor={ip} onCambio={setIp} deshabilitado={!editando} />
                      <CampoWeb etiqueta="Subnet Mask" valor={mascara} onCambio={setMascara} deshabilitado={!editando} />
                      <CampoWeb etiqueta="Gateway" valor={gw} onCambio={setGw} deshabilitado={!editando} />
                      <div className="mt-3 flex justify-end gap-2">
                        {!editando ? (
                          <button data-guide="hme50-edit" onClick={() => setEditando(true)} className="rounded bg-[#2f3338] px-4 py-1 font-bold text-white">
                            EDIT
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => {
                                dispatch({ tipo: 'HME_GUARDAR', cfg: { ip: ip.trim(), mascara: mascara.trim(), gateway: gw.trim() }, dns1: d.dns1 ?? '', dns2: d.dns2 ?? '' })
                                setEditando(false)
                                setMsg('Settings applied. Verify the connection with ping.')
                              }}
                              className="rounded bg-[#1d6f42] px-4 py-1 font-bold text-white"
                            >
                              APPLY
                            </button>
                            <button onClick={() => setEditando(false)} className="rounded border border-slate-400 px-4 py-1">
                              CANCEL
                            </button>
                          </>
                        )}
                      </div>
                      {msg && <p className="mt-2 font-semibold text-green-700">{msg}</p>}
                    </div>
                  ) : (
                    <p className="rounded-b border border-t-0 border-slate-300 bg-white p-4 text-slate-500">No changes needed.</p>
                  )}
                </div>
              )}
            </main>
          </div>
        )}
      </div>
    </Vigilante>
  )
}
