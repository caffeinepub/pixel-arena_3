import { useState, useCallback } from "react";
import { GameHeader } from "../components/GameHeader";
import { GameOver } from "../components/GameOver";
import { Difficulty, useSubmitScore } from "../hooks/useQueries";
import { sfx } from "../utils/audio";
import { toast } from "sonner";

type Cell = "X" | "O" | null;

function checkWinner(board: Cell[]): Cell | "draw" {
  const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  for (const [a,b,c] of lines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
  }
  if (board.every(Boolean)) return "draw";
  return null;
}

function minimax(board: Cell[], isMax: boolean, depth: number): number {
  const winner = checkWinner(board);
  if (winner === "O") return 10 - depth;
  if (winner === "X") return depth - 10;
  if (winner === "draw") return 0;
  const scores: number[] = [];
  board.forEach((cell, i) => {
    if (!cell) {
      const b = [...board];
      b[i] = isMax ? "O" : "X";
      scores.push(minimax(b, !isMax, depth + 1));
    }
  });
  return isMax ? Math.max(...scores) : Math.min(...scores);
}

function getBestMove(board: Cell[], difficulty: Difficulty): number {
  const empty = board.map((c, i) => (!c ? i : -1)).filter((i) => i >= 0);
  if (difficulty === Difficulty.easy && Math.random() < 0.5) return empty[Math.floor(Math.random() * empty.length)];
  if (difficulty === Difficulty.medium && Math.random() < 0.25) return empty[Math.floor(Math.random() * empty.length)];
  let best = -Infinity, bestIdx = empty[0];
  for (const i of empty) {
    const b = [...board]; b[i] = "O";
    const score = minimax(b, false, 0);
    if (score > best) { best = score; bestIdx = i; }
  }
  return bestIdx;
}

const TOTAL_ROUNDS = 5;

interface TicTacToeGameProps { personalBest: number; }

export function TicTacToeGame({ personalBest }: TicTacToeGameProps) {
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.easy);
  const [muted, setMuted] = useState(false);
  const [gameState, setGameState] = useState<"idle" | "playing" | "over">("idle");
  const [board, setBoard] = useState<Cell[]>(Array(9).fill(null));
  const [score, setScore] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [round, setRound] = useState(0);
  const [wins, setWins] = useState(0);
  const [roundResult, setRoundResult] = useState<string | null>(null);
  const [waiting, setWaiting] = useState(false);

  const { mutateAsync: submitScore, isPending: isSubmitting } = useSubmitScore();

  const newRound = useCallback((roundNum: number, currentWins: number) => {
    setBoard(Array(9).fill(null));
    setRound(roundNum);
    setRoundResult(null);
    setWaiting(false);
    setGameState("playing");
    void currentWins;
  }, []);

  const startGame = useCallback(() => {
    setWins(0);
    setScore(0);
    setSubmitted(false);
    setRound(0);
    newRound(0, 0);
  }, [newRound]);

  const handleClick = useCallback((idx: number) => {
    if (waiting || board[idx] || gameState !== "playing") return;
    const newBoard = [...board] as Cell[];
    newBoard[idx] = "X";
    sfx.eat(muted);
    const winner = checkWinner(newBoard);
    if (winner) {
      setBoard(newBoard);
      const isWin = winner === "X";
      if (isWin) sfx.eat(muted); else sfx.die(muted);
      const result = winner === "draw" ? "DRAW" : isWin ? "YOU WIN!" : "CPU WINS";
      setRoundResult(result);
      const newWins = isWin ? wins + 1 : wins;
      setWins(newWins);
      setScore(newWins * 100);
      setWaiting(true);
      setTimeout(() => {
        if (round + 1 >= TOTAL_ROUNDS) { setGameState("over"); setScore(newWins * 100); }
        else newRound(round + 1, newWins);
      }, 1200);
      return;
    }
    // CPU move
    setBoard(newBoard);
    setWaiting(true);
    setTimeout(() => {
      const cpuIdx = getBestMove(newBoard, difficulty);
      const afterCpu = [...newBoard] as Cell[];
      afterCpu[cpuIdx] = "O";
      const cpuWinner = checkWinner(afterCpu);
      setBoard(afterCpu);
      if (cpuWinner) {
        sfx.die(muted);
        const result2 = cpuWinner === "draw" ? "DRAW" : "CPU WINS";
        setRoundResult(result2);
        setWaiting(true);
        setTimeout(() => {
          if (round + 1 >= TOTAL_ROUNDS) { setGameState("over"); }
          else newRound(round + 1, wins);
        }, 1200);
      } else {
        setWaiting(false);
      }
    }, 400);
  }, [waiting, board, gameState, muted, wins, round, difficulty, newRound]);

  const handleSubmit = async () => {
    try {
      await submitScore({ game: "tictactoe", score: BigInt(score), difficulty });
      setSubmitted(true);
      sfx.submit(muted);
      toast.success("Score submitted!");
    } catch { toast.error("Failed to submit score"); }
  };

  return (
    <div className="flex flex-col h-full">
      <GameHeader title="TIC TAC TOE" emoji="✕" score={score} difficulty={difficulty} onDifficultyChange={setDifficulty} muted={muted} onMuteToggle={() => setMuted((m) => !m)} gameActive={gameState === "playing"} />
      <div className="flex-1 flex flex-col items-center justify-center p-6 gap-4 relative">
        {gameState === "idle" && (
          <div className="text-center">
            <div className="pixel-font text-primary text-sm mb-2 text-glow-cyan animate-pulse-glow">TIC TAC TOE</div>
            <div className="text-muted-foreground text-xs font-display mb-6">Play 5 rounds vs CPU. Score = wins × 100!</div>
            <button type="button" onClick={startGame} className="btn-neon-cyan border px-6 py-3 pixel-font text-xs rounded">START GAME</button>
          </div>
        )}
        {gameState === "playing" && (
          <div className="text-center">
            <div className="text-xs font-display text-muted-foreground mb-2">Round {round + 1} / {TOTAL_ROUNDS} · Wins: {wins}</div>
            {roundResult && (
              <div className={`pixel-font text-sm mb-3 ${roundResult.includes("WIN!") ? "text-accent" : "text-muted-foreground"}`}>
                {roundResult}
              </div>
            )}
            <div className="grid grid-cols-3 gap-2" style={{ width: 216 }}>
              {board.map((cell, i) => {
                const cellKey = `cell-${i}`;
                return (
                  <button
                    key={cellKey}
                    type="button"
                    onClick={() => handleClick(i)}
                    className="w-16 h-16 rounded-lg border-2 font-bold text-2xl transition-all duration-100 flex items-center justify-center"
                    style={{
                      borderColor: cell === "X" ? "#00f5ff55" : cell === "O" ? "#ff006655" : "#ffffff15",
                      background: cell ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.03)",
                      color: cell === "X" ? "#00f5ff" : "#ff0066",
                      cursor: cell || waiting ? "default" : "pointer",
                    }}
                  >
                    {cell}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {gameState === "over" && (
          <GameOver score={score} personalBest={Math.max(personalBest, submitted ? score : 0)} onSubmit={handleSubmit} onPlayAgain={startGame} isSubmitting={isSubmitting} submitted={submitted} game="tictactoe" difficulty={difficulty} />
        )}
      </div>
    </div>
  );
}
