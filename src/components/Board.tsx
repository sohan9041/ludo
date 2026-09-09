import { BASE_ORIGIN, CENTER, GRID, HOME_COLUMN, SAFE_TRACK_INDICES, START_OFFSET, TRACK, cellFor } from '../game/board'
import { COLORS, type Color, type GameState } from '../game/types'
import { COLOR_HEX } from './colors'
import { Token } from './Token'

const CELL = 40
const SIZE = GRID * CELL

interface Props {
  state: GameState
  movable: number[]
  onTokenClick: (token: number) => void
  /** colour whose turn is shown as "you" (online); null shows all */
  viewer?: Color | null
}

function Star({ x, y }: { x: number; y: number }) {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const r = i % 2 === 0 ? 13 : 6
    const a = (Math.PI / 5) * i - Math.PI / 2
    return `${x + r * Math.cos(a)},${y + r * Math.sin(a)}`
  }).join(' ')
  return <polygon points={pts} fill="none" stroke="#555" strokeWidth={1.5} />
}

function Arrow({ x, y, dir }: { x: number; y: number; dir: 'r' | 'l' | 'u' | 'd' }) {
  const rot = { r: 0, d: 90, l: 180, u: 270 }[dir]
  return (
    <path
      d={`M${x - 10} ${y} L${x + 8} ${y} M${x + 2} ${y - 6} L${x + 8} ${y} L${x + 2} ${y + 6}`}
      stroke="#fff"
      strokeWidth={3}
      fill="none"
      strokeLinecap="round"
      transform={`rotate(${rot} ${x} ${y})`}
    />
  )
}

export function Board({ state, movable, onTokenClick, viewer }: Props) {
  const c = (n: number) => n * CELL + CELL / 2
  return (
    <svg className="board" viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label="Ludo board">
      <rect width={SIZE} height={SIZE} fill="#fafafa" />

      {/* bases */}
      {COLORS.map((color) => {
        const o = BASE_ORIGIN[color]
        const p = state.players[color]
        const isTurn = state.current === color && state.phase !== 'over'
        return (
          <g key={color} className={`base ${isTurn ? 'base-active' : ''} ${p.active ? '' : 'base-inactive'}`}>
            <rect x={o.col * CELL} y={o.row * CELL} width={6 * CELL} height={6 * CELL} fill={COLOR_HEX[color]} />
            <rect
              x={o.col * CELL + CELL}
              y={o.row * CELL + CELL}
              width={4 * CELL}
              height={4 * CELL}
              rx={12}
              fill="#fff"
              stroke={isTurn ? '#222' : 'none'}
              strokeWidth={4}
            />
            {[0, 1, 2, 3].map((t) => {
              const s = cellFor(color, t, -1)
              return <circle key={t} cx={c(s.col)} cy={c(s.row)} r={CELL * 0.62} fill={COLOR_HEX[color]} opacity={0.25} />
            })}
            <text
              x={o.col * CELL + 3 * CELL}
              y={o.row * CELL + (o.row === 0 ? 6 * CELL - 8 : 22)}
              textAnchor="middle"
              className="base-label"
            >
              {p.active ? p.name : ''}
              {viewer === color ? ' (you)' : ''}
            </text>
          </g>
        )
      })}

      {/* track */}
      {TRACK.map((cell, i) => {
        const startColor = COLORS.find((col) => START_OFFSET[col] === i)
        const fill = startColor ? COLOR_HEX[startColor] : '#fff'
        return (
          <g key={i}>
            <rect x={cell.col * CELL} y={cell.row * CELL} width={CELL} height={CELL} fill={fill} stroke="#bbb" />
            {SAFE_TRACK_INDICES.has(i) && !startColor && <Star x={c(cell.col)} y={c(cell.row)} />}
            {startColor && (
              <Arrow
                x={c(cell.col)}
                y={c(cell.row)}
                dir={startColor === 'red' ? 'r' : startColor === 'green' ? 'd' : startColor === 'yellow' ? 'l' : 'u'}
              />
            )}
          </g>
        )
      })}

      {/* home columns */}
      {COLORS.map((color) =>
        HOME_COLUMN[color].map((cell, i) => (
          <rect
            key={`${color}${i}`}
            x={cell.col * CELL}
            y={cell.row * CELL}
            width={CELL}
            height={CELL}
            fill={COLOR_HEX[color]}
            stroke="#bbb"
          />
        )),
      )}

      {/* centre */}
      {(() => {
        const x0 = 6 * CELL, y0 = 6 * CELL, x1 = 9 * CELL, y1 = 9 * CELL
        const cx = c(CENTER.col), cy = c(CENTER.row)
        return (
          <g>
            <polygon points={`${x0},${y0} ${x0},${y1} ${cx},${cy}`} fill={COLOR_HEX.red} />
            <polygon points={`${x0},${y0} ${x1},${y0} ${cx},${cy}`} fill={COLOR_HEX.green} />
            <polygon points={`${x1},${y0} ${x1},${y1} ${cx},${cy}`} fill={COLOR_HEX.yellow} />
            <polygon points={`${x0},${y1} ${x1},${y1} ${cx},${cy}`} fill={COLOR_HEX.blue} />
            <rect x={x0} y={y0} width={3 * CELL} height={3 * CELL} fill="none" stroke="#999" />
          </g>
        )
      })()}

      {/* tokens */}
      {COLORS.filter((col) => state.players[col].active).map((color) =>
        state.tokens[color].map((pos, t) => {
          const cell = cellFor(color, t, pos)
          // spread stacked tokens slightly
          const stack = state.tokens[color].filter((p, i) => p === pos && i < t && pos >= 0).length
          const others = COLORS.filter((oc) => oc !== color && state.players[oc].active).flatMap((oc) =>
            state.tokens[oc].filter((p) => {
              const oc2 = cellFor(oc, 0, p)
              return p >= 0 && oc2.row === cell.row && oc2.col === cell.col
            }),
          ).length
          const offset = (stack + others) * 6
          const isMovable = state.current === color && movable.includes(t)
          const justMoved = state.lastMove?.color === color && state.lastMove.token === t
          return (
            <Token
              key={`${color}${t}`}
              color={color}
              x={c(cell.col) + offset - (offset ? 6 : 0)}
              y={c(cell.row) - offset + (offset ? 6 : 0)}
              r={CELL * 0.38}
              movable={isMovable}
              highlight={justMoved}
              finished={pos >= 56}
              onClick={() => isMovable && onTokenClick(t)}
            />
          )
        }),
      )}
    </svg>
  )
}
