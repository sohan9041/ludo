import { createServer } from 'node:http'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { extname, join, normalize } from 'node:path'
import { randomBytes, randomUUID } from 'node:crypto'
import { WebSocketServer, type WebSocket } from 'ws'
import { createGame, reduce } from '../src/game/engine'
import { COLORS, type Color, type GameState } from '../src/game/types'
import type { ClientMessage, RoomView, Seat, ServerMessage } from '../src/net/protocol'

const PORT = Number(process.env.PORT ?? 3001)
const DIST = join(process.cwd(), 'dist')
const LOBBY_DISCONNECT_MS = 60_000
const EMPTY_ROOM_MS = 10 * 60_000

interface Room {
  code: string
  hostId: string
  seats: Seat[]
  state: GameState | null
  sockets: Map<string, WebSocket>
  emptyTimer: NodeJS.Timeout | null
}

const rooms = new Map<string, Room>()
const socketRoom = new Map<WebSocket, { code: string; playerId: string }>()

function genCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  do {
    code = Array.from(randomBytes(5), (b) => alphabet[b % alphabet.length]).join('')
  } while (rooms.has(code))
  return code
}

function send(ws: WebSocket, msg: ServerMessage) {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg))
}

function view(room: Room): RoomView {
  return { code: room.code, hostId: room.hostId, seats: room.seats, state: room.state }
}

function broadcast(room: Room) {
  const msg: ServerMessage = { type: 'room', room: view(room) }
  for (const ws of room.sockets.values()) send(ws, msg)
}

function attach(ws: WebSocket, room: Room, seat: Seat) {
  room.sockets.set(seat.playerId, ws)
  socketRoom.set(ws, { code: room.code, playerId: seat.playerId })
  seat.connected = true
  if (room.emptyTimer) {
    clearTimeout(room.emptyTimer)
    room.emptyTimer = null
  }
  send(ws, { type: 'joined', code: room.code, playerId: seat.playerId, color: seat.color })
  broadcast(room)
}

function removeSeat(room: Room, playerId: string) {
  room.seats = room.seats.filter((s) => s.playerId !== playerId)
  room.sockets.delete(playerId)
  if (room.hostId === playerId && room.seats[0]) room.hostId = room.seats[0].playerId
  if (room.seats.length === 0) rooms.delete(room.code)
  else broadcast(room)
}

function handle(ws: WebSocket, msg: ClientMessage) {
  const ctx = socketRoom.get(ws)
  const room = ctx ? rooms.get(ctx.code) : undefined

  switch (msg.type) {
    case 'create': {
      const code = genCode()
      const seat: Seat = { playerId: randomUUID(), color: 'red', name: msg.name.slice(0, 12), connected: true }
      const r: Room = { code, hostId: seat.playerId, seats: [seat], state: null, sockets: new Map(), emptyTimer: null }
      rooms.set(code, r)
      attach(ws, r, seat)
      return
    }
    case 'join': {
      const r = rooms.get(msg.code.toUpperCase())
      if (!r) return send(ws, { type: 'error', message: 'Room not found' })
      if (r.state) return send(ws, { type: 'error', message: 'Game already started' })
      const color = COLORS.find((c) => !r.seats.some((s) => s.color === c))
      if (!color) return send(ws, { type: 'error', message: 'Room is full' })
      const seat: Seat = { playerId: randomUUID(), color, name: msg.name.slice(0, 12), connected: true }
      r.seats.push(seat)
      attach(ws, r, seat)
      return
    }
    case 'rejoin': {
      const r = rooms.get(msg.code.toUpperCase())
      const seat = r?.seats.find((s) => s.playerId === msg.playerId)
      if (!r || !seat) return send(ws, { type: 'error', message: 'Session expired' })
      const old = r.sockets.get(seat.playerId)
      if (old && old !== ws) {
        socketRoom.delete(old)
        old.close()
      }
      attach(ws, r, seat)
      return
    }
  }

  if (!room || !ctx) return send(ws, { type: 'error', message: 'Not in a room' })
  const me = room.seats.find((s) => s.playerId === ctx.playerId)!

  switch (msg.type) {
    case 'start':
    case 'restart': {
      if (room.hostId !== me.playerId) return send(ws, { type: 'error', message: 'Only the host can start' })
      if (room.seats.length < 2) return send(ws, { type: 'error', message: 'Need at least 2 players' })
      if (msg.type === 'restart' && room.state && room.state.phase !== 'over') return
      const players: Partial<Record<Color, string>> = {}
      for (const s of room.seats) players[s.color] = s.name
      room.state = createGame(players)
      broadcast(room)
      return
    }
    case 'action': {
      if (!room.state) return
      if (msg.action.type === 'NEW_GAME') return
      if (room.state.current !== me.color) return send(ws, { type: 'error', message: 'Not your turn' })
      // dice values always come from the server
      const action = msg.action.type === 'ROLL' ? { type: 'ROLL' as const } : msg.action
      const next = reduce(room.state, action)
      if (next !== room.state) {
        room.state = next
        broadcast(room)
      }
      return
    }
    case 'leave': {
      socketRoom.delete(ws)
      send(ws, { type: 'left' })
      if (room.state && room.state.phase !== 'over') {
        // keep the seat so the game stays valid; mark disconnected
        me.connected = false
        room.sockets.delete(me.playerId)
        broadcast(room)
        scheduleEmptyCheck(room)
      } else {
        removeSeat(room, me.playerId)
      }
      return
    }
  }
}

