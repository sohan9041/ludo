import { FINISH, HOME_ENTRY, isSafe, trackIndex } from './board'
import { legalMoves } from './engine'
import { COLORS, type GameState, type Move } from './types'

/** Simple heuristic AI: capture > finish > leave base > escape danger > reach safety > advance. */
export function chooseMove(state: GameState, dice: number): number | null {
  const moves = legalMoves(state, state.current, dice)
  if (moves.length === 0) return null
  const scored = moves.map((m) => ({ m, s: score(state, m) }))
  scored.sort((a, b) => b.s - a.s)
  return scored[0].m.token
}

function threatened(state: GameState, move: Move, pos: number): boolean {
  if (pos >= HOME_ENTRY || pos < 0 || isSafe(move.color, pos)) return false
  const target = trackIndex(move.color, pos)!
  for (const oc of COLORS) {
    if (oc === move.color || !state.players[oc].active) continue
    for (const p of state.tokens[oc]) {
      const ti = trackIndex(oc, p)
      if (ti === null) continue
      const dist = (target - ti + 52) % 52
      if (dist >= 1 && dist <= 6) return true
    }
  }
  return false
}

function score(state: GameState, m: Move): number {
  let s = m.to - Math.max(m.from, 0) // progress
  if (m.captures.length) s += 60
  if (m.finishes) s += 50
  if (m.from < 0) s += 30
  if (m.to >= HOME_ENTRY && m.to < FINISH) s += 15
  if (threatened(state, m, m.from)) s += 20
  if (threatened(state, m, m.to)) s -= 25
  if (isSafe(m.color, m.to) && m.to < HOME_ENTRY) s += 10
  return s
}
