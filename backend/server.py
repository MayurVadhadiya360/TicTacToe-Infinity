import asyncio
import json
import time
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from contextlib import asynccontextmanager
from pathlib import Path

from gamemanager import Game, GameManager


# Optional: import aioredis for redis-backed operations (commented usage in code)
# import aioredis

@asynccontextmanager
async def lifespan(app: FastAPI):
    # on startup here
    print("[SYSTEM] Starting cleanup loop...")
    cleanup_task = asyncio.create_task(cleanup_dead_players())

    yield   # app runs here

    # on shutdown here
    print("[SYSTEM] Stopping cleanup loop...")
    cleanup_task.cancel()
    try:
        await cleanup_task
    except asyncio.CancelledError:
        print("[SYSTEM] Cleanup loop stopped.")


app = FastAPI(lifespan=lifespan)

# -----------------------------------
# Allow CORS from frontend dev server
# -----------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Path to your frontend build
frontend_path = Path(__file__).parent / "frontend"

# Serve assets (CSS, JS, images)
app.mount("/assets", StaticFiles(directory=frontend_path / "assets"), name="assets")
app.mount("/sounds", StaticFiles(directory=frontend_path / "sounds"), name="sounds")

# SPA fallback: return index.html for ALL unmatched routes
@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    return FileResponse(frontend_path / "index.html")

manager = GameManager()

# --------------------------
# PLAYER HEARTBEAT TRACKING
# --------------------------
PLAYER_LAST_SEEN = {}     # player_id -> timestamp
PLAYER_TIMEOUT = 25       # seconds
CLEANUP_INTERVAL = 5      # seconds

async def cleanup_dead_players():
    """Periodic cleanup for players who disappeared without disconnect event."""
    try:
        while True:
            now = time.time()
            to_remove = [
                pid for pid, ts in PLAYER_LAST_SEEN.items()
                if now - ts > PLAYER_TIMEOUT
            ]

            for pid in to_remove:
                print(f"[CLEANUP] Player timed out: {pid}")
                await remove_player_from_random_waiting(pid)
                await remove_player_from_games(pid)
                del PLAYER_LAST_SEEN[pid]

            await asyncio.sleep(CLEANUP_INTERVAL)
    except asyncio.CancelledError:
        print("[CLEANUP] Task cancelled cleanly.")
        raise

# --------------------------
# CLEANUP HELPERS
# --------------------------
async def remove_player_from_random_waiting(player_id: str):
    if manager.random_waiting and manager.random_waiting["player_id"] == player_id:
        print(f"[MATCHMAKING] Removing timed-out player from waiting queue: {player_id}")
        manager.random_waiting = None

async def remove_player_from_games(player_id: str):
    """Remove player from any active game. Optionally: declare opponent winner."""
    for game in list(manager.games.values()):
        if player_id in game.players:
            print(f"[GAME] Player timed out inside game {game.id}: {player_id}")
            async with game.lock:
                game.players[player_id]["ws"] = None

                # Optional: declare opponent winner if game started
                others = [pid for pid in game.players if pid != player_id]
                if others and game.winner is None:
                    game.winner = others[0]

                # Notify remaining player
                for pid, p in game.players.items():
                    ws_conn = p.get("ws")
                    if ws_conn:
                        try:
                            await ws_conn.send_text(json.dumps({
                                "type": "state",
                                "game": game.to_dict()
                            }))
                        except:
                            pass



# Simple REST helpers (create game)
@app.post("/api/create_game")
async def api_create_game():
    g = await manager.create_game()
    print(g.id)
    return JSONResponse({"game_id": g.id})


@app.get("/api/game/{game_id}")
async def api_get_game(game_id: str):
    g = manager.get_game(game_id)
    if not g:
        raise HTTPException(status_code=404, detail="Game not found")
    return g.to_dict()


