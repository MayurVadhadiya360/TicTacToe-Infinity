import { useRef, useState } from 'react'
import type { GameState, ServerMessage, ClientMessage } from '../types/messages'
import { WSManager } from '../utils/wsManager'

const DEFAULT_SERVER = import.meta.env.VITE_API_URL || window.location.origin; // change if your backend sits elsewhere

function toWSUrl(httpUrl: string): string {
  const url = new URL(httpUrl);

  if (url.protocol.startsWith("ws")) {
    return url.toString().replace(/\/$/, "");
  }

  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return url.toString().replace(/\/$/, "");
}

export function useGameSocket(server = DEFAULT_SERVER, handleMatchFound: (m: ServerMessage) => void) {
  const mgrRef = useRef<WSManager | null>(null)
  const [connected, setConnected] = useState(false)
  const [game, setGame] = useState<GameState | null>(null)
  const [status, setStatus] = useState<string>('idle')

  // open connection for a particular game & player
  const connect = (gameId: string, playerId: string) => {
    // close previous
    mgrRef.current?.close()
    setStatus('connecting')
    const url = `${toWSUrl(server)}/ws/${encodeURIComponent(gameId)}/${encodeURIComponent(playerId)}`
    const onMsg = (m: ServerMessage) => {
      if (m.type === 'joined' || m.type === 'state') {
        setGame(m.game)
      } else if (m.type === 'match_found') {
        // match_found tells client to reconnect to new gameId - caller should handle
        handleMatchFound(m);
      } else {
        // info / error - could show to user
        console.debug('ws info/error', m)
      }
    }
    const onOpen = () => { setConnected(true); setStatus('connected') }
    const onClose = () => { setConnected(false); setStatus('closed') }
    mgrRef.current = new WSManager(url, onMsg, onOpen, onClose)
  }

  const send = (msg: ClientMessage) => {
    const ok = mgrRef.current?.send(msg)
    if (!ok) console.warn('WS not open:', msg)
  }

  const disconnect = () => {
    mgrRef.current?.close()
    mgrRef.current = null
    setConnected(false)
    setStatus('idle')
  }

  return { connect, send, disconnect, connected, game, status, setGame }
}
