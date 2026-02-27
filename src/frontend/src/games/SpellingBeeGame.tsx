import { useState, useCallback, useEffect, useRef } from "react";
import { GameHeader } from "../components/GameHeader";
import { GameOver } from "../components/GameOver";
import { Difficulty, useSubmitScore } from "../hooks/useQueries";
import { sfx } from "../utils/audio";
import { toast } from "sonner";

const GAME_TIME = 90;

const PUZZLES = [
  { center: "A", letters: ["A", "R", "T", "E", "S", "I", "N"], words: ["ART", "RAT", "RATS", "STAR", "TARS", "RAIN", "RAINS", "TRAIN", "TRAINS", "STRAIN", "RETAINS", "NASTIER", "ANTSIER", "STAINER", "STEARIN"] },
  { center: "E", letters: ["E", "L", "P", "S", "T", "A", "C"], words: ["ALE", "APE", "ACE", "CAP", "CAT", "EAT", "LAP", "LAT", "PEA", "PET", "SAC", "SAP", "SAT", "SEA", "SET", "TAP", "CAPE", "CASE", "CLAP", "LACE", "LEAP", "PACE", "PEAT", "PLEA", "SLAP", "TAPE", "PLEAT", "SPATE", "ECLATS"] },
  { center: "O", letters: ["O", "G", "L", "D", "N", "E", "S"], words: ["DOG", "GOD", "LOG", "OLD", "SEL", "DOE", "EGO", "GEL", "GON", "DOGS", "GODS", "GELS", "LOGE", "NODE", "LONG", "DONG", "DOES", "DONE", "GONE", "LEGEND", "GOLDEN", "LONGED"] },
];

const MIN_WORD_LEN: Record<Difficulty, number> = { [Difficulty.easy]: 3, [Difficulty.medium]: 4, [Difficulty.hard]: 5 };

interface SpellingBeeGameProps { personalBest: number; }