@app.websocket("/ws/{game_id}/{player_id}")
async def ws_endpoint(websocket: WebSocket, game_id: str, player_id: str):
    await websocket.accept()
    # Mark player as alive
    PLAYER_LAST_SEEN[player_id] = time.time()
    try:
        # Random matchmaking flow
        if game_id == "random":
            # if no one waiting -> set waiting slot
            if manager.random_waiting is None:
                manager.random_waiting = (player_id, websocket)
                # Wait until matched or client disconnects
                while True:
                    await asyncio.sleep(0.5)
                    # other side matched -> we return after sending match_found
                    if manager.random_waiting is None:
                        # match created by other connecting client
                        # the match maker will have notified this ws with match_found; client should reconnect using game id
                        try:
                            await websocket.send_text(json.dumps({"type":"info","message":"matched; reconnect to game"}))
                        except:
                            pass
                        return
                    
            else:
                # pair with waiting
                p1_id, p1_ws = manager.random_waiting
                p2_id, p2_ws = player_id, websocket
                manager.random_waiting = None
                game = await manager.create_game()
                # assign symbols X=0 to p1 and O=1 to p2
                game.players[p1_id] = {"symbol": 0, "moves": [], "ws": p1_ws}
                game.players[p2_id] = {"symbol": 1, "moves": [], "ws": p2_ws}
                game.turn = p1_id
                # notify both endpoints (they should reconnect to /ws/{game_id}/{player_id})
                try:
                    await p1_ws.send_text(json.dumps({"type":"match_found","game_id": game.id}))
                except:
                    pass
                try:
                    await p2_ws.send_text(json.dumps({"type":"match_found","game_id": game.id}))
                except:
                    pass
                # done — both clients should reconnect to new game id
                return
        

        # Join or create a specific game
        game = manager.get_game(game_id)
        if not game:
            # first player creates game automatically
            game = Game(game_id)
            manager.games[game_id] = game


        async with game.lock:
            if player_id in game.players:
                # reconnecting
                game.players[player_id]["ws"] = websocket
            elif len(game.players) < 2:
                symbol = 0 if not game.players else 1
                game.players[player_id] = {"symbol": symbol, "moves": [], "ws": websocket}
                if len(game.players) == 2 and not game.turn:
                    game.turn = next(iter(game.players.keys()))
                if len(game.players) == 2:
                    # broadcast new state to both players
                    for pid, p in game.players.items():
                        ws_conn = p.get("ws")
                        if ws_conn:
                            try:
                                await ws_conn.send_text(json.dumps({"type":"state","game": game.to_dict()}))
                            except Exception:
                                pass
            else:
                await websocket.send_text(json.dumps({"type":"error","message":"Game full"}))
                await websocket.close()
                return
        
        # send joined state
        await websocket.send_text(json.dumps({"type":"joined","game": game.to_dict()}))


        # message loop
        while True:
            raw = await websocket.receive_text()
            data = json.loads(raw)
            typ = data.get("type")

            # --- heartbeat (PING from client)
            if data.get("type") == "ping":
                PLAYER_LAST_SEEN[player_id] = time.time()
                continue


            if typ == "move":
                idx = int(data.get("index"))
                async with game.lock:
                    # validations
                    if game.winner is not None:
                        await websocket.send_text(json.dumps({"type":"error","message":"Game finished"}))
                        continue
                    if game.turn != player_id:
                        await websocket.send_text(json.dumps({"type":"error","message":"Not your turn"}))
                        continue
                    if idx < 0 or idx > 8:
                        await websocket.send_text(json.dumps({"type":"error","message":"Invalid index"}))
                        continue
                    if game.board[idx] != -1:
                        await websocket.send_text(json.dumps({"type":"error","message":"Cell occupied"}))
                        continue

                    symbol = game.players[player_id]["symbol"]
                    game.board[idx] = symbol
                    game.players[player_id]["moves"].append(idx)

                    # enforce sliding-window of 3
                    if len(game.players[player_id]["moves"]) > 3:
                        evict = game.players[player_id]["moves"].pop(0)
                        if game.board[evict] == symbol:
                            game.board[evict] = -1
                    
                    # check winner
                    win_sym = Game.check_winner(game.board)
                    if win_sym is not None:
                        # find winner player id by symbol
                        for pid,p in game.players.items():
                            if p["symbol"] == win_sym:
                                game.winner = pid
                                break
                    
                    # switch turn
                    other = [pid for pid in game.players.keys() if pid != player_id]
                    if other:
                        game.turn = other[0]

                    # broadcast new state to both players
                    for pid, p in game.players.items():
                        ws_conn = p.get("ws")
                        if ws_conn:
                            try:
                                await ws_conn.send_text(json.dumps({"type":"state","game": game.to_dict()}))
                            except Exception:
                                pass
            else:
                # unknown messages: ignore or respond
                await websocket.send_text(json.dumps({"type":"error","message":"Unknown message type"}))
    except WebSocketDisconnect:
        # clear ws reference for reconnect possibility
        g = manager.get_game(game_id)
        if g and player_id in g.players:
            g.players[player_id]["ws"] = None
        
        # 🟢 If player disconnected while waiting in random queue → clear waiting slot
        if game_id == "random" and manager.random_waiting is not None:
            waiting_player_id, waiting_ws = manager.random_waiting
            if waiting_player_id == player_id:   # <-- this player was the one waiting
                manager.random_waiting = None    # <-- clear queue
    except Exception as e:
        try:
            await websocket.send_text(json.dumps({"type":"error","message": str(e)}))
        except:
            pass