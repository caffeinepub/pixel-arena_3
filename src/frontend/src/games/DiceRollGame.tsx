import { useState, useCallback } from "react";
import { GameHeader } from "../components/GameHeader";
import { GameOver } from "../components/GameOver";
import { Difficulty, useSubmitScore } from "../hooks/useQueries";
import { sfx } from "../utils/audio";
import { toast } from "sonner";

const DICE_FACES = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
const TOTAL_ROUNDS = 5;
const DICE_COUNT = 5;

function rollDice(): number[] {
  return Array.from({ length: DICE_COUNT }, () => Math.floor(Math.random() * 6) + 1);
}

const BONUSES: Record<Difficulty, number> = {
  [Difficulty.easy]: 0,
  [Difficulty.medium]: 5,
  [Difficulty.hard]: 10,
};

interface DiceRollGameProps { personalBest: number; }

export function DiceRollGame({ personalBest }: DiceRollGameProps) {
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.easy);
  const [muted, setMuted] = useState(false);
  const [gameState, setGameState] = useState<"idle" | "playing" | "over">("idle");
  const [score, setScore] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [round, setRound] = useState(0);
  const [dice, setDice] = useState<number[]>([]);
  const [roundTotal, setRoundTotal] = useState(0);
  const [rolling, setRolling] = useState(false);
  const [history, setHistory] = useState<number[]>([]);

  const { mutateAsync: submitScore, isPending: isSubmitting } = useSubmitScore();

  const startGame = useCallback(() => {
    setScore(0);
    setRound(0);
    setDice([]);
    setRoundTotal(0);
    setHistory([]);
    setSubmitted(false);
    setGameState("playing");
  }, []);

  const roll = useCallback(() => {
    if (rolling || gameState !== "playing") return;
    setRolling(true);
    sfx.eat(muted);
    // Animate
    let count = 0;
    const id = setInterval(() => {
      setDice(rollDice());
      count++;
      if (count >= 8) {
        clearInterval(id);
        const final = rollDice();
        setDice(final);
        const total = final.reduce((a, b) => a + b, 0);
        const bonus = BONUSES[difficulty];
        const roundScore = total + bonus;
        setRoundTotal(roundScore);
        setHistory((h) => [...h, roundScore]);
        setScore((s) => s + roundScore);
        setRolling(false);
        const newRound = round + 1;
        setRound(newRound);
        if (newRound >= TOTAL_ROUNDS) {
          setTimeout(() => setGameState("over"), 800);
        }
      }
    }, 80);
  }, [rolling, gameState, muted, difficulty, round]);

  const handleSubmit = async () => {
    try {
      await submitScore({ game: "diceroll", score: BigInt(score), difficulty });
      setSubmitted(true);
      sfx.submit(muted);
      toast.success("Score submitted!");
    } catch { toast.error("Failed to submit score"); }
  };

  return (
    <div className="flex flex-col h-full">
      <GameHeader title="DICE ROLL" emoji="🎲" score={score} difficulty={difficulty} onDifficultyChange={setDifficulty} muted={muted} onMuteToggle={() => setMuted((m) => !m)} gameActive={gameState === "playing"} />
      <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6 relative">
        {gameState === "idle" && (
          <div className="text-center">
            <div className="pixel-font text-primary text-sm mb-2 text-glow-cyan animate-pulse-glow">DICE ROLL</div>
            <div className="text-muted-foreground text-xs font-display mb-6">Roll 5 dice, 5 rounds. Score = total pips!</div>
            <button type="button" onClick={startGame} className="btn-neon-cyan border px-6 py-3 pixel-font text-xs rounded">START GAME</button>
          </div>
        )}
        {gameState === "playing" && (
          <div className="text-center w-full max-w-sm">
            <div className="text-xs font-display text-muted-foreground mb-4">Round {round + 1} / {TOTAL_ROUNDS}</div>
            <div className="flex justify-center gap-3 mb-6">
              {(dice.length ? dice : [0,0,0,0,0]).map((d, i) => {
                const dieKey = `die-${i}`;
                return (
                  <div
                    key={dieKey}
                    className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl border-2 transition-all"
                    style={{
                      borderColor: "rgba(0,245,255,0.3)",
                      background: "rgba(0,245,255,0.06)",
                      transform: rolling ? `rotate(${Math.random() * 20 - 10}deg)` : "none",
                    }}
                  >
                    {d > 0 ? DICE_FACES[d - 1] : "?"}
                  </div>
                );
              })}
            </div>
            {roundTotal > 0 && !rolling && (
              <div className="text-xl font-display font-bold mb-4" style={{ color: "#ffcc00" }}>
                Round total: {roundTotal}
              </div>
            )}
            {history.length > 0 && (
              <div className="flex gap-2 justify-center mb-4">
                {history.map((h, i) => {
                  const histKey = `hist-${i}`;
                  return (
                    <div key={histKey} className="text-xs font-display px-2 py-1 rounded border" style={{ borderColor: "rgba(0,245,255,0.2)", color: "#00f5ff" }}>
                      R{i+1}: {h}
                    </div>
                  );
                })}
              </div>
            )}
            {round < TOTAL_ROUNDS && (
              <button
                type="button"
                onClick={roll}
                disabled={rolling}
                className="btn-neon-cyan border px-8 py-3 pixel-font text-xs rounded w-full"
              >
                {rolling ? "ROLLING..." : round === 0 ? "🎲 ROLL!" : "🎲 ROLL AGAIN!"}
              </button>
            )}
          </div>
        )}
        {gameState === "over" && (
          <GameOver score={score} personalBest={Math.max(personalBest, submitted ? score : 0)} onSubmit={handleSubmit} onPlayAgain={startGame} isSubmitting={isSubmitting} submitted={submitted} game="diceroll" difficulty={difficulty} />
        )}
      </div>
    </div>
  );
}
