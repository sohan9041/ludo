import type { Color } from '../game/types'
import { COLOR_HEX } from './colors'

interface Props {
  color: Color
  x: number
  y: number
  r: number
  movable: boolean
  highlight: boolean
  finished: boolean
  onClick: () => void
}

export function Token({ color, x, y, r, movable, highlight, finished, onClick }: Props) {
  return (
    <g
      className={`token ${movable ? 'token-movable' : ''} ${highlight ? 'token-moved' : ''} ${finished ? 'token-finished' : ''}`}
      style={{ transform: `translate(${x}px, ${y}px)` }}
      onClick={onClick}
      role={movable ? 'button' : undefined}
      aria-label={`${color} token`}
    >
      {movable && <circle r={r + 6} className="token-ring" />}
      <circle r={r} fill={COLOR_HEX[color]} stroke="#222" strokeWidth={2} />
      <circle r={r * 0.45} fill="#fff" opacity={0.85} />
    </g>
  )
}
