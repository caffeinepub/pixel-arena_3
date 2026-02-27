import { useState, useEffect, useCallback, useRef } from "react";
import { GameHeader } from "../components/GameHeader";
import { GameOver } from "../components/GameOver";
import { Difficulty, useSubmitScore } from "../hooks/useQueries";
import { sfx } from "../utils/audio";
import { toast } from "sonner";

const GAME_TIME = 30;

function makeQuestion(difficulty: Difficulty): { q: string; answer: number; choices: number[] } {
  let a: number, b: number, op: string, answer: number;
  if (difficulty === Difficulty.easy) {
    a = Math.floor(Math.random() * 10) + 1;
    b = Math.floor(Math.random() * 10) + 1;
    op = Math.random() < 0.5 ? "+" : "-";
    answer = op === "+" ? a + b : a - b;
  } else if (difficulty === Difficulty.medium) {
    a = Math.floor(Math.random() * 12) + 1;
    b = Math.floor(Math.random() * 12) + 1;
    op = Math.random() < 0.33 ? "+" : Math.random() < 0.5 ? "-" : "×";
    answer = op === "+" ? a + b : op === "-" ? a - b : a * b;
  } else {
    a = Math.floor(Math.random() * 20) + 2;
    b = Math.floor(Math.random() * 15) + 2;
    op = Math.random() < 0.25 ? "+" : Math.random() < 0.5 ? "-" : Math.random() < 0.75 ? "×" : "÷";
    if (op === "÷") { answer = a; a = a * b; } else answer = op === "+" ? a + b : op === "-" ? a - b : a * b;
  }
  const q = `${a} ${op} ${b}`;
  const choices = new Set<number>([answer]);
  while (choices.size < 4) {
    const offset = Math.floor(Math.random() * 10) - 5;
    if (offset !== 0) choices.add(answer + offset);
  }
  return { q, answer, choices: [...choices].sort(() => Math.random() - 0.5) };
}

interface MathQuizGameProps { personalBest: number; }

export function MathQuizGame({ personalBest }: MathQuizGameProps) {
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.easy);
  const [muted, setMuted] = useState(false);
  const [gameState, setGameState] = useState<"idle" | "playing" | "over">("idle");
  const [score, setScore] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(GAME_TIME);
  const [question, setQuestion] = useState(() => makeQuestion(Difficulty.easy));
  const [feedback, setFeedback] = useState<number | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const diffRef = useRef(difficulty);
  useEffect(() => { diffRef.current = difficulty; }, [difficulty]);

  const { mutateAsync: submitScore, isPending: isSubmitting } = useSubmitScore();

  const startGame = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setScore(0);
    setTimeLeft(GAME_TIME);
    setFeedback(null);
    setSubmitted(false);
    setQuestion(makeQuestion(diffRef.current));
    setGameState("playing");
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          setGameState("over");
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }, []);

  const handleAnswer = useCallback((choice: number) => {
    if (gameState !== "playing") return;
    setFeedback(choice);
    if (choice === question.answer) {
      sfx.eat(muted);
      setScore((s) => s + 10);
    } else {
      sfx.die(muted);
    }
    setTimeout(() => {
      setFeedback(null);
      setQuestion(makeQuestion(diffRef.current));
    }, 350);
  }, [gameState, question.answer, muted]);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const handleSubmit = async () => {
    try {
      await submitScore({ game: "mathquiz", score: BigInt(score), difficulty });
      setSubmitted(true);
      sfx.submit(muted);
      toast.success("Score submitted!");
    } catch { toast.error("Failed to submit score"); }
  };

  const timerPct = (timeLeft / GAME_TIME) * 100;

  return (
    <div className="flex flex-col h-full">
      <GameHeader title="MATH QUIZ" emoji="🧮" score={score} difficulty={difficulty} onDifficultyChange={setDifficulty} muted={muted} onMuteToggle={() => setMuted((m) => !m)} gameActive={gameState === "playing"} />
      <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6 relative">
        {gameState === "idle" && (
          <div className="text-center">
            <div className="pixel-font text-primary text-sm mb-2 text-glow-cyan animate-pulse-glow">MATH QUIZ</div>
            <div className="text-muted-foreground text-xs font-display mb-6 text-center">30 seconds of rapid arithmetic. Pick the right answer!</div>
            <button type="button" onClick={startGame} className="btn-neon-cyan border px-6 py-3 pixel-font text-xs rounded">START GAME</button>
          </div>
        )}
        {gameState === "playing" && (
          <div className="w-full max-w-sm text-center">
            {/* Timer bar */}
            <div className="w-full h-2 rounded-full bg-white/10 mb-6 overflow-hidden">
              <div className="h-full rounded-full transition-all duration-1000"
                style={{ width: `${timerPct}%`, background: timerPct > 50 ? "#00f5ff" : timerPct > 20 ? "#ffcc00" : "#ff0066" }} />
            </div>
            <div className="pixel-font text-3xl text-foreground mb-8" style={{ color: "#ffcc00", textShadow: "0 0 12px #ffcc0088" }}>
              {question.q} = ?
            </div>
            <div className="grid grid-cols-2 gap-3">
              {question.choices.map((c) => {
                const isCorrect = feedback !== null && c === question.answer;
                const isWrong = feedback === c && c !== question.answer;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => handleAnswer(c)}
                    className="py-4 rounded-xl font-bold text-xl font-display transition-all duration-150 border"
                    style={{
                      background: isCorrect ? "rgba(0,255,136,0.2)" : isWrong ? "rgba(255,0,102,0.2)" : "rgba(0,245,255,0.05)",
                      borderColor: isCorrect ? "#00ff88" : isWrong ? "#ff0066" : "rgba(0,245,255,0.2)",
                      color: isCorrect ? "#00ff88" : isWrong ? "#ff0066" : "#e0e0e0",
                    }}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {gameState === "over" && (
          <GameOver score={score} personalBest={Math.max(personalBest, submitted ? score : 0)} onSubmit={handleSubmit} onPlayAgain={startGame} isSubmitting={isSubmitting} submitted={submitted} game="mathquiz" difficulty={difficulty} />
        )}
      </div>
    </div>
  );
}
