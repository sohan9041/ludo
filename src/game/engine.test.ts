import { describe, expect, it } from 'vitest'
import { FINISH, HOME_ENTRY, TRACK, cellFor, isSafe } from './board'
import { createGame, legalMoves, reduce } from './engine'
import type { GameState } from './types'

const two = () => createGame({ red: 'A', yellow: 'B' })

describe('board', () => {
  it('has 52 unique track cells', () => {
    const keys = new Set(TRACK.map((c) => `${c.row},${c.col}`))
    expect(TRACK).toHaveLength(52)
    expect(keys.size).toBe(52)
  })
  it('maps start squares correctly', () => {
    expect(cellFor('red', 0, 0)).toEqual({ row: 6, col: 1 })
    expect(cellFor('green', 0, 0)).toEqual({ row: 1, col: 8 })
    expect(cellFor('yellow', 0, 0)).toEqual({ row: 8, col: 13 })
    expect(cellFor('blue', 0, 0)).toEqual({ row: 13, col: 6 })
    expect(cellFor('red', 0, HOME_ENTRY)).toEqual({ row: 7, col: 1 })
    expect(cellFor('red', 0, FINISH)).toEqual({ row: 7, col: 7 })
  })
  it('marks start and star squares safe', () => {
    expect(isSafe('red', 0)).toBe(true)
    expect(isSafe('red', 8)).toBe(true)
    expect(isSafe('red', 1)).toBe(false)
  })
})

describe('rules', () => {
  it('needs a six to leave base and grants an extra roll', () => {
    let s = two()
    s = reduce(s, { type: 'ROLL', value: 3 })
    expect(s.current).toBe('yellow')
    s = reduce(s, { type: 'ROLL', value: 6 })
    expect(s.tokens.yellow).toContain(0)
    expect(s.current).toBe('yellow')
    expect(s.phase).toBe('roll')
  })

  it('loses the turn on three sixes', () => {
    let s = two()
    s = reduce(s, { type: 'ROLL', value: 6 })
    s = reduce(s, { type: 'ROLL', value: 6 })
    s = reduce(s, { type: 'MOVE', token: 1 })
    s = reduce(s, { type: 'ROLL', value: 6 })
    expect(s.current).toBe('yellow')
  })

  it('captures an opponent on a non-safe square and sends it home', () => {
    const s: GameState = { ...two(), tokens: { ...two().tokens, red: [1, -1, -1, -1], yellow: [27, -1, -1, -1] } }
    // yellow at path 27 → track (26+27)%52 = 1 == red path 1
    const moves = legalMoves(s, 'red', 3)
    expect(moves[0].captures).toEqual([])
    const s2 = reduce({ ...s, tokens: { ...s.tokens, red: [-1, -1, -1, -1], yellow: [26, -1, -1, -1] } }, { type: 'ROLL', value: 6 })
    // yellow at 26 → track 0 == red start (safe) → no capture
    expect(s2.tokens.yellow[0]).toBe(26)
    const s3: GameState = { ...s, tokens: { ...s.tokens, red: [0, -1, -1, -1], yellow: [29, -1, -1, -1] }, current: 'red' }
    const s4 = reduce(s3, { type: 'ROLL', value: 3 })
    expect(s4.tokens.red[0]).toBe(3)
    expect(s4.tokens.yellow[0]).toBe(-1)
    expect(s4.current).toBe('red')
  })

  it('requires an exact roll to finish and wins when all four are home', () => {
    const base = two()
    const s: GameState = { ...base, tokens: { ...base.tokens, red: [FINISH, FINISH, FINISH, 54] } }
    expect(legalMoves(s, 'red', 3)).toHaveLength(0)
    const done = reduce(s, { type: 'ROLL', value: 2 })
    expect(done.winners).toEqual(['red', 'yellow'])
    expect(done.phase).toBe('over')
  })

  it('auto-passes when no legal move', () => {
    const s = reduce(two(), { type: 'ROLL', value: 2 })
    expect(s.current).toBe('yellow')
    expect(s.phase).toBe('roll')
  })
})
