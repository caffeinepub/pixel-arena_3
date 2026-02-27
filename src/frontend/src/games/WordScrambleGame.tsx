import { useState, useEffect, useCallback, useRef } from "react";
import { GameHeader } from "../components/GameHeader";
import { GameOver } from "../components/GameOver";
import { Difficulty, useSubmitScore } from "../hooks/useQueries";
import { sfx } from "../utils/audio";
import { toast } from "sonner";

const WORDS = [
  "FLAME", "STORM", "PIXEL", "SWIFT", "BRAVE", "CRANE", "GHOST", "LUCID", "PRISM", "SIGMA",
  "THINK", "BLAZE", "FROST", "GLIDE", "SPARK", "QUEST", "RHYME", "SLICE", "TOWER", "VENOM",
  "WRATH", "YIELD", "ZOOMS", "PLUMB", "CRISP", "DWARF", "ELBOW", "FJORD", "GLYPH", "KNACK",
];

const TIME: Record<Difficulty, number> = { [Difficulty.easy]: 20, [Difficulty.medium]: 12, [Difficulty.hard]: 8 };

function scramble(word: string): string {
  const arr = word.split("");
  let tries = 0;
  do {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    tries++;
  } while (arr.join("") === word && tries < 10);
  return arr.join("");
}

interface WordScrambleGameProps { personalBest: number; }

export function WordScrambleGame({ personalBest }: WordScrambleGameProps) {
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.easy);
  const [muted, setMuted] = useState(false);
  const [gameState, setGameState] = useState<"idle" | "playing" | "over">("idle");
  const [score, setScore] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  const [round, setRound] = useState(0);
  const [currentWord, setCurrentWord] = useState("");
  const [scrambled, setScrambled] = useState("");
  const [input, setInput] = useState("");
  const [timeLeft, setTimeLeft] = useState(0);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [usedWords, setUsedWords] = useState<Set<number>>(new Set());

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { mutateAsync: submitScore, isPending: isSubmitting } = useSubmitScore();

  const ROUNDS = 10;

  const nextRound = useCallback((roundNum: number, used: Set<number>, currentScore: number) => {
    if (roundNum >= ROUNDS) {
      setGameState("over");
      setScore(currentScore);
      return;
    }
    let idx: number;
    do { idx = Math.floor(Math.random() * WORDS.length); } while (used.has(idx));
    const newUsed = new Set(used);
    newUsed.add(idx);
    const word = WORDS[idx];
    setCurrentWord(word);
    setScrambled(scramble(word));
    setInput("");
    setFeedback(null);
    setTimeLeft(TIME[difficulty]);
    setRound(roundNum);
    setUsedWords(newUsed);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          sfx.die(muted);
          setFeedback("wrong");
          setTimeout(() => nextRound(roundNum + 1, newUsed, currentScore), 800);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }, [difficulty, muted]);

  const startGame = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setScore(0);
    setSubmitted(false);
    setUsedWords(new Set());
    setGameState("playing");
    nextRound(0, new Set(), 0);
  }, [nextRound]);

  const handleGuess = useCallback(() => {
    if (input.trim().toUpperCase() !== currentWord) {
      sfx.die(muted);
      setFeedback("wrong");
      return;
    }
    if (timerRef.current) clearInterval(timerRef.current);
    sfx.eat(muted);
    setFeedback("correct");
    const pts = timeLeft * 10;
    setScore((s) => {
      const newScore = s + pts;
      setTimeout(() => nextRound(round + 1, usedWords, newScore), 600);
      return newScore;
    });
  }, [input, currentWord, timeLeft, round, usedWords, muted, nextRound]);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const handleSubmit = async () => {
    try {
      await submitScore({ game: "wordscramble", score: BigInt(score), difficulty });
      setSubmitted(true);
      sfx.submit(muted);
      toast.success("Score submitted!");
    } catch { toast.error("Failed to submit score"); }
  };

  return (
    <div className="flex flex-col h-full">
      <GameHeader title="WORD SCRAMBLE" emoji="🔤" score={score} difficulty={difficulty} onDifficultyChange={setDifficulty} muted={muted} onMuteToggle={() => setMuted((m) => !m)} gameActive={gameState === "playing"} />
      <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6 relative">
        {gameState === "idle" && (
          <div className="text-center">
            <div className="pixel-font text-primary text-sm mb-2 text-glow-cyan animate-pulse-glow">WORD SCRAMBLE</div>
            <div className="text-muted-foreground text-xs font-display mb-6 text-center">Unscramble 10 words. Faster = more points!</div>
            <button type="button" onClick={startGame} className="btn-neon-cyan border px-6 py-3 pixel-font text-xs rounded">START GAME</button>
          </div>
        )}
        {gameState === "playing" && (
          <div className="w-full max-w-sm text-center">
            <div className="text-xs font-display text-muted-foreground mb-4">Round {round + 1} / {ROUNDS}</div>
            <div
              className="pixel-font text-4xl mb-6 tracking-widest"
              style={{ color: feedback === "correct" ? "#00ff88" : feedback === "wrong" ? "#ff0066" : "#ffcc00" }}
            >
              {scrambled}
            </div>
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 rounded-full flex items-center justify-center border-2 pixel-font text-xl"
                style={{ borderColor: timeLeft > 5 ? "#00f5ff" : "#ff0066", color: timeLeft > 5 ? "#00f5ff" : "#ff0066" }}>
                {timeLeft}
              </div>
            </div>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value.toUpperCase())}
              onKeyDown={(e) => { if (e.key === "Enter") handleGuess(); }}
              maxLength={7}
              className="w-full px-4 py-3 rounded-lg bg-black/30 border border-primary/30 text-center font-mono text-xl text-foreground outline-none focus:border-primary/60 uppercase tracking-widest mb-4"
              placeholder="TYPE ANSWER"

            />
            <button
              type="button"
              onClick={handleGuess}
              className="btn-neon-cyan border px-8 py-2 pixel-font text-xs rounded w-full"
            >
              SUBMIT
            </button>
          </div>
        )}
        {gameState === "over" && (
          <GameOver score={score} personalBest={Math.max(personalBest, submitted ? score : 0)} onSubmit={handleSubmit} onPlayAgain={startGame} isSubmitting={isSubmitting} submitted={submitted} game="wordscramble" difficulty={difficulty} />
        )}
      </div>
    </div>
  );
}
