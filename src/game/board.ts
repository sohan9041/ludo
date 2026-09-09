import type { Color, TokenPos } from './types'

export const GRID = 15
export const TRACK_LEN = 52
export const HOME_ENTRY = 51 // path index where the home column starts
export const FINISH = 56
export const PATH_LEN = 57

export interface Cell {
  row: number
  col: number
}

export const START_OFFSET: Record<Color, number> = {
  red: 0,
  green: 13,
  yellow: 26,
  blue: 39,
}

function range(a: number, b: number): number[] {
  const out: number[] = []
  const step = a <= b ? 1 : -1
  for (let i = a; i !== b + step; i += step) out.push(i)
  return out
}

/** The 52 shared track cells, clockwise, starting at red's start square. */
export const TRACK: Cell[] = [
  ...range(1, 5).map((col) => ({ row: 6, col })),
  ...range(5, 0).map((row) => ({ row, col: 6 })),
  { row: 0, col: 7 },
  { row: 0, col: 8 },
  ...range(1, 5).map((row) => ({ row, col: 8 })),
  ...range(9, 14).map((col) => ({ row: 6, col })),
  { row: 7, col: 14 },
  { row: 8, col: 14 },
  ...range(13, 9).map((col) => ({ row: 8, col })),
  ...range(9, 14).map((row) => ({ row, col: 8 })),
  { row: 14, col: 7 },
  { row: 14, col: 6 },
  ...range(13, 9).map((row) => ({ row, col: 6 })),
  ...range(5, 0).map((col) => ({ row: 8, col })),
  { row: 7, col: 0 },
  { row: 6, col: 0 },
]

export const HOME_COLUMN: Record<Color, Cell[]> = {
  red: range(1, 5).map((col) => ({ row: 7, col })),
  green: range(1, 5).map((row) => ({ row, col: 7 })),
  yellow: range(13, 9).map((col) => ({ row: 7, col })),
  blue: range(13, 9).map((row) => ({ row, col: 7 })),
}

export const CENTER: Cell = { row: 7, col: 7 }

/** Base (yard) 6x6 area origin and the 4 token slots inside it. */
export const BASE_ORIGIN: Record<Color, Cell> = {
  red: { row: 0, col: 0 },
  green: { row: 0, col: 9 },
  yellow: { row: 9, col: 9 },
  blue: { row: 9, col: 0 },
}

export function baseSlot(color: Color, token: number): Cell {
  const o = BASE_ORIGIN[color]
  const offsets = [
    { row: 1.5, col: 1.5 },
    { row: 1.5, col: 3.5 },
    { row: 3.5, col: 1.5 },
    { row: 3.5, col: 3.5 },
  ]
  return { row: o.row + offsets[token].row, col: o.col + offsets[token].col }
}

/** Safe squares: every colour's start square and the star square 8 ahead. */
export const SAFE_TRACK_INDICES = new Set<number>(
  Object.values(START_OFFSET).flatMap((s) => [s, (s + 8) % TRACK_LEN]),
)

export function trackIndex(color: Color, pos: TokenPos): number | null {
  if (pos < 0 || pos >= HOME_ENTRY) return null
  return (START_OFFSET[color] + pos) % TRACK_LEN
}

export function isSafe(color: Color, pos: TokenPos): boolean {
  const t = trackIndex(color, pos)
  return t === null || SAFE_TRACK_INDICES.has(t)
}

export function cellFor(color: Color, token: number, pos: TokenPos): Cell {
  if (pos < 0) return baseSlot(color, token)
  if (pos >= FINISH) return CENTER
  if (pos >= HOME_ENTRY) return HOME_COLUMN[color][pos - HOME_ENTRY]
  return TRACK[trackIndex(color, pos)!]
}
