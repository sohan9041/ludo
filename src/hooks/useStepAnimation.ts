import { useEffect, useState } from 'react'
import type { Color, GameState, Move, TokenPos } from '../game/types'

export type PosOverride = Partial<Record<Color, Record<number, TokenPos>>>

const STEP_MS = 170

const steps = (m: Move | null): m is Move => !!m && m.from >= 0 && m.to - m.from > 1

/**
 * Walks the last-moved token one cell at a time from `from` to `to`, and keeps
 * captured tokens on their square until the mover lands on them.
 */
export function useStepAnimation(state: GameState) {
  const lm = state.lastMove
  const [anim, setAnim] = useState<{ move: Move; pos: number } | null>(null)

  // start a new walk in the same render the move arrives, so the token never jumps first
  if (steps(lm) && anim?.move !== lm) setAnim({ move: lm, pos: lm.from })

  const active = anim && anim.move === lm && anim.pos < anim.move.to ? anim : null
  const activeMove = active?.move

  useEffect(() => {
    if (!activeMove) return
    const id = setInterval(() => {
      setAnim((a) => (!a || a.pos >= a.move.to ? a : { ...a, pos: a.pos + 1 }))
    }, STEP_MS)
    return () => clearInterval(id)
  }, [activeMove])

  let override: PosOverride = {}
  if (active) {
    const m = active.move
    for (const c of m.captures) override[c.color] = { ...override[c.color], [c.token]: m.to }
    override = { ...override, [m.color]: { [m.token]: active.pos } }
  }
  return { override, animating: active !== null, step: active ? active.pos - active.move.from : 0 }
}
