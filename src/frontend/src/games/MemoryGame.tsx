import { useState, useEffect, useRef, useCallback } from "react";
import { GameHeader } from "../components/GameHeader";
import { GameOver } from "../components/GameOver";
import { Difficulty, useSubmitScore } from "../hooks/useQueries";
import { sfx } from "../utils/audio";
import { toast } from "sonner";

const EMOJIS = ["🎮", "🕹️", "👾", "🎯", "🏆", "💎", "⚡", "🔥"];

const TIMER: Record<Difficulty, number> = {
  [Difficulty.easy]: 120,
  [Difficulty.medium]: 60,
  [Difficulty.hard]: 30,
};

interface Card {
  id: number;
  emoji: string;
  flipped: boolean;
  matched: boolean;
}

function createCards(): Card[] {
  const pairs = [...EMOJIS, ...EMOJIS];
  // Shuffle
  for (let i = pairs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
  }
  return pairs.map((emoji, id) => ({ id, emoji, flipped: false, matched: false }));
}

interface MemoryGameProps {
  personalBest: number;
}

export function MemoryGame({ personalBest }: MemoryGameProps) {
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.easy);
  const [muted, setMuted] = useState(false);
  const [gameState, setGameState] = useState<"idle" | "playing" | "over">("idle");
  const [score, setScore] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [cards, setCards] = useState<Card[]>(createCards());
  const [selected, setSelected] = useState<number[]>([]);
  const [timeLeft, setTimeLeft] = useState(TIMER[Difficulty.easy]);
  const [locked, setLocked] = useState(false);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { mutateAsync: submitScore, isPending: isSubmitting } = useSubmitScore();

  const stopGame = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const endGame = useCallback(() => {
    stopGame();
    setGameState("over");
  }, [stopGame]);

  const startGame = useCallback(() => {
    stopGame();
    setCards(createCards());
    setSelected([]);
    setScore(0);
    setSubmitted(false);
    setLocked(false);
    const t = TIMER[difficulty];
    setTimeLeft(t);
    setGameState("playing");
  }, [difficulty, stopGame]);

  useEffect(() => {
    if (gameState !== "playing") return;
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          endGame();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => stopGame();
  }, [gameState, endGame, stopGame]);

  // Check win condition
  useEffect(() => {
    if (gameState === "playing" && cards.every((c) => c.matched)) {
      sfx.levelUp(muted);
      endGame();
    }
  }, [cards, gameState, muted, endGame]);

  const handleCardClick = (id: number) => {
    if (gameState !== "playing" || locked) return;
    const card = cards[id];
    if (card.flipped || card.matched) return;
    if (selected.includes(id)) return;

    const newSelected = [...selected, id];
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, flipped: true } : c)));

    if (newSelected.length === 2) {
      setLocked(true);
      const [a, b] = newSelected;
      const cardA = cards[a];
      const cardB = { ...cards[b], flipped: true };

      if (cardA.emoji === cardB.emoji) {
        sfx.match(muted);
        setScore((s) => s + 100);
        setCards((prev) =>
          prev.map((c) =>
            c.id === a || c.id === b ? { ...c, matched: true, flipped: true } : c
          )
        );
        setSelected([]);
        setLocked(false);
      } else {
        sfx.mismatch(muted);
        setScore((s) => Math.max(0, s - 5));
        setTimeout(() => {
          setCards((prev) =>
            prev.map((c) =>
              c.id === a || c.id === b ? { ...c, flipped: false } : c
            )
          );
          setSelected([]);
          setLocked(false);
        }, 800);
      }
    } else {
      setSelected(newSelected);
    }
  };

  const handleSubmit = async () => {
    try {
      await submitScore({ game: "memory", score: BigInt(score), difficulty });
      setSubmitted(true);
      sfx.submit(muted);
      toast.success("Score submitted!", { description: `${score} pts on ${difficulty}` });
    } catch {
      toast.error("Failed to submit score");
    }
  };

  const timerPercent = (timeLeft / TIMER[difficulty]) * 100;
  const timerColor = timerPercent > 50 ? "#00ff88" : timerPercent > 25 ? "#ffaa00" : "#ff4444";

  return (
    <div className="flex flex-col h-full">
      <GameHeader
        title="MEMORY MATCH"
        emoji="🃏"
        score={score}
        difficulty={difficulty}
        onDifficultyChange={(d) => { setDifficulty(d); }}
        muted={muted}
        onMuteToggle={() => setMuted((m) => !m)}
        gameActive={gameState === "playing"}
      />

      {/* Timer bar */}
      {gameState === "playing" && (
        <div className="h-1.5 bg-muted/30 mx-3 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{ width: `${timerPercent}%`, backgroundColor: timerColor }}
          />
        </div>
      )}

      <div className="flex-1 flex flex-col items-center justify-center p-4 gap-3 relative overflow-y-auto">
        {gameState === "idle" && (
          <div className="text-center">
            <div className="pixel-font text-primary text-sm mb-2 text-glow-cyan animate-pulse-glow">
              MEMORY MATCH
            </div>
            <div className="text-muted-foreground text-sm font-display mb-6">
              Match all 8 pairs before time runs out!
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

        {gameState !== "idle" && (
          <>
            <div className="text-sm font-display text-muted-foreground">
              ⏱ {timeLeft}s
            </div>

            <div className="grid grid-cols-4 gap-2">
              {cards.map((card) => (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => handleCardClick(card.id)}
                  className={`w-16 h-16 sm:w-20 sm:h-20 rounded-lg border text-2xl sm:text-3xl transition-all duration-300 cursor-pointer ${
                    card.matched
                      ? "border-accent/50 bg-accent/10 scale-95 cursor-default"
                      : card.flipped
                      ? "border-primary/70 bg-primary/10 scale-100"
                      : "border-border/40 bg-card/80 hover:border-primary/40 hover:bg-primary/5 hover:scale-105"
                  }`}
                  style={
                    card.matched
                      ? { boxShadow: "0 0 10px oklch(0.82 0.2 145 / 0.4)" }
                      : card.flipped
                      ? { boxShadow: "0 0 10px oklch(0.85 0.18 195 / 0.4)" }
                      : {}
                  }
                >
                  {card.flipped || card.matched ? card.emoji : "?"}
                </button>
              ))}
            </div>
          </>
        )}

        {gameState === "over" && (
          <GameOver
            score={score}
            personalBest={Math.max(personalBest, submitted ? score : 0)}
            onSubmit={handleSubmit}
            onPlayAgain={startGame}
            isSubmitting={isSubmitting}
            submitted={submitted}
            game="memory"
            difficulty={difficulty}
          />
        )}
      </div>
    </div>
  );
}
