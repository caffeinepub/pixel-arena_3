import { useState, useEffect, useRef, useCallback } from "react";
import { GameHeader } from "../components/GameHeader";
import { GameOver } from "../components/GameOver";
import { Difficulty, useSubmitScore } from "../hooks/useQueries";
import { sfx } from "../utils/audio";
import { toast } from "sonner";

const GRID_SIZE = 20;
const CELL_SIZE = 20;

type Point = { x: number; y: number };
type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT";

const SPEED: Record<Difficulty, number> = {
  [Difficulty.easy]: 150,
  [Difficulty.medium]: 100,
  [Difficulty.hard]: 60,
};

function randomFood(snake: Point[]): Point {
  let pos: Point;
  do {
    pos = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
    };
  } while (snake.some((s) => s.x === pos.x && s.y === pos.y));
  return pos;
}

interface SnakeGameProps {
  personalBest: number;
}

export function SnakeGame({ personalBest }: SnakeGameProps) {
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.easy);
  const [muted, setMuted] = useState(false);
  const [gameState, setGameState] = useState<"idle" | "playing" | "over">("idle");
  const [score, setScore] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [snake, setSnake] = useState<Point[]>([{ x: 10, y: 10 }]);
  const [food, setFood] = useState<Point>({ x: 5, y: 5 });
  const [direction, setDirection] = useState<Direction>("RIGHT");

  const dirRef = useRef<Direction>("RIGHT");
  const gameStateRef = useRef<"idle" | "playing" | "over">("idle");
  const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { mutateAsync: submitScore, isPending: isSubmitting } = useSubmitScore();

  const stopGame = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startGame = useCallback(() => {
    stopGame();
    const initialSnake = [{ x: 10, y: 10 }];
    const initialFood = randomFood(initialSnake);
    setSnake(initialSnake);
    setFood(initialFood);
    setDirection("RIGHT");
    dirRef.current = "RIGHT";
    setScore(0);
    setSubmitted(false);
    setGameState("playing");
    gameStateRef.current = "playing";
  }, [stopGame]);

  useEffect(() => {
    if (gameState !== "playing") return;

    intervalRef.current = setInterval(() => {
      setSnake((prev) => {
        const dir = dirRef.current;
        const head = prev[0];
        const newHead: Point = { x: head.x, y: head.y };

        if (dir === "UP") newHead.y -= 1;
        else if (dir === "DOWN") newHead.y += 1;
        else if (dir === "LEFT") newHead.x -= 1;
        else if (dir === "RIGHT") newHead.x += 1;

        // Wall collision
        if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE) {
          sfx.die(muted);
          setGameState("over");
          gameStateRef.current = "over";
          return prev;
        }

        // Self collision
        if (prev.some((s) => s.x === newHead.x && s.y === newHead.y)) {
          sfx.die(muted);
          setGameState("over");
          gameStateRef.current = "over";
          return prev;
        }

        let newSnake = [newHead, ...prev];

        // Check food
        setFood((currentFood) => {
          if (newHead.x === currentFood.x && newHead.y === currentFood.y) {
            sfx.eat(muted);
            setScore((s) => s + 10);
            return randomFood(newSnake);
          } else {
            newSnake = newSnake.slice(0, -1);
            return currentFood;
          }
        });

        return newSnake;
      });
    }, SPEED[difficulty]);

    return () => stopGame();
  }, [gameState, difficulty, muted, stopGame]);

  useEffect(() => {
    if (gameState === "over") stopGame();
  }, [gameState, stopGame]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (gameStateRef.current !== "playing") return;
      const dir = dirRef.current;
      const map: Record<string, Direction> = {
        ArrowUp: "UP", w: "UP", W: "UP",
        ArrowDown: "DOWN", s: "DOWN", S: "DOWN",
        ArrowLeft: "LEFT", a: "LEFT", A: "LEFT",
        ArrowRight: "RIGHT", d: "RIGHT", D: "RIGHT",
      };
      const newDir = map[e.key];
      if (!newDir) return;
      if (
        (newDir === "UP" && dir === "DOWN") ||
        (newDir === "DOWN" && dir === "UP") ||
        (newDir === "LEFT" && dir === "RIGHT") ||
        (newDir === "RIGHT" && dir === "LEFT")
      )
        return;
      setDirection(newDir);
      dirRef.current = newDir;
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const handleSubmit = async () => {
    try {
      await submitScore({ game: "snake", score: BigInt(score), difficulty });
      setSubmitted(true);
      sfx.submit(muted);
      toast.success("Score submitted!", { description: `${score} pts on ${difficulty}` });
    } catch {
      toast.error("Failed to submit score");
    }
  };

  const currentBest = Math.max(personalBest, submitted ? score : 0);

  return (
    <div className="flex flex-col h-full">
      <GameHeader
        title="SNAKE"
        emoji="🐍"
        score={score}
        difficulty={difficulty}
        onDifficultyChange={setDifficulty}
        muted={muted}
        onMuteToggle={() => setMuted((m) => !m)}
        gameActive={gameState === "playing"}
      />

      <div className="flex-1 flex flex-col items-center justify-center p-4 gap-4">
        {/* Game canvas */}
        <div
          className="relative border border-primary/30"
          style={{
            width: GRID_SIZE * CELL_SIZE,
            height: GRID_SIZE * CELL_SIZE,
            backgroundColor: "rgba(0, 0, 20, 0.95)",
            boxShadow: "inset 0 0 20px rgba(0, 245, 255, 0.05), 0 0 20px rgba(0, 245, 255, 0.1)",
          }}
        >
          {/* Grid dots */}
          <svg
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none opacity-10"
            width={GRID_SIZE * CELL_SIZE}
            height={GRID_SIZE * CELL_SIZE}
          >
            {Array.from({ length: GRID_SIZE + 1 }, (_, i) => {
              const y = i * CELL_SIZE;
              return (
                <line
                  key={`hline-at-${y}`}
                  x1={0}
                  y1={y}
                  x2={GRID_SIZE * CELL_SIZE}
                  y2={y}
                  stroke="oklch(0.85 0.18 195)"
                  strokeWidth="0.5"
                />
              );
            })}
            {Array.from({ length: GRID_SIZE + 1 }, (_, i) => {
              const x = i * CELL_SIZE;
              return (
                <line
                  key={`vline-at-${x}`}
                  x1={x}
                  y1={0}
                  x2={x}
                  y2={GRID_SIZE * CELL_SIZE}
                  stroke="oklch(0.85 0.18 195)"
                  strokeWidth="0.5"
                />
              );
            })}
          </svg>

          {/* Snake */}
          {snake.map((segment, i) => (
            <div
              key={`seg-${segment.x}-${segment.y}`}
              className="absolute rounded-sm"
              style={{
                left: segment.x * CELL_SIZE + 1,
                top: segment.y * CELL_SIZE + 1,
                width: CELL_SIZE - 2,
                height: CELL_SIZE - 2,
                backgroundColor: i === 0
                  ? "oklch(0.85 0.18 195)"
                  : `oklch(${0.65 + (0.2 * (1 - i / snake.length))} 0.18 195)`,
                boxShadow: i === 0 ? "0 0 8px oklch(0.85 0.18 195 / 0.8)" : "none",
              }}
            />
          ))}

          {/* Food */}
          <div
            className="absolute rounded-full animate-pulse"
            style={{
              left: food.x * CELL_SIZE + 2,
              top: food.y * CELL_SIZE + 2,
              width: CELL_SIZE - 4,
              height: CELL_SIZE - 4,
              backgroundColor: "oklch(0.82 0.2 145)",
              boxShadow: "0 0 10px oklch(0.82 0.2 145 / 0.8)",
            }}
          />

          {/* Overlay: Idle */}
          {gameState === "idle" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm z-10">
              <div className="pixel-font text-primary text-sm mb-2 text-glow-cyan animate-pulse-glow">
                SNAKE
              </div>
              <div className="text-muted-foreground text-xs font-display mb-6 text-center">
                Arrow keys / WASD to move
              </div>
              <button
                type="button"
                onClick={startGame}
                className="btn-neon-cyan border px-6 py-3 pixel-font text-xs rounded"
              >
                START GAME
              </button>
            </div>
          )}

          {/* Game Over */}
          {gameState === "over" && (
            <GameOver
              score={score}
              personalBest={currentBest}
              onSubmit={handleSubmit}
              onPlayAgain={startGame}
              isSubmitting={isSubmitting}
              submitted={submitted}
              game="snake"
              difficulty={difficulty}
            />
          )}
        </div>

        <div className="text-xs text-muted-foreground font-display">
          Arrow keys / WASD to control
        </div>
      </div>
    </div>
  );
}
