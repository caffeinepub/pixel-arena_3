import { useState, useEffect, useCallback } from "react";
import { GameHeader } from "../components/GameHeader";
import { GameOver } from "../components/GameOver";
import { Difficulty, useSubmitScore } from "../hooks/useQueries";
import { sfx } from "../utils/audio";
import { toast } from "sonner";

type Grid = (number | 0)[][];

function emptyGrid(): Grid {
  return Array.from({ length: 4 }, () => [0, 0, 0, 0]);
}

function addRandom(g: Grid): Grid {
  const empty: [number, number][] = [];
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) if (!g[r][c]) empty.push([r, c]);
  if (!empty.length) return g;
  const [r, c] = empty[Math.floor(Math.random() * empty.length)];
  const newG = g.map((row) => [...row]) as Grid;
  newG[r][c] = Math.random() < 0.9 ? 2 : 4;
  return newG;
}

function slideRow(row: (number | 0)[]): { row: (number | 0)[]; gained: number } {
  const nums = row.filter(Boolean) as number[];
  let gained = 0;
  const merged: number[] = [];
  let i = 0;
  while (i < nums.length) {
    if (i + 1 < nums.length && nums[i] === nums[i + 1]) {
      const val = nums[i] * 2;
      merged.push(val);
      gained += val;
      i += 2;
    } else {
      merged.push(nums[i]);
      i++;
    }
  }
  while (merged.length < 4) merged.push(0);
  return { row: merged as (number | 0)[], gained };
}

function move(g: Grid, dir: "left" | "right" | "up" | "down"): { grid: Grid; gained: number; moved: boolean } {
  let gained = 0;
  let moved = false;
  const newG = emptyGrid();

  if (dir === "left" || dir === "right") {
    for (let r = 0; r < 4; r++) {
      const row = dir === "right" ? [...g[r]].reverse() : [...g[r]];
      const { row: slid, gained: g2 } = slideRow(row as (number | 0)[]);
      const result = dir === "right" ? slid.reverse() : slid;
      newG[r] = result as (number | 0)[];
      gained += g2;
      if (JSON.stringify(result) !== JSON.stringify(g[r])) moved = true;
    }
  } else {
    for (let c = 0; c < 4; c++) {
      const col = g.map((r) => r[c]);
      const reversed = dir === "down" ? [...col].reverse() : col;
      const { row: slid, gained: g2 } = slideRow(reversed as (number | 0)[]);
      const result = dir === "down" ? slid.reverse() : slid;
      for (let r = 0; r < 4; r++) {
        newG[r][c] = result[r] as number | 0;
        if (result[r] !== g[r][c]) moved = true;
      }
      gained += g2;
    }
  }
  return { grid: newG, gained, moved };
}

function hasMovesLeft(g: Grid): boolean {
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
    if (!g[r][c]) return true;
    if (g[r][c + 1] === g[r][c]) return true;
    if (g[r + 1]?.[c] === g[r][c]) return true;
  }
  return false;
}

const TILE_COLORS: Record<number, { bg: string; fg: string }> = {
  2: { bg: "#1a1a2e", fg: "#e0e0e0" },
  4: { bg: "#16213e", fg: "#e0e0e0" },
  8: { bg: "#ff6b35", fg: "#fff" },
  16: { bg: "#ff4444", fg: "#fff" },
  32: { bg: "#ff0066", fg: "#fff" },
  64: { bg: "#bf00ff", fg: "#fff" },
  128: { bg: "#00f5ff", fg: "#000" },
  256: { bg: "#00ff88", fg: "#000" },
  512: { bg: "#ffcc00", fg: "#000" },
  1024: { bg: "#ffaa00", fg: "#000" },
  2048: { bg: "#ff8c00", fg: "#fff" },
};

interface Game2048Props {
  personalBest: number;
}

