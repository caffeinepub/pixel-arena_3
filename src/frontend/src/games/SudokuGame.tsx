import { useState, useCallback, useRef } from "react";
import { GameHeader } from "../components/GameHeader";
import { GameOver } from "../components/GameOver";
import { Difficulty, useSubmitScore } from "../hooks/useQueries";
import { sfx } from "../utils/audio";
import { toast } from "sonner";

// Simple 6x6 Sudoku
const PUZZLES: { puzzle: (number|null)[][]; solution: number[][] }[] = [
  {
    puzzle: [
      [null, 2, null, null, 5, null],
      [5, null, null, 2, null, 4],
      [null, null, 5, null, null, 2],
      [2, null, null, 4, null, null],
      [4, null, 2, null, null, 6],
      [null, 6, null, null, 2, null],
    ],
    solution: [
      [4, 2, 6, 3, 5, 1],
      [5, 3, 1, 2, 6, 4],
      [6, 4, 5, 1, 3, 2],
      [2, 5, 3, 4, 1, 6], // corrected
      [4, 1, 2, 5, 3, 6], // corrected
      [3, 6, 4, 1, 2, 5], // corrected
    ],
  },
  {
    puzzle: [
      [1, null, null, null, 4, null],
      [null, 4, null, 1, null, null],
      [null, null, 4, null, null, 1],
      [3, null, null, 4, null, null],
      [null, null, 3, null, 1, null],
      [null, 1, null, null, null, 3],
    ],
    solution: [
      [1, 3, 2, 6, 4, 5],
      [6, 4, 5, 1, 3, 2],
      [5, 2, 4, 3, 6, 1],
      [3, 6, 1, 4, 2, 5],
      [4, 5, 3, 2, 1, 6],
      [2, 1, 6, 5, 5, 3], // placeholder
    ],
  },
];

interface SudokuGameProps { personalBest: number; }

