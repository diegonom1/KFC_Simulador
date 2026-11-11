import { Gauge, Globe, Search, ShieldAlert, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { useSim } from '../../../engine/SimProvider'
import { Vigilante, type PropsPagina } from '../comun'

export function PaginaDigi({ host, origen, navegar }: PropsPagina) {
  const { dispatch } = useSim()
  const [aviso, setAviso] = useState(false)
  return (
    <Vigilante origen={origen} host={host} web="digi" navegar={navegar}>
      <div className="web-claro grid h-full place-items-center bg-[#f3f4f6] p-4 text-[13px]">
        <div className="w-96 overflow-hidden rounded-lg border border-slate-300 bg-white shadow">
          <div className="bg-[#1f2a37] px-4 py-2.5 text-white">
            <p className="font-bold">Digi · Remote Manager</p>
            <p className="text-[11px] text-slate-300">Dispositivo administrado</p>
          </div>
          <div className="space-y-2 p-4">
            <div className="flex gap-2 rounded border border-amber-300 bg-amber-50 p-2.5 text-amber-900">
              <ShieldAlert size={18} className="shrink-0" />
              <p>
                Este equipo lo configura <b>PRB de forma remota</b>. En sitio solo se valida que responda con <b>ping</b>.
              </p>
            </div>
            <input placeholder="Username" className="w-full rounded border border-slate-300 px-2.5 py-1.5" />
            <input placeholder="Password" type="password" className="w-full rounded border border-slate-300 px-2.5 py-1.5" />
            <button
              onClick={() => {
                dispatch({ tipo: 'DIGI_INTENTO' })
                setAviso(true)
              }}
              className="w-full rounded bg-[#1f2a37] py-1.5 font-semibold text-white"
            >
              Log in
            </button>
            {aviso && <p className="text-center font-semibold text-red-600">No te toca configurar el Digi: lo hace PRB. Solo valida que responda.</p>}
          </div>
        </div>
      </div>
    </Vigilante>
  )
}

function Bloqueado({ titulo, subtitulo, texto, color, host, origen, navegar, web }: PropsPagina & { titulo: string; subtitulo: string; texto: string; color: string; web: 'ont-tp' | 'fortigate' | 'router-viejo' | 'modem-extra' }) {
  return (
    <Vigilante origen={origen} host={host} web={web} navegar={navegar}>
      <div className="web-claro grid h-full place-items-center bg-[#f3f4f6] p-4 text-[13px]">
        <div className="w-96 overflow-hidden rounded-lg border border-slate-300 bg-white shadow">
          <div className="px-4 py-2.5 text-white" style={{ background: color }}>
            <p className="font-bold">{titulo}</p>
            <p className="text-[11px] opacity-80">{subtitulo}</p>
          </div>
          <div className="space-y-2 p-4">
            <div className="flex gap-2 rounded border border-slate-200 bg-slate-50 p-2.5 text-slate-700">
              <ShieldCheck size={18} className="shrink-0 text-slate-500" />
              <p>{texto}</p>
            </div>
            <input placeholder="Usuario" className="w-full rounded border border-slate-300 px-2.5 py-1.5" />
            <input placeholder="Contraseña" type="password" className="w-full rounded border border-slate-300 px-2.5 py-1.5" />
            <button className="w-full cursor-not-allowed rounded py-1.5 font-semibold text-white opacity-60" style={{ background: color }}>
              Entrar
            </button>
          </div>
        </div>
      </div>
    </Vigilante>
  )
}

export const PaginaOnt = (p: PropsPagina) => <Bloqueado {...p} web="ont-tp" titulo="ONT Totalplay" subtitulo="Terminal de fibra óptica" texto="La ONT de Totalplay no se configura en esta migración: solo se conecta al WAN del FortiGate y se etiqueta L5-ONT." color="#334155" />
export const PaginaFortigate = (p: PropsPagina) => <Bloqueado {...p} web="fortigate" titulo="FortiGate 40F" subtitulo="Acceso administrativo" texto="La configuración del FortiGate y del switch la administra el equipo central. En sitio no se modifica." color="#b91c1c" />
export const PaginaRouterViejo = (p: PropsPagina) => <Bloqueado {...p} web="router-viejo" titulo="Router anterior" subtitulo="Equipo que se retira" texto="Es el gateway de la red vieja. Se queda fuera cuando todo pasa al FortiGate y al switch nuevo." color="#475569" />
export const PaginaModemExtra = (p: PropsPagina) => <Bloqueado {...p} web="modem-extra" titulo="Módem" subtitulo="Otro proveedor" texto="Módem adicional: debe quedar sin nada conectado." color="#6b21a8" />

export function PaginaInicio({ navegar, examen }: { navegar: (u: string) => void; examen: boolean }) {
  const [q, setQ] = useState('')
  return (
    <div className="grid h-full place-items-center overflow-y-auto bg-gradient-to-b from-[#f9f9fb] to-[#ececf1] p-6 font-sans text-slate-700">
      <div className="w-full max-w-lg text-center">
        <Globe className="mx-auto mb-3 text-[#7542e5]" size={40} />
        <form
          onSubmit={(e) => {
            e.preventDefault()
            navegar(q)
          }}
          className="flex items-center gap-2 rounded-xl bg-white px-4 py-3 shadow ring-1 ring-black/5"
        >
          <Search size={16} className="text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar o escribir dirección" className="flex-1 bg-transparent text-sm outline-none" />
        </form>
        <div className="mt-6 grid grid-cols-3 gap-3">
          <button onClick={() => navegar('speedtest.net')} className="rounded-xl bg-white p-3 text-xs shadow-sm ring-1 ring-black/5 hover:shadow">
            <Gauge className="mx-auto mb-1 text-cyan-600" size={22} />
            speedtest.net
          </button>
          <button onClick={() => navegar('google.com')} className="rounded-xl bg-white p-3 text-xs shadow-sm ring-1 ring-black/5 hover:shadow">
            <Search className="mx-auto mb-1 text-blue-600" size={22} />
            Buscador
          </button>
          <div className="rounded-xl bg-white/60 p-3 text-xs text-slate-400 ring-1 ring-black/5">
            <Globe className="mx-auto mb-1" size={22} />
            Sitio
          </div>
        </div>
        {!examen && <p className="mt-6 text-xs text-slate-500">Para entrar a un equipo, escribe su IP en la barra de direcciones (por ejemplo la IP actual del biométrico) y presiona Enter.</p>}
      </div>
    </div>
  )
}

export function PaginaBuscador() {
  return (
    <div className="h-full overflow-y-auto bg-white p-8 font-sans text-slate-700">
      <p className="text-3xl font-bold text-slate-800">Buscador</p>
      <p className="mt-2 text-sm text-emerald-700">✓ Hay salida a internet desde este equipo.</p>
      <div className="mt-6 max-w-xl space-y-4 text-sm">
        <div>
          <p className="text-blue-700">Prueba de velocidad · speedtest.net</p>
          <p className="text-slate-500">Mide ping, descarga y carga de tu conexión.</p>
        </div>
        <div>
          <p className="text-blue-700">Cálculo de subredes /24</p>
          <p className="text-slate-500">network = .0 · broadcast = .255 · máscara 255.255.255.0</p>
        </div>
      </div>
    </div>
  )
}

export function PaginaError({ tipo, host, reintentar }: { tipo: 'timeout' | 'rechazada' | 'dns' | 'sin-red'; host: string; reintentar: () => void }) {
  const t = {
    timeout: {
      titulo: 'La conexión ha caducado',
      texto: `El servidor en ${host} está tardando demasiado en responder.`,
      puntos: ['El sitio podría no estar disponible temporalmente: intenta de nuevo en un momento.', 'Revisa que tu equipo esté en el mismo segmento (IP y máscara) que el equipo al que quieres entrar.', 'Si cambiaste la IP del equipo, ahora responde en la dirección nueva.'],
    },
    rechazada: {
      titulo: 'No se puede conectar',
      texto: `Firefox no puede establecer una conexión con el servidor en ${host}.`,
      puntos: ['El equipo responde en la red, pero no tiene una página web de configuración.'],
    },
    dns: {
      titulo: 'Hmm. Tenemos problemas para encontrar ese sitio.',
      texto: `No podemos conectar con el servidor en ${host}.`,
      puntos: ['Revisa que la dirección esté bien escrita (por ejemplo 192.168.10.4).', 'Revisa tu conexión a la red y a internet.'],
    },
    'sin-red': {
      titulo: 'Sin conexión',
      texto: 'Este equipo no tiene una conexión de red activa o no tiene IP.',
      puntos: ['Revisa el cable de red y la configuración IP del equipo.'],
    },
  }[tipo]
  return (
    <div className="h-full overflow-y-auto bg-[#f9f9fb] px-8 py-14 font-sans text-[#15141a]">
      <div className="mx-auto flex max-w-2xl gap-6">
        <div className="mt-1 hidden size-12 shrink-0 rounded-full bg-gradient-to-br from-[#ff9f43] to-[#e8467c] sm:block" />
        <div>
          <h1 className="text-2xl font-semibold">{t.titulo}</h1>
          <p className="mt-3 text-[15px]">{t.texto}</p>
          <ul className="mt-4 list-disc space-y-1.5 pl-5 text-sm text-slate-600">
            {t.puntos.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
          <button onClick={reintentar} className="mt-6 rounded bg-[#0061e0] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0250bb]">
            Reintentar
          </button>
        </div>
      </div>
    </div>
  )
}
