import { useState, useCallback } from "react";
import { GameHeader } from "../components/GameHeader";
import { GameOver } from "../components/GameOver";
import { Difficulty, useSubmitScore } from "../hooks/useQueries";
import { sfx } from "../utils/audio";
import { toast } from "sonner";

const ROWS = 6;
const COLS = 7;

type Cell = 0 | 1 | 2; // 0=empty, 1=player, 2=cpu
type Board = Cell[][];

function emptyBoard(): Board {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(0) as Cell[]);
}

function dropPiece(board: Board, col: number, player: 1 | 2): Board | null {
  for (let r = ROWS - 1; r >= 0; r--) {
    if (!board[r][col]) {
      const nb = board.map((row) => [...row] as Cell[]);
      nb[r][col] = player;
      return nb;
    }
  }
  return null;
}

function checkWin(board: Board, player: Cell): boolean {
  // Horizontal
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c <= COLS - 4; c++) {
      if ([0,1,2,3].every((i) => board[r][c+i] === player)) return true;
    }
  }
  // Vertical
  for (let r = 0; r <= ROWS - 4; r++) {
    for (let c = 0; c < COLS; c++) {
      if ([0,1,2,3].every((i) => board[r+i][c] === player)) return true;
    }
  }
  // Diagonal
  for (let r = 0; r <= ROWS - 4; r++) {
    for (let c = 0; c <= COLS - 4; c++) {
      if ([0,1,2,3].every((i) => board[r+i][c+i] === player)) return true;
      if ([0,1,2,3].every((i) => board[r+i][c+3-i] === player)) return true;
    }
  }
  return false;
}

function scoreBoard(board: Board, player: Cell): number {
  let score = 0;
  const opp = player === 1 ? 2 : 1;
  const center = board.map((r) => r[Math.floor(COLS/2)]);
  score += center.filter((c) => c === player).length * 3;
  const evalWindow = (window: Cell[]) => {
    const p = window.filter((c) => c === player).length;
    const e = window.filter((c) => c === 0).length;
    const o = window.filter((c) => c === opp).length;
    if (p === 4) return 100;
    if (p === 3 && e === 1) return 5;
    if (p === 2 && e === 2) return 2;
    if (o === 3 && e === 1) return -4;
    return 0;
  };
  for (let r = 0; r < ROWS; r++) for (let c = 0; c <= COLS-4; c++) score += evalWindow(board[r].slice(c, c+4));
  for (let r = 0; r <= ROWS-4; r++) for (let c = 0; c < COLS; c++) score += evalWindow([0,1,2,3].map((i) => board[r+i][c]));
  for (let r = 0; r <= ROWS-4; r++) for (let c = 0; c <= COLS-4; c++) {
    score += evalWindow([0,1,2,3].map((i) => board[r+i][c+i]));
    score += evalWindow([0,1,2,3].map((i) => board[r+i][c+3-i]));
  }
  return score;
}

function minimax(board: Board, depth: number, alpha: number, beta: number, maximizing: boolean): number {
  if (checkWin(board, 2)) return 100 + depth;
  if (checkWin(board, 1)) return -(100 + depth);
  if (depth === 0 || board[0].every((c) => c !== 0)) return scoreBoard(board, 2);
  const cols = Array.from({length: COLS}, (_,i) => i).filter(c => board[0][c] === 0);
  if (maximizing) {
    let best = -Infinity;
    for (const col of cols) {
      const nb = dropPiece(board, col, 2);
      if (!nb) continue;
      best = Math.max(best, minimax(nb, depth - 1, alpha, beta, false));
      alpha = Math.max(alpha, best);
      if (alpha >= beta) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const col of cols) {
      const nb = dropPiece(board, col, 1);
      if (!nb) continue;
      best = Math.min(best, minimax(nb, depth - 1, alpha, beta, true));
      beta = Math.min(beta, best);
      if (alpha >= beta) break;
    }
    return best;
  }
}

function getCpuMove(board: Board, difficulty: Difficulty): number {
  const cols = Array.from({length: COLS}, (_,i) => i).filter(c => board[0][c] === 0);
  if (difficulty === Difficulty.easy) return cols[Math.floor(Math.random() * cols.length)];
  const depth = difficulty === Difficulty.medium ? 3 : 5;
  let best = -Infinity, bestCol = cols[0];
  for (const col of cols) {
    const nb = dropPiece(board, col, 2);
    if (!nb) continue;
    const score = minimax(nb, depth, -Infinity, Infinity, false);
    if (score > best) { best = score; bestCol = col; }
  }
  return bestCol;
}

const TOTAL_ROUNDS = 5;

interface ConnectFourGameProps { personalBest: number; }

