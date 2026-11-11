import { useEffect, useMemo, useRef, useState } from 'react'
import { cx } from '../../lib/util'

interface Opcion {
  id: string
  nombre: string
  valores?: string[]
  inicial?: number
  sub?: string
  texto?: string
  accion?: 'guardar' | 'descartar' | 'defecto'
  ayuda: string
  bloqueada?: boolean
}

const HD = ['Habilitado', 'Deshabilitado']
const TABS = ['Principal', 'Opciones avanzadas', 'Arranque', 'Seguridad', 'Guardar y salir'] as const

function construir(pci: boolean): { tabs: Record<string, Opcion[]>; subs: Record<string, { titulo: string; ops: Opcion[] }> } {
  return {
    tabs: {
      Principal: [
        { id: 'fecha', nombre: 'Fecha del sistema', texto: '[mar 10/11/2026]', ayuda: 'Fecha actual del sistema.' },
        { id: 'hora', nombre: 'Hora del sistema', texto: '[10:31:22]', ayuda: 'Hora actual del sistema.' },
        { id: 'ver', nombre: 'Versión de BIOS', texto: 'A12', ayuda: 'Versión del firmware instalado.' },
        { id: 'cpu', nombre: 'Procesador', texto: 'Intel Core i5-7500 @ 3.40GHz', ayuda: 'Procesador detectado.' },
        { id: 'mem', nombre: 'Memoria instalada', texto: '8192 MB', ayuda: 'Memoria RAM detectada.' },
        { id: 'idioma', nombre: 'Idioma del sistema', valores: ['Español', 'English'], inicial: 0, ayuda: 'Idioma de esta utilidad.' },
      ],
      'Opciones avanzadas': [
        { id: 's-cpu', nombre: 'Configuración de CPU', sub: 'cpu', ayuda: 'Opciones del procesador.' },
        { id: 's-sata', nombre: 'Configuración SATA', sub: 'sata', ayuda: 'Modo de los discos.' },
        { id: 's-disp', nombre: 'Configuración de dispositivos incluidos', sub: 'disp', ayuda: 'Habilita o deshabilita los dispositivos integrados en la tarjeta madre (audio, red, puertos).' },
        { id: 's-ener', nombre: 'Administración de energía', sub: 'energia', ayuda: 'Encendido por red y comportamiento ante cortes.' },
        { id: 's-usb', nombre: 'Configuración USB', sub: 'usb', ayuda: 'Puertos USB.' },
      ],
      Arranque: [
        { id: 'boot1', nombre: 'Prioridad de arranque #1', valores: ['Disco duro', 'USB', 'Red (PXE)'], inicial: 0, ayuda: 'Primer dispositivo desde el que arranca la PC.' },
        { id: 'boot2', nombre: 'Prioridad de arranque #2', valores: ['USB', 'Disco duro', 'Red (PXE)'], inicial: 0, ayuda: 'Segundo dispositivo de arranque.' },
        { id: 'fast', nombre: 'Arranque rápido', valores: HD, inicial: 0, ayuda: 'Omite algunas pruebas al encender.' },
      ],
      Seguridad: [
        { id: 'adminpw', nombre: 'Contraseña de administrador', texto: 'No instalada', ayuda: 'Contraseña para entrar a esta utilidad.' },
        { id: 'secure', nombre: 'Arranque seguro', valores: HD, inicial: 1, ayuda: 'Verifica la firma del cargador de arranque.' },
      ],
      'Guardar y salir': [
        { id: 'save', nombre: 'Guardar cambios y salir', accion: 'guardar', ayuda: 'Guarda la configuración y reinicia (F10).' },
        { id: 'discard', nombre: 'Descartar cambios y salir', accion: 'descartar', ayuda: 'Sale sin guardar los cambios.' },
        { id: 'def', nombre: 'Cargar valores predeterminados', accion: 'defecto', ayuda: 'Regresa todas las opciones a sus valores de fábrica (F9).' },
      ],
    },
    subs: {
      cpu: {
        titulo: 'Configuración de CPU',
        ops: [
          { id: 'vt', nombre: 'Tecnología de virtualización', valores: HD, inicial: 0, ayuda: 'Virtualización por hardware.' },
          { id: 'ht', nombre: 'Hyper-Threading', valores: HD, inicial: 0, ayuda: 'Hilos lógicos por núcleo.' },
        ],
      },
      sata: { titulo: 'Configuración SATA', ops: [{ id: 'sata', nombre: 'Modo SATA', valores: ['AHCI', 'RAID', 'IDE'], inicial: 0, ayuda: 'Cambiarlo puede impedir que arranque el sistema.' }] },
      disp: {
        titulo: 'Configuración de dispositivos incluidos',
        ops: [
          { id: 'audio', nombre: 'Controladora de audio integrada', valores: HD, inicial: 0, ayuda: 'Audio de la tarjeta madre.' },
          { id: 'lan1', nombre: 'Controladora de LAN Intel (primaria)', valores: HD, inicial: 0, ayuda: 'Tarjeta de red principal (eth0). No la deshabilites.' },
          pci
            ? { id: 'realtek', nombre: 'Controladora de LAN Realtek', texto: 'No instalada', bloqueada: true, ayuda: 'Esta tarjeta madre no tiene controladora Realtek integrada: usa la ranura PCI.' }
            : { id: 'realtek', nombre: 'Controladora de LAN Realtek', valores: HD, inicial: 1, ayuda: 'Segundo puerto de red integrado. Al habilitarlo, Linux lo detecta como eth1.' },
          { id: 'pxe', nombre: 'ROM de arranque de LAN', valores: HD, inicial: 1, ayuda: 'Arranque por red (PXE).' },
          { id: 'serie', nombre: 'Puerto serie 1', valores: HD, inicial: 0, ayuda: 'Puerto COM integrado.' },
        ],
      },
      energia: {
        titulo: 'Administración de energía',
        ops: [
          { id: 'wol', nombre: 'Wake on LAN', valores: HD, inicial: 1, ayuda: 'Encender la PC por red.' },
          { id: 'ac', nombre: 'Recuperación tras corte de energía', valores: ['Apagado', 'Encendido', 'Último estado'], inicial: 2, ayuda: 'Qué hace la PC cuando regresa la luz.' },
        ],
      },
      usb: {
        titulo: 'Configuración USB',
        ops: [
          { id: 'usbf', nombre: 'Puertos USB frontales', valores: HD, inicial: 0, ayuda: 'USB del frente del gabinete.' },
          { id: 'usbboot', nombre: 'Arranque desde USB', valores: HD, inicial: 0, ayuda: 'Permite arrancar desde memorias USB.' },
        ],
      },
    },
  }
}

