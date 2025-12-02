import { useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import './../styles.css'
import Divider from './Divider'

export default function Lobby({
  onStart,
}: {
  onStart: (gameId: string, playerId: string, mode: 'create' | 'specific' | 'random') => void
}) {
  const [joinId, setJoinId] = useState('')

  const ensurePlayer = () => {
    let pid = localStorage.getItem('playerId')
    if (!pid) {
      pid = 'guest_' + uuidv4().slice(0, 8)
      localStorage.setItem('playerId', pid)
    }
    return pid
  }


  const createGame = async () => {
    const pid = ensurePlayer()
    onStart('game_id', pid, 'create')
  }

  const joinSpecific = () => {
    const pid = ensurePlayer()
    if (!joinId.trim()) { alert('Paste a Game ID to join'); return }
    onStart(joinId.trim(), pid, 'specific')
  }

  const randomMatch = () => {
    const pid = ensurePlayer()
    onStart('random', pid, 'random')
  }

  return (
    <div className="card">
      <div className="header" style={{ justifyContent: 'center' }}>
        <div>
          <div className="title">Play Tic-Tac-Toe</div>
          <div className="small">Create a game, join by ID, or get a random opponent</div>
        </div>
      </div>

      <div style={{ marginTop: 12 }} className="flex">
        <button className="btn" style={{ flex: 1 }} onClick={createGame}>Create Game</button>
        <button className="btn" style={{ flex: 1 }} onClick={randomMatch}>Random Match</button>
        {/* <button className="btn" style={{ flex: 1 }} onClick={randomMatch}>Against System</button> */}
      </div>

      <div style={{ marginTop: 12, width: '100%' }}>
        <Divider random={true} />
      </div>

      <div style={{ marginTop: 12 }} className="input-container">
        <input id="join_gid" name="join_gid" className="input" placeholder="Game ID to join" value={joinId} onChange={e => setJoinId(e.target.value)} />
        <button className="btn" style={{ width: 'fit-content' }} onClick={joinSpecific}>Join</button>
      </div>
    </div>
  )
}
