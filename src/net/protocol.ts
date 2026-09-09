import type { Color, GameAction, GameState } from '../game/types'

export interface Seat {
  playerId: string
  color: Color
  name: string
  connected: boolean
}

export interface RoomView {
  code: string
  hostId: string
  seats: Seat[]
  state: GameState | null
}

export type ClientMessage =
  | { type: 'create'; name: string }
  | { type: 'join'; code: string; name: string }
  | { type: 'rejoin'; code: string; playerId: string }
  | { type: 'start' }
  | { type: 'restart' }
  | { type: 'action'; action: GameAction }
  | { type: 'leave' }

export type ServerMessage =
  | { type: 'joined'; code: string; playerId: string; color: Color }
  | { type: 'room'; room: RoomView }
  | { type: 'left' }
  | { type: 'error'; message: string }
