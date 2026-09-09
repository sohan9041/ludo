export type Color = 'red' | 'green' | 'yellow' | 'blue'

export const COLORS: Color[] = ['red', 'green', 'yellow', 'blue']

/** -1 = in base, 0..55 = on path, 56 = finished */
export type TokenPos = number

export interface Player {
  color: Color
  name: string
  /** false → seat is not in this game */
  active: boolean
}

export type Phase = 'roll' | 'move' | 'over'

export interface Move {
  color: Color
  token: number
  from: TokenPos
  to: TokenPos
  captures: { color: Color; token: number }[]
  finishes: boolean
}

export interface GameState {
  players: Record<Color, Player>
  turnOrder: Color[]
  tokens: Record<Color, TokenPos[]>
  current: Color
  phase: Phase
  dice: number | null
  sixStreak: number
  winners: Color[]
  lastMove: Move | null
  turn: number
  log: string[]
}

export type GameAction =
  | { type: 'NEW_GAME'; players: Partial<Record<Color, string>> }
  | { type: 'ROLL'; value?: number }
  | { type: 'MOVE'; token: number }
