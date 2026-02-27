import { useState, useEffect, useRef, useCallback } from "react";
import { GameHeader } from "../components/GameHeader";
import { GameOver } from "../components/GameOver";
import { Difficulty, useSubmitScore } from "../hooks/useQueries";
import { sfx } from "../utils/audio";
import { toast } from "sonner";

const W = 400;
const H = 400;
const FRUITS = ["🍎", "🍊", "🍋", "🍇", "🍓", "🍉", "🥝", "🍑"];
const MISS_LIMIT = 3;

const FRUIT_LIFETIME: Record<Difficulty, number> = { [Difficulty.easy]: 2500, [Difficulty.medium]: 1800, [Difficulty.hard]: 1200 };
const SPAWN_RATE: Record<Difficulty, number> = { [Difficulty.easy]: 1500, [Difficulty.medium]: 1100, [Difficulty.hard]: 800 };

interface FruitItem {
  id: number;
  x: number;
  y: number;
  emoji: string;
  spawnTime: number;
  lifetime: number;
  sliced: boolean;
}

interface FruitSlicerGameProps { personalBest: number; }

export function FruitSlicerGame({ personalBest }: FruitSlicerGameProps) {
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.easy);
  const [muted, setMuted] = useState(false);
  const [gameState, setGameState] = useState<"idle" | "playing" | "over">("idle");
  const [score, setScore] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [fruits, setFruits] = useState<FruitItem[]>([]);
  const [misses, setMisses] = useState(0);

  const rafRef = useRef<number>(0);
  const spawnRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const counterRef = useRef(0);
  const diffRef = useRef(difficulty);
  const gameStateRef = useRef<"idle" | "playing" | "over">("idle");
  useEffect(() => { diffRef.current = difficulty; }, [difficulty]);

  const { mutateAsync: submitScore, isPending: isSubmitting } = useSubmitScore();

  const startGame = useCallback(() => {
    if (spawnRef.current) clearInterval(spawnRef.current);
    cancelAnimationFrame(rafRef.current);
    setFruits([]);
    setMisses(0);
    setScore(0);
    setSubmitted(false);
    counterRef.current = 0;
    gameStateRef.current = "playing";
    setGameState("playing");

    spawnRef.current = setInterval(() => {
      if (gameStateRef.current !== "playing") return;
      counterRef.current++;
      const id = counterRef.current;
      const lifetime = FRUIT_LIFETIME[diffRef.current];
      setFruits((prev) => [
        ...prev,
        {
          id,
          x: 30 + Math.random() * (W - 60),
          y: 30 + Math.random() * (H - 80),
          emoji: FRUITS[Math.floor(Math.random() * FRUITS.length)],
          spawnTime: Date.now(),
          lifetime,
          sliced: false,
        },
      ]);
    }, SPAWN_RATE[difficulty]);

    // Expire checker
    const check = () => {
      if (gameStateRef.current !== "playing") return;
      setFruits((prev) => {
        const now = Date.now();
        const expired = prev.filter((f) => !f.sliced && now - f.spawnTime > f.lifetime);
        if (expired.length > 0) {
          setMisses((m) => {
            const newMisses = m + expired.length;
            if (newMisses >= MISS_LIMIT) {
              gameStateRef.current = "over";
              setGameState("over");
              if (spawnRef.current) clearInterval(spawnRef.current);
            }
            return newMisses;
          });
          return prev.filter((f) => f.sliced || now - f.spawnTime <= f.lifetime);
        }
        return prev;
      });
      rafRef.current = requestAnimationFrame(check);
    };
    rafRef.current = requestAnimationFrame(check);
  }, [difficulty]);

  const handleSlice = useCallback((id: number) => {
    if (gameState !== "playing") return;
    sfx.eat(muted);
    setFruits((prev) => prev.filter((f) => f.id !== id));
    setScore((s) => s + 10);
  }, [gameState, muted]);

  useEffect(() => () => {
    if (spawnRef.current) clearInterval(spawnRef.current);
    cancelAnimationFrame(rafRef.current);
  }, []);

  const handleSubmit = async () => {
    try {
      await submitScore({ game: "fruitslicer", score: BigInt(score), difficulty });
      setSubmitted(true);
      sfx.submit(muted);
      toast.success("Score submitted!");
    } catch { toast.error("Failed to submit score"); }
  };

  return (
    <div className="flex flex-col h-full">
      <GameHeader title="FRUIT SLICER" emoji="🍎" score={score} difficulty={difficulty} onDifficultyChange={setDifficulty} muted={muted} onMuteToggle={() => setMuted((m) => !m)} gameActive={gameState === "playing"} />
      <div className="flex-1 flex flex-col items-center justify-center p-4 gap-3 relative">
        {gameState === "idle" && (
          <div className="text-center">
            <div className="pixel-font text-primary text-sm mb-2 text-glow-cyan animate-pulse-glow">FRUIT SLICER</div>
            <div className="text-muted-foreground text-xs font-display mb-6">Click fruits before they disappear! Miss 3 = game over.</div>
            <button type="button" onClick={startGame} className="btn-neon-cyan border px-6 py-3 pixel-font text-xs rounded">START GAME</button>
          </div>
        )}
        {gameState === "playing" && (
          <div
            className="relative rounded-xl border border-primary/20 overflow-hidden select-none"
            style={{ width: W, height: H, maxWidth: "100%", background: "rgba(0,0,20,0.95)" }}
          >
            <div className="absolute top-2 left-2 text-xs font-display" style={{ color: "#ff0066" }}>
              {Array.from({ length: MISS_LIMIT }, (_, i) => i < misses ? "💔" : "❤️").join("")}
            </div>
            {fruits.map((fruit) => {
              const age = (Date.now() - fruit.spawnTime) / fruit.lifetime;
              return (
                <button
                  key={fruit.id}
                  type="button"
                  onClick={() => handleSlice(fruit.id)}
                  className="absolute transition-transform hover:scale-125 active:scale-90"
                  style={{
                    left: fruit.x,
                    top: fruit.y,
                    fontSize: 36,
                    opacity: Math.max(0.4, 1 - age * 0.5),
                    transform: `scale(${1 - age * 0.3})`,
                    cursor: "pointer",
                    background: "none",
                    border: "none",
                    padding: 0,
                    lineHeight: 1,
                  }}
                >
                  {fruit.emoji}
                </button>
              );
            })}
          </div>
        )}
        {gameState === "over" && (
          <GameOver score={score} personalBest={Math.max(personalBest, submitted ? score : 0)} onSubmit={handleSubmit} onPlayAgain={startGame} isSubmitting={isSubmitting} submitted={submitted} game="fruitslicer" difficulty={difficulty} />
        )}
      </div>
    </div>
  );
}
