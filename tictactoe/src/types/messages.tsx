export type PlayerSymbol = -1 | 0 | 1

export interface GameState {
  id: string
  board: PlayerSymbol[]
  players: Record<string, { symbol: PlayerSymbol; moves: number[] }>
  turn: string | null
  winner: string | null
}

export type ServerMessage =
  | { type: 'joined'; game: GameState }
  | { type: 'state'; game: GameState }
  | { type: 'match_found'; game_id: string }
  | { type: 'info'; message: string }
  | { type: 'error'; message: string }

export type ClientMessage = { type: 'move'; index: number } | { type: 'join'; game_id: string; player_id: string }
