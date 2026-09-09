import { useEffect, useRef, useState } from 'react'
import { chooseMove } from '../game/bot'
import { movableTokens } from '../game/engine'
import { COLORS, type Color, type GameAction, type GameState } from '../game/types'
import { useSound } from '../hooks/useSound'
import { useStepAnimation } from '../hooks/useStepAnimation'
import { Board } from './Board'
import { COLOR_HEX } from './colors'
import { Dice } from './Dice'

interface Props {
  state: GameState
  dispatch: (a: GameAction) => void
  /** colour controlled from this device; undefined = hot-seat, everyone */
  viewer?: Color | null
  /** seats played by the computer (local mode) */
  bots?: Color[]
  onExit: () => void
  onRestart: () => void
  statusExtra?: React.ReactNode
}

export function GameScreen({ state, dispatch, viewer, bots = [], onExit, onRestart, statusExtra }: Props) {
  const { play, muted, toggleMuted } = useSound()
  const [rolling, setRolling] = useState(false)
  const prev = useRef<GameState>(state)
  const { override, animating, step } = useStepAnimation(state)

  const isBot = bots.includes(state.current)
  const myTurn = !isBot && !animating && (viewer === undefined || viewer === state.current)
  const movable = myTurn ? movableTokens(state) : []

  useEffect(() => {
    if (!isBot || animating || state.phase === 'over') return
    let cancelled = false
    const id = setTimeout(() => {
      if (cancelled) return
      if (state.phase === 'roll') {
        play('roll')
        setRolling(true)
        setTimeout(() => {
          if (cancelled) return
          setRolling(false)
          dispatch({ type: 'ROLL' })
        }, 450)
      } else if (state.phase === 'move' && state.dice !== null) {
        const token = chooseMove(state, state.dice)
        if (token !== null) dispatch({ type: 'MOVE', token })
      }
    }, 600)
    return () => {
      cancelled = true
      clearTimeout(id)
    }
  }, [isBot, animating, state, dispatch, play])

  useEffect(() => {
    if (step > 0) play('move')
  }, [step, play])

  useEffect(() => {
    if (animating) return
    const p = prev.current
    prev.current = state
    if (p === state) return
    const lm = state.lastMove
    if (lm && lm !== p.lastMove) {
      if (state.winners.length > p.winners.length) play(state.phase === 'over' ? 'win' : 'home')
      else if (lm.captures.length) play('capture')
      else if (lm.finishes) play('home')
      else play('move')
    } else if (state.current !== p.current) {
      play('turn')
    }
  }, [state, animating, play])

  const roll = () => {
    if (!myTurn || state.phase !== 'roll' || rolling) return
    play('roll')
    setRolling(true)
    setTimeout(() => {
      setRolling(false)
      dispatch({ type: 'ROLL' })
    }, 450)
  }

  const cur = state.players[state.current]
  let status: string
  if (state.phase === 'over') status = `${state.players[state.winners[0]].name} wins!`
  else if (isBot) status = `${cur.name} (computer) is thinking…`
  else if (state.phase === 'roll') status = myTurn ? `${cur.name}: roll the dice` : `Waiting for ${cur.name} to roll`
  else status = myTurn ? `${cur.name}: choose a token` : `Waiting for ${cur.name} to move`

  return (
    <div className="game">
      <header className="topbar">
        <button className="btn btn-ghost" onClick={onExit}>
          ← Menu
        </button>
        <h1>Ludo</h1>
        <button className="btn btn-ghost" onClick={toggleMuted} aria-label={muted ? 'Unmute' : 'Mute'}>
          {muted ? 'Sound: off' : 'Sound: on'}
        </button>
      </header>

      <div className="layout">
        <Board state={state} movable={movable} onTokenClick={(t) => dispatch({ type: 'MOVE', token: t })} viewer={viewer} override={override} />

        <aside className="panel">
          <div className="status" style={{ borderColor: COLOR_HEX[state.current] }}>
            <span className="swatch" style={{ background: COLOR_HEX[state.current] }} />
            <span>{status}</span>
          </div>
          {statusExtra}

          <Dice value={state.dice} rolling={rolling} color={state.current} disabled={!myTurn || state.phase !== 'roll'} onRoll={roll} />

          <ul className="scores">
            {COLORS.filter((c) => state.players[c].active).map((c) => {
              const home = state.tokens[c].filter((p) => p >= 56).length
              const rank = state.winners.indexOf(c)
              return (
                <li key={c} className={c === state.current ? 'is-turn' : ''}>
                  <span className="swatch" style={{ background: COLOR_HEX[c] }} />
                  <span className="name">{state.players[c].name}</span>
                  <span className="home">{rank >= 0 ? `#${rank + 1}` : `${home}/4 home`}</span>
                </li>
              )
            })}
          </ul>

          {state.phase === 'over' && (
            <div className="gameover">
              <h2>🏆 {state.players[state.winners[0]].name} wins!</h2>
              <ol>
                {state.winners.map((c) => (
                  <li key={c}>{state.players[c].name}</li>
                ))}
              </ol>
              <button className="btn btn-primary" onClick={onRestart}>
                Play again
              </button>
            </div>
          )}

          <ul className="log">
            {state.log.slice(-6).reverse().map((l, i) => (
              <li key={state.log.length - i}>{l}</li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  )
}
