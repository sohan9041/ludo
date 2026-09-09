import { FINISH, HOME_ENTRY, isSafe, trackIndex } from './board'
import { COLORS, type Color, type GameAction, type GameState, type Move, type Player } from './types'

const NAMES: Record<Color, string> = { red: 'Red', green: 'Green', yellow: 'Yellow', blue: 'Blue' }

export function createGame(players: Partial<Record<Color, string>>): GameState {
  const active = COLORS.filter((c) => players[c] !== undefined)
  if (active.length < 2) throw new Error('Need at least 2 players')
  const ps = {} as Record<Color, Player>
  const tokens = {} as Record<Color, number[]>
  for (const c of COLORS) {
    ps[c] = { color: c, name: players[c] ?? NAMES[c], active: players[c] !== undefined }
    tokens[c] = [-1, -1, -1, -1]
  }
  return {
    players: ps,
    turnOrder: active,
    tokens,
    current: active[0],
    phase: 'roll',
    dice: null,
    sixStreak: 0,
    winners: [],
    lastMove: null,
    turn: 1,
    log: [`${ps[active[0]].name} rolls first`],
  }
}

export function rollDie(): number {
  return 1 + Math.floor(Math.random() * 6)
}

export function legalMoves(state: GameState, color: Color, dice: number): Move[] {
  const moves: Move[] = []
  const mine = state.tokens[color]
  const firstInBase = mine.indexOf(-1)
  for (let t = 0; t < 4; t++) {
    const from = mine[t]
    if (from >= FINISH) continue
    let to: number
    if (from < 0) {
      // all base tokens are interchangeable; only offer the first one
      if (dice !== 6 || t !== firstInBase) continue
      to = 0
    } else {
      to = from + dice
      if (to > FINISH) continue
    }
    const captures: Move['captures'] = []
    if (to < HOME_ENTRY) {
      const target = trackIndex(color, to)!
      for (const oc of COLORS) {
        if (oc === color || !state.players[oc].active) continue
        state.tokens[oc].forEach((p, i) => {
          if (trackIndex(oc, p) === target && !isSafe(oc, p)) captures.push({ color: oc, token: i })
        })
      }
      // Two opposing tokens on one square form a blockade that cannot be passed or captured.
      const blockers = COLORS.filter((oc) => oc !== color && state.players[oc].active)
      let blocked = false
      for (let step = from + 1; step <= to && step < HOME_ENTRY; step++) {
        const ti = trackIndex(color, step)!
        for (const oc of blockers) {
          const n = state.tokens[oc].filter((p) => trackIndex(oc, p) === ti).length
          if (n >= 2) blocked = true
        }
      }
      if (blocked) continue
    }
    moves.push({ color, token: t, from, to, captures, finishes: to === FINISH })
  }
  return moves
}

function nextPlayer(state: GameState, from: Color): Color {
  const order = state.turnOrder.filter((c) => !state.winners.includes(c))
  const i = order.indexOf(from)
  return order[(i + 1) % order.length]
}

function endTurn(state: GameState, extra: boolean): GameState {
  if (state.winners.length >= state.turnOrder.length - 1) {
    const last = state.turnOrder.find((c) => !state.winners.includes(c))
    const winners = last ? [...state.winners, last] : state.winners
    return { ...state, winners, phase: 'over', log: [...state.log, 'Game over'] }
  }
  if (extra) return { ...state, phase: 'roll' }
  const next = nextPlayer(state, state.current)
  return { ...state, current: next, phase: 'roll', sixStreak: 0, turn: state.turn + 1 }
}

export function reduce(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'NEW_GAME':
      return createGame(action.players)

    case 'ROLL': {
      if (state.phase !== 'roll') return state
      const value = action.value ?? rollDie()
      const name = state.players[state.current].name
      const log = [...state.log, `${name} rolled ${value}`]
      const sixStreak = value === 6 ? state.sixStreak + 1 : 0
      const rolled = { ...state, dice: value, sixStreak, log, lastMove: null }
      if (sixStreak === 3) {
        return endTurn({ ...rolled, log: [...log, `${name} rolled three sixes – turn lost`] }, false)
      }
      const moves = legalMoves(rolled, state.current, value)
      if (moves.length === 0) {
        return endTurn({ ...rolled, log: [...log, `${name} has no moves`] }, false)
      }
      if (moves.length === 1) {
        return applyMove({ ...rolled, phase: 'move' }, moves[0])
      }
      return { ...rolled, phase: 'move' }
    }

    case 'MOVE': {
      if (state.phase !== 'move' || state.dice === null) return state
      const move = legalMoves(state, state.current, state.dice).find((m) => m.token === action.token)
      if (!move) return state
      return applyMove(state, move)
    }
  }
}

function applyMove(state: GameState, move: Move): GameState {
  const tokens = { ...state.tokens, [move.color]: [...state.tokens[move.color]] }
  tokens[move.color][move.token] = move.to
  const name = state.players[move.color].name
  const log = [...state.log]
  for (const cap of move.captures) {
    tokens[cap.color] = [...tokens[cap.color]]
    tokens[cap.color][cap.token] = -1
    log.push(`${name} captured ${state.players[cap.color].name}`)
  }
  let winners = state.winners
  if (move.finishes) {
    log.push(`${name} brought a token home`)
    if (tokens[move.color].every((p) => p >= FINISH)) {
      winners = [...winners, move.color]
      log.push(`${name} finished #${winners.length}!`)
    }
  }
  const next: GameState = { ...state, tokens, winners, log, lastMove: move }
  const bonus = state.dice === 6 || move.captures.length > 0 || move.finishes
  const stillPlaying = !winners.includes(move.color)
  return endTurn(next, bonus && stillPlaying)
}

export function movableTokens(state: GameState): number[] {
  if (state.phase !== 'move' || state.dice === null) return []
  return legalMoves(state, state.current, state.dice).map((m) => m.token)
}
