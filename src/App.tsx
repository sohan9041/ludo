import { useEffect, useReducer, useState } from 'react'
import { GameScreen } from './components/GameScreen'
import { ConnBadge, Lobby } from './components/Lobby'
import { Menu, type LocalSetup } from './components/Menu'
import { createGame, reduce } from './game/engine'
import { useRoom } from './net/useRoom'
import type { GameState } from './game/types'

const LOCAL_SAVE = 'ludo-local-game'

interface LocalSave {
  setup: LocalSetup
  state: GameState
}

function loadLocal(): LocalSave | null {
  try {
    const raw = localStorage.getItem(LOCAL_SAVE)
    return raw ? (JSON.parse(raw) as LocalSave) : null
  } catch {
    return null
  }
}

type Mode = { kind: 'menu' } | { kind: 'local'; setup: LocalSetup } | { kind: 'online' }

export default function App() {
  const [chosen, setMode] = useState<Mode>({ kind: 'menu' })
  const net = useRoom()
  // a restored online session takes precedence over the menu
  const mode: Mode = net.room && chosen.kind === 'menu' ? { kind: 'online' } : chosen

  // ?room=CODE deep link → prefill join
  const [prefillCode] = useState(() => new URLSearchParams(location.search).get('room')?.toUpperCase() ?? '')

  const [saved, setSaved] = useState<LocalSave | null>(loadLocal)

  if (mode.kind === 'local') {
    return (
      <LocalGame
        setup={mode.setup}
        initial={saved?.state}
        onExit={() => {
          setSaved(loadLocal())
          setMode({ kind: 'menu' })
        }}
      />
    )
  }

  if (mode.kind === 'online' && net.room && net.me) {
    const { room, me } = net
    if (!room.state) {
      return (
        <Lobby
          room={room}
          myId={me.playerId}
          status={net.status}
          onStart={net.start}
          onLeave={() => {
            net.leave()
            setMode({ kind: 'menu' })
          }}
        />
      )
    }
    const disconnected = room.seats.filter((s) => !s.connected)
    return (
      <GameScreen
        state={room.state}
        dispatch={net.dispatch}
        viewer={me.color}
        onExit={() => {
          net.leave()
          setMode({ kind: 'menu' })
        }}
        onRestart={net.restart}
        statusExtra={
          <>
            <ConnBadge status={net.status} />
            {disconnected.length > 0 && (
              <div className="conn-badge warn">{disconnected.map((s) => s.name).join(', ')} disconnected…</div>
            )}
            <div className="hint">Room {room.code}</div>
          </>
        }
      />
    )
  }

  return (
    <>
      <Menu
        onLocal={(setup) => {
          localStorage.removeItem(LOCAL_SAVE)
          setSaved(null)
          setMode({ kind: 'local', setup })
        }}
        resume={saved && saved.state.phase !== 'over' ? () => setMode({ kind: 'local', setup: saved.setup }) : undefined}
        onCreateRoom={(name) => {
          net.createRoom(name)
          setMode({ kind: 'online' })
        }}
        onJoinRoom={(code, name) => {
          net.joinRoom(code, name)
          setMode({ kind: 'online' })
        }}
        error={net.error}
        initialCode={prefillCode}
      />
      {mode.kind === 'online' && <ConnBadge status={net.status} />}
    </>
  )
}

function LocalGame({ setup, initial, onExit }: { setup: LocalSetup; initial?: GameState; onExit: () => void }) {
  const [state, dispatch] = useReducer(reduce, setup, (s) => initial ?? createGame(s.players))
  useEffect(() => {
    localStorage.setItem(LOCAL_SAVE, JSON.stringify({ setup, state } satisfies LocalSave))
  }, [setup, state])
  return (
    <GameScreen
      state={state}
      dispatch={dispatch}
      bots={setup.bots}
      onExit={onExit}
      onRestart={() => dispatch({ type: 'NEW_GAME', players: setup.players })}
    />
  )
}