export function ConnectFourGame({ personalBest }: ConnectFourGameProps) {
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.easy);
  const [muted, setMuted] = useState(false);
  const [gameState, setGameState] = useState<"idle" | "playing" | "over">("idle");
  const [board, setBoard] = useState<Board>(emptyBoard());
  const [score, setScore] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [round, setRound] = useState(0);
  const [wins, setWins] = useState(0);
  const [roundResult, setRoundResult] = useState<string | null>(null);
  const [waiting, setWaiting] = useState(false);
  const [hoverCol, setHoverCol] = useState<number | null>(null);

  const { mutateAsync: submitScore, isPending: isSubmitting } = useSubmitScore();

  const newRound = useCallback((roundNum: number) => {
    setBoard(emptyBoard());
    setRound(roundNum);
    setRoundResult(null);
    setWaiting(false);
    setHoverCol(null);
  }, []);

  const startGame = useCallback(() => {
    setWins(0);
    setScore(0);
    setSubmitted(false);
    newRound(0);
    setGameState("playing");
  }, [newRound]);

  const handleDrop = useCallback((col: number) => {
    if (waiting || gameState !== "playing") return;
    const nb = dropPiece(board, col, 1);
    if (!nb) return;
    sfx.eat(muted);
    if (checkWin(nb, 1)) {
      setBoard(nb);
      sfx.eat(muted);
      setRoundResult("YOU WIN!");
      const newWins = wins + 1;
      setWins(newWins);
      setScore(newWins * 100);
      setWaiting(true);
      setTimeout(() => { if (round + 1 >= TOTAL_ROUNDS) setGameState("over"); else newRound(round + 1); }, 1200);
      return;
    }
    if (nb[0].every((c) => c !== 0)) {
      setBoard(nb);
      setRoundResult("DRAW");
      setWaiting(true);
      setTimeout(() => { if (round + 1 >= TOTAL_ROUNDS) setGameState("over"); else newRound(round + 1); }, 1200);
      return;
    }
    setBoard(nb);
    setWaiting(true);
    setTimeout(() => {
      const cpuCol = getCpuMove(nb, difficulty);
      const nb2 = dropPiece(nb, cpuCol, 2);
      if (!nb2) return;
      setBoard(nb2);
      if (checkWin(nb2, 2)) {
        sfx.die(muted);
        setRoundResult("CPU WINS");
        setWaiting(true);
        setTimeout(() => { if (round + 1 >= TOTAL_ROUNDS) setGameState("over"); else newRound(round + 1); }, 1200);
      } else if (nb2[0].every((c) => c !== 0)) {
        setRoundResult("DRAW");
        setWaiting(true);
        setTimeout(() => { if (round + 1 >= TOTAL_ROUNDS) setGameState("over"); else newRound(round + 1); }, 1200);
      } else {
        setWaiting(false);
      }
    }, 500);
  }, [waiting, gameState, board, muted, wins, round, difficulty, newRound]);

  const handleSubmit = async () => {
    try {
      await submitScore({ game: "connectfour", score: BigInt(score), difficulty });
      setSubmitted(true);
      sfx.submit(muted);
      toast.success("Score submitted!");
    } catch { toast.error("Failed to submit score"); }
  };

  return (
    <div className="flex flex-col h-full">
      <GameHeader title="CONNECT FOUR" emoji="🔵" score={score} difficulty={difficulty} onDifficultyChange={setDifficulty} muted={muted} onMuteToggle={() => setMuted((m) => !m)} gameActive={gameState === "playing"} />
      <div className="flex-1 flex flex-col items-center justify-center p-4 gap-3 relative">
        {gameState === "idle" && (
          <div className="text-center">
            <div className="pixel-font text-primary text-sm mb-2 text-glow-cyan animate-pulse-glow">CONNECT FOUR</div>
            <div className="text-muted-foreground text-xs font-display mb-6">Drop discs to connect 4 in a row. 5 rounds vs CPU!</div>
            <button type="button" onClick={startGame} className="btn-neon-cyan border px-6 py-3 pixel-font text-xs rounded">START GAME</button>
          </div>
        )}
        {gameState === "playing" && (
          <div className="text-center">
            <div className="text-xs font-display text-muted-foreground mb-2">Round {round + 1} / {TOTAL_ROUNDS} · Wins: {wins}</div>
            {roundResult && (
              <div className={`pixel-font text-sm mb-2 ${roundResult === "YOU WIN!" ? "text-accent" : "text-muted-foreground"}`}>{roundResult}</div>
            )}
            <div className="p-2 rounded-xl inline-block" style={{ background: "rgba(0,245,255,0.05)", border: "1px solid rgba(0,245,255,0.1)" }}>
              {/* Column buttons */}
              <div className="flex mb-1">
                {Array.from({length: COLS}, (_, c) => {
                  const colKey = `col-btn-${c}`;
                  return (
                    <button key={colKey} type="button" onClick={() => handleDrop(c)} onMouseEnter={() => setHoverCol(c)} onMouseLeave={() => setHoverCol(null)}
                      className="flex items-center justify-center transition-all"
                      style={{ width: 40, height: 20, cursor: waiting ? "default" : "pointer" }}>
                      {hoverCol === c && !waiting ? <span style={{ color: "#00f5ff", fontSize: 12 }}>▼</span> : null}
                    </button>
                  );
                })}
              </div>
              {board.map((row, r) => {
                const rowKey = `board-row-${r}`;
                return (
                  <div key={rowKey} className="flex gap-1 mb-1">
                    {row.map((cell, c) => {
                      const cellKey = `board-cell-${r}-${c}`;
                      return (
                        <div key={cellKey} className="rounded-full transition-all duration-200" style={{
                          width: 36, height: 36,
                          background: cell === 0 ? "rgba(255,255,255,0.04)" : cell === 1 ? "#00f5ff" : "#ff0066",
                          boxShadow: cell === 1 ? "0 0 8px #00f5ff88" : cell === 2 ? "0 0 8px #ff006688" : "none",
                          border: `1px solid ${cell === 0 ? "rgba(255,255,255,0.08)" : "transparent"}`,
                        }} />
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {gameState === "over" && (
          <GameOver score={score} personalBest={Math.max(personalBest, submitted ? score : 0)} onSubmit={handleSubmit} onPlayAgain={startGame} isSubmitting={isSubmitting} submitted={submitted} game="connectfour" difficulty={difficulty} />
        )}
      </div>
    </div>
  );
}
