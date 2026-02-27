import { useState, useCallback, useRef } from "react";
import { GameHeader } from "../components/GameHeader";
import { GameOver } from "../components/GameOver";
import { Difficulty, useSubmitScore } from "../hooks/useQueries";
import { sfx } from "../utils/audio";
import { toast } from "sonner";

function generateNumber(digits: number): string {
  let num = "";
  for (let i = 0; i < digits; i++) {
    num += i === 0 ? String(Math.floor(Math.random() * 9) + 1) : String(Math.floor(Math.random() * 10));
  }
  return num;
}

const SHOW_TIME: Record<Difficulty, number> = {
  [Difficulty.easy]: 3000,
  [Difficulty.medium]: 2000,
  [Difficulty.hard]: 1200,
};

interface NumberMemoryGameProps { personalBest: number; }

export function NumberMemoryGame({ personalBest }: NumberMemoryGameProps) {
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.easy);
  const [muted, setMuted] = useState(false);
  const [gameState, setGameState] = useState<"idle" | "showing" | "input" | "over">("idle");
  const [score, setScore] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [currentNumber, setCurrentNumber] = useState("");
  const [input, setInput] = useState("");
  const [digits, setDigits] = useState(3);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { mutateAsync: submitScore, isPending: isSubmitting } = useSubmitScore();

  const startRound = useCallback((numDigits: number) => {
    const num = generateNumber(numDigits);
    setCurrentNumber(num);
    setInput("");
    setFeedback(null);
    setGameState("showing");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setGameState("input");
    }, SHOW_TIME[difficulty]);
  }, [difficulty]);

  const startGame = useCallback(() => {
    setDigits(3);
    setScore(0);
    setSubmitted(false);
    startRound(3);
  }, [startRound]);

  const handleGuess = useCallback(() => {
    if (input.trim() === currentNumber) {
      sfx.eat(muted);
      setFeedback("correct");
      const newDigits = digits + 1;
      const newScore = (newDigits - 3) * 100;
      setScore(newScore);
      setDigits(newDigits);
      setTimeout(() => startRound(newDigits), 800);
    } else {
      sfx.die(muted);
      setFeedback("wrong");
      setTimeout(() => {
        setScore(Math.max(0, (digits - 3) * 100));
        setGameState("over");
      }, 800);
    }
  }, [input, currentNumber, digits, muted, startRound]);

  const handleSubmit = async () => {
    try {
      await submitScore({ game: "numbermemory", score: BigInt(score), difficulty });
      setSubmitted(true);
      sfx.submit(muted);
      toast.success("Score submitted!");
    } catch { toast.error("Failed to submit score"); }
  };

  return (
    <div className="flex flex-col h-full">
      <GameHeader title="NUMBER MEMORY" emoji="🔢" score={score} difficulty={difficulty} onDifficultyChange={setDifficulty} muted={muted} onMuteToggle={() => setMuted((m) => !m)} gameActive={gameState !== "idle" && gameState !== "over"} />
      <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6 relative">
        {gameState === "idle" && (
          <div className="text-center">
            <div className="pixel-font text-primary text-sm mb-2 text-glow-cyan animate-pulse-glow">NUMBER MEMORY</div>
            <div className="text-muted-foreground text-xs font-display mb-6">Memorize the number, then type it back. Gets longer each round!</div>
            <button type="button" onClick={startGame} className="btn-neon-cyan border px-6 py-3 pixel-font text-xs rounded">START GAME</button>
          </div>
        )}
        {gameState === "showing" && (
          <div className="text-center">
            <div className="text-xs font-display text-muted-foreground mb-4">{digits} digits — memorize!</div>
            <div
              className="pixel-font text-4xl tracking-widest"
              style={{ color: "#ffcc00", textShadow: "0 0 20px #ffcc0088" }}
            >
              {currentNumber}
            </div>
          </div>
        )}
        {gameState === "input" && (
          <div className="w-full max-w-xs text-center">
            <div className="text-xs font-display text-muted-foreground mb-4">Type the number you saw ({digits} digits)</div>
            {feedback !== null && (
              <div className={`pixel-font text-sm mb-3 ${feedback === "correct" ? "text-accent" : "text-destructive"}`}>
                {feedback === "correct" ? "✓ CORRECT!" : `✗ It was: ${currentNumber}`}
              </div>
            )}
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value.replace(/\D/g, ""))}
              onKeyDown={(e) => { if (e.key === "Enter") handleGuess(); }}
              maxLength={20}
              className="w-full px-4 py-3 rounded-lg bg-black/30 border border-primary/30 text-center font-mono text-2xl text-foreground outline-none focus:border-primary/60 tracking-widest mb-4"
              placeholder="?????"
            />
            <button type="button" onClick={handleGuess} className="btn-neon-cyan border px-8 py-2 pixel-font text-xs rounded w-full">
              SUBMIT
            </button>
          </div>
        )}
        {gameState === "over" && (
          <GameOver score={score} personalBest={Math.max(personalBest, submitted ? score : 0)} onSubmit={handleSubmit} onPlayAgain={startGame} isSubmitting={isSubmitting} submitted={submitted} game="numbermemory" difficulty={difficulty} />
        )}
      </div>
    </div>
  );
}
