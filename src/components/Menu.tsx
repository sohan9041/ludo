import { useState } from 'react'
import { COLORS, type Color } from '../game/types'
import { COLOR_HEX } from './colors'

export type SeatKind = 'off' | 'human' | 'bot'

export interface LocalSetup {
  players: Partial<Record<Color, string>>
  bots: Color[]
}

interface Props {
  onLocal: (setup: LocalSetup) => void
  onCreateRoom: (name: string) => void
  onJoinRoom: (code: string, name: string) => void
  error?: string | null
  initialCode?: string
  resume?: () => void
}

const DEFAULT: Record<Color, string> = { red: 'Red', green: 'Green', yellow: 'Yellow', blue: 'Blue' }
const OPPOSITE: Record<Color, Color> = { red: 'yellow', yellow: 'red', green: 'blue', blue: 'green' }

export function Menu({ onLocal, onCreateRoom, onJoinRoom, error, initialCode = '', resume }: Props) {
  const [tab, setTab] = useState<'local' | 'online'>(initialCode ? 'online' : 'local')
  const [kinds, setKinds] = useState<Record<Color, SeatKind>>(() => {
    const saved = localStorage.getItem('ludo-local-kinds')
    return saved ? JSON.parse(saved) : { red: 'human', green: 'human', yellow: 'human', blue: 'human' }
  })
  const [names, setNames] = useState<Record<Color, string>>(DEFAULT)
  const [nick, setNick] = useState(() => localStorage.getItem('ludo-nick') ?? '')
  const [code, setCode] = useState(initialCode)

  const count = COLORS.filter((c) => kinds[c] !== 'off').length
  const humans = COLORS.filter((c) => kinds[c] === 'human').length

  const setKind = (c: Color, k: SeatKind) => {
    const next = { ...kinds, [c]: k }
    // two players always sit on opposite corners
    const active = COLORS.filter((x) => next[x] !== 'off')
    if (active.length === 2) {
      const keep = k !== 'off' ? c : active[0]
      const other = active.find((x) => x !== keep)!
      if (other !== OPPOSITE[keep]) {
        next[OPPOSITE[keep]] = next[other]
        next[other] = 'off'
      }
    }
    setKinds(next)
    localStorage.setItem('ludo-local-kinds', JSON.stringify(next))
  }

  const startLocal = () => {
    const players: Partial<Record<Color, string>> = {}
    const bots: Color[] = []
    for (const c of COLORS) {
      if (kinds[c] === 'off') continue
      players[c] = names[c].trim() || DEFAULT[c]
      if (kinds[c] === 'bot') bots.push(c)
    }
    onLocal({ players, bots })
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
          {resume && (
            <button className="btn" onClick={resume}>
              Resume saved game
            </button>
          )}
          <p className="hint">Play offline on one device — 2–4 players, each seat a person or the computer.</p>
          {count === 2 && <p className="hint">Two players sit on opposite corners.</p>}
          {COLORS.map((c) => (
            <div key={c} className="player-row">
              <span className="swatch" style={{ background: COLOR_HEX[c] }} />
              <input
                className="input"
                value={names[c]}
                disabled={kinds[c] === 'off'}
                maxLength={12}
                aria-label={`${c} player name`}
                onChange={(e) => setNames({ ...names, [c]: e.target.value })}
              />
              <select className="input kind" value={kinds[c]} aria-label={`${c} seat`} onChange={(e) => setKind(c, e.target.value as SeatKind)}>
                <option value="human">Player</option>
                <option value="bot">Computer</option>
                <option value="off">Off</option>
              </select>
            </div>
          ))}
          {count >= 2 && humans === 0 && <p className="hint">At least one seat must be a player.</p>}
          <button className="btn btn-primary" disabled={count < 2 || humans === 0} onClick={startLocal}>
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
