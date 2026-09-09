import { useCallback, useEffect, useRef, useState } from 'react'
import type { Color, GameAction } from '../game/types'
import type { ClientMessage, RoomView, ServerMessage } from './protocol'

export type ConnStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'offline'

const SESSION_KEY = 'ludo-session'

interface Session {
  code: string
  playerId: string
}

function wsUrl(): string {
  const env = import.meta.env.VITE_WS_URL as string | undefined
  if (env) return env
  const proto = location.protocol === 'https:' ? 'wss' : 'ws'
  return `${proto}://${location.host}/ws`
}

export function useRoom() {
  const [status, setStatus] = useState<ConnStatus>('idle')
  const [room, setRoom] = useState<RoomView | null>(null)
  const [me, setMe] = useState<{ playerId: string; color: Color } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const ws = useRef<WebSocket | null>(null)
  const pending = useRef<ClientMessage | null>(null)
  const retry = useRef(0)
  const wanted = useRef(false)
  const connectRef = useRef<() => void>(() => {})

  const send = useCallback((msg: ClientMessage) => {
    const s = ws.current
    if (s && s.readyState === WebSocket.OPEN) s.send(JSON.stringify(msg))
    else pending.current = msg
  }, [])

  const connect = useCallback(() => {
    if (ws.current && ws.current.readyState <= WebSocket.OPEN) return
    wanted.current = true
    setStatus((s) => (s === 'idle' ? 'connecting' : 'reconnecting'))
    const s = new WebSocket(wsUrl())
    ws.current = s
    s.onopen = () => {
      retry.current = 0
      setStatus('connected')
      setError(null)
      const saved = localStorage.getItem(SESSION_KEY)
      if (pending.current) {
        s.send(JSON.stringify(pending.current))
        pending.current = null
      } else if (saved) {
        const sess: Session = JSON.parse(saved)
        s.send(JSON.stringify({ type: 'rejoin', ...sess } satisfies ClientMessage))
      }
    }
    s.onmessage = (ev) => {
      const msg: ServerMessage = JSON.parse(ev.data)
      switch (msg.type) {
        case 'joined':
          setMe({ playerId: msg.playerId, color: msg.color })
          localStorage.setItem(SESSION_KEY, JSON.stringify({ code: msg.code, playerId: msg.playerId } satisfies Session))
          break
        case 'room':
          setRoom(msg.room)
          break
        case 'left':
          localStorage.removeItem(SESSION_KEY)
          setRoom(null)
          setMe(null)
          break
        case 'error':
          setError(msg.message)
          if (msg.message === 'Session expired') {
            localStorage.removeItem(SESSION_KEY)
            setRoom(null)
            setMe(null)
          }
          break
      }
    }
    s.onclose = () => {
      ws.current = null
      if (!wanted.current) return setStatus('idle')
      setStatus('reconnecting')
      const delay = Math.min(10_000, 500 * 2 ** retry.current++)
      setTimeout(() => connectRef.current(), delay)
    }
    s.onerror = () => s.close()
  }, [])
  useEffect(() => {
    connectRef.current = connect
  }, [connect])

  // resume a saved session on load
  useEffect(() => {
    if (localStorage.getItem(SESSION_KEY)) connect()
  }, [connect])

  useEffect(() => {
    const onOnline = () => wanted.current && connect()
    const onVisible = () => document.visibilityState === 'visible' && wanted.current && connect()
    window.addEventListener('online', onOnline)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener('online', onOnline)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [connect])

  const createRoom = (name: string) => {
    setError(null)
    send({ type: 'create', name })
    connect()
  }
  const joinRoom = (code: string, name: string) => {
    setError(null)
    send({ type: 'join', code, name })
    connect()
  }
  const start = () => send({ type: 'start' })
  const restart = () => send({ type: 'restart' })
  const dispatch = (action: GameAction) => send({ type: 'action', action })
  const leave = () => {
    send({ type: 'leave' })
    wanted.current = false
    localStorage.removeItem(SESSION_KEY)
    setRoom(null)
    setMe(null)
    setTimeout(() => ws.current?.close(), 100)
  }

  return { status, room, me, error, createRoom, joinRoom, start, restart, dispatch, leave }
}
