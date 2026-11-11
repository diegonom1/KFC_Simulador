import { Binary, BookOpen, Cable, Calculator, Check, Copy, Cpu, Globe, KeyRound, ListOrdered, Network, Radar, SquareTerminal } from 'lucide-react'
import { useState } from 'react'
import { carriers, credenciales, destinosValidacion, equiposRed, equiposVlan40, fases, hojaEtiquetado, ordenEquipos, passwordPcGerencial, pcRedCocina, sucursalEjemplo, telefonoDns } from '../data/sucursal'
import { generarInterfaces } from '../engine/linux/interfaces'
import { direccionBroadcast, direccionDeRed, esIpValida, esMascaraValida, hostEn, ipAEntero, prefijoDeMascara } from '../lib/ip'
import { cx } from '../lib/util'
import { Topologia } from './Topologia'
import { Acordeon, Kbd } from './ui/base'

function Codigo({ children }: { children: string }) {
  const [ok, setOk] = useState(false)
  return (
    <div className="group relative">
      <pre className="term scroll-fino overflow-x-auto rounded-lg bg-[#300a24] px-3 py-2 text-[12.5px] leading-relaxed text-[#eeeeec]">{children}</pre>
      <button
        onClick={() => {
          try {
            void navigator.clipboard?.writeText(children)
            setOk(true)
            window.setTimeout(() => setOk(false), 1200)
          } catch {
            /* sin portapapeles */
          }
        }}
        className="absolute right-1.5 top-1.5 rounded bg-white/10 p-1 text-white/70 opacity-0 transition group-hover:opacity-100 hover:text-white"
        aria-label="Copiar"
      >
        {ok ? <Check size={13} /> : <Copy size={13} />}
      </button>
    </div>
  )
}

const RESUMEN_FASES = [
  'IP fija libre del segmento actual en la laptop + cable a un puerto del switch.',
  'Tener la tabla nueva y anotar la IP actual de cada equipo (rollback).',
  'Biométrico, teléfono, HME e impresora desde la laptop o Firefox de la PC Gerencial.',
  'fingerprint.conf (biométrico) y timer.conf (HME): solo la línea IP=.',
  'Home Delivery y LMS: /etc/network/interfaces (5 valores de eth0) + reboot.',
  'La PC Gerencial va al final: desde ella se configuran los demás.',
  'Tarjeta de red PCI, o BIOS → Controladora de LAN Realtek → Habilitado. eth0:1 → eth1.',
  'TP → WAN, Telmex → PORT1, PORT-A → 48, hoja de etiquetado, SW Plano, IP del Telmex, etiquetas L5/L6.',
  'ping -c 40: Internet, servicios PRB, cada equipo y la VLAN40 (40/40, 0% loss).',
  'Speedtest por cable directo al módem, sin otros equipos, y captura de evidencias.',
]

function CalculadoraCeco() {
  const [ceco, setCeco] = useState('312')
  const limpio = ceco.replace(/\D/g, '')
  const suma = limpio.split('').reduce((a, d) => a + Number(d), 0)
  return (
    <div className="rounded-xl border border-borde bg-black/20 p-3">
      <p className="mb-2 flex items-center gap-2 text-[12px] font-semibold text-amber-200">
        <Calculator size={14} /> Calculadora de contraseña de la PC Gerencial
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-[13px]">
          CECO
          <input value={ceco} onChange={(e) => setCeco(e.target.value)} className="w-24 rounded-md border border-borde-2 bg-black/40 px-2 py-1 font-mono" inputMode="numeric" />
        </label>
        {limpio && (
          <p className="font-mono text-[13px]">
            <span className="text-tenue">0</span> + <span className="text-cyan-200">{limpio}</span> + <span className="text-violet-200">{String(suma).padStart(2, '0')}</span> + <span className="text-tenue">r</span> = <b className="text-amber-200">{passwordPcGerencial(limpio)}</b>
          </p>
        )}
      </div>
      {limpio && <p className="mt-1.5 text-[11.5px] text-tenue">Suma de dígitos: {limpio.split('').join(' + ')} = {suma} → a dos dígitos: {String(suma).padStart(2, '0')}</p>}
    </div>
  )
}

