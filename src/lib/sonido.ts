// Efectos de sonido sintetizados con WebAudio (no se cargan archivos de audio).
import { CLAVES, guardar, leer } from './almacen'

interface Ajustes {
  sonido: boolean
  pingRapido: boolean
}

let ajustes: Ajustes = { sonido: true, pingRapido: true, ...leer<Partial<Ajustes>>(CLAVES.ajustes, {}) }
const oyentes = new Set<() => void>()

export function obtenerAjustes(): Ajustes {
  return ajustes
}

export function cambiarAjustes(parcial: Partial<Ajustes>) {
  ajustes = { ...ajustes, ...parcial }
  guardar(CLAVES.ajustes, ajustes)
  oyentes.forEach((f) => f())
}

export function suscribirAjustes(f: () => void) {
  oyentes.add(f)
  return () => {
    oyentes.delete(f)
  }
}

let ctx: AudioContext | null = null

function audio(): AudioContext | null {
  if (!ajustes.sonido) return null
  try {
    if (!ctx) {
      const C = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!C) return null
      ctx = new C()
    }
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

function tono(freq: number, dur: number, tipo: OscillatorType = 'sine', vol = 0.06, retraso = 0) {
  const c = audio()
  if (!c) return
  try {
    const t0 = c.currentTime + retraso
    const osc = c.createOscillator()
    const g = c.createGain()
    osc.type = tipo
    osc.frequency.setValueAtTime(freq, t0)
    g.gain.setValueAtTime(0.0001, t0)
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
    osc.connect(g).connect(c.destination)
    osc.start(t0)
    osc.stop(t0 + dur + 0.02)
  } catch {
    /* ignorar */
  }
}

function ruido(dur: number, vol = 0.2, filtro = 2500) {
  const c = audio()
  if (!c) return
  try {
    const buf = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) ** 3
    const src = c.createBufferSource()
    src.buffer = buf
    const bp = c.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = filtro
    const g = c.createGain()
    g.gain.value = vol
    src.connect(bp).connect(g).connect(c.destination)
    src.start()
  } catch {
    /* ignorar */
  }
}

export const sfx = {
  click: () => tono(1200, 0.04, 'square', 0.015),
  tecla: () => tono(1800 + Math.random() * 300, 0.012, 'square', 0.006),
  conectar: () => {
    ruido(0.05, 0.35, 3200)
    tono(150, 0.09, 'sine', 0.12)
  },
  desconectar: () => {
    ruido(0.04, 0.2, 1800)
    tono(260, 0.06, 'sine', 0.06)
  },
  exito: () => {
    tono(660, 0.12, 'sine', 0.06)
    tono(990, 0.2, 'sine', 0.06, 0.1)
  },
  error: () => {
    tono(180, 0.22, 'sawtooth', 0.04)
    tono(140, 0.26, 'sawtooth', 0.035, 0.12)
  },
  aviso: () => {
    tono(520, 0.12, 'triangle', 0.05)
    tono(420, 0.16, 'triangle', 0.05, 0.12)
  },
  ping: () => tono(1480, 0.03, 'sine', 0.012),
  pingFin: () => {
    tono(784, 0.1, 'sine', 0.05)
    tono(988, 0.1, 'sine', 0.05, 0.1)
    tono(1175, 0.18, 'sine', 0.05, 0.2)
  },
  logro: () => [523, 659, 784, 1047].forEach((f, i) => tono(f, 0.2, 'triangle', 0.05, i * 0.09)),
  arranque: () => {
    tono(220, 0.3, 'sine', 0.04)
    tono(330, 0.4, 'sine', 0.04, 0.25)
  },
  obturador: () => {
    ruido(0.08, 0.4, 5000)
    ruido(0.06, 0.3, 3000)
  },
}
