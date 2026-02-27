import { useState, useCallback, useEffect } from "react";
import { GameHeader } from "../components/GameHeader";
import { Difficulty, useSubmitScore } from "../hooks/useQueries";
import { sfx } from "../utils/audio";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Trophy, RotateCcw, Upload } from "lucide-react";

const CONFIG: Record<Difficulty, { rows: number; cols: number; mines: number }> = {
  [Difficulty.easy]: { rows: 9, cols: 9, mines: 10 },
  [Difficulty.medium]: { rows: 12, cols: 12, mines: 20 },
  [Difficulty.hard]: { rows: 16, cols: 16, mines: 40 },
};

type CellState = { mine: boolean; revealed: boolean; flagged: boolean; adjacent: number };

function buildGrid(rows: number, cols: number, mines: number, safeR: number, safeC: number): CellState[][] {
  const grid: CellState[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({ mine: false, revealed: false, flagged: false, adjacent: 0 }))
  );
  let placed = 0;
  while (placed < mines) {
    const r = Math.floor(Math.random() * rows);
    const c = Math.floor(Math.random() * cols);
    if (grid[r][c].mine) continue;
    if (Math.abs(r - safeR) <= 1 && Math.abs(c - safeC) <= 1) continue;
    grid[r][c].mine = true;
    placed++;
  }
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c].mine) continue;
      let count = 0;
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        if (grid[r + dr]?.[c + dc]?.mine) count++;
      }
      grid[r][c].adjacent = count;
    }
  }
  return grid;
}

function floodReveal(grid: CellState[][], r: number, c: number) {
  if (!grid[r]?.[c] || grid[r][c].revealed || grid[r][c].flagged || grid[r][c].mine) return;
  grid[r][c].revealed = true;
  if (grid[r][c].adjacent === 0) {
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) floodReveal(grid, r + dr, c + dc);
  }
}

const ADJ_COLORS = ["", "#00f5ff", "#00ff88", "#ff6b35", "#ff0066", "#bf00ff", "#ffcc00", "#ffffff", "#aaaaaa"];

interface MinesweeperGameProps {
  personalBest: number;
}

