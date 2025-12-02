import './App.css'

import { useCallback, useEffect, useState } from 'react'
import Lobby from './components/Lobby'
import GameBoard from './components/GameBoard'
import { useGameSocket } from './hooks/useGameSocket'
import type { ServerMessage } from './types/messages'

const SERVER:string = import.meta.env.VITE_API_URL || window.location.origin; // change this if backend is at other address

function App() {
  const [mode, setMode] = useState<'lobby'|'game'>('lobby')
  const [gameId, setGameId] = useState<string>('')
  const [playerId, setPlayerId] = useState<string>(localStorage.getItem('playerId') ?? '')
  
  // handle messages that require special action (match_found)
  const handleMatchFound = useCallback((m: ServerMessage) => {
    if (m.type === 'match_found') {
      // server says: reconnect to this new game id
      setTimeout(() => {
        setGameId(m.game_id)
      }, 50)
    } else if (m.type === 'info' || m.type === 'error') {
      console.log(m)
    }
  }, [])
  const { connect, send, disconnect, connected, game, setGame } = useGameSocket(SERVER, handleMatchFound)


  // effect: whenever gameId+playerId become available, connect WS
  useEffect(() => {
    if (!gameId || !playerId) return
    // special handling: if gameId === 'random' we connect to random endpoint - server will reply with match_found
    const toConnect = gameId
    connect(toConnect, playerId)

    return () => {
      disconnect()
      setGame(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId, playerId])

  // watch for server pushes in game state and handle match_found
  useEffect(() => {
    // small watcher just to intercept match_found when it arrives as info; the hook already sets state for joined/state
    // We don't need to add more here — the hook stores the latest game object
  }, [game])

  // start from lobby
  const onStart = async (requestedGameId: string, pid: string, modeType: 'create'|'specific'|'random') => {
    setPlayerId(pid); localStorage.setItem('playerId', pid)

    if (modeType === 'create') {
      // create via REST
      const res = await fetch(`${SERVER}/api/create_game`, { method: 'POST' })
      const j = await res.json()
      setGameId(j.game_id)
      setMode('game')
    } else if (modeType === 'random') {
      setGameId('random')
      setMode('game')
    } else {
      setGameId(requestedGameId)
      setMode('game')
    }
  }

  const onCellClick = (idx:number) => {
    send({ type: 'move', index: idx })
  }

  const leave = () => {
    disconnect()
    setGameId('')
    setMode('lobby')
  }

  return (
    <div className="container">
      <div className="header">
        <div className="title">Tic-Tac-Toe: Infinity</div>
        <div className="small">{connected ? '🟢Connected' : '⚪Disconnected'}</div>
      </div>

      {mode === 'lobby' ? (
        <Lobby onStart={onStart} />
      ) : (
        <div style={{display:'grid', gridTemplateColumns:'1fr', gap:12}}>
          <GameBoard game={game} me={playerId} onCell={onCellClick} onLeave={leave} />
        </div>
      )}
    </div>
  )
}

export default App
