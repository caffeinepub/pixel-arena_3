import { useState, useCallback, useEffect, useRef } from "react";
import { GameHeader } from "../components/GameHeader";
import { GameOver } from "../components/GameOver";
import { Difficulty, useSubmitScore } from "../hooks/useQueries";
import { sfx } from "../utils/audio";
import { toast } from "sonner";

const EMOJIS = ["🐉", "🦊", "🌟", "🎯", "🚀", "🎮", "💎", "🔥", "⚡", "🌈"];
const TIME: Record<Difficulty, number> = { [Difficulty.easy]: 90, [Difficulty.medium]: 60, [Difficulty.hard]: 45 };

function makeCards() {
  const pairs = [...EMOJIS, ...EMOJIS];
  return pairs.sort(() => Math.random() - 0.5).map((emoji, i) => ({ id: i, emoji, revealed: false, matched: false }));
}

interface CardMatchingGameProps { personalBest: number; }

export function CardMatchingGame({ personalBest }: CardMatchingGameProps) {
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.easy);
  const [muted, setMuted] = useState(false);
  const [gameState, setGameState] = useState<"idle" | "playing" | "over">("idle");
  const [score, setScore] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [cards, setCards] = useState(makeCards());
  const [flipped, setFlipped] = useState<number[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [locked, setLocked] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { mutateAsync: submitScore, isPending: isSubmitting } = useSubmitScore();
  const diffRef = useRef(difficulty);
  useEffect(() => { diffRef.current = difficulty; }, [difficulty]);

  const startGame = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    const newCards = makeCards();
    setCards(newCards);
    setFlipped([]);
    setLocked(false);
    setScore(0);
    setSubmitted(false);
    const t = TIME[diffRef.current];
    setTimeLeft(t);
    setGameState("playing");
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          setGameState("over");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const handleFlip = useCallback((id: number) => {
    if (locked || gameState !== "playing") return;
    setCards((prev) => {
      const card = prev.find((c) => c.id === id);
      if (!card || card.revealed || card.matched) return prev;
      return prev.map((c) => c.id === id ? { ...c, revealed: true } : c);
    });
    setFlipped((prev) => {
      if (prev.length === 0) return [id];
      if (prev.length === 1) {
        const firstId = prev[0];
        setCards((cardState) => {
          const first = cardState.find((c) => c.id === firstId);
          const second = cardState.find((c) => c.id === id);
          if (!first || !second) return cardState;
          if (first.emoji === second.emoji && firstId !== id) {
            sfx.eat(muted);
            const newCards = cardState.map((c) =>
              c.id === firstId || c.id === id ? { ...c, matched: true, revealed: true } : c
            );
            setFlipped([]);
            const matched = newCards.filter((c) => c.matched).length / 2;
            setScore(matched * 50);
            if (newCards.every((c) => c.matched)) {
              if (timerRef.current) clearInterval(timerRef.current);
              setTimeLeft((t) => {
                setScore(matched * 50 + t * 5);
                return t;
              });
              setTimeout(() => setGameState("over"), 500);
            }
            return newCards;
          } else {
            sfx.die(muted);
            setLocked(true);
            setTimeout(() => {
              setCards((cs) => cs.map((c) =>
                c.id === firstId || c.id === id ? { ...c, revealed: false } : c
              ));
              setFlipped([]);
              setLocked(false);
            }, 800);
            return cardState;
          }
        });
        return [id];
      }
      return prev;
    });
  }, [locked, gameState, muted]);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const handleSubmit = async () => {
    try {
      await submitScore({ game: "cardmatching", score: BigInt(score), difficulty });
      setSubmitted(true);
      sfx.submit(muted);
      toast.success("Score submitted!");
    } catch { toast.error("Failed to submit score"); }
  };

  return (
    <div className="flex flex-col h-full">
      <GameHeader title="CARD MATCHING" emoji="🃏" score={score} difficulty={difficulty} onDifficultyChange={setDifficulty} muted={muted} onMuteToggle={() => setMuted((m) => !m)} gameActive={gameState === "playing"} />
      <div className="flex-1 flex flex-col items-center justify-center p-4 gap-3 relative">
        {gameState === "idle" && (
          <div className="text-center">
            <div className="pixel-font text-primary text-sm mb-2 text-glow-cyan animate-pulse-glow">CARD MATCHING</div>
            <div className="text-muted-foreground text-xs font-display mb-6">Match all pairs before time runs out! 5×4 grid, 10 pairs.</div>
            <button type="button" onClick={startGame} className="btn-neon-cyan border px-6 py-3 pixel-font text-xs rounded">START GAME</button>
          </div>
        )}
        {gameState === "playing" && (
          <div className="text-center">
            <div className="text-xs font-display text-muted-foreground mb-2">⏱ {timeLeft}s</div>
            <div className="grid gap-1.5" style={{ gridTemplateColumns: "repeat(5, 1fr)" }}>
              {cards.map((card) => (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => handleFlip(card.id)}
                  className="rounded-lg font-bold text-2xl flex items-center justify-center transition-all duration-200 border"
                  style={{
                    width: 48, height: 48,
                    background: card.matched ? "rgba(0,255,136,0.1)" : card.revealed ? "rgba(0,245,255,0.12)" : "rgba(0,245,255,0.04)",
                    borderColor: card.matched ? "rgba(0,255,136,0.4)" : card.revealed ? "rgba(0,245,255,0.4)" : "rgba(0,245,255,0.1)",
                    cursor: card.matched ? "default" : "pointer",
                    transform: card.revealed || card.matched ? "rotateY(0deg)" : "rotateY(90deg)",
                  }}
                >
                  {card.revealed || card.matched ? card.emoji : "?"}
                </button>
              ))}
            </div>
          </div>
        )}
        {gameState === "over" && (
          <GameOver score={score} personalBest={Math.max(personalBest, submitted ? score : 0)} onSubmit={handleSubmit} onPlayAgain={startGame} isSubmitting={isSubmitting} submitted={submitted} game="cardmatching" difficulty={difficulty} />
        )}
      </div>
    </div>
  );
}
