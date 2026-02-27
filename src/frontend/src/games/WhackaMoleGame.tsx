import { useState, useEffect, useRef, useCallback } from "react";
import { GameHeader } from "../components/GameHeader";
import { GameOver } from "../components/GameOver";
import { Difficulty, useSubmitScore } from "../hooks/useQueries";
import { sfx } from "../utils/audio";
import { toast } from "sonner";

const DURATION: Record<Difficulty, number> = {
  [Difficulty.easy]: 45,
  [Difficulty.medium]: 30,
  [Difficulty.hard]: 20,
};

const MOLE_INTERVAL: Record<Difficulty, number> = {
  [Difficulty.easy]: 1200,
  [Difficulty.medium]: 800,
  [Difficulty.hard]: 500,
};

interface WhackaMoleGameProps {
  personalBest: number;
}

export function WhackaMoleGame({ personalBest }: WhackaMoleGameProps) {
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.easy);
  const [muted, setMuted] = useState(false);
  const [gameState, setGameState] = useState<"idle" | "playing" | "over">("idle");
  const [score, setScore] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [moles, setMoles] = useState<boolean[]>(Array(9).fill(false));
  const [timeLeft, setTimeLeft] = useState(DURATION[Difficulty.easy]);
  const [whackedCells, setWhackedCells] = useState<number[]>([]);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const moleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const moleRef = useRef<boolean[]>(Array(9).fill(false));

  const { mutateAsync: submitScore, isPending: isSubmitting } = useSubmitScore();

  const stopAll = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (moleTimerRef.current) clearInterval(moleTimerRef.current);
  }, []);

  const endGame = useCallback(() => {
    stopAll();
    setMoles(Array(9).fill(false));
    setGameState("over");
  }, [stopAll]);

  const startGame = useCallback(() => {
    stopAll();
    setMoles(Array(9).fill(false));
    moleRef.current = Array(9).fill(false);
    setScore(0);
    setSubmitted(false);
    setWhackedCells([]);
    const t = DURATION[difficulty];
    setTimeLeft(t);
    setGameState("playing");
  }, [difficulty, stopAll]);

  useEffect(() => {
    if (gameState !== "playing") return;

    // Countdown timer
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          endGame();
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    // Mole spawner
    const spawnMole = () => {
      const current = [...moleRef.current];
      // Hide a random active mole
      const active = current.map((m, i) => (m ? i : -1)).filter((i) => i >= 0);
      if (active.length > 0) {
        const hide = active[Math.floor(Math.random() * active.length)];
        current[hide] = false;
      }
      // Show a random inactive mole
      const inactive = current.map((m, i) => (!m ? i : -1)).filter((i) => i >= 0);
      if (inactive.length > 0) {
        const show = inactive[Math.floor(Math.random() * inactive.length)];
        current[show] = true;
      }
      moleRef.current = current;
      setMoles([...current]);
    };

    moleTimerRef.current = setInterval(spawnMole, MOLE_INTERVAL[difficulty]);
    spawnMole();

    return () => stopAll();
  }, [gameState, difficulty, endGame, stopAll]);

  const handleHoleClick = (index: number) => {
    if (gameState !== "playing") return;
    if (moles[index]) {
      sfx.whack(muted);
      setScore((s) => s + 10);
      setWhackedCells((prev) => [...prev, index]);
      setTimeout(() => setWhackedCells((prev) => prev.filter((i) => i !== index)), 200);
      const newMoles = [...moleRef.current];
      newMoles[index] = false;
      moleRef.current = newMoles;
      setMoles([...newMoles]);
    } else {
      sfx.miss(muted);
      setScore((s) => Math.max(0, s - 5));
    }
  };

  const handleSubmit = async () => {
    try {
      await submitScore({ game: "whacamole", score: BigInt(score), difficulty });
      setSubmitted(true);
      sfx.submit(muted);
      toast.success("Score submitted!", { description: `${score} pts on ${difficulty}` });
    } catch {
      toast.error("Failed to submit score");
    }
  };

  const timerPercent = (timeLeft / DURATION[difficulty]) * 100;

  return (
    <div className="flex flex-col h-full">
      <GameHeader
        title="WHACK-A-MOLE"
        emoji="🔨"
        score={score}
        difficulty={difficulty}
        onDifficultyChange={setDifficulty}
        muted={muted}
        onMuteToggle={() => setMuted((m) => !m)}
        gameActive={gameState === "playing"}
      />

      {/* Timer */}
      {gameState === "playing" && (
        <div className="h-1.5 bg-muted/30 mx-3 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{
              width: `${timerPercent}%`,
              backgroundColor: timerPercent > 50 ? "#00ff88" : timerPercent > 25 ? "#ffaa00" : "#ff4444",
            }}
          />
        </div>
      )}

      <div className="flex-1 flex flex-col items-center justify-center p-4 gap-4 relative">
        {gameState === "idle" && (
          <div className="text-center">
            <div className="pixel-font text-primary text-sm mb-2 text-glow-cyan animate-pulse-glow">
              WHACK-A-MOLE
            </div>
            <div className="text-muted-foreground text-sm font-display mb-6">
              Click moles to whack them! Avoid empty holes.
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

            <div className="grid grid-cols-3 gap-4">
              {moles.map((hasMole, i) => (
                <button
                  key={`hole-pos-${i.toString()}`}
                  type="button"
                  onClick={() => handleHoleClick(i)}
                  className={`w-24 h-24 sm:w-28 sm:h-28 rounded-full border-2 flex items-center justify-center text-4xl transition-all duration-100 cursor-pointer relative overflow-hidden ${
                    whackedCells.includes(i)
                      ? "bg-yellow-400/20 border-yellow-400/60 scale-90"
                      : hasMole
                      ? "bg-card/60 border-secondary/60 hover:border-secondary cursor-pointer"
                      : "bg-card/20 border-border/30 hover:border-border/50"
                  }`}
                  style={
                    hasMole
                      ? { boxShadow: "0 0 15px oklch(0.6 0.22 300 / 0.4)" }
                      : {}
                  }
                >
                  {/* Hole background */}
                  <div className="absolute inset-2 rounded-full bg-black/60 border border-border/20" />

                  {/* Mole */}
                  {hasMole && (
                    <div
                      className="absolute inset-0 flex items-center justify-center animate-mole-popup"
                      style={{ zIndex: 2 }}
                    >
                      🐹
                    </div>
                  )}
                  {whackedCells.includes(i) && (
                    <div className="absolute inset-0 flex items-center justify-center z-10 text-2xl">
                      ⭐
                    </div>
                  )}
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
            game="whacamole"
            difficulty={difficulty}
          />
        )}
      </div>
    </div>
  );
}
