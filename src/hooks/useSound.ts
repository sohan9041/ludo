import { useCallback, useEffect, useRef, useState } from 'react'

export type SoundName = 'roll' | 'move' | 'capture' | 'home' | 'win' | 'turn'

let ctx: AudioContext | null = null
function audio(): AudioContext {
  if (!ctx) ctx = new AudioContext()
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function tone(freq: number, dur: number, type: OscillatorType = 'sine', when = 0, gain = 0.15) {
  const ac = audio()
  const o = ac.createOscillator()
  const g = ac.createGain()
  o.type = type
  o.frequency.value = freq
  g.gain.setValueAtTime(gain, ac.currentTime + when)
  g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + when + dur)
  o.connect(g).connect(ac.destination)
  o.start(ac.currentTime + when)
  o.stop(ac.currentTime + when + dur)
}

const SOUNDS: Record<SoundName, () => void> = {
  roll: () => {
    for (let i = 0; i < 6; i++) tone(200 + Math.random() * 400, 0.05, 'square', i * 0.06, 0.06)
  },
  move: () => tone(440, 0.08, 'triangle'),
  capture: () => {
    tone(600, 0.1, 'sawtooth')
    tone(300, 0.2, 'sawtooth', 0.1)
  },
  home: () => {
    tone(523, 0.1, 'sine')
    tone(659, 0.1, 'sine', 0.1)
    tone(784, 0.2, 'sine', 0.2)
  },
  win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.25, 'triangle', i * 0.15)),
  turn: () => tone(880, 0.06, 'sine', 0, 0.08),
}

export function useSound() {
  const [muted, setMuted] = useState(() => localStorage.getItem('ludo-muted') === '1')
  const mutedRef = useRef(muted)
  useEffect(() => {
    mutedRef.current = muted
    localStorage.setItem('ludo-muted', muted ? '1' : '0')
  }, [muted])
  const play = useCallback((name: SoundName) => {
    if (mutedRef.current) return
    try {
      SOUNDS[name]()
    } catch {
      /* audio unavailable */
    }
  }, [])
  return { play, muted, toggleMuted: () => setMuted((m) => !m) }
}
