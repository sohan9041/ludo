import type { RoomView } from '../net/protocol'
import type { ConnStatus } from '../net/useRoom'
import { COLOR_HEX } from './colors'

interface Props {
  room: RoomView
  myId: string
  status: ConnStatus
  onStart: () => void
  onLeave: () => void
}

export function Lobby({ room, myId, status, onStart, onLeave }: Props) {
  const isHost = room.hostId === myId
  const share = `${location.origin}${location.pathname}?room=${room.code}`
  return (
    <div className="menu">
      <h1 className="title">Room</h1>
      <div className="card">
        <div className="room-code" onClick={() => navigator.clipboard?.writeText(share)} title="Click to copy invite link">
          {room.code}
        </div>
        <p className="hint">Share this code (or click to copy an invite link). Up to 4 players.</p>
        <ul className="seats">
          {room.seats.map((s) => (
            <li key={s.playerId}>
              <span className="swatch" style={{ background: COLOR_HEX[s.color] }} />
              <span className="name">
                {s.name}
                {s.playerId === myId ? ' (you)' : ''}
                {s.playerId === room.hostId ? ' · host' : ''}
              </span>
              <span className={`dot ${s.connected ? 'on' : 'off'}`} />
            </li>
          ))}
        </ul>
        <ConnBadge status={status} />
        {isHost ? (
          <button className="btn btn-primary" disabled={room.seats.length < 2} onClick={onStart}>
            Start game ({room.seats.length}/4)
          </button>
        ) : (
          <p className="hint">Waiting for the host to start…</p>
        )}
        <button className="btn btn-ghost" onClick={onLeave}>
          Leave
        </button>
      </div>
    </div>
  )
}

export function ConnBadge({ status }: { status: ConnStatus }) {
  if (status === 'connected') return null
  const text = { idle: '', connecting: 'Connecting…', reconnecting: 'Connection lost — reconnecting…', offline: 'Offline' }[status]
  return text ? <div className="conn-badge">{text}</div> : null
}
