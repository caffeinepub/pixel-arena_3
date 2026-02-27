import { useState, useEffect, useRef, useCallback } from "react";
import { GameHeader } from "../components/GameHeader";
import { GameOver } from "../components/GameOver";
import { Difficulty, useSubmitScore } from "../hooks/useQueries";
import { sfx } from "../utils/audio";
import { toast } from "sonner";

const ROUNDS = 5;

type ReactionState = "idle" | "waiting" | "ready" | "clicked" | "fake" | "over";

interface RoundResult {
  time: number;
  score: number;
  fake?: boolean;
}

interface ReactionGameProps {
  personalBest: number;
}

export function ReactionGame({ personalBest }: ReactionGameProps) {
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.easy);
  const [muted, setMuted] = useState(false);
  const [phase, setPhase] = useState<ReactionState>("idle");
  const [round, setRound] = useState(0);
  const [results, setResults] = useState<RoundResult[]>([]);
  const [totalScore, setTotalScore] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [startTime, setStartTime] = useState(0);
  const [lastReactionMs, setLastReactionMs] = useState<number | null>(null);
  const [message, setMessage] = useState("");

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { mutateAsync: submitScore, isPending: isSubmitting } = useSubmitScore();

  const clearTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const startRound = useCallback(
    (roundNum: number) => {
      clearTimer();
      setPhase("waiting");
      setLastReactionMs(null);
      setMessage("Wait for green...");

      // Fake flashes on hard
      const doFakes = difficulty === Difficulty.hard;
      const maxFakes = doFakes ? Math.floor(Math.random() * 3) : 0;
      let fakesDone = 0;

      const scheduleFake = () => {
        if (fakesDone >= maxFakes) {
          scheduleReal();
          return;
        }
        const delay = 600 + Math.random() * 1200;
        timerRef.current = setTimeout(() => {
          fakesDone++;
          setPhase("fake");
          setMessage("FAKE! Don't click!");
          timerRef.current = setTimeout(() => {
            setPhase("waiting");
            setMessage("Wait for green...");
            scheduleFake();
          }, 500);
        }, delay);
      };

      const scheduleReal = () => {
        const minDelay = difficulty === Difficulty.easy ? 1000 : difficulty === Difficulty.medium ? 800 : 600;
        const maxDelay = difficulty === Difficulty.easy ? 3000 : difficulty === Difficulty.medium ? 2500 : 2000;
        const delay = minDelay + Math.random() * (maxDelay - minDelay);
        timerRef.current = setTimeout(() => {
          sfx.reaction(muted);
          setPhase("ready");
          setStartTime(Date.now());
          setMessage("CLICK NOW!");
        }, delay);
      };

      if (doFakes) scheduleFake();
      else scheduleReal();

      void roundNum;
    },
    [difficulty, muted, clearTimer]
  );

  const handleScreenClick = useCallback(() => {
    if (phase === "waiting") {
      // Too early
      sfx.die(muted);
      setMessage("Too early! -50 pts");
      setResults((prev) => [...prev, { time: 0, score: -50 }]);
      setTotalScore((s) => Math.max(0, s - 50));
      setPhase("clicked");

      const nextRound = round + 1;
      setRound(nextRound);
      if (nextRound >= ROUNDS) {
        timerRef.current = setTimeout(() => setPhase("over"), 1000);
      } else {
        timerRef.current = setTimeout(() => startRound(nextRound), 1200);
      }
    } else if (phase === "fake") {
      sfx.die(muted);
      setMessage("That was a fake! -50 pts");
      setResults((prev) => [...prev, { time: 0, score: -50, fake: true }]);
      setTotalScore((s) => Math.max(0, s - 50));
      setPhase("clicked");

      const nextRound = round + 1;
      setRound(nextRound);
      if (nextRound >= ROUNDS) {
        timerRef.current = setTimeout(() => setPhase("over"), 1000);
      } else {
        timerRef.current = setTimeout(() => startRound(nextRound), 1200);
      }
    } else if (phase === "ready") {
      clearTimer();
      const ms = Date.now() - startTime;
      const roundScore = Math.max(0, 1000 - ms);
      setLastReactionMs(ms);
      setResults((prev) => [...prev, { time: ms, score: roundScore }]);
      setTotalScore((s) => s + roundScore);
      setMessage(`${ms}ms — ${roundScore} pts!`);
      setPhase("clicked");

      const nextRound = round + 1;
      setRound(nextRound);
      if (nextRound >= ROUNDS) {
        timerRef.current = setTimeout(() => setPhase("over"), 1200);
      } else {
        timerRef.current = setTimeout(() => startRound(nextRound), 1200);
      }
    }
  }, [phase, muted, round, startTime, startRound, clearTimer]);

  const startGame = useCallback(() => {
    clearTimer();
    setRound(0);
    setResults([]);
    setTotalScore(0);
    setSubmitted(false);
    setLastReactionMs(null);
    startRound(0);
  }, [clearTimer, startRound]);

  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  const handleSubmit = async () => {
    try {
      await submitScore({ game: "reaction", score: BigInt(totalScore), difficulty });
      setSubmitted(true);
      sfx.submit(muted);
      toast.success("Score submitted!", { description: `${totalScore} pts on ${difficulty}` });
    } catch {
      toast.error("Failed to submit score");
    }
  };

  const getBgColor = () => {
    if (phase === "ready") return "rgba(0, 80, 0, 0.9)";
    if (phase === "fake") return "rgba(80, 0, 0, 0.9)";
    if (phase === "waiting") return "rgba(80, 60, 0, 0.9)";
    if (phase === "clicked") return "rgba(0, 30, 60, 0.9)";
    return "transparent";
  };

  return (
    <div className="flex flex-col h-full">
      <GameHeader
        title="REACTION TEST"
        emoji="⚡"
        score={totalScore}
        difficulty={difficulty}
        onDifficultyChange={setDifficulty}
        muted={muted}
        onMuteToggle={() => setMuted((m) => !m)}
        gameActive={phase !== "idle" && phase !== "over"}
      />

      <div className="flex-1 flex flex-col items-center justify-center p-4 relative">
        {phase === "idle" && (
          <div className="text-center">
            <div className="pixel-font text-primary text-sm mb-2 text-glow-cyan animate-pulse-glow">
              REACTION TEST
            </div>
            <div className="text-muted-foreground text-sm font-display mb-2">
              Wait for the screen to turn GREEN, then click!
            </div>
            <div className="text-muted-foreground text-xs font-display mb-6">
              {ROUNDS} rounds • Score up to 1000 per round
            </div>
            <button
              type="button"
              onClick={startGame}
              className="btn-neon-cyan border px-6 py-3 pixel-font text-xs rounded"
            >
              START
            </button>
          </div>
        )}

        {phase !== "idle" && phase !== "over" && (
          <button
            type="button"
            onClick={handleScreenClick}
            className="w-full max-w-lg h-64 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all duration-100 border-2"
            style={{
              backgroundColor: getBgColor(),
              borderColor: phase === "ready" ? "#00ff88" : phase === "fake" ? "#ff4444" : "#555",
              boxShadow: phase === "ready" ? "0 0 40px rgba(0, 255, 136, 0.5)" : "none",
            }}
          >
            <div className="pixel-font text-2xl mb-4" style={{
              color: phase === "ready" ? "#00ff88" : phase === "fake" ? "#ff4444" : "#aaa",
            }}>
              {phase === "ready" ? "CLICK!" : phase === "waiting" ? "..." : phase === "fake" ? "FAKE!" : "✓"}
            </div>
            <div className="font-display text-foreground/80 text-lg">{message}</div>
            {lastReactionMs !== null && phase === "clicked" && (
              <div className="font-display text-2xl font-bold text-primary mt-2">
                {lastReactionMs}ms
              </div>
            )}
          </button>
        )}

        {/* Round indicators */}
        {phase !== "idle" && phase !== "over" && (
          <div className="flex gap-2 mt-4">
            {Array.from({ length: ROUNDS }, (_, i) => {
              const dotNum = i + 1;
              return (
                <div
                  key={`round-dot-${dotNum}`}
                  className="w-3 h-3 rounded-full border transition-all"
                  style={{
                    backgroundColor: i < results.length
                      ? results[i].score > 0 ? "oklch(0.82 0.2 145)" : "oklch(0.65 0.22 25)"
                      : i === round ? "oklch(0.85 0.18 195)" : "transparent",
                    borderColor: i <= round ? "oklch(0.85 0.18 195 / 0.6)" : "oklch(0.3 0.04 260)",
                  }}
                />
              );
            })}
          </div>
        )}

        {/* Results */}
        {results.length > 0 && phase !== "over" && (
          <div className="mt-4 grid grid-cols-5 gap-2">
            {results.map((r, i) => {
              const roundLabel = i + 1;
              return (
                <div key={`result-r${roundLabel}`} className="text-center text-xs font-display">
                  <div className="text-muted-foreground">R{roundLabel}</div>
                  <div className={r.score > 0 ? "text-accent" : "text-destructive"}>
                    {r.fake ? "FAKE" : r.time === 0 ? "EARLY" : `${r.time}ms`}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {phase === "over" && (
          <GameOver
            score={totalScore}
            personalBest={Math.max(personalBest, submitted ? totalScore : 0)}
            onSubmit={handleSubmit}
            onPlayAgain={startGame}
            isSubmitting={isSubmitting}
            submitted={submitted}
            game="reaction"
            difficulty={difficulty}
          />
        )}
      </div>
    </div>
  );
}