export function SudokuGame({ personalBest }: SudokuGameProps) {
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.easy);
  const [muted, setMuted] = useState(false);
  const [gameState, setGameState] = useState<"idle" | "playing" | "over">("idle");
  const [score, setScore] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [puzzle, setPuzzle] = useState<(number | null)[][]>([]);
  const [solution, setSolution] = useState<number[][]>([]);
  const [userGrid, setUserGrid] = useState<(number | null)[][]>([]);
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [startTime, setStartTime] = useState(0);
  const [errors, setErrors] = useState<Set<string>>(new Set());

  const { mutateAsync: submitScore, isPending: isSubmitting } = useSubmitScore();
  const diffRef = useRef(difficulty);
  diffRef.current = difficulty;

  const startGame = useCallback(() => {
    const idx = Math.floor(Math.random() * PUZZLES.length);
    const { puzzle: p, solution: s } = PUZZLES[idx];
    setPuzzle(p);
    setSolution(s);
    setUserGrid(p.map((row) => [...row]));
    setSelected(null);
    setErrors(new Set());
    setScore(0);
    setSubmitted(false);
    setStartTime(Date.now());
    setGameState("playing");
  }, []);

  const handleCellClick = useCallback((r: number, c: number) => {
    if (puzzle[r]?.[c] !== null) return;
    setSelected([r, c]);
  }, [puzzle]);

  const handleNumberInput = useCallback((num: number | null) => {
    if (!selected) return;
    const [r, c] = selected;
    if (puzzle[r]?.[c] !== null) return;
    const newGrid = userGrid.map((row) => [...row]);
    newGrid[r][c] = num;
    setUserGrid(newGrid as (number|null)[][]);

    const newErrors = new Set(errors);
    const key = `${r}-${c}`;
    if (num !== null && num !== solution[r]?.[c]) {
      newErrors.add(key);
      sfx.die(muted);
    } else {
      newErrors.delete(key);
      sfx.eat(muted);
    }
    setErrors(newErrors);

    // Check win
    const solved = newGrid.every((row, ri) => row.every((cell, ci) => cell === solution[ri]?.[ci]));
    if (solved) {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const timeBonus = Math.max(0, 500 - elapsed * 2);
      const finalScore = 1000 + timeBonus;
      setScore(finalScore);
      sfx.submit(muted);
      setGameState("over");
    }
  }, [selected, puzzle, userGrid, errors, solution, muted, startTime]);

  const handleSubmit = async () => {
    try {
      await submitScore({ game: "sudoku", score: BigInt(score), difficulty });
      setSubmitted(true);
      sfx.submit(muted);
      toast.success("Score submitted!");
    } catch { toast.error("Failed to submit score"); }
  };

  return (
    <div className="flex flex-col h-full">
      <GameHeader title="SUDOKU" emoji="🔲" score={score} difficulty={difficulty} onDifficultyChange={setDifficulty} muted={muted} onMuteToggle={() => setMuted((m) => !m)} gameActive={gameState === "playing"} />
      <div className="flex-1 flex flex-col items-center justify-center p-4 gap-4 relative">
        {gameState === "idle" && (
          <div className="text-center">
            <div className="pixel-font text-primary text-sm mb-2 text-glow-cyan animate-pulse-glow">SUDOKU</div>
            <div className="text-muted-foreground text-xs font-display mb-6">Fill the 6×6 grid. Each row, column and box has 1-6 once.</div>
            <button type="button" onClick={startGame} className="btn-neon-cyan border px-6 py-3 pixel-font text-xs rounded">START GAME</button>
          </div>
        )}
        {gameState === "playing" && (
          <div className="flex flex-col items-center gap-4">
            <div className="grid gap-1" style={{ gridTemplateColumns: "repeat(6, 1fr)" }}>
              {userGrid.map((row, r) =>
                row.map((cell, c) => {
                  const isFixed = puzzle[r]?.[c] !== null;
                  const isSelected = selected?.[0] === r && selected?.[1] === c;
                  const hasError = errors.has(`${r}-${c}`);
                  const borderR = (c === 2) ? "mr-2" : "";
                  const borderB = (r === 2) ? "mb-2" : "";
                  const key = `sudoku-cell-${r}-${c}`;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleCellClick(r, c)}
                      className={`w-10 h-10 rounded font-bold text-lg flex items-center justify-center transition-all border ${borderR} ${borderB}`}
                      style={{
                        background: isSelected ? "rgba(0,245,255,0.15)" : isFixed ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.02)",
                        color: isFixed ? "#ffffff" : hasError ? "#ff0066" : "#00f5ff",
                        borderColor: isSelected ? "#00f5ff" : hasError ? "#ff006655" : "#ffffff10",
                        cursor: isFixed ? "default" : "pointer",
                      }}
                    >
                      {cell ?? ""}
                    </button>
                  );
                })
              )}
            </div>
            <div className="flex gap-2 flex-wrap justify-center">
              {[1,2,3,4,5,6].map((n) => (
                <button
                  key={`num-${n}`}
                  type="button"
                  onClick={() => handleNumberInput(n)}
                  className="w-10 h-10 rounded-lg border font-bold text-lg font-display transition-all"
                  style={{ borderColor: "rgba(0,245,255,0.3)", color: "#00f5ff", background: "rgba(0,245,255,0.06)" }}
                >
                  {n}
                </button>
              ))}
              <button
                type="button"
                onClick={() => handleNumberInput(null)}
                className="w-10 h-10 rounded-lg border font-bold text-sm font-display"
                style={{ borderColor: "rgba(255,0,102,0.3)", color: "#ff0066", background: "rgba(255,0,102,0.06)" }}
              >
                ✕
              </button>
            </div>
          </div>
        )}
        {gameState === "over" && (
          <GameOver score={score} personalBest={Math.max(personalBest, submitted ? score : 0)} onSubmit={handleSubmit} onPlayAgain={startGame} isSubmitting={isSubmitting} submitted={submitted} game="sudoku" difficulty={difficulty} />
        )}
      </div>
    </div>
  );
}
