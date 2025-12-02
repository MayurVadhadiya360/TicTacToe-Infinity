import type { GameState } from "../types/messages";
import "../styles.css";
import { useEffect, useRef } from "react";
import WaitingCard from "./WaitingCard";

function symbolToChar(v: number) {
  if (v === -1) return "";
  return v === 0 ? "X" : "O";
}

// ------------------------------
// CYBER AUDIO ENGINE
// ------------------------------
function useCyberAudio() {
  const clickSound = useRef<HTMLAudioElement | null>(null);
  const turnSound = useRef<HTMLAudioElement | null>(null);
  const startSound = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    clickSound.current = new Audio("/sounds/click.wav");
    turnSound.current = new Audio("/sounds/turn.wav");
    startSound.current = new Audio("/sounds/start.wav");

    // volume tuning
    if (clickSound.current) clickSound.current.volume = 0.4;
    if (turnSound.current) turnSound.current.volume = 0.5;
    if (startSound.current) startSound.current.volume = 0.65;
  }, []);

  return {
    playClick: () => clickSound.current?.play(),
    playTurn: () => turnSound.current?.play(),
    playStart: () => startSound.current?.play(),
  };
}

export default function GameBoard({
  game,
  me,
  onCell,
  onLeave,
}: {
  game: GameState | null;
  me: string;
  onCell: (idx: number) => void;
  onLeave: () => void;
}) {
  const { playClick, playTurn, playStart } = useCyberAudio();

  // PLAY START SOUND WHEN GAME LOADED
  useEffect(() => {
    if (game && Object.keys(game.players).length === 2 && game.turn) {
      playStart();
    }
  }, [game?.id]);

  // PLAY TURN SOUND WHEN TURN CHANGES
  const lastTurn = useRef<string | null>(null);

  useEffect(() => {
    if (game?.turn && lastTurn.current && lastTurn.current !== game.turn) {
      playTurn();
    }
    lastTurn.current = game?.turn ?? null;
  }, [game?.turn]);

  if (!game) return <WaitingCard onCancel={onLeave} />;

  const mySymbol = game.players[me]?.symbol;
  const isMyTurn = game.turn === me;
  const isWinner = game.winner === me;
  const isLoser = game.winner && game.winner !== me;


  return (
    // <div className={`card neon-card ${isWinner ? "win-effect" : ""} ${isLoser ? "lose-effect" : ""}`}>
    <div className={`card neon-card `}>

      {/* TOP HEADER */}
      <div className="cyber-header">

        <div>
          <div className="cyber-title">Game: {game.id}</div>
          <div className="small">
            You: {me}
            {/* {" "} */}
            {/* {mySymbol !== undefined ? `(${mySymbol === 0 ? "X" : "O"})` : ""} */}
          </div>
        </div>

        <div>
          <button className="btn-red" onClick={() => { playClick(); onLeave(); }}>
            Leave
          </button>
        </div>
      </div>

      {/* === CYBER SHOWDOWN PANEL === */}
      <div className="cyber-showdown">
        {/* YOU */}
        <div className={`cyber-card ${isMyTurn && !game.winner ? "cyber-active" : ""}`}>
          <div className="holo-scan"></div>
          <div className="cyber-avatar you">
            <span className="cyber-symbol">
              {mySymbol === 0 ? "X" : "O"}
            </span>
          </div>
          <div className="cyber-name">{me}</div>
          <div className="cyber-role">YOU</div>
        </div>

        {/* VS */}
        <div className="cyber-vs">VS</div>

        {/* OPPONENT */}
        {(() => {
          const opponentId = Object.keys(game.players).find(pid => pid !== me)
          const opponentSymbol = opponentId ? game.players[opponentId].symbol : null

          return (
            <div className={`cyber-card red-active ${!isMyTurn && !game.winner ? "cyber-active" : ""}`}>
              <div className="holo-scan red-scan"></div>
              <div className="cyber-avatar opp">
                <span className="cyber-symbol red-symbol">
                  {opponentSymbol === 0 ? "X" : opponentSymbol === 1 ? "O" : "?"}
                </span>
              </div>
              <div className="cyber-name">{opponentId ?? "Waiting…"}</div>
              <div className="cyber-role">OPPONENT</div>
            </div>
          )
        })()}
      </div>

      {/* Winner Declaration */}
      {isWinner && (
        <div className="win-banner">
          <span className="glow">YOU WIN</span>
        </div>
      )}

      {/* Loser Declaration */}
      {isLoser && (
        <div className="lose-banner">
          <span className="glow-red">YOU LOSE</span>
        </div>
      )}

      {/* 🌐 3D NEON GRID WRAPPER */}
      <div className="grid-wrapper">
        {/* 🎮 NEON ANIMATED BOARD BORDER */}
        <div className="neon-board">

          {/* TIC-TAC-TOE BOARD */}
          <div className="board">
            {game.board.map((c, i) => (
              <div
                key={i}
                className="cell"
                onClick={() => {
                  if (!game.winner && game.turn === me && game.board[i] === -1) {
                    playClick();
                    onCell(i);
                  }
                }}
              >
                {symbolToChar(c)}
              </div>
            ))}
          </div>

        </div>
      </div>

    </div>
  );
}
