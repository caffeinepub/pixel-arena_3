import { useState, useEffect, useCallback, useRef } from "react";
import { GameHeader } from "../components/GameHeader";
import { GameOver } from "../components/GameOver";
import { Difficulty, useSubmitScore } from "../hooks/useQueries";
import { sfx } from "../utils/audio";
import { toast } from "sonner";

const SENTENCES: Record<Difficulty, string[]> = {
  [Difficulty.easy]: [
    "The quick brown fox jumps over the lazy dog",
    "Pack my box with five dozen liquor jugs",
    "How vexingly quick daft zebras jump",
    "The five boxing wizards jump quickly",
    "Sphinx of black quartz judge my vow",
  ],
  [Difficulty.medium]: [
    "Bright vixens jump dozy fowl quack",
    "The job requires extra pluck and zeal from every young wage earner",
    "Sixty zippers were quickly picked from the woven jute bag",
    "A wizard's job is to vex chumps quickly in fog",
    "Five quacking zephyrs jolt my wax bed",
  ],
  [Difficulty.hard]: [
    "Cozy lummox gives smart squid who asks for job pen",
    "Crazy Frederick bought many very exquisite opal jewels",
    "The quick onyx goblin jumps over the lazy dwarf",
    "Amazingly few discotheques provide jukeboxes",
    "My girl wove six dozen plaid jackets before she quit",
  ],
};

interface TypingSpeedGameProps { personalBest: number; }

export function TypingSpeedGame({ personalBest }: TypingSpeedGameProps) {
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.easy);
  const [muted, setMuted] = useState(false);
  const [gameState, setGameState] = useState<"idle" | "playing" | "over">("idle");
  const [score, setScore] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [sentence, setSentence] = useState("");
  const [typed, setTyped] = useState("");
  const [startTime, setStartTime] = useState(0);
  const [wpm, setWpm] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const { mutateAsync: submitScore, isPending: isSubmitting } = useSubmitScore();
  const diffRef = useRef(difficulty);
  useEffect(() => { diffRef.current = difficulty; }, [difficulty]);

  const startGame = useCallback(() => {
    const sents = SENTENCES[diffRef.current];
    const sent = sents[Math.floor(Math.random() * sents.length)];
    setSentence(sent);
    setTyped("");
    setWpm(0);
    setSubmitted(false);
    setScore(0);
    setStartTime(0);
    setGameState("playing");
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const handleInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (gameState !== "playing") return;
    const val = e.target.value;
    if (startTime === 0 && val.length === 1) setStartTime(Date.now());
    setTyped(val);
    if (val === sentence) {
      const elapsed = (Date.now() - startTime) / 1000 / 60;
      const words = sentence.split(" ").length;
      const calculatedWpm = Math.round(words / elapsed);
      setWpm(calculatedWpm);
      setScore(calculatedWpm);
      sfx.eat(muted);
      setGameState("over");
    }
  }, [gameState, sentence, startTime, muted]);

  const handleSubmit = async () => {
    try {
      await submitScore({ game: "typingspeed", score: BigInt(score), difficulty });
      setSubmitted(true);
      sfx.submit(muted);
      toast.success("Score submitted!");
    } catch { toast.error("Failed to submit score"); }
  };

  const getCharClass = (i: number) => {
    if (i >= typed.length) return "text-muted-foreground";
    return typed[i] === sentence[i] ? "text-accent" : "text-destructive";
  };

  return (
    <div className="flex flex-col h-full">
      <GameHeader title="TYPING SPEED" emoji="⌨️" score={wpm} difficulty={difficulty} onDifficultyChange={setDifficulty} muted={muted} onMuteToggle={() => setMuted((m) => !m)} gameActive={gameState === "playing"} />
      <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6 relative">
        {gameState === "idle" && (
          <div className="text-center">
            <div className="pixel-font text-primary text-sm mb-2 text-glow-cyan animate-pulse-glow">TYPING SPEED</div>
            <div className="text-muted-foreground text-xs font-display mb-6">Type the sentence as fast as you can. Score = WPM!</div>
            <button type="button" onClick={startGame} className="btn-neon-cyan border px-6 py-3 pixel-font text-xs rounded">START GAME</button>
          </div>
        )}
        {gameState === "playing" && (
          <div className="w-full max-w-lg text-center">
            <div className="p-6 rounded-xl border border-primary/20 bg-black/30 mb-6 font-mono text-xl leading-loose tracking-wide">
              {sentence.split("").map((char, i) => {
                const charKey = `${i}-${char}`;
                return <span key={charKey} className={`transition-colors ${getCharClass(i)}`}>{char}</span>;
              })}
            </div>
            <input
              ref={inputRef}
              type="text"
              value={typed}
              onChange={handleInput}
              className="w-full px-4 py-3 rounded-lg bg-black/30 border border-primary/30 text-foreground font-mono text-lg outline-none focus:border-primary/60"
              placeholder="Start typing..."
              spellCheck={false}
            />
          </div>
        )}
        {gameState === "over" && (
          <div className="text-center">
            <div className="pixel-font text-accent text-2xl mb-2">{wpm} WPM</div>
            <GameOver score={score} personalBest={Math.max(personalBest, submitted ? score : 0)} onSubmit={handleSubmit} onPlayAgain={startGame} isSubmitting={isSubmitting} submitted={submitted} game="typingspeed" difficulty={difficulty} />
          </div>
        )}
      </div>
    </div>
  );
}
