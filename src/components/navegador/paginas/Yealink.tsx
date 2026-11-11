import { useState } from 'react'
import { credenciales } from '../../../data/sucursal'
import { useSim } from '../../../engine/SimProvider'
import { cx } from '../../../lib/util'
import { CampoWeb, Vigilante, type PropsPagina } from '../comun'

const PESTANAS = ['Status', 'Account', 'Network', 'DSSKey', 'Features', 'Settings', 'Directory', 'Security'] as const

export function PaginaYealink({ host, origen, navegar }: PropsPagina) {
  const { s, dispatch } = useSim()
  const d = s.disp.tel
  const [sesion, setSesion] = useState(false)
  const [u, setU] = useState('')
  const [p, setP] = useState('')
  const [err, setErr] = useState('')
  const [tab, setTab] = useState<(typeof PESTANAS)[number]>('Status')
  const [sub, setSub] = useState('Basic')
  const base = d.pendiente ?? d.activa
  const [estatica, setEstatica] = useState(!d.dhcp)
  const [ip, setIp] = useState(d.dhcp ? '' : base.ip)
  const [mascara, setMascara] = useState(d.dhcp ? '' : base.mascara)
  const [gw, setGw] = useState(d.dhcp ? '' : base.gateway)
  const [dnsOn, setDnsOn] = useState(!!d.dnsEstatico)
  const [dns1, setDns1] = useState(d.dns1 ?? '')
  const [dns2, setDns2] = useState(d.dns2 ?? '')
  const [confirmar, setConfirmar] = useState(false)
  const [msg, setMsg] = useState('')

  const guardar = (reiniciar: boolean) => {
    dispatch({ tipo: 'TEL_GUARDAR', cfg: { ip: ip.trim(), mascara: mascara.trim(), gateway: gw.trim() }, estatica, dnsEstatico: dnsOn, dns1, dns2, reiniciar })
    setConfirmar(false)
    setMsg(reiniciar ? 'Rebooting, please wait... (the phone will take the new settings)' : 'Settings saved. They will take effect after the phone reboots.')
  }

  if (!sesion)
    return (
      <Vigilante origen={origen} host={host} web="tel" navegar={navegar}>
        <div className="web-claro grid h-full place-items-center bg-gradient-to-b from-[#eaf2fb] to-white">
          <form
            data-guide="tel-login"
            onSubmit={(e) => {
              e.preventDefault()
              if (u === credenciales.telefono.usuario && p === credenciales.telefono.password) setSesion(true)
              else setErr('Incorrect user name or password!')
            }}
            className="w-80 rounded-lg border border-slate-300 bg-white p-6 shadow-lg"
          >
            <p className="text-center text-lg font-bold text-[#0a5fa8]">IP Phone · T30P</p>
            <p className="mb-4 text-center text-xs text-slate-500">Web management</p>
            <input placeholder="Username" value={u} onChange={(e) => setU(e.target.value)} className="mb-2 w-full rounded border border-slate-300 px-3 py-1.5 text-sm" autoComplete="off" />
            <input placeholder="Password" type="password" value={p} onChange={(e) => setP(e.target.value)} className="mb-2 w-full rounded border border-slate-300 px-3 py-1.5 text-sm" />
            {err && <p className="mb-2 text-xs text-red-600">{err}</p>}
            <button className="w-full rounded bg-[#0a5fa8] py-1.5 text-sm font-semibold text-white hover:bg-[#0b6dc2]">Login</button>
          </form>
        </div>
      </Vigilante>
    )

  return (
    <Vigilante origen={origen} host={host} web="tel" navegar={navegar}>
      <div className="web-claro relative flex h-full min-h-0 flex-col bg-white text-[13px]">
        <div className="flex items-center justify-between bg-[#0a5fa8] px-4 py-2 text-white">
          <span className="font-bold">T30P · IP Phone</span>
          <button onClick={() => setSesion(false)} className="text-xs underline">
            Log Out
          </button>
        </div>
        <nav className="flex flex-wrap bg-[#e6eef7]">
          {PESTANAS.map((t) => (
            <button
              key={t}
              data-guide={t === 'Network' ? 'tel-tab-network' : undefined}
              onClick={() => {
                setTab(t)
                setMsg('')
              }}
              className={cx('px-4 py-2 font-semibold', tab === t ? 'bg-white text-[#0a5fa8]' : 'text-slate-600 hover:text-[#0a5fa8]')}
            >
              {t}
            </button>
          ))}
        </nav>
        <div className="flex min-h-0 flex-1">
          {tab === 'Network' && (
            <aside className="w-36 shrink-0 border-r border-slate-200 bg-slate-50 py-2">
              {['Basic', 'PC Port', 'NAT', 'Advanced'].map((x) => (
                <button key={x} data-guide={x === 'Basic' ? 'tel-sub-basic' : undefined} onClick={() => setSub(x)} className={cx('block w-full px-4 py-1.5 text-left', sub === x ? 'bg-[#0a5fa8] text-white' : 'text-slate-700 hover:bg-slate-100')}>
                  {x}
                </button>
              ))}
            </aside>
          )}
          <main className="min-w-0 flex-1 overflow-y-auto p-5">
            {tab === 'Status' && (
              <table className="max-w-md text-[13px]">
                <tbody>
                  {[
                    ['Model', 'T30P'],
                    ['Firmware Version', '124.86.0.40'],
                    ['MAC Address', '80:5E:C0:2A:91:3F'],
                    ['IPv4 Mode', d.dhcp ? 'DHCP' : 'Static IP'],
                    ['IPv4 Address', d.activa.ip],
                    ['Gateway', d.activa.gateway],
                    ['Account 1', d.dnsEstatico ? 'Registered' : 'Registration failed'],
                  ].map(([a, b]) => (
                    <tr key={a} className="border-b border-slate-100">
                      <td className="w-44 py-1.5 text-slate-500">{a}</td>
                      <td className="py-1.5 font-medium">{b}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {tab === 'Network' && sub === 'Basic' && (
              <div data-guide="tel-form" className="max-w-xl">
                <h3 className="mb-2 border-b border-slate-200 pb-1 font-bold text-[#0a5fa8]">Internet Port</h3>
                <div className="mb-2 flex items-center gap-3 py-1">
                  <span className="w-40 text-right">IPv4 Config</span>
                  <div className="flex flex-wrap gap-4">
                    <label className="flex items-center gap-1">
                      <input type="radio" checked={!estatica} onChange={() => setEstatica(false)} /> DHCP
                    </label>
                    <label className="flex items-center gap-1">
                      <input type="radio" checked={estatica} onChange={() => setEstatica(true)} /> Static IP Address
                    </label>
                    <label className="flex items-center gap-1 text-slate-400">
                      <input type="radio" disabled /> PPPoE
                    </label>
                  </div>
                </div>
                <CampoWeb etiqueta="IP Address" valor={ip} onCambio={setIp} deshabilitado={!estatica} />
                <CampoWeb etiqueta="Subnet Mask" valor={mascara} onCambio={setMascara} deshabilitado={!estatica} />
                <CampoWeb etiqueta="Default Gateway" valor={gw} onCambio={setGw} deshabilitado={!estatica} />
                <div className="flex items-center gap-3 py-1">
                  <span className="w-40 text-right">Static DNS</span>
                  <label className="flex items-center gap-1">
                    <input type="radio" checked={dnsOn} onChange={() => setDnsOn(true)} /> On
                  </label>
                  <label className="flex items-center gap-1">
                    <input type="radio" checked={!dnsOn} onChange={() => setDnsOn(false)} /> Off
                  </label>
                </div>
                <CampoWeb etiqueta="Primary DNS" valor={dns1} onCambio={setDns1} deshabilitado={!dnsOn} />
                <CampoWeb etiqueta="Secondary DNS" valor={dns2} onCambio={setDns2} deshabilitado={!dnsOn} />
                <div className="mt-4 flex gap-3 pl-44">
                  <button onClick={() => setConfirmar(true)} className="rounded bg-[#0a5fa8] px-5 py-1.5 font-semibold text-white hover:bg-[#0b6dc2]">
                    Save
                  </button>
                  <button onClick={() => navegar(host)} className="rounded border border-slate-300 px-5 py-1.5">
                    Cancel
                  </button>
                </div>
                {msg && <p className="mt-3 pl-44 font-semibold text-green-700">{msg}</p>}
              </div>
            )}
            {tab === 'Network' && sub !== 'Basic' && <p className="text-slate-500">Sin cambios necesarios en esta sección.</p>}
            {tab === 'Settings' && (
              <div className="max-w-md">
                <h3 className="mb-2 border-b border-slate-200 pb-1 font-bold text-[#0a5fa8]">Upgrade</h3>
                <p className="mb-2 text-slate-600">Reboot the phone to apply pending settings.</p>
                <button
                  onClick={() => {
                    dispatch({ tipo: 'TEL_REINICIAR' })
                    setMsg('Rebooting, please wait...')
                  }}
                  className="rounded bg-[#0a5fa8] px-5 py-1.5 font-semibold text-white"
                >
                  Reboot
                </button>
                {msg && <p className="mt-3 font-semibold text-blue-700">{msg}</p>}
              </div>
            )}
            {!['Status', 'Network', 'Settings'].includes(tab) && <p className="text-slate-500">Sección sin cambios para la migración.</p>}
          </main>
        </div>
        {confirmar && (
          <div className="absolute inset-0 z-10 grid place-items-center bg-black/30">
            <div className="w-80 rounded border border-slate-300 bg-white shadow-xl">
              <div className="bg-[#0a5fa8] px-3 py-1.5 font-bold text-white">Warning</div>
              <p className="p-4 text-center">Some settings will take effect after a reboot. Reboot now?</p>
              <div className="flex justify-center gap-3 pb-4">
                <button data-guide="tel-reboot-ok" onClick={() => guardar(true)} className="rounded bg-[#0a5fa8] px-5 py-1 font-semibold text-white">
                  OK
                </button>
                <button onClick={() => guardar(false)} className="rounded border border-slate-300 px-5 py-1">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Vigilante>
  )
}