function scheduleEmptyCheck(room: Room) {
  if (room.seats.some((s) => s.connected)) return
  if (room.emptyTimer) clearTimeout(room.emptyTimer)
  room.emptyTimer = setTimeout(() => rooms.delete(room.code), EMPTY_ROOM_MS)
}

function onClose(ws: WebSocket) {
  const ctx = socketRoom.get(ws)
  socketRoom.delete(ws)
  if (!ctx) return
  const room = rooms.get(ctx.code)
  if (!room) return
  const seat = room.seats.find((s) => s.playerId === ctx.playerId)
  if (!seat || room.sockets.get(seat.playerId) !== ws) return
  seat.connected = false
  room.sockets.delete(seat.playerId)
  broadcast(room)
  if (!room.state) {
    setTimeout(() => {
      const r = rooms.get(ctx.code)
      const s = r?.seats.find((x) => x.playerId === ctx.playerId)
      if (r && s && !s.connected) removeSeat(r, s.playerId)
    }, LOBBY_DISCONNECT_MS)
  }
  scheduleEmptyCheck(room)
}

const MIME: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.json': 'application/json',
}

const http = createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'content-type': 'application/json' })
    return res.end(JSON.stringify({ ok: true, rooms: rooms.size }))
  }
  if (!existsSync(DIST)) {
    res.writeHead(404)
    return res.end('Run `npm run build` first')
  }
  let path = normalize(decodeURIComponent((req.url ?? '/').split('?')[0]))
  let file = join(DIST, path)
  if (!file.startsWith(DIST) || !existsSync(file) || statSync(file).isDirectory()) file = join(DIST, 'index.html')
  res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' })
  res.end(readFileSync(file))
})

const wss = new WebSocketServer({ server: http, path: '/ws' })
wss.on('connection', (ws) => {
  ws.on('message', (data) => {
    let msg: ClientMessage
    try {
      msg = JSON.parse(data.toString())
    } catch {
      return send(ws, { type: 'error', message: 'Bad message' })
    }
    try {
      handle(ws, msg)
    } catch (e) {
      send(ws, { type: 'error', message: (e as Error).message })
    }
  })
  ws.on('close', () => onClose(ws))
})

// heartbeat so dead connections are detected quickly
const alive = new WeakSet<WebSocket>()
wss.on('connection', (ws) => {
  alive.add(ws)
  ws.on('pong', () => alive.add(ws))
})
setInterval(() => {
  for (const ws of wss.clients) {
    if (!alive.has(ws)) return ws.terminate()
    alive.delete(ws)
    ws.ping()
  }
}, 15_000)

http.listen(PORT, () => console.log(`Ludo server on http://localhost:${PORT}`))
