import { useState, useCallback, useEffect, useRef } from "react";
import { GameHeader } from "../components/GameHeader";
import { GameOver } from "../components/GameOver";
import { Difficulty, useSubmitScore } from "../hooks/useQueries";
import { sfx } from "../utils/audio";
import { toast } from "sonner";

function shuffle(arr: number[], moves = 200): number[] {
  const a = [...arr];
  const size = Math.sqrt(a.length);
  let blankIdx = a.indexOf(0);
  const directions = [-1, 1, -size, size];
  for (let i = 0; i < moves; i++) {
    const validDirs = directions.filter((d) => {
      const ni = blankIdx + d;
      if (ni < 0 || ni >= a.length) return false;
      if (d === -1 && blankIdx % size === 0) return false;
      if (d === 1 && blankIdx % size === size - 1) return false;
      return true;
    });
    const dir = validDirs[Math.floor(Math.random() * validDirs.length)];
    const ni = blankIdx + dir;
    [a[blankIdx], a[ni]] = [a[ni], a[blankIdx]];
    blankIdx = ni;
  }
  return a;
}

function isSolved(tiles: number[]): boolean {
  return tiles.every((t, i) => t === (i + 1) % tiles.length);
}

interface SliderPuzzleGameProps { personalBest: number; }

export function SliderPuzzleGame({ personalBest }: SliderPuzzleGameProps) {
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.easy);
  const [muted, setMuted] = useState(false);
  const [gameState, setGameState] = useState<"idle" | "playing" | "over">("idle");
  const [score, setScore] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [tiles, setTiles] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const startTimeRef = useRef(0);

  const { mutateAsync: submitScore, isPending: isSubmitting } = useSubmitScore();

  const SIZE = 4; // 4x4

  const startGame = useCallback(() => {
    const initial = [...Array.from({length: SIZE * SIZE - 1}, (_, i) => i + 1), 0];
    const shuffled = shuffle(initial, difficulty === Difficulty.easy ? 50 : difficulty === Difficulty.medium ? 100 : 200);
    setTiles(shuffled);
    setMoves(0);
    setScore(0);
    setSubmitted(false);
    startTimeRef.current = Date.now();
    setGameState("playing");
  }, [difficulty]);

  const handleTileClick = useCallback((idx: number) => {
    if (gameState !== "playing") return;
    const blankIdx = tiles.indexOf(0);
    const size = SIZE;
    const adjacents = [blankIdx - 1, blankIdx + 1, blankIdx - size, blankIdx + size].filter((ni) => {
      if (ni < 0 || ni >= tiles.length) return false;
      if (ni === blankIdx - 1 && blankIdx % size === 0) return false;
      if (ni === blankIdx + 1 && blankIdx % size === size - 1) return false;
      return true;
    });
    if (!adjacents.includes(idx)) return;
    const newTiles = [...tiles];
    [newTiles[blankIdx], newTiles[idx]] = [newTiles[idx], newTiles[blankIdx]];
    sfx.eat(muted);
    setTiles(newTiles);
    const newMoves = moves + 1;
    setMoves(newMoves);
    if (isSolved(newTiles)) {
      const bonus = Math.max(0, 500 - newMoves * 2);
      const finalScore = 1000 + bonus;
      setScore(finalScore);
      sfx.submit(muted);
      setGameState("over");
    }
  }, [gameState, tiles, moves, muted]);

  // Keyboard support
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (gameState !== "playing") return;
      const blankIdx = tiles.indexOf(0);
      const size = SIZE;
      const map: Record<string, number> = {
        ArrowUp: blankIdx + size,
        ArrowDown: blankIdx - size,
        ArrowLeft: blankIdx + 1,
        ArrowRight: blankIdx - 1,
      };
      const target = map[e.key];
      if (target !== undefined) { e.preventDefault(); handleTileClick(target); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [gameState, tiles, handleTileClick]);

  const handleSubmit = async () => {
    try {
      await submitScore({ game: "sliderpuzzle", score: BigInt(score), difficulty });
      setSubmitted(true);
      sfx.submit(muted);
      toast.success("Score submitted!");
    } catch { toast.error("Failed to submit score"); }
  };

  return (
    <div className="flex flex-col h-full">
      <GameHeader title="SLIDER PUZZLE" emoji="🔢" score={score} difficulty={difficulty} onDifficultyChange={setDifficulty} muted={muted} onMuteToggle={() => setMuted((m) => !m)} gameActive={gameState === "playing"} />
      <div className="flex-1 flex flex-col items-center justify-center p-4 gap-4 relative">
        {gameState === "idle" && (
          <div className="text-center">
            <div className="pixel-font text-primary text-sm mb-2 text-glow-cyan animate-pulse-glow">SLIDER PUZZLE</div>
            <div className="text-muted-foreground text-xs font-display mb-6">Slide tiles to arrange 1-15. Fewer moves = more bonus!</div>
            <button type="button" onClick={startGame} className="btn-neon-cyan border px-6 py-3 pixel-font text-xs rounded">START GAME</button>
          </div>
        )}
        {gameState === "playing" && (
          <div className="text-center">
            <div className="text-xs font-display text-muted-foreground mb-3">Moves: {moves}</div>
            <div className="grid gap-1.5 p-3 rounded-xl" style={{ gridTemplateColumns: `repeat(${SIZE}, 1fr)`, background: "rgba(0,245,255,0.04)", border: "1px solid rgba(0,245,255,0.08)" }}>
              {tiles.map((tile, i) => {
                const tileKey = `tile-${i}-${tile}`;
                return (
                  <button
                    key={tileKey}
                    type="button"
                    onClick={() => handleTileClick(i)}
                    className="rounded-lg font-bold text-xl font-display flex items-center justify-center transition-all duration-100 border"
                    style={{
                      width: 56, height: 56,
                      background: tile === 0 ? "transparent" : "rgba(0,245,255,0.08)",
                      color: tile === 0 ? "transparent" : "#00f5ff",
                      borderColor: tile === 0 ? "transparent" : "rgba(0,245,255,0.25)",
                      boxShadow: tile === 0 ? "none" : "0 2px 8px rgba(0,245,255,0.1)",
                      cursor: tile === 0 ? "default" : "pointer",
                    }}
                  >
                    {tile || ""}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {gameState === "over" && (
          <GameOver score={score} personalBest={Math.max(personalBest, submitted ? score : 0)} onSubmit={handleSubmit} onPlayAgain={startGame} isSubmitting={isSubmitting} submitted={submitted} game="sliderpuzzle" difficulty={difficulty} />
        )}
      </div>
    </div>
  );
}