export function Bios({ pci, realtekInicial, onSalir }: { pci: boolean; realtekInicial: boolean; onSalir: (r: { guardar: boolean; realtek: boolean; cambiosExtra: string[] }) => void }) {
  const def = useMemo(() => construir(pci), [pci])
  const todas = useMemo(() => [...Object.values(def.tabs).flat(), ...Object.values(def.subs).flatMap((x) => x.ops)], [def])
  const iniciales = useMemo(() => {
    const r: Record<string, number> = {}
    for (const o of todas) if (o.valores) r[o.id] = o.id === 'realtek' ? (realtekInicial ? 0 : 1) : (o.inicial ?? 0)
    return r
  }, [todas, realtekInicial])
  const [valores, setValores] = useState<Record<string, number>>(iniciales)
  const [tab, setTab] = useState(0)
  const [pila, setPila] = useState<string[]>([])
  const [sel, setSel] = useState(0)
  const [popup, setPopup] = useState<{ op: Opcion; idx: number } | null>(null)
  const [dialogo, setDialogo] = useState<'guardar' | 'salir' | null>(null)
  const [dlgSel, setDlgSel] = useState(0)
  const raiz = useRef<HTMLDivElement>(null)

  const sub = pila.length ? def.subs[pila[pila.length - 1]] : null
  const ops = sub ? sub.ops : def.tabs[TABS[tab]]
  const actual = ops[Math.min(sel, ops.length - 1)]

  const terminar = (guardar: boolean) => {
    const cambiosExtra = todas.filter((o) => o.valores && o.id !== 'realtek' && valores[o.id] !== iniciales[o.id]).map((o) => o.nombre)
    onSalir({ guardar, realtek: guardar ? valores.realtek === 0 : realtekInicial, cambiosExtra: guardar ? cambiosExtra : [] })
  }

  const activar = (o: Opcion) => {
    if (o.sub) {
      setPila((p) => [...p, o.sub!])
      setSel(0)
    } else if (o.valores && !o.bloqueada) setPopup({ op: o, idx: valores[o.id] ?? 0 })
    else if (o.accion === 'guardar') {
      setDialogo('guardar')
      setDlgSel(0)
    } else if (o.accion === 'descartar') {
      setDialogo('salir')
      setDlgSel(0)
    } else if (o.accion === 'defecto') {
      const r: Record<string, number> = {}
      for (const x of todas) if (x.valores) r[x.id] = x.id === 'realtek' ? 1 : (x.inicial ?? 0)
      setValores(r)
    }
  }

  const tecla = (k: string) => {
    if (dialogo) {
      if (k === 'ArrowLeft' || k === 'ArrowRight' || k === 'Tab') setDlgSel((x) => 1 - x)
      else if (k === 'Enter') {
        if (dlgSel === 0) terminar(dialogo === 'guardar')
        else setDialogo(null)
      } else if (k === 'Escape') setDialogo(null)
      return
    }
    if (popup) {
      const n = popup.op.valores!.length
      if (k === 'ArrowUp') setPopup({ ...popup, idx: (popup.idx - 1 + n) % n })
      else if (k === 'ArrowDown') setPopup({ ...popup, idx: (popup.idx + 1) % n })
      else if (k === 'Enter') {
        setValores((v) => ({ ...v, [popup.op.id]: popup.idx }))
        setPopup(null)
      } else if (k === 'Escape') setPopup(null)
      return
    }
    switch (k) {
      case 'ArrowUp':
        setSel((x) => (x - 1 + ops.length) % ops.length)
        break
      case 'ArrowDown':
        setSel((x) => (x + 1) % ops.length)
        break
      case 'ArrowLeft':
        if (!pila.length) {
          setTab((t) => (t - 1 + TABS.length) % TABS.length)
          setSel(0)
        }
        break
      case 'ArrowRight':
        if (!pila.length) {
          setTab((t) => (t + 1) % TABS.length)
          setSel(0)
        }
        break
      case 'Enter':
        if (actual) activar(actual)
        break
      case 'Escape':
        if (pila.length) {
          setPila((p) => p.slice(0, -1))
          setSel(0)
        } else {
          setDialogo('salir')
          setDlgSel(0)
        }
        break
      case '+':
      case '-':
        if (actual?.valores && !actual.bloqueada) {
          const n = actual.valores.length
          setValores((v) => ({ ...v, [actual.id]: ((v[actual.id] ?? 0) + (k === '+' ? 1 : -1) + n) % n }))
        }
        break
      case 'F10':
        setDialogo('guardar')
        setDlgSel(0)
        break
      case 'F9':
        activar({ id: 'def', nombre: '', accion: 'defecto', ayuda: '' })
        break
    }
  }

  const ref = useRef(tecla)
  ref.current = tecla
  useEffect(() => {
    raiz.current?.focus()
    const f = (e: KeyboardEvent) => {
      const k = e.key
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'Escape', '+', '-', 'F9', 'F10', 'Tab'].includes(k)) {
        e.preventDefault()
        e.stopPropagation()
        ref.current(k)
      }
    }
    window.addEventListener('keydown', f, true)
    return () => window.removeEventListener('keydown', f, true)
  }, [])

  return (
    <div ref={raiz} tabIndex={-1} data-guide="bios-pantalla" className="absolute inset-0 flex select-none flex-col bg-[#0b2a8c] font-mono text-[13px] text-[#e8eefc] outline-none">
      <div className="bg-[#0a1f66] py-1 text-center text-[#7fd3ff]">Utilidad de configuración del BIOS · v2.18</div>
      <div className="flex flex-wrap bg-[#0a1f66] px-2">
        {TABS.map((t, i) => (
          <button key={t} onClick={() => (setTab(i), setPila([]), setSel(0))} className={cx('px-3 py-0.5', i === tab ? 'bg-[#e8eefc] text-[#0b2a8c]' : 'text-[#e8eefc] hover:bg-white/10')}>
            {t}
          </button>
        ))}
      </div>
      <div className="flex min-h-0 flex-1 border-t-2 border-[#7fd3ff]/50">
        <div className="scroll-fino min-w-0 flex-[2] overflow-y-auto p-3">
          {sub && <p className="mb-2 text-[#ffe066]">▸ {sub.titulo}</p>}
          {ops.map((o, i) => (
            <button
              key={o.id}
              onClick={() => (i === sel ? activar(o) : setSel(i))}
              className={cx('flex w-full justify-between gap-4 px-2 py-0.5 text-left', i === sel ? 'bg-[#e8eefc] text-[#0b2a8c]' : o.bloqueada ? 'text-[#8fa3d9]' : 'hover:bg-white/10')}
            >
              <span>
                {o.sub ? '▶ ' : '  '}
                {o.nombre}
              </span>
              <span className={cx(i !== sel && (o.valores ? 'text-[#ffe066]' : 'text-[#bcd0ff]'))}>{o.valores ? `[${o.valores[valores[o.id] ?? 0]}]` : o.texto ?? ''}</span>
            </button>
          ))}
        </div>
        <div className="hidden flex-1 border-l-2 border-[#7fd3ff]/50 p-3 text-[12px] leading-relaxed text-[#bcd0ff] sm:block">
          <p className="mb-2 text-[#7fd3ff]">Ayuda</p>
          <p>{actual?.ayuda}</p>
          <div className="mt-6 space-y-0.5 text-[11px]">
            <p>←→ : Cambiar pestaña</p>
            <p>↑↓ : Seleccionar</p>
            <p>Enter : Elegir</p>
            <p>+/- : Cambiar valor</p>
            <p>F9 : Valores predeterminados</p>
            <p>F10 : Guardar y salir</p>
            <p>Esc : Regresar / Salir</p>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-1 bg-[#0a1f66] px-2 py-1 text-[11px]">
        {(
          [
            ['↑', 'ArrowUp'],
            ['↓', 'ArrowDown'],
            ['←', 'ArrowLeft'],
            ['→', 'ArrowRight'],
            ['Enter', 'Enter'],
            ['Esc', 'Escape'],
            ['+', '+'],
            ['−', '-'],
            ['F10 Guardar', 'F10'],
          ] as const
        ).map(([t, k]) => (
          <button key={k} onClick={() => tecla(k)} className="rounded border border-[#7fd3ff]/40 px-2 py-0.5 text-[#e8eefc] hover:bg-white/10">
            {t}
          </button>
        ))}
      </div>
      {popup && (
        <div className="absolute inset-0 grid place-items-center bg-black/20">
          <div className="min-w-60 border-2 border-[#e8eefc] bg-[#0b2a8c] p-1 shadow-xl">
            <p className="bg-[#0a1f66] px-2 py-0.5 text-center text-[#ffe066]">{popup.op.nombre}</p>
            {popup.op.valores!.map((v, i) => (
              <button
                key={v}
                onClick={() => {
                  setValores((x) => ({ ...x, [popup.op.id]: i }))
                  setPopup(null)
                }}
                className={cx('block w-full px-3 py-0.5 text-left', i === popup.idx ? 'bg-[#e8eefc] text-[#0b2a8c]' : 'hover:bg-white/10')}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      )}
      {dialogo && (
        <div className="absolute inset-0 grid place-items-center bg-black/30">
          <div className="w-80 border-2 border-[#e8eefc] bg-[#7a7a7a] p-1 text-white shadow-xl">
            <p className="bg-[#5a5a5a] px-2 py-0.5 text-center">{dialogo === 'guardar' ? 'Guardar y salir' : 'Salir sin guardar'}</p>
            <p className="p-3 text-center">{dialogo === 'guardar' ? '¿Guardar la configuración y salir?' : '¿Salir sin guardar los cambios?'}</p>
            <div className="flex justify-center gap-4 pb-2">
              {['Sí', 'No'].map((t, i) => (
                <button key={t} onClick={() => (i === 0 ? terminar(dialogo === 'guardar') : setDialogo(null))} className={cx('px-4', dlgSel === i ? 'bg-[#e8eefc] text-[#5a5a5a]' : '')}>
                  [{t}]
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