function CalculadoraSubred() {
  const [ip, setIp] = useState('10.112.219.10')
  const [m, setM] = useState('255.255.255.0')
  const ok = esIpValida(ip) && esMascaraValida(m)
  const bits = (x: string) =>
    (ipAEntero(x) ?? 0)
      .toString(2)
      .padStart(32, '0')
      .match(/.{8}/g)!
  const pref = ok ? prefijoDeMascara(m) : 0
  return (
    <div className="rounded-xl border border-borde bg-black/20 p-3">
      <p className="mb-2 flex items-center gap-2 text-[12px] font-semibold text-cyan-200">
        <Binary size={14} /> Calculadora de network y broadcast
      </p>
      <div className="flex flex-wrap gap-3 text-[13px]">
        <label className="flex items-center gap-2">
          IP <input value={ip} onChange={(e) => setIp(e.target.value.trim())} className="w-36 rounded-md border border-borde-2 bg-black/40 px-2 py-1 font-mono" />
        </label>
        <label className="flex items-center gap-2">
          Máscara <input value={m} onChange={(e) => setM(e.target.value.trim())} className="w-36 rounded-md border border-borde-2 bg-black/40 px-2 py-1 font-mono" />
        </label>
      </div>
      {ok ? (
        <>
          <div className="mt-3 overflow-x-auto font-mono text-[11px] leading-5">
            {[
              ['IP', ip],
              ['Máscara', m],
            ].map(([t, v]) => (
              <div key={t} className="flex gap-2 whitespace-nowrap">
                <span className="w-16 text-tenue">{t}</span>
                {bits(v).map((oct, i) => (
                  <span key={i}>
                    {oct.split('').map((b, j) => (
                      <span key={j} className={cx(i * 8 + j < pref ? 'text-cyan-300' : 'text-violet-300')}>
                        {b}
                      </span>
                    ))}{' '}
                  </span>
                ))}
              </div>
            ))}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-[12.5px] sm:grid-cols-4">
            {[
              ['Prefijo', `/${pref}`],
              ['network', direccionDeRed(ip, m) ?? ''],
              ['broadcast', direccionBroadcast(ip, m) ?? ''],
              ['Hosts', String(Math.max(0, 2 ** (32 - pref) - 2))],
            ].map(([t, v]) => (
              <div key={t} className="rounded-lg bg-black/30 p-2">
                <p className="text-[10px] uppercase tracking-wider text-tenue">{t}</p>
                <p className="font-mono text-slate-100">{v}</p>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[11.5px] text-tenue">
            <span className="text-cyan-300">Azul</span> = bits de red (no cambian dentro del segmento), <span className="text-violet-300">morado</span> = bits de host. network pone los bits de host en 0; broadcast, en 1.
          </p>
        </>
      ) : (
        <p className="mt-2 text-[12px] text-rose-300">Escribe una IP y una máscara válidas.</p>
      )}
    </div>
  )
}

export function ContenidoReferencia() {
  const e = sucursalEjemplo
  const antes = generarInterfaces({ ip: hostEn(e.segmentoViejo.red, e.hostsViejos.pc), mascara: e.segmentoViejo.mascara, gateway: e.segmentoViejo.gateway }, { ip: pcRedCocina.ip, mascara: pcRedCocina.mascara })
  const nueva = { ip: hostEn(e.segmentoNuevo.red, equiposRed.pc.hostNuevo), mascara: e.segmentoNuevo.mascara, gateway: e.segmentoNuevo.gateway }
  const despues = generarInterfaces(nueva, { ip: pcRedCocina.ip, mascara: pcRedCocina.mascara })
  const conEth1 = despues.replace(/eth0:1/g, 'eth1')
  return (
    <div className="space-y-3">
      <Acordeon titulo="Orden correcto de los pasos" icono={<ListOrdered size={18} />} abiertoInicial>
        <ol className="space-y-2">
          {fases.map((f, i) => (
            <li key={f.n} className="flex gap-3">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-cyan-400/15 text-xs font-bold text-cyan-200">{f.n}</span>
              <span>
                <b className="text-slate-100">{f.titulo}.</b> {RESUMEN_FASES[i]}
              </span>
            </li>
          ))}
        </ol>
      </Acordeon>

      <Acordeon titulo="Topología nueva (SD-WAN)" icono={<Network size={18} />}>
        <Topologia />
        <ul className="mt-2 grid gap-1 sm:grid-cols-2">
          <li>• Totalplay → <b>WAN</b> del FortiGate (DHCP).</li>
          <li>• Telmex → <b>PORT1</b> (DHCP), LAN del módem en 192.168.0.1.</li>
          <li>• PORT-A → <b>puerto 48</b> del switch (FortiLink).</li>
          <li>• Si solo hay Telmex: va al WAN con el direccionamiento de TP ({carriers.totalplay.ipLan}).</li>
        </ul>
      </Acordeon>

      <Acordeon titulo="Credenciales de ejemplo" icono={<KeyRound size={18} />}>
        <p className="mb-2 text-[12.5px] text-amber-200/90">Son valores de ejemplo (placeholders). Los reales se cambian en src/data/sucursal.ts.</p>
        <table className="mb-3 w-full text-[13px]">
          <tbody>
            {[
              ['PC Gerencial (sesión)', 'Regla: 0 + CECO + suma de dígitos (2) + r'],
              ['Home Delivery / LMS (sesión)', credenciales.homeDelivery.sesion],
              ['su - sysadmin', credenciales.pcGerencial.sysadmin],
              ['Biométrico', `${credenciales.biometrico.usuario} / ${credenciales.biometrico.password}`],
              ['Teléfono Yealink', `${credenciales.telefono.usuario} / ${credenciales.telefono.password}`],
              ['HME (Installer)', `${credenciales.hme.usuario} / ${credenciales.hme.password}`],
              ['Impresora', `${credenciales.impresora.usuario} / ${credenciales.impresora.password}`],
              ['Módem Telmex', `${credenciales.telmex.usuario} (mayúsculas) / la de la etiqueta`],
            ].map(([a, b]) => (
              <tr key={a} className="border-b border-borde/60">
                <td className="py-1.5 pr-3 text-tenue">{a}</td>
                <td className="py-1.5 font-mono text-slate-100">{b}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <CalculadoraCeco />
      </Acordeon>

      <Acordeon titulo="Direccionamiento de ejemplo" icono={<Globe size={18} />}>
        <p className="mb-2">
          Segmento actual <span className="font-mono">{e.segmentoViejo.red}/24</span> (gw {e.segmentoViejo.gateway}) → nuevo <span className="font-mono">{e.segmentoNuevo.red}/24</span> (gw {e.segmentoNuevo.gateway}).
        </p>
        <div className="grid gap-x-6 sm:grid-cols-2">
          {ordenEquipos.map((id) => (
            <div key={id} className="flex justify-between border-b border-borde/50 py-1 font-mono text-[12.5px]">
              <span className="font-sans text-slate-300">{equiposRed[id].corto}</span>
              <span>
                <span className="text-tenue">{hostEn(e.segmentoViejo.red, e.hostsViejos[id])}</span> → <span className="text-cyan-200">{hostEn(e.segmentoNuevo.red, equiposRed[id].hostNuevo)}</span>
              </span>
            </div>
          ))}
        </div>
        <p className="mt-3 font-semibold text-slate-200">VLAN40 (no cambian) y validación</p>
        <div className="mt-1 grid gap-x-6 sm:grid-cols-2">
          {[...equiposVlan40.map((v) => [v.nombre, v.ip]), ...destinosValidacion.map((d) => [d.nombre, d.ip])].map(([a, b]) => (
            <div key={a} className="flex justify-between border-b border-borde/50 py-1 text-[12.5px]">
              <span className="text-slate-300">{a}</span>
              <span className="font-mono">{b}</span>
            </div>
          ))}
        </div>
        <div className="mt-3">
          <CalculadoraSubred />
        </div>
      </Acordeon>

      <Acordeon titulo="Comandos de la terminal" icono={<SquareTerminal size={18} />}>
        <p className="mb-2">
          Abrir terminal: <Kbd>Ctrl</Kbd> + <Kbd>T</Kbd> (en el simulador también <Kbd>Alt</Kbd> + <Kbd>T</Kbd> o el ícono del dock). Pide la contraseña de sesión.
        </p>
        <div className="space-y-2">
          <Codigo>{`su - sysadmin                       # pide la contraseña de sysadmin
ip a                                 # ver IPs (eth0, eth0:1, eth1)
cat /ph/timer/etc/timer.conf         # ver IP actual del HME
nano /ph/fingerprint/etc/fingerprint.conf
sudo nano /etc/network/interfaces    # requiere sudo
sudo reboot                          # aplicar la IP nueva
ping -c 40 8.8.8.8                   # Ctrl+C detiene un ping`}</Codigo>
        </div>
        <p className="mb-1 mt-3 font-semibold text-slate-200">Atajos de nano</p>
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[12.5px]">
          <span>
            <Kbd>Ctrl</Kbd>+<Kbd>O</Kbd> y <Kbd>Enter</Kbd> guardar
          </span>
          <span>
            <Kbd>Ctrl</Kbd>+<Kbd>X</Kbd> salir (si preguntas: <Kbd>Y</Kbd> y <Kbd>Enter</Kbd>)
          </span>
          <span>
            <Kbd>Ctrl</Kbd>+<Kbd>K</Kbd> cortar línea · <Kbd>Ctrl</Kbd>+<Kbd>U</Kbd> pegar
          </span>
        </div>
        <p className="mt-2 text-[12px] text-amber-200/90">Ojo: en el navegador, Ctrl+W cierra la pestaña. Para buscar en nano usa el botón ^W de la barra.</p>
      </Acordeon>

      <Acordeon titulo="/etc/network/interfaces: antes y después" icono={<BookOpen size={18} />}>
        <p className="mb-2">Se actualizan los <b>cinco valores de eth0</b>: address, netmask, network, broadcast y gateway. <b>eth0:1 no se toca</b>.</p>
        <div className="grid gap-3 lg:grid-cols-2">
          <div>
            <p className="mb-1 text-[11px] uppercase tracking-wider text-tenue">Antes (PC Gerencial)</p>
            <Codigo>{antes.split('\n').slice(9).join('\n')}</Codigo>
          </div>
          <div>
            <p className="mb-1 text-[11px] uppercase tracking-wider text-tenue">Después</p>
            <Codigo>{despues.split('\n').slice(9).join('\n')}</Codigo>
          </div>
        </div>
        <p className="mb-1 mt-3">Con tarjeta nueva o Realtek habilitada: <b>eth0:1 → eth1</b> (en la línea auto y en iface), conservando sus parámetros:</p>
        <Codigo>{conEth1.split('\n').slice(-5).join('\n')}</Codigo>
        <p className="mt-2 text-[12.5px]">fingerprint.conf y timer.conf: <b>solo la línea IP=</b>. Cambiar usuario o contraseña es error.</p>
      </Acordeon>

      <Acordeon titulo="Cableado y etiquetado" icono={<Cable size={18} />}>
        <ul className="space-y-1.5">
          <li>• Totalplay → <b>WAN</b>; Telmex → <b>PORT1</b>; ambos en DHCP.</li>
          <li>• <b>PORT-A</b> del FortiGate → <b>puerto 48</b> del switch.</li>
          <li>• Cada equipo al puerto de la hoja de etiquetado; si no se puede, a cualquier puerto <b>de la misma VLAN</b>.</li>
          <li>
            • VLANs: {hojaEtiquetado.vlans.map((v) => `VLAN${v.id} ${v.nombre} (${v.desde}${v.hasta !== v.desde ? `–${v.hasta}` : ''})`).join(' · ')}
          </li>
          <li>• Proveedores → <b>SW Plano</b> (cualquier puerto).</li>
          <li>• Pantallas de menú → <b>ONT</b> mediante su switch plano.</li>
          <li>• Módems adicionales → <b>sin nada conectado</b>.</li>
          <li>• Etiquetas: Totalplay <b>L5-ONT</b>, Telmex <b>L6-ONT</b>.</li>
        </ul>
      </Acordeon>

      <Acordeon titulo="Interfaces web paso a paso" icono={<Radar size={18} />}>
        <div className="space-y-2 text-[13px]">
          <p>
            <b>Biométrico</b> (IP termina en .4): login → Setting › TCP/IP → IP Address, Subnet Mask, Default Gateway → OK → Terminal › Reboot.
          </p>
          <p>
            <b>Yealink T30P</b>: ver IP en su pantalla (Menu › Status) → login → Network › Basic → Static IP Address → IP, máscara, gateway → Static DNS On: {telefonoDns.primario} / {telefonoDns.secundario} → Save.
          </p>
          <p>
            <b>HME 60 (ZOOM Nitro)</b>: Dashboard → hamburguesa → Installer + contraseña → Network › Local Network → Control Unit Network: solo IP Address y Gateway → Save (sin reinicio) → ping.
          </p>
          <p>
            <b>HME 50</b>: engrane → Settings… › Installer › Security → usuario + contraseña → LOG IN → Control Unit Network › EDIT → IP y Gateway → APPLY → ping.
          </p>
          <p>
            <b>Impresora</b> A) web: login → Configuración › Configuración de red → deshabilitar TCP/IPv6 → TCP/IPv4 Manualmente → Guardar → Desconexión. B) display: Ajustes › TCP/IP › Cambiar › IP › Guardar.
          </p>
          <p>
            <b>Módem Telmex</b>: laptop por cable en DHCP → 192.168.1.254 → usuario TELMEX + contraseña de la etiqueta → Configuración LAN → 192.168.0.1 → Aplicar.
          </p>
          <p>
            <b>Digi</b>: lo configura PRB; solo se valida con ping.
          </p>
          <p>
            <b>Speedtest</b>: laptop por cable directo al módem, sin otros equipos, Wi-Fi apagado → speedtest.net → GO → captura.
          </p>
        </div>
      </Acordeon>

      <Acordeon titulo="Tarjeta de red y BIOS" icono={<Cpu size={18} />}>
        <ol className="list-decimal space-y-1 pl-5">
          <li>Apagar desde el sistema, desconectar la corriente, quitar tornillos y tapa.</li>
          <li>Con ranura PCI libre: insertar la tarjeta y atornillarla. Cerrar, conectar corriente y el cable de red en la tarjeta.</li>
          <li>Sin ranura: al encender presiona F2 (o F8 / F12) → Opciones avanzadas → Configuración de dispositivos incluidos → Controladora de LAN Realtek → Habilitado → F10.</li>
          <li>En /etc/network/interfaces cambiar eth0:1 por eth1 y reiniciar; ip a debe mostrar eth1 con {pcRedCocina.ip}.</li>
        </ol>
      </Acordeon>
    </div>
  )
}
