import { useState } from 'react'
import { credenciales } from '../../../data/sucursal'
import { useSim } from '../../../engine/SimProvider'
import { cx } from '../../../lib/util'
import { CampoWeb, Vigilante, type PropsPagina } from '../comun'

type Vista = 'info' | 'tcpip' | 'reboot' | 'usuarios' | 'reporte' | 'fecha'

export function PaginaBiometrico({ host, origen, navegar }: PropsPagina) {
  const { s, dispatch } = useSim()
  const d = s.disp.bio
  const [sesion, setSesion] = useState(false)
  const [u, setU] = useState('')
  const [p, setP] = useState('')
  const [err, setErr] = useState('')
  const [abiertos, setAbiertos] = useState<Record<string, boolean>>({})
  const [vista, setVista] = useState<Vista>('info')
  const base = d.pendiente ?? d.activa
  const [ip, setIp] = useState(base.ip)
  const [mascara, setMascara] = useState(base.mascara)
  const [gw, setGw] = useState(base.gateway)
  const [msg, setMsg] = useState('')

  const grupo = (id: string, titulo: string, guia: string, items: Array<[Vista, string, string?]>) => (
    <div>
      <button data-guide={guia} onClick={() => setAbiertos((a) => ({ ...a, [id]: !a[id] }))} className="flex w-full items-center gap-1.5 border-b border-[#9db3cf] bg-gradient-to-b from-[#e8eff8] to-[#cfdcee] px-2 py-1.5 text-left text-[13px] font-bold text-[#1d3c66]">
        <span className="text-[10px]">{abiertos[id] ? '▼' : '▶'}</span> {titulo}
      </button>
      {abiertos[id] &&
        items.map(([v, t, g]) => (
          <button
            key={v}
            data-guide={g}
            onClick={() => {
              setVista(v)
              setMsg('')
            }}
            className={cx('block w-full py-1 pl-7 text-left text-[13px] hover:underline', vista === v ? 'bg-[#fff6c8] font-semibold text-[#7a4b00]' : 'text-[#1d4f91]')}
          >
            {t}
          </button>
        ))}
    </div>
  )

  return (
    <Vigilante origen={origen} host={host} web="bio" navegar={navegar}>
      <div className="web-claro flex h-full min-h-0 flex-col bg-[#f2f5f9]">
        <div className="flex items-center justify-between bg-gradient-to-r from-[#17365d] to-[#2a5a94] px-4 py-2.5 text-white">
          <div>
            <p className="text-[15px] font-bold tracking-wide">Fingerprint Time Attendance</p>
            <p className="text-[11px] text-blue-100">Web Server · Terminal {host}</p>
          </div>
          {sesion && (
            <button onClick={() => setSesion(false)} className="rounded border border-white/40 px-2 py-0.5 text-xs hover:bg-white/10">
              Logout
            </button>
          )}
        </div>
        {!sesion ? (
          <div className="grid flex-1 place-items-center">
            <form
              data-guide="bio-login"
              onSubmit={(e) => {
                e.preventDefault()
                if (u === credenciales.biometrico.usuario && p === credenciales.biometrico.password) {
                  setSesion(true)
                  setErr('')
                } else setErr('User name or password error!')
              }}
              className="w-80 rounded border border-[#9db3cf] bg-white shadow"
            >
              <div className="bg-gradient-to-b from-[#e8eff8] to-[#cfdcee] px-3 py-2 text-[13px] font-bold text-[#1d3c66]">User Login</div>
              <div className="space-y-2 p-4 text-[13px]">
                <label className="flex items-center gap-2">
                  <span className="w-20">User Name</span>
                  <input value={u} onChange={(e) => setU(e.target.value)} className="flex-1 border border-slate-400 px-1.5 py-0.5" autoComplete="off" />
                </label>
                <label className="flex items-center gap-2">
                  <span className="w-20">Password</span>
                  <input type="password" value={p} onChange={(e) => setP(e.target.value)} className="flex-1 border border-slate-400 px-1.5 py-0.5" />
                </label>
                {err && <p className="text-xs text-red-600">{err}</p>}
                <div className="pt-1 text-right">
                  <button className="rounded border border-slate-500 bg-gradient-to-b from-white to-slate-200 px-4 py-0.5 text-[13px] hover:from-slate-50">Login</button>
                </div>
              </div>
            </form>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1">
            <aside className="w-48 shrink-0 overflow-y-auto border-r border-[#9db3cf] bg-white">
              {grupo('user', 'User', 'bio-menu-user', [['usuarios', 'User Info']])}
              {grupo('report', 'Report', 'bio-menu-report', [['reporte', 'Attendance Log']])}
              {grupo('setting', 'Setting', 'bio-menu-setting', [
                ['fecha', 'Date Time'],
                ['tcpip', 'TCP/IP', 'bio-menu-tcpip'],
              ])}
              {grupo('terminal', 'Terminal', 'bio-menu-terminal', [
                ['info', 'Device Info'],
                ['reboot', 'Reboot', 'bio-menu-reboot'],
              ])}
            </aside>
            <main className="min-w-0 flex-1 overflow-y-auto p-5 text-[13px]">
              {vista === 'info' && (
                <Tabla
                  titulo="Device Info"
                  filas={[
                    ['Device Name', 'TFT-Attendance'],
                    ['Serial Number', 'BIO8291044312'],
                    ['Firmware', 'Ver 6.60 Apr 28 2022'],
                    ['IP Address', d.activa.ip],
                    ['Users / Fingerprints', '38 / 74'],
                  ]}
                />
              )}
              {vista === 'usuarios' && <Tabla titulo="User Info" filas={[['1', 'GERENTE'], ['2', 'SUPERVISOR'], ['3', 'CAJA 1']]} />}
              {vista === 'reporte' && <Tabla titulo="Attendance Log" filas={[['08:01', 'CAJA 1 · Check-In'], ['08:04', 'COCINA 2 · Check-In'], ['08:15', 'SUPERVISOR · Check-In']]} />}
              {vista === 'fecha' && <Tabla titulo="Date Time" filas={[['Date', '2026-11-10'], ['Time', '10:31:22']]} />}
              {vista === 'tcpip' && (
                <form
                  data-guide="bio-form"
                  onSubmit={(e) => {
                    e.preventDefault()
                    dispatch({ tipo: 'BIO_GUARDAR', cfg: { ip: ip.trim(), mascara: mascara.trim(), gateway: gw.trim() } })
                    setMsg('Saved successfully! Please reboot the device to apply the new settings.')
                  }}
                  className="max-w-lg rounded border border-[#9db3cf] bg-white"
                >
                  <div className="bg-gradient-to-b from-[#e8eff8] to-[#cfdcee] px-3 py-2 font-bold text-[#1d3c66]">TCP/IP Setting</div>
                  <div className="p-4">
                    <CampoWeb etiqueta="IP Address" valor={ip} onCambio={setIp} />
                    <CampoWeb etiqueta="Subnet Mask" valor={mascara} onCambio={setMascara} />
                    <CampoWeb etiqueta="Default Gateway" valor={gw} onCambio={setGw} />
                    <CampoWeb etiqueta="Port" valor="4370" deshabilitado />
                    <div className="mt-3 flex justify-center gap-3">
                      <button className="rounded border border-slate-500 bg-gradient-to-b from-white to-slate-200 px-6 py-0.5">OK</button>
                    </div>
                    {msg && <p className="mt-3 text-center font-semibold text-green-700">{msg}</p>}
                  </div>
                </form>
              )}
              {vista === 'reboot' && (
                <div className="max-w-md rounded border border-[#9db3cf] bg-white">
                  <div className="bg-gradient-to-b from-[#e8eff8] to-[#cfdcee] px-3 py-2 font-bold text-[#1d3c66]">Reboot</div>
                  <div className="p-4 text-center">
                    <p>Are you sure you want to reboot the device?</p>
                    {d.pendiente && <p className="mt-1 text-xs text-amber-700">There are unsaved network changes that will apply after reboot.</p>}
                    <button
                      data-guide="bio-reboot-btn"
                      onClick={() => {
                        dispatch({ tipo: 'BIO_REINICIAR' })
                        setMsg('The device is rebooting, please wait...')
                      }}
                      className="mt-3 rounded border border-slate-500 bg-gradient-to-b from-white to-slate-200 px-6 py-0.5"
                    >
                      Reboot
                    </button>
                    {msg && <p className="mt-3 font-semibold text-blue-700">{msg}</p>}
                  </div>
                </div>
              )}
            </main>
          </div>
        )}
      </div>
    </Vigilante>
  )
}

function Tabla({ titulo, filas }: { titulo: string; filas: string[][] }) {
  return (
    <div className="max-w-lg rounded border border-[#9db3cf] bg-white">
      <div className="bg-gradient-to-b from-[#e8eff8] to-[#cfdcee] px-3 py-2 font-bold text-[#1d3c66]">{titulo}</div>
      <table className="w-full">
        <tbody>
          {filas.map((f) => (
            <tr key={f[0]} className="border-t border-slate-200">
              <td className="w-48 bg-slate-50 px-3 py-1.5 text-slate-600">{f[0]}</td>
              <td className="px-3 py-1.5">{f[1]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
