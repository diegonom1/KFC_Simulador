import { useState } from 'react'
import { credenciales } from '../../../data/sucursal'
import { useSim } from '../../../engine/SimProvider'
import { cx } from '../../../lib/util'
import { CampoWeb, Vigilante, type PropsPagina } from '../comun'

export function PaginaTelmex({ host, origen, navegar }: PropsPagina) {
  const { s, dispatch } = useSim()
  const [sesion, setSesion] = useState(false)
  const [u, setU] = useState('')
  const [p, setP] = useState('')
  const [err, setErr] = useState('')
  const [vista, setVista] = useState<'estado' | 'lan' | 'otra'>('estado')
  const [ip, setIp] = useState(s.telmexLan)
  const [msg, setMsg] = useState('')
  const base = ip.split('.').slice(0, 3).join('.')

  return (
    <Vigilante origen={origen} host={host} web="telmex" navegar={navegar}>
      <div className="web-claro flex h-full min-h-0 flex-col bg-[#eef3f9] text-[13px]">
        <header className="flex items-center justify-between bg-gradient-to-r from-[#00205b] to-[#003da5] px-4 py-2.5 text-white">
          <div>
            <p className="text-[15px] font-bold">Módem Telmex</p>
            <p className="text-[11px] text-blue-100">Gateway residencial · Configuración</p>
          </div>
          {sesion && (
            <button onClick={() => setSesion(false)} className="rounded border border-white/50 px-3 py-1 text-xs">
              Cerrar sesión
            </button>
          )}
        </header>
        {!sesion ? (
          <div className="grid flex-1 place-items-center">
            <form
              data-guide="tx-login"
              onSubmit={(e) => {
                e.preventDefault()
                if (u === credenciales.telmex.usuario && p === s.esc.telmexPassword) {
                  setSesion(true)
                  setErr('')
                } else if (u.toUpperCase() === credenciales.telmex.usuario && u !== credenciales.telmex.usuario) setErr('Usuario o contraseña incorrectos. (El usuario distingue mayúsculas y minúsculas.)')
                else setErr('Usuario o contraseña incorrectos.')
              }}
              className="w-80 rounded-lg border border-slate-300 bg-white p-5 shadow"
            >
              <p className="mb-1 font-bold text-[#00205b]">Acceso al módem</p>
              <p className="mb-3 text-xs text-slate-500">La contraseña viene en la etiqueta del equipo.</p>
              <input placeholder="Usuario" value={u} onChange={(e) => setU(e.target.value)} className="mb-2 w-full rounded border border-slate-300 px-2.5 py-1.5" autoComplete="off" autoCapitalize="off" />
              <input placeholder="Contraseña" type="password" value={p} onChange={(e) => setP(e.target.value)} className="mb-2 w-full rounded border border-slate-300 px-2.5 py-1.5" />
              {err && <p className="mb-2 text-xs text-red-600">{err}</p>}
              <button className="w-full rounded bg-[#003da5] py-1.5 font-semibold text-white">Entrar</button>
            </form>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1">
            <aside className="w-48 shrink-0 border-r border-slate-200 bg-white py-2">
              {(
                [
                  ['estado', 'Estado'],
                  ['lan', 'Configuración LAN'],
                  ['otra', 'Wi-Fi'],
                  ['otra', 'Internet'],
                  ['otra', 'Mantenimiento'],
                ] as const
              ).map(([v, t]) => (
                <button key={t} data-guide={v === 'lan' ? 'tx-menu-lan' : undefined} onClick={() => (setVista(v), setMsg(''))} className={cx('block w-full px-4 py-1.5 text-left', vista === v && v !== 'otra' ? 'bg-[#e1ebf8] font-semibold text-[#003da5]' : 'hover:bg-slate-50')}>
                  {t}
                </button>
              ))}
            </aside>
            <main className="min-w-0 flex-1 overflow-y-auto p-5">
              {vista === 'estado' && (
                <div className="max-w-md rounded-lg border border-slate-200 bg-white p-4">
                  <p className="font-semibold">Estado</p>
                  <p className="mt-2 text-slate-600">Internet: Conectado</p>
                  <p className="text-slate-600">IP LAN: {s.telmexLan}</p>
                  <p className="text-slate-600">Red Wi-Fi: {s.esc.ssidTx}</p>
                </div>
              )}
              {vista === 'otra' && <p className="text-slate-500">No se modifica en esta migración.</p>}
              {vista === 'lan' && (
                <div data-guide="tx-form" className="max-w-xl rounded-lg border border-slate-200 bg-white p-4">
                  <p className="mb-2 font-bold text-[#00205b]">Configuración LAN</p>
                  <CampoWeb etiqueta="Dirección IP" valor={ip} onCambio={setIp} />
                  <CampoWeb etiqueta="Máscara de subred" valor="255.255.255.0" deshabilitado />
                  <CampoWeb etiqueta="Servidor DHCP" valor="Habilitado" deshabilitado />
                  <CampoWeb etiqueta="Rango DHCP" valor={`${base}.64 – ${base}.253`} deshabilitado ancho="w-56" />
                  <button
                    onClick={() => {
                      dispatch({ tipo: 'TELMEX_LAN', ip: ip.trim() })
                      setMsg('Aplicando cambios… La red LAN del módem se reinicia. Vuelve a entrar con la nueva IP si lo necesitas.')
                    }}
                    className="ml-44 mt-3 rounded bg-[#003da5] px-5 py-1.5 font-semibold text-white"
                  >
                    Aplicar
                  </button>
                  {msg && <p className="mt-3 font-semibold text-emerald-700">{msg}</p>}
                </div>
              )}
            </main>
          </div>
        )}
      </div>
    </Vigilante>
  )
}
