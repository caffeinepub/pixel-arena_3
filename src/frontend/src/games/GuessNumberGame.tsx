import { useState, useCallback } from "react";
import { GameHeader } from "../components/GameHeader";
import { GameOver } from "../components/GameOver";
import { Difficulty, useSubmitScore } from "../hooks/useQueries";
import { sfx } from "../utils/audio";
import { toast } from "sonner";

const TOTAL_ROUNDS = 3;
const MAX_RANGE: Record<Difficulty, number> = { [Difficulty.easy]: 50, [Difficulty.medium]: 100, [Difficulty.hard]: 200 };

interface GuessNumberGameProps { personalBest: number; }

export function GuessNumberGame({ personalBest }: GuessNumberGameProps) {
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.easy);
  const [muted, setMuted] = useState(false);
  const [gameState, setGameState] = useState<"idle" | "playing" | "over">("idle");
  const [score, setScore] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [secret, setSecret] = useState(0);
  const [input, setInput] = useState("");
  const [guesses, setGuesses] = useState(0);
  const [hint, setHint] = useState("");
  const [round, setRound] = useState(0);
  const [roundScores, setRoundScores] = useState<number[]>([]);

  const { mutateAsync: submitScore, isPending: isSubmitting } = useSubmitScore();

  const startRound = useCallback((roundNum: number, currentScore: number) => {
    const range = MAX_RANGE[difficulty];
    setSecret(Math.floor(Math.random() * range) + 1);
    setInput("");
    setGuesses(0);
    setHint(`Guess 1-${range}`);
    setRound(roundNum);
    void currentScore;
  }, [difficulty]);

  const startGame = useCallback(() => {
    setScore(0);
    setRoundScores([]);
    setSubmitted(false);
    setGameState("playing");
    startRound(0, 0);
  }, [startRound]);

  const handleGuess = useCallback(() => {
    const num = parseInt(input, 10);
    const range = MAX_RANGE[difficulty];
    if (isNaN(num) || num < 1 || num > range) { setHint(`Enter a number between 1 and ${range}`); return; }
    const newGuesses = guesses + 1;
    setGuesses(newGuesses);
    setInput("");
    if (num === secret) {
      sfx.eat(muted);
      const pts = Math.max(0, 100 - (newGuesses - 1) * 10);
      const newScore = score + pts;
      setScore(newScore);
      setRoundScores((r) => [...r, pts]);
      setHint(`✓ Correct in ${newGuesses} guess${newGuesses > 1 ? "es" : ""}! +${pts} pts`);
      const nextRound = round + 1;
      if (nextRound >= TOTAL_ROUNDS) {
        setTimeout(() => { setScore(newScore); setGameState("over"); }, 1000);
      } else {
        setTimeout(() => startRound(nextRound, newScore), 1000);
      }
    } else if (num < secret) {
      sfx.die(muted);
      setHint(`📈 Higher! (${newGuesses} guesses)`);
    } else {
      sfx.die(muted);
      setHint(`📉 Lower! (${newGuesses} guesses)`);
    }
  }, [input, difficulty, guesses, secret, muted, score, round, startRound]);

  const handleSubmit = async () => {
    try {
      await submitScore({ game: "guessnumber", score: BigInt(score), difficulty });
      setSubmitted(true);
      sfx.submit(muted);
      toast.success("Score submitted!");
    } catch { toast.error("Failed to submit score"); }
  };

  return (
    <div className="flex flex-col h-full">
      <GameHeader title="GUESS NUMBER" emoji="🔢" score={score} difficulty={difficulty} onDifficultyChange={setDifficulty} muted={muted} onMuteToggle={() => setMuted((m) => !m)} gameActive={gameState === "playing"} />
      <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6 relative">
        {gameState === "idle" && (
          <div className="text-center">
            <div className="pixel-font text-primary text-sm mb-2 text-glow-cyan animate-pulse-glow">GUESS NUMBER</div>
            <div className="text-muted-foreground text-xs font-display mb-6">3 rounds. Fewer guesses = more points. Score up to 100 per round!</div>
            <button type="button" onClick={startGame} className="btn-neon-cyan border px-6 py-3 pixel-font text-xs rounded">START GAME</button>
          </div>
        )}
        {gameState === "playing" && (
          <div className="w-full max-w-xs text-center">
            <div className="text-xs font-display text-muted-foreground mb-4">Round {round + 1} / {TOTAL_ROUNDS}</div>
            <div
              className="text-xl font-display mb-6 px-4 py-3 rounded-lg border"
              style={{ borderColor: "rgba(0,245,255,0.2)", color: hint.startsWith("✓") ? "#00ff88" : "#e0e0e0", minHeight: 56 }}
            >
              {hint}
            </div>
            {roundScores.length > 0 && (
              <div className="flex gap-2 justify-center mb-4">
                {roundScores.map((s, i) => {
                  const rsKey = `rs-${i}`;
                  return (
                    <div key={rsKey} className="text-xs font-display px-2 py-1 rounded border" style={{ borderColor: "rgba(0,255,136,0.2)", color: "#00ff88" }}>
                      R{i+1}: {s}pts
                    </div>
                  );
                })}
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="number"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleGuess(); }}
                min={1}
                max={MAX_RANGE[difficulty]}
                className="flex-1 px-4 py-3 rounded-lg bg-black/30 border border-primary/30 text-center font-mono text-xl text-foreground outline-none focus:border-primary/60"
                placeholder="?"
              />
              <button type="button" onClick={handleGuess} className="btn-neon-cyan border px-4 py-3 pixel-font text-xs rounded">GO</button>
            </div>
          </div>
        )}
        {gameState === "over" && (
          <GameOver score={score} personalBest={Math.max(personalBest, submitted ? score : 0)} onSubmit={handleSubmit} onPlayAgain={startGame} isSubmitting={isSubmitting} submitted={submitted} game="guessnumber" difficulty={difficulty} />
        )}
      </div>
    </div>
  );
}