export function Game2048({ personalBest }: Game2048Props) {
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.easy);
  const [muted, setMuted] = useState(false);
  const [gameState, setGameState] = useState<"idle" | "playing" | "over">("idle");
  const [grid, setGrid] = useState<Grid>(emptyGrid());
  const [score, setScore] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  const { mutateAsync: submitScore, isPending: isSubmitting } = useSubmitScore();

  const startGame = useCallback(() => {
    let g = emptyGrid();
    g = addRandom(g);
    g = addRandom(g);
    setGrid(g);
    setScore(0);
    setSubmitted(false);
    setGameState("playing");
  }, []);

  const doMove = useCallback((dir: "left" | "right" | "up" | "down") => {
    if (gameState !== "playing") return;
    setGrid((prev) => {
      const { grid: newG, gained, moved } = move(prev, dir);
      if (!moved) return prev;
      sfx.eat(muted);
      setScore((s) => s + gained);
      const withNew = addRandom(newG);
      if (!hasMovesLeft(withNew)) {
        sfx.die(muted);
        setGameState("over");
      }
      return withNew;
    });
  }, [gameState, muted]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (gameState !== "playing") return;
      const map: Record<string, "left" | "right" | "up" | "down"> = {
        ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down",
        a: "left", d: "right", w: "up", s: "down",
      };
      const dir = map[e.key];
      if (dir) { e.preventDefault(); doMove(dir); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [gameState, doMove]);

  // Touch swipe
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  useEffect(() => {
    const onStart = (e: TouchEvent) => setTouchStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    const onEnd = (e: TouchEvent) => {
      setTouchStart((start) => {
        if (!start) return null;
        const dx = e.changedTouches[0].clientX - start.x;
        const dy = e.changedTouches[0].clientY - start.y;
        if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 30) doMove(dx > 0 ? "right" : "left");
        else if (Math.abs(dy) > 30) doMove(dy > 0 ? "down" : "up");
        return null;
      });
    };
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchend", onEnd, { passive: true });
    return () => { window.removeEventListener("touchstart", onStart); window.removeEventListener("touchend", onEnd); };
  }, [doMove]);
  void touchStart; // used via setTouchStart functional update

  const handleSubmit = async () => {
    try {
      await submitScore({ game: "game2048", score: BigInt(score), difficulty });
      setSubmitted(true);
      sfx.submit(muted);
      toast.success("Score submitted!");
    } catch { toast.error("Failed to submit score"); }
  };

  return (
    <div className="flex flex-col h-full">
      <GameHeader title="2048" emoji="🔢" score={score} difficulty={difficulty} onDifficultyChange={setDifficulty} muted={muted} onMuteToggle={() => setMuted((m) => !m)} gameActive={gameState === "playing"} />
      <div className="flex-1 flex flex-col items-center justify-center p-4 gap-4 relative">
        {gameState === "idle" && (
          <div className="text-center">
            <div className="pixel-font text-primary text-sm mb-2 text-glow-cyan animate-pulse-glow">2048</div>
            <div className="text-muted-foreground text-xs font-display mb-6 text-center">Arrow keys / swipe to merge tiles. Reach 2048!</div>
            <button type="button" onClick={startGame} className="btn-neon-cyan border px-6 py-3 pixel-font text-xs rounded">START GAME</button>
          </div>
        )}
        {gameState !== "idle" && (
          <div className="relative">
            <div
              className="grid gap-2 p-3 rounded-xl"
              style={{ gridTemplateColumns: "repeat(4, 1fr)", background: "rgba(0,245,255,0.05)", border: "1px solid rgba(0,245,255,0.1)" }}
            >
              {grid.flat().map((val, i) => {
                const tileKey = `tile-${i}`;
                const colors = val ? (TILE_COLORS[val] ?? { bg: "#ff8c00", fg: "#fff" }) : null;
                return (
                  <div
                    key={tileKey}
                    className="flex items-center justify-center rounded-lg font-bold transition-all duration-100"
                    style={{
                      width: 64, height: 64,
                      fontSize: val >= 1000 ? 16 : val >= 100 ? 20 : 24,
                      background: colors ? colors.bg : "rgba(255,255,255,0.03)",
                      color: colors ? colors.fg : "transparent",
                      boxShadow: val ? `0 0 12px ${colors?.bg}88` : "none",
                      border: val ? `1px solid ${colors?.bg}66` : "1px solid rgba(255,255,255,0.04)",
                    }}
                  >
                    {val || ""}
                  </div>
                );
              })}
            </div>
            {gameState === "over" && (
              <GameOver score={score} personalBest={Math.max(personalBest, submitted ? score : 0)} onSubmit={handleSubmit} onPlayAgain={startGame} isSubmitting={isSubmitting} submitted={submitted} game="game2048" difficulty={difficulty} />
            )}
          </div>
        )}
        <div className="text-xs text-muted-foreground font-display">Arrow keys / WASD / swipe to move</div>
      </div>
    </div>
  );
}
