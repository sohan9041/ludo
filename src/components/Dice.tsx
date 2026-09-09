import { useEffect, useState } from 'react'
import type { Color } from '../game/types'
import { COLOR_HEX } from './colors'

interface Props {
  value: number | null
  rolling: boolean
  color: Color
  disabled: boolean
  onRoll: () => void
}

const PIPS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[25, 25], [75, 75]],
  3: [[25, 25], [50, 50], [75, 75]],
  4: [[25, 25], [75, 25], [25, 75], [75, 75]],
  5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
  6: [[25, 25], [75, 25], [25, 50], [75, 50], [25, 75], [75, 75]],
}

export function Dice({ value, rolling, color, disabled, onRoll }: Props) {
  const [face, setFace] = useState(1)
  useEffect(() => {
    if (!rolling) return
    const id = setInterval(() => setFace((f) => (f % 6) + 1), 70)
    return () => clearInterval(id)
  }, [rolling])
  const shown = rolling ? face : value
  return (
    <button
      className={`dice ${rolling ? 'dice-rolling' : ''}`}
      style={{ borderColor: COLOR_HEX[color] }}
      onClick={onRoll}
      disabled={disabled || rolling}
      aria-label={shown ? `Dice showing ${shown}` : 'Roll dice'}
    >
      <svg viewBox="0 0 100 100">
        <rect x={4} y={4} width={92} height={92} rx={16} fill="#fff" />
        {shown
          ? PIPS[shown].map(([cx, cy], i) => <circle key={i} cx={cx} cy={cy} r={9} fill="#222" />)
          : (
              <text x={50} y={58} textAnchor="middle" fontSize={22} fill="#666">
                ROLL
              </text>
            )}
      </svg>
    </button>
  )
}