export function MinesweeperGame({ personalBest }: MinesweeperGameProps) {
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.easy);
  const [muted, setMuted] = useState(false);
  const [gameState, setGameState] = useState<"idle" | "playing" | "over" | "win">("idle");
  const [grid, setGrid] = useState<CellState[][]>([]);
  const [score, setScore] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [startTime, setStartTime] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [initialized, setInitialized] = useState(false);

  const { mutateAsync: submitScore, isPending: isSubmitting } = useSubmitScore();
  const { rows, cols, mines } = CONFIG[difficulty];

  useEffect(() => {
    if (gameState !== "playing") return;
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startTime) / 1000)), 500);
    return () => clearInterval(id);
  }, [gameState, startTime]);

  const startGame = useCallback(() => {
    setGrid([]);
    setInitialized(false);
    setScore(0);
    setSubmitted(false);
    setElapsed(0);
    setGameState("playing");
  }, []);

  const handleReveal = useCallback((r: number, c: number) => {
    if (gameState !== "playing") return;
    setGrid((prev) => {
      let g = prev;
      if (!initialized) {
        g = buildGrid(rows, cols, mines, r, c);
        setInitialized(true);
        setStartTime(Date.now());
      }
      if (g[r]?.[c]?.flagged || g[r]?.[c]?.revealed) return prev;
      const newGrid = g.map((row) => row.map((cell) => ({ ...cell })));
      if (newGrid[r][c].mine) {
        // Reveal all mines
        for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) if (newGrid[i][j].mine) newGrid[i][j].revealed = true;
        sfx.die(muted);
        setGameState("over");
        setScore(0);
        return newGrid;
      }
      floodReveal(newGrid, r, c);
      const safe = rows * cols - mines;
      const revealed = newGrid.flat().filter((cell) => cell.revealed && !cell.mine).length;
      if (revealed >= safe) {
        const timeBonus = Math.max(0, 1000 - elapsed * 10);
        sfx.submit(muted);
        setGameState("win");
        setScore(revealed * 10 + timeBonus);
      } else {
        sfx.eat(muted);
      }
      return newGrid;
    });
  }, [gameState, initialized, rows, cols, mines, muted, elapsed]);

  const handleFlag = useCallback((e: React.MouseEvent, r: number, c: number) => {
    e.preventDefault();
    if (gameState !== "playing" || !initialized) return;
    setGrid((prev) => {
      const newGrid = prev.map((row) => row.map((cell) => ({ ...cell })));
      if (!newGrid[r][c].revealed) newGrid[r][c].flagged = !newGrid[r][c].flagged;
      return newGrid;
    });
  }, [gameState, initialized]);

  const handleSubmit = async () => {
    try {
      await submitScore({ game: "minesweeper", score: BigInt(score), difficulty });
      setSubmitted(true);
      sfx.submit(muted);
      toast.success("Score submitted!");
    } catch { toast.error("Failed to submit score"); }
  };

  const cellSize = Math.min(32, Math.floor(280 / cols));

  return (
    <div className="flex flex-col h-full">
      <GameHeader title="MINESWEEPER" emoji="💣" score={score} difficulty={difficulty} onDifficultyChange={(d) => { setDifficulty(d); setGameState("idle"); }} muted={muted} onMuteToggle={() => setMuted((m) => !m)} gameActive={gameState === "playing"} />
      <div className="flex-1 flex flex-col items-center justify-center p-4 gap-3 overflow-auto">
        {gameState === "idle" && (
          <div className="text-center">
            <div className="pixel-font text-primary text-sm mb-2 text-glow-cyan animate-pulse-glow">MINESWEEPER</div>
            <div className="text-muted-foreground text-xs font-display mb-6 text-center">Left-click to reveal. Right-click to flag. Clear the board!</div>
            <button type="button" onClick={startGame} className="btn-neon-cyan border px-6 py-3 pixel-font text-xs rounded">START GAME</button>
          </div>
        )}
        {(gameState === "playing" || gameState === "over" || gameState === "win") && (
          <>
            <div className="flex items-center gap-4 mb-2 font-display text-xs text-muted-foreground">
              <span>💣 {mines}</span>
              <span>⏱ {elapsed}s</span>
              {(gameState === "over" || gameState === "win") && (
                <span className={gameState === "win" ? "text-accent font-bold" : "text-destructive font-bold"}>
                  {gameState === "win" ? "✓ CLEARED!" : "✗ BOOM!"}
                </span>
              )}
            </div>
            <div
              className="border border-primary/20 rounded overflow-hidden"
              style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, ${cellSize}px)` }}
            >
              {(grid.length > 0 ? grid : Array.from({ length: rows }, () => Array.from({ length: cols }, () => ({ mine: false, revealed: false, flagged: false, adjacent: 0 })))).map((row, r) =>
                row.map((cell, c) => {
                  const key = `cell-${r}-${c}`;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleReveal(r, c)}
                      onContextMenu={(e) => handleFlag(e, r, c)}
                      className="flex items-center justify-center border border-white/5 transition-colors"
                      style={{
                        width: cellSize, height: cellSize,
                        fontSize: cellSize * 0.5,
                        background: cell.revealed
                          ? cell.mine ? "rgba(255,0,102,0.3)" : "rgba(0,0,20,0.9)"
                          : "rgba(0,245,255,0.05)",
                        color: cell.adjacent > 0 ? ADJ_COLORS[cell.adjacent] : undefined,
                        cursor: cell.revealed ? "default" : "pointer",
                      }}
                    >
                      {cell.revealed ? (cell.mine ? "💥" : cell.adjacent > 0 ? cell.adjacent : "") : cell.flagged ? "🚩" : ""}
                    </button>
                  );
                })
              )}
            </div>
            {(gameState === "over" || gameState === "win") && (
              <div className="flex gap-3 mt-4">
                {!submitted && gameState === "win" && (
                  <Button onClick={() => void handleSubmit()} disabled={isSubmitting} className="btn-neon-green border font-display font-bold flex items-center gap-2">
                    <Upload size={14} />
                    {isSubmitting ? "SAVING..." : "SUBMIT SCORE"}
                  </Button>
                )}
                {submitted && <div className="text-accent text-sm font-display font-bold flex items-center gap-2"><Trophy size={14} /> Score Saved!</div>}
                <Button onClick={startGame} variant="outline" className="border-border/50 font-display font-bold flex items-center gap-2">
                  <RotateCcw size={14} /> PLAY AGAIN
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
