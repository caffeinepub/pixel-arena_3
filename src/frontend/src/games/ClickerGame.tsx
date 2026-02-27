import { useState, useEffect, useCallback, useRef } from "react";
import { GameHeader } from "../components/GameHeader";
import { GameOver } from "../components/GameOver";
import { Difficulty, useSubmitScore } from "../hooks/useQueries";
import { sfx } from "../utils/audio";
import { toast } from "sonner";

const GAME_TIME = 60;

interface Upgrade { id: string; name: string; cost: number; cps: number; count: number; }

const BASE_UPGRADES: Upgrade[] = [
  { id: "cursor", name: "Auto Cursor", cost: 10, cps: 0.1, count: 0 },
  { id: "farm", name: "Cookie Farm", cost: 50, cps: 0.5, count: 0 },
  { id: "factory", name: "Factory", cost: 200, cps: 2, count: 0 },
  { id: "mine", name: "Cookie Mine", cost: 1000, cps: 8, count: 0 },
];

const CLICK_BONUS: Record<Difficulty, number> = { [Difficulty.easy]: 1, [Difficulty.medium]: 2, [Difficulty.hard]: 5 };

interface ClickerGameProps { personalBest: number; }

export function ClickerGame({ personalBest }: ClickerGameProps) {
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.easy);
  const [muted, setMuted] = useState(false);
  const [gameState, setGameState] = useState<"idle" | "playing" | "over">("idle");
  const [score, setScore] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [cookies, setCookies] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_TIME);
  const [upgrades, setUpgrades] = useState<Upgrade[]>(BASE_UPGRADES.map(u => ({...u})));
  const [clickEffect, setClickEffect] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cpsRef = useRef(0);
  const diffRef = useRef(difficulty);
  useEffect(() => { diffRef.current = difficulty; }, [difficulty]);

  const { mutateAsync: submitScore, isPending: isSubmitting } = useSubmitScore();

  const startGame = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setCookies(0);
    setTimeLeft(GAME_TIME);
    setUpgrades(BASE_UPGRADES.map(u => ({...u})));
    cpsRef.current = 0;
    setScore(0);
    setSubmitted(false);
    setGameState("playing");
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          setCookies((c) => { setScore(Math.floor(c)); return c; });
          setGameState("over");
          return 0;
        }
        // Apply CPS
        setCookies((c) => c + cpsRef.current / 10);
        return t - 1;
      });
    }, 100);
  }, []);

  const handleClick = useCallback(() => {
    if (gameState !== "playing") return;
    const bonus = CLICK_BONUS[diffRef.current];
    setCookies((c) => c + bonus);
    sfx.eat(muted);
    setClickEffect(true);
    setTimeout(() => setClickEffect(false), 100);
  }, [gameState, muted]);

  const buyUpgrade = useCallback((idx: number) => {
    setUpgrades((prev) => {
      const upg = prev[idx];
      setCookies((c) => {
        if (c < upg.cost) return c;
        cpsRef.current += upg.cps;
        const newUpgrades = prev.map((u, i) => i === idx ? { ...u, count: u.count + 1, cost: Math.floor(u.cost * 1.15) } : u);
        setUpgrades(newUpgrades);
        sfx.eat(muted);
        return c - upg.cost;
      });
      return prev;
    });
  }, [muted]);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const handleSubmit = async () => {
    try {
      await submitScore({ game: "clicker", score: BigInt(score), difficulty });
      setSubmitted(true);
      sfx.submit(muted);
      toast.success("Score submitted!");
    } catch { toast.error("Failed to submit score"); }
  };

  return (
    <div className="flex flex-col h-full">
      <GameHeader title="COOKIE CLICKER" emoji="🍪" score={Math.floor(cookies)} difficulty={difficulty} onDifficultyChange={setDifficulty} muted={muted} onMuteToggle={() => setMuted((m) => !m)} gameActive={gameState === "playing"} />
      <div className="flex-1 flex flex-col items-center justify-center p-4 gap-4 relative">
        {gameState === "idle" && (
          <div className="text-center">
            <div className="pixel-font text-primary text-sm mb-2 text-glow-cyan animate-pulse-glow">COOKIE CLICKER</div>
            <div className="text-muted-foreground text-xs font-display mb-6">Click to earn cookies. Buy upgrades. 60 seconds!</div>
            <button type="button" onClick={startGame} className="btn-neon-cyan border px-6 py-3 pixel-font text-xs rounded">START GAME</button>
          </div>
        )}
        {gameState === "playing" && (
          <div className="w-full max-w-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-display text-muted-foreground">⏱ {timeLeft}s</div>
              <div className="text-xs font-display" style={{ color: "#ffcc00" }}>CPS: {cpsRef.current.toFixed(1)}</div>
            </div>
            <div className="flex gap-4">
              {/* Cookie button */}
              <div className="flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={handleClick}
                  className="rounded-full transition-all duration-75 select-none"
                  style={{
                    width: 100, height: 100,
                    fontSize: 56,
                    background: clickEffect ? "rgba(255,204,0,0.2)" : "rgba(255,204,0,0.06)",
                    border: `2px solid ${clickEffect ? "#ffcc00" : "rgba(255,204,0,0.3)"}`,
                    boxShadow: clickEffect ? "0 0 30px #ffcc0066" : "none",
                    transform: clickEffect ? "scale(0.93)" : "scale(1)",
                  }}
                >
                  🍪
                </button>
                <div className="text-xs font-display" style={{ color: "#ffcc00" }}>
                  +{CLICK_BONUS[difficulty]}/click
                </div>
              </div>
              {/* Upgrades */}
              <div className="flex-1 flex flex-col gap-2">
                {upgrades.map((u, idx) => {
                  const canAfford = cookies >= u.cost;
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => buyUpgrade(idx)}
                      disabled={!canAfford}
                      className="flex items-center justify-between px-3 py-2 rounded-lg border text-xs font-display transition-all"
                      style={{
                        borderColor: canAfford ? "rgba(0,255,136,0.4)" : "rgba(255,255,255,0.1)",
                        background: canAfford ? "rgba(0,255,136,0.06)" : "rgba(255,255,255,0.02)",
                        color: canAfford ? "#00ff88" : "#555",
                        cursor: canAfford ? "pointer" : "not-allowed",
                      }}
                    >
                      <span>{u.name} ({u.count})</span>
                      <span>{u.cost} 🍪</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="text-center mt-3 text-2xl font-bold" style={{ color: "#ffcc00" }}>
              {Math.floor(cookies).toLocaleString()} cookies
            </div>
          </div>
        )}
        {gameState === "over" && (
          <GameOver score={score} personalBest={Math.max(personalBest, submitted ? score : 0)} onSubmit={handleSubmit} onPlayAgain={startGame} isSubmitting={isSubmitting} submitted={submitted} game="clicker" difficulty={difficulty} />
        )}
      </div>
    </div>
  );
}
