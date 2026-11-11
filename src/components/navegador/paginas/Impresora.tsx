import { useState } from 'react'
import { credenciales } from '../../../data/sucursal'
import { useSim } from '../../../engine/SimProvider'
import { cx } from '../../../lib/util'
import { CampoWeb, Vigilante, type PropsPagina } from '../comun'

export function PaginaImpresora({ host, origen, navegar }: PropsPagina) {
  const { s, dispatch } = useSim()
  const hp = s.esc.marcaImpresora === 'hp'
  const d = s.disp.imp
  const tema = hp
    ? { barra: 'from-[#005a9c] to-[#0096d6]', acento: 'text-[#0071bc]', boton: 'bg-[#0071bc] hover:bg-[#0084db]', nombre: 'HP Laser MFP 408dn', sub: 'Servidor web incorporado' }
    : { barra: 'from-[#00706b] to-[#00a29a]', acento: 'text-[#00807a]', boton: 'bg-[#00807a] hover:bg-[#00948d]', nombre: 'Kyocera ECOSYS · Multifuncional', sub: 'Command Center' }
  const [sesion, setSesion] = useState(false)
  const [login, setLogin] = useState(false)
  const [u, setU] = useState('')
  const [p, setP] = useState('')
  const [err, setErr] = useState('')
  const [configAbierta, setConfigAbierta] = useState(false)
  const [vista, setVista] = useState<'inicio' | 'red' | 'otra'>('inicio')
  const base = d.pendiente ?? d.activa
  const [ipv6, setIpv6] = useState(!!d.ipv6)
  const [manual, setManual] = useState(!!d.manual)
  const [ip, setIp] = useState(base.ip)
  const [mascara, setMascara] = useState(base.mascara)
  const [gw, setGw] = useState(base.gateway)
  const [msg, setMsg] = useState('')
  const [cerrada, setCerrada] = useState(false)

  return (
    <Vigilante origen={origen} host={host} web="imp" navegar={navegar}>
      <div className="web-claro flex h-full min-h-0 flex-col bg-[#f4f6f8] text-[13px]">
        <header className={cx('flex items-center gap-3 bg-gradient-to-r px-4 py-2.5 text-white', tema.barra)}>
          <div>
            <p className="text-[15px] font-bold">{tema.nombre}</p>
            <p className="text-[11px] opacity-80">
              {tema.sub} · {host}
            </p>
          </div>
          <div className="ml-auto">
            {sesion ? (
              <button
                data-guide="imp-desconexion"
                onClick={() => {
                  dispatch({ tipo: 'IMP_DESCONEXION' })
                  setSesion(false)
                  setCerrada(true)
                }}
                className="rounded border border-white/60 px-3 py-1 text-xs font-semibold hover:bg-white/15"
              >
                Desconexión
              </button>
            ) : (
              <button onClick={() => setLogin(true)} className="rounded border border-white/60 px-3 py-1 text-xs font-semibold hover:bg-white/15">
                Iniciar sesión
              </button>
            )}
          </div>
        </header>
        {cerrada && !sesion && <p className="bg-emerald-50 px-4 py-2 text-emerald-800">Sesión cerrada. Si cambiaste la red, la impresora está aplicando la nueva configuración.</p>}
        {!sesion ? (
          <div className="grid flex-1 place-items-center p-4">
            {login ? (
              <form
                data-guide="imp-login"
                onSubmit={(e) => {
                  e.preventDefault()
                  if (u === credenciales.impresora.usuario && p === credenciales.impresora.password) {
                    setSesion(true)
                    setErr('')
                    setCerrada(false)
                  } else setErr('Nombre de usuario o contraseña incorrectos.')
                }}
                className="w-80 rounded-lg border border-slate-300 bg-white p-5 shadow"
              >
                <p className={cx('mb-3 font-bold', tema.acento)}>Iniciar sesión</p>
                <input placeholder="Nombre de usuario" value={u} onChange={(e) => setU(e.target.value)} className="mb-2 w-full rounded border border-slate-300 px-2.5 py-1.5" autoComplete="off" />
                <input placeholder="Contraseña" type="password" value={p} onChange={(e) => setP(e.target.value)} className="mb-2 w-full rounded border border-slate-300 px-2.5 py-1.5" />
                {err && <p className="mb-2 text-xs text-red-600">{err}</p>}
                <button className={cx('w-full rounded py-1.5 font-semibold text-white', tema.boton)}>Iniciar sesión</button>
              </form>
            ) : (
              <div className="max-w-md rounded-lg border border-slate-300 bg-white p-5 text-center shadow-sm" data-guide="imp-login">
                <p className="font-semibold text-slate-700">Estado del dispositivo: Listo</p>
                <p className="mt-1 text-slate-500">Tóner: 64% · Bandeja 1: Carta</p>
                <button onClick={() => setLogin(true)} className={cx('mt-3 rounded px-4 py-1.5 font-semibold text-white', tema.boton)}>
                  Iniciar sesión
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex min-h-0 flex-1">
            <aside className="w-52 shrink-0 border-r border-slate-200 bg-white py-2">
              <button onClick={() => setVista('inicio')} className="block w-full px-4 py-1.5 text-left hover:bg-slate-50">
                Inicio
              </button>
              <button data-guide="imp-menu-config" onClick={() => setConfigAbierta((v) => !v)} className="block w-full px-4 py-1.5 text-left font-semibold hover:bg-slate-50">
                {configAbierta ? '▾' : '▸'} Configuración
              </button>
              {configAbierta && (
                <div className="pl-4">
                  <button data-guide="imp-menu-red" onClick={() => (setVista('red'), setMsg(''))} className={cx('block w-full px-4 py-1.5 text-left', vista === 'red' ? cx('font-semibold', tema.acento) : 'hover:bg-slate-50')}>
                    Configuración de red
                  </button>
                  <button onClick={() => setVista('otra')} className="block w-full px-4 py-1.5 text-left text-slate-500 hover:bg-slate-50">
                    Configuración de impresión
                  </button>
                  <button onClick={() => setVista('otra')} className="block w-full px-4 py-1.5 text-left text-slate-500 hover:bg-slate-50">
                    Seguridad
                  </button>
                </div>
              )}
            </aside>
            <main className="min-w-0 flex-1 overflow-y-auto p-5">
              {vista === 'inicio' && (
                <div className="max-w-md rounded-lg border border-slate-200 bg-white p-4">
                  <p className="font-semibold">Información del dispositivo</p>
                  <p className="mt-2 text-slate-600">Dirección IPv4: {d.activa.ip}</p>
                  <p className="text-slate-600">TCP/IPv6: {d.ipv6 ? 'Habilitado' : 'Deshabilitado'}</p>
                  <p className="text-slate-600">Modo IPv4: {d.manual ? 'Manual' : 'Automático (DHCP)'}</p>
                </div>
              )}
              {vista === 'otra' && <p className="text-slate-500">Sin cambios para la migración.</p>}
              {vista === 'red' && (
                <div data-guide="imp-form" className="max-w-xl space-y-4">
                  <section className="rounded-lg border border-slate-200 bg-white p-4">
                    <p className={cx('mb-2 font-bold', tema.acento)}>TCP/IPv6</p>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={ipv6} onChange={(e) => setIpv6(e.target.checked)} /> Habilitar TCP/IPv6
                    </label>
                  </section>
                  <section className="rounded-lg border border-slate-200 bg-white p-4">
                    <p className={cx('mb-2 font-bold', tema.acento)}>TCP/IPv4</p>
                    <label className="flex items-center gap-3 py-1">
                      <span className="w-40 text-right">Método de asignación</span>
                      <select value={manual ? 'manual' : 'auto'} onChange={(e) => setManual(e.target.value === 'manual')} className="rounded-sm border border-slate-400 bg-white px-2 py-1">
                        <option value="auto">Automático (DHCP)</option>
                        <option value="manual">Manualmente</option>
                      </select>
                    </label>
                    <CampoWeb etiqueta="Dirección IP" valor={ip} onCambio={setIp} deshabilitado={!manual} />
                    <CampoWeb etiqueta="Máscara de subred" valor={mascara} onCambio={setMascara} deshabilitado={!manual} />
                    <CampoWeb etiqueta="Puerta de enlace" valor={gw} onCambio={setGw} deshabilitado={!manual} />
                  </section>
                  <button
                    onClick={() => {
                      dispatch({ tipo: 'IMP_GUARDAR', via: 'web', cfg: { ip: ip.trim(), mascara: mascara.trim(), gateway: gw.trim() }, ipv6, manual })
                      setMsg('Configuración guardada. Para aplicar los cambios, cierra la sesión con "Desconexión".')
                    }}
                    className={cx('rounded px-5 py-1.5 font-semibold text-white', tema.boton)}
                  >
                    Guardar
                  </button>
                  {msg && <p className="font-semibold text-emerald-700">{msg}</p>}
                </div>
              )}
            </main>
          </div>
        )}
      </div>
    </Vigilante>
  )
}
