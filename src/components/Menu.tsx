import { useState } from 'react'
import { COLORS, type Color } from '../game/types'
import { COLOR_HEX } from './colors'

export interface LocalSetup {
  players: Partial<Record<Color, string>>
}

interface Props {
  onLocal: (setup: LocalSetup) => void
  onCreateRoom: (name: string) => void
  onJoinRoom: (code: string, name: string) => void
  error?: string | null
  initialCode?: string
}

const DEFAULT: Record<Color, string> = { red: 'Red', green: 'Green', yellow: 'Yellow', blue: 'Blue' }

export function Menu({ onLocal, onCreateRoom, onJoinRoom, error, initialCode = '' }: Props) {
  const [tab, setTab] = useState<'local' | 'online'>(initialCode ? 'online' : 'local')
  const [enabled, setEnabled] = useState<Record<Color, boolean>>({ red: true, green: false, yellow: true, blue: false })
  const [names, setNames] = useState<Record<Color, string>>(DEFAULT)
  const [nick, setNick] = useState(() => localStorage.getItem('ludo-nick') ?? '')
  const [code, setCode] = useState(initialCode)

  const count = COLORS.filter((c) => enabled[c]).length

  const startLocal = () => {
    const players: Partial<Record<Color, string>> = {}
    for (const c of COLORS) if (enabled[c]) players[c] = names[c].trim() || DEFAULT[c]
    onLocal({ players })
  }

  const saveNick = () => localStorage.setItem('ludo-nick', nick)

  return (
    <div className="menu">
      <h1 className="title">
        <span style={{ color: COLOR_HEX.red }}>L</span>
        <span style={{ color: COLOR_HEX.green }}>u</span>
        <span style={{ color: COLOR_HEX.yellow }}>d</span>
        <span style={{ color: COLOR_HEX.blue }}>o</span>
      </h1>

      <div className="tabs">
        <button className={`tab ${tab === 'local' ? 'active' : ''}`} onClick={() => setTab('local')}>
          Local
        </button>
        <button className={`tab ${tab === 'online' ? 'active' : ''}`} onClick={() => setTab('online')}>
          Online
        </button>
      </div>

      {tab === 'local' && (
        <div className="card">
          <p className="hint">Pass-and-play on one device. Pick 2–4 players.</p>
          {COLORS.map((c) => (
            <label key={c} className="player-row">
              <input type="checkbox" checked={enabled[c]} onChange={(e) => setEnabled({ ...enabled, [c]: e.target.checked })} />
              <span className="swatch" style={{ background: COLOR_HEX[c] }} />
              <input
                className="input"
                value={names[c]}
                disabled={!enabled[c]}
                maxLength={12}
                onChange={(e) => setNames({ ...names, [c]: e.target.value })}
              />
            </label>
          ))}
          <button className="btn btn-primary" disabled={count < 2} onClick={startLocal}>
            Start game
          </button>
        </div>
      )}

      {tab === 'online' && (
        <div className="card">
          <label className="field">
            Your name
            <input className="input" value={nick} maxLength={12} placeholder="Player" onChange={(e) => setNick(e.target.value)} onBlur={saveNick} />
          </label>
          <button className="btn btn-primary" disabled={!nick.trim()} onClick={() => (saveNick(), onCreateRoom(nick.trim()))}>
            Create room
          </button>
          <div className="divider">or</div>
          <label className="field">
            Room code
            <input
              className="input code"
              value={code}
              maxLength={5}
              placeholder="ABCDE"
              onChange={(e) => setCode(e.target.value.toUpperCase())}
            />
          </label>
          <button className="btn" disabled={!nick.trim() || code.length < 4} onClick={() => (saveNick(), onJoinRoom(code, nick.trim()))}>
            Join room
          </button>
          {error && <p className="error">{error}</p>}
        </div>
      )}
    </div>
  )
}