export function SpellingBeeGame({ personalBest }: SpellingBeeGameProps) {
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.easy);
  const [muted, setMuted] = useState(false);
  const [gameState, setGameState] = useState<"idle" | "playing" | "over">("idle");
  const [score, setScore] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [puzzle, setPuzzle] = useState(PUZZLES[0]);
  const [input, setInput] = useState("");
  const [found, setFound] = useState<Set<string>>(new Set());
  const [timeLeft, setTimeLeft] = useState(GAME_TIME);
  const [feedback, setFeedback] = useState<{ msg: string; ok: boolean } | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const diffRef = useRef(difficulty);
  useEffect(() => { diffRef.current = difficulty; }, [difficulty]);

  const { mutateAsync: submitScore, isPending: isSubmitting } = useSubmitScore();

  const startGame = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    const p = PUZZLES[Math.floor(Math.random() * PUZZLES.length)];
    setPuzzle(p);
    setFound(new Set());
    setInput("");
    setFeedback(null);
    setScore(0);
    setSubmitted(false);
    setTimeLeft(GAME_TIME);
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

  const handleSubmit2 = useCallback(() => {
    const word = input.trim().toUpperCase();
    setInput("");
    const minLen = MIN_WORD_LEN[diffRef.current];
    if (word.length < minLen) { setFeedback({ msg: `Min ${minLen} letters!`, ok: false }); return; }
    if (!word.includes(puzzle.center)) { setFeedback({ msg: `Must use "${puzzle.center}"!`, ok: false }); return; }
    if (![...word].every((ch) => puzzle.letters.includes(ch))) { setFeedback({ msg: "Invalid letters!", ok: false }); return; }
    if (found.has(word)) { setFeedback({ msg: "Already found!", ok: false }); return; }
    if (!puzzle.words.includes(word)) { setFeedback({ msg: "Not a word!", ok: false }); sfx.die(muted); return; }
    sfx.eat(muted);
    const pts = word.length;
    setFound((f) => new Set([...f, word]));
    setScore((s) => s + pts);
    setFeedback({ msg: `+${pts} pts: ${word}`, ok: true });
  }, [input, puzzle, found, muted]);

  const handleLetterClick = useCallback((letter: string) => {
    setInput((i) => i + letter);
  }, []);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const handleSubmit = async () => {
    try {
      await submitScore({ game: "spellingbee", score: BigInt(score), difficulty });
      setSubmitted(true);
      sfx.submit(muted);
      toast.success("Score submitted!");
    } catch { toast.error("Failed to submit score"); }
  };

  const timerPct = (timeLeft / GAME_TIME) * 100;

  return (
    <div className="flex flex-col h-full">
      <GameHeader title="SPELLING BEE" emoji="🐝" score={score} difficulty={difficulty} onDifficultyChange={setDifficulty} muted={muted} onMuteToggle={() => setMuted((m) => !m)} gameActive={gameState === "playing"} />
      <div className="flex-1 flex flex-col items-center justify-center p-4 gap-4 relative overflow-auto">
        {gameState === "idle" && (
          <div className="text-center">
            <div className="pixel-font text-primary text-sm mb-2 text-glow-cyan animate-pulse-glow">SPELLING BEE</div>
            <div className="text-muted-foreground text-xs font-display mb-6 max-w-xs text-center">Make words using the given letters. Center letter required! 90 seconds.</div>
            <button type="button" onClick={startGame} className="btn-neon-cyan border px-6 py-3 pixel-font text-xs rounded">START GAME</button>
          </div>
        )}
        {gameState === "playing" && (
          <div className="w-full max-w-sm text-center">
            <div className="w-full h-1.5 rounded-full bg-white/10 mb-3 overflow-hidden">
              <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${timerPct}%`, background: timerPct > 40 ? "#ffcc00" : "#ff0066" }} />
            </div>
            <div className="text-xs font-display text-muted-foreground mb-3">⏱ {timeLeft}s · Found: {found.size}</div>

            {/* Honeycomb letters */}
            <div className="flex flex-wrap justify-center gap-2 mb-4">
              {puzzle.letters.map((l, i) => {
                const lKey = `letter-${i}-${l}`;
                return (
                  <button
                    key={lKey}
                    type="button"
                    onClick={() => handleLetterClick(l)}
                    className="w-10 h-10 rounded-xl font-bold text-lg font-display border-2 transition-all hover:scale-110"
                    style={{
                      background: l === puzzle.center ? "rgba(255,204,0,0.2)" : "rgba(0,245,255,0.06)",
                      borderColor: l === puzzle.center ? "#ffcc00" : "rgba(0,245,255,0.3)",
                      color: l === puzzle.center ? "#ffcc00" : "#00f5ff",
                    }}
                  >
                    {l}
                  </button>
                );
              })}
            </div>

            {feedback && (
              <div className={`text-sm font-display mb-2 ${feedback.ok ? "text-accent" : "text-muted-foreground"}`}>
                {feedback.msg}
              </div>
            )}

            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value.toUpperCase())}
                onKeyDown={(e) => { if (e.key === "Enter") handleSubmit2(); }}
                className="flex-1 px-3 py-2 rounded-lg bg-black/30 border border-primary/30 text-center font-mono text-lg text-foreground outline-none focus:border-primary/60 uppercase tracking-widest"
                placeholder="TYPE WORD"
              />
              <button type="button" onClick={handleSubmit2} className="btn-neon-cyan border px-3 py-2 pixel-font text-xs rounded">✓</button>
              <button type="button" onClick={() => setInput("")} className="px-3 py-2 rounded-lg border font-display text-sm" style={{ borderColor: "rgba(255,255,255,0.1)", color: "#666" }}>✕</button>
            </div>

            {found.size > 0 && (
              <div className="flex flex-wrap gap-1 justify-center max-h-20 overflow-y-auto">
                {[...found].map((w) => (
                  <span key={w} className="text-xs px-2 py-0.5 rounded-full font-display" style={{ background: "rgba(0,255,136,0.1)", color: "#00ff88", border: "1px solid rgba(0,255,136,0.2)" }}>{w}</span>
                ))}
              </div>
            )}
          </div>
        )}
        {gameState === "over" && (
          <GameOver score={score} personalBest={Math.max(personalBest, submitted ? score : 0)} onSubmit={handleSubmit} onPlayAgain={startGame} isSubmitting={isSubmitting} submitted={submitted} game="spellingbee" difficulty={difficulty} />
        )}
      </div>
    </div>
  );
}
