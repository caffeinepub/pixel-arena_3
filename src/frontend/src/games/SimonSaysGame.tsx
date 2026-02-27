import { useState, useCallback, useRef } from "react";
import { GameHeader } from "../components/GameHeader";
import { GameOver } from "../components/GameOver";
import { Difficulty, useSubmitScore } from "../hooks/useQueries";
import { sfx } from "../utils/audio";
import { toast } from "sonner";

const BUTTONS = [
  { id: 0, color: "#ff0066", label: "RED" },
  { id: 1, color: "#00f5ff", label: "CYAN" },
  { id: 2, color: "#00ff88", label: "GREEN" },
  { id: 3, color: "#ffcc00", label: "YELLOW" },
];

const FLASH_DURATION: Record<Difficulty, number> = {
  [Difficulty.easy]: 500,
  [Difficulty.medium]: 350,
  [Difficulty.hard]: 220,
};

interface SimonSaysGameProps { personalBest: number; }

export function SimonSaysGame({ personalBest }: SimonSaysGameProps) {
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.easy);
  const [muted, setMuted] = useState(false);
  const [gameState, setGameState] = useState<"idle" | "showing" | "input" | "over">("idle");
  const [score, setScore] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [sequence, setSequence] = useState<number[]>([]);
  const [playerIndex, setPlayerIndex] = useState(0);
  const [activeBtn, setActiveBtn] = useState<number | null>(null);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { mutateAsync: submitScore, isPending: isSubmitting } = useSubmitScore();

  const flashSequence = useCallback((seq: number[], flashDur: number, onDone: () => void) => {
    let i = 0;
    const next = () => {
      if (i >= seq.length) { onDone(); return; }
      setActiveBtn(seq[i]);
      sfx.eat(muted);
      timerRef.current = setTimeout(() => {
        setActiveBtn(null);
        timerRef.current = setTimeout(() => { i++; next(); }, flashDur * 0.4);
      }, flashDur);
    };
    timerRef.current = setTimeout(next, 600);
  }, [muted]);

  const startGame = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const first = Math.floor(Math.random() * 4);
    const seq = [first];
    setSequence(seq);
    setPlayerIndex(0);
    setScore(0);
    setSubmitted(false);
    setGameState("showing");
    flashSequence(seq, FLASH_DURATION[difficulty], () => {
      setPlayerIndex(0);
      setGameState("input");
    });
  }, [difficulty, flashSequence]);

  const handlePress = useCallback((btnId: number) => {
    if (gameState !== "input") return;
    setActiveBtn(btnId);
    setTimeout(() => setActiveBtn(null), 150);

    if (btnId !== sequence[playerIndex]) {
      sfx.die(muted);
      setGameState("over");
      return;
    }
    sfx.eat(muted);
    const nextIdx = playerIndex + 1;
    if (nextIdx >= sequence.length) {
      // Round complete
      const newScore = sequence.length * 100;
      setScore(newScore);
      const nextSeq = [...sequence, Math.floor(Math.random() * 4)];
      setSequence(nextSeq);
      setGameState("showing");
      flashSequence(nextSeq, FLASH_DURATION[difficulty], () => {
        setPlayerIndex(0);
        setGameState("input");
      });
    } else {
      setPlayerIndex(nextIdx);
    }
  }, [gameState, sequence, playerIndex, muted, difficulty, flashSequence]);

  const handleSubmit = async () => {
    try {
      await submitScore({ game: "simonsays", score: BigInt(score), difficulty });
      setSubmitted(true);
      sfx.submit(muted);
      toast.success("Score submitted!");
    } catch { toast.error("Failed to submit score"); }
  };

  return (
    <div className="flex flex-col h-full">
      <GameHeader title="SIMON SAYS" emoji="🔴" score={score} difficulty={difficulty} onDifficultyChange={setDifficulty} muted={muted} onMuteToggle={() => setMuted((m) => !m)} gameActive={gameState === "showing" || gameState === "input"} />
      <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6 relative">
        {gameState === "idle" && (
          <div className="text-center">
            <div className="pixel-font text-primary text-sm mb-2 text-glow-cyan animate-pulse-glow">SIMON SAYS</div>
            <div className="text-muted-foreground text-xs font-display mb-6 text-center">Watch the sequence, repeat it. Each round adds one!</div>
            <button type="button" onClick={startGame} className="btn-neon-cyan border px-6 py-3 pixel-font text-xs rounded">START GAME</button>
          </div>
        )}
        {(gameState === "showing" || gameState === "input") && (
          <div className="w-full max-w-xs text-center">
            <div className="text-xs font-display text-muted-foreground mb-4">
              {gameState === "showing" ? "Watch..." : `Repeat! (${playerIndex + 1}/${sequence.length})`}
            </div>
            <div className="grid grid-cols-2 gap-4">
              {BUTTONS.map((btn) => (
                <button
                  key={btn.id}
                  type="button"
                  onClick={() => handlePress(btn.id)}
                  disabled={gameState === "showing"}
                  className="h-24 rounded-2xl font-bold text-sm font-display border-2 transition-all duration-100"
                  style={{
                    background: activeBtn === btn.id ? btn.color : `${btn.color}22`,
                    borderColor: activeBtn === btn.id ? btn.color : `${btn.color}55`,
                    color: btn.color,
                    boxShadow: activeBtn === btn.id ? `0 0 30px ${btn.color}88` : "none",
                    opacity: gameState === "showing" ? 0.6 : 1,
                  }}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>
        )}
        {gameState === "over" && (
          <GameOver score={score} personalBest={Math.max(personalBest, submitted ? score : 0)} onSubmit={handleSubmit} onPlayAgain={startGame} isSubmitting={isSubmitting} submitted={submitted} game="simonsays" difficulty={difficulty} />
        )}
      </div>
    </div>
  );
}
