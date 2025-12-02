import asyncio
import uuid
import time

from fastapi import WebSocket


class Game:
    WIN_LINES = [
        (0,1,2),(3,4,5),(6,7,8),
        (0,3,6),(1,4,7),(2,5,8),
        (0,4,8),(2,4,6),
    ]

    def check_winner(board):
        for a,b,c in Game.WIN_LINES:
            if board[a] != -1 and board[a] == board[b] == board[c]:
                return board[a]
        return None
    
    def __init__(self, game_id: str):
        self.id = game_id
        self.board = [-1]*9
        # players: player_id -> {symbol: 0|1, moves: [int], ws: WebSocket|None}
        self.players: dict[str, dict] = {}
        self.turn: str | None = None
        self.winner: str | None = None
        self.lock = asyncio.Lock()
        self.created_at = time.time()


    def to_dict(self):
        return {
            "id": self.id,
            "board": self.board,
            "players": {pid: {"symbol": p["symbol"], "moves": p["moves"]} for pid,p in self.players.items()},
            "turn": self.turn,
            "winner": self.winner,
        }
    
class GameManager:
    def __init__(self):
        self.games: dict[str, Game] = {}
        self.random_waiting: tuple[str, WebSocket] | None = None # (player_id, ws)


    async def create_game(self) -> Game:
        gid = str(uuid.uuid4())[:8]
        g = Game(gid)
        self.games[gid] = g
        return g


    def get_game(self, gid: str) -> Game | None:
        return self.games.get(gid)


    async def remove_game(self, gid: str):
        if gid in self.games:
            del self.games[gid]