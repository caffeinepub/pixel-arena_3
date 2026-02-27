import { useState, useCallback } from "react";
import { GameHeader } from "../components/GameHeader";
import { GameOver } from "../components/GameOver";
import { Difficulty, useSubmitScore } from "../hooks/useQueries";
import { sfx } from "../utils/audio";
import { toast } from "sonner";

const COLORS = [
  { name: "RED", value: "#ff0066" },
  { name: "BLUE", value: "#00aaff" },
  { name: "GREEN", value: "#00ff88" },
  { name: "YELLOW", value: "#ffcc00" },
  { name: "PURPLE", value: "#bf00ff" },
  { name: "CYAN", value: "#00f5ff" },
];

const TOTAL_ROUNDS = 20;

function makeRound() {
  const inkColor = COLORS[Math.floor(Math.random() * COLORS.length)];
  let wordColor = COLORS[Math.floor(Math.random() * COLORS.length)];
  while (wordColor.name === inkColor.name) wordColor = COLORS[Math.floor(Math.random() * COLORS.length)];
  return { inkColor, wordColor };
}

interface ColorMatchGameProps { personalBest: number; }

export function ColorMatchGame({ personalBest }: ColorMatchGameProps) {
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.easy);
  const [muted, setMuted] = useState(false);
  const [gameState, setGameState] = useState<"idle" | "playing" | "over">("idle");
  const [score, setScore] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [round, setRound] = useState(0);
  const [currentRound, setCurrentRound] = useState(makeRound());
  const [feedback, setFeedback] = useState<string | null>(null);

  const { mutateAsync: submitScore, isPending: isSubmitting } = useSubmitScore();

  const startGame = useCallback(() => {
    setScore(0);
    setRound(0);
    setCurrentRound(makeRound());
    setFeedback(null);
    setSubmitted(false);
    setGameState("playing");
  }, []);

  const handleChoice = useCallback((colorName: string) => {
    if (gameState !== "playing" || feedback !== null) return;
    const correct = colorName === currentRound.inkColor.name;
    setFeedback(colorName);
    if (correct) {
      sfx.eat(muted);
      setScore((s) => s + 10);
    } else {
      sfx.die(muted);
    }
    setTimeout(() => {
      const nextRound = round + 1;
      if (nextRound >= TOTAL_ROUNDS) {
        setGameState("over");
      } else {
        setRound(nextRound);
        setCurrentRound(makeRound());
        setFeedback(null);
      }
    }, 400);
  }, [gameState, feedback, currentRound, round, muted]);

  const handleSubmit = async () => {
    try {
      await submitScore({ game: "colormatch", score: BigInt(score), difficulty });
      setSubmitted(true);
      sfx.submit(muted);
      toast.success("Score submitted!");
    } catch { toast.error("Failed to submit score"); }
  };

  return (
    <div className="flex flex-col h-full">
      <GameHeader title="COLOR MATCH" emoji="🎨" score={score} difficulty={difficulty} onDifficultyChange={setDifficulty} muted={muted} onMuteToggle={() => setMuted((m) => !m)} gameActive={gameState === "playing"} />
      <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6 relative">
        {gameState === "idle" && (
          <div className="text-center">
            <div className="pixel-font text-primary text-sm mb-2 text-glow-cyan animate-pulse-glow">COLOR MATCH</div>
            <div className="text-muted-foreground text-xs font-display mb-2 max-w-xs text-center">Click the color of the INK — not the word!</div>
            <div className="font-bold text-2xl mb-6" style={{ color: "#ff0066" }}>BLUE</div>
            <button type="button" onClick={startGame} className="btn-neon-cyan border px-6 py-3 pixel-font text-xs rounded">START GAME</button>
          </div>
        )}
        {gameState === "playing" && (
          <div className="w-full max-w-sm text-center">
            <div className="text-xs font-display text-muted-foreground mb-4">Round {round + 1} / {TOTAL_ROUNDS}</div>
            <div className="mb-8">
              <div className="text-xs font-display text-muted-foreground mb-2">What color is the INK?</div>
              <div
                className="font-bold leading-none select-none"
                style={{ fontSize: "clamp(2rem, 8vw, 3.5rem)", color: currentRound.inkColor.value }}
              >
                {currentRound.wordColor.name}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {COLORS.map((c) => {
                const isSelected = feedback === c.name;
                const isCorrect = isSelected && c.name === currentRound.inkColor.name;
                const isWrong = isSelected && c.name !== currentRound.inkColor.name;
                return (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => handleChoice(c.name)}
                    className="py-3 rounded-xl font-bold text-sm font-display border transition-all duration-150"
                    style={{
                      background: isCorrect ? "rgba(0,255,136,0.2)" : isWrong ? "rgba(255,0,102,0.2)" : `${c.value}22`,
                      borderColor: isCorrect ? "#00ff88" : isWrong ? "#ff0066" : `${c.value}88`,
                      color: c.value,
                    }}
                  >
                    {c.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {gameState === "over" && (
          <GameOver score={score} personalBest={Math.max(personalBest, submitted ? score : 0)} onSubmit={handleSubmit} onPlayAgain={startGame} isSubmitting={isSubmitting} submitted={submitted} game="colormatch" difficulty={difficulty} />
        )}
      </div>
    </div>
  );
}
