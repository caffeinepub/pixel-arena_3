import { useState, useEffect, useRef, useCallback } from "react";
import { GameHeader } from "../components/GameHeader";
import { GameOver } from "../components/GameOver";
import { Difficulty, useSubmitScore } from "../hooks/useQueries";
import { sfx } from "../utils/audio";
import { toast } from "sonner";

const W = 360;
const H = 480;
const PLAYER_W = 30;
const PLAYER_H = 30;
const OBSTACLE_W = 28;
const OBSTACLE_H = 28;

const SPEED: Record<Difficulty, number> = { [Difficulty.easy]: 3, [Difficulty.medium]: 5, [Difficulty.hard]: 7 };

interface Obstacle { x: number; y: number; speed: number; emoji: string; }
const EMOJIS = ["🔥", "⚡", "💣", "🌑", "☄️", "🌪️"];

interface AvoidGameProps { personalBest: number; }

export function AvoidGame({ personalBest }: AvoidGameProps) {
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.easy);
  const [muted, setMuted] = useState(false);
  const [gameState, setGameState] = useState<"idle" | "playing" | "over">("idle");
  const [score, setScore] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const keysRef = useRef<Set<string>>(new Set());
  const diffRef = useRef(difficulty);
  useEffect(() => { diffRef.current = difficulty; }, [difficulty]);

  const stateRef = useRef({
    playerX: W / 2 - PLAYER_W / 2,
    obstacles: [] as Obstacle[],
    running: false,
    frame: 0,
    startTime: 0,
  });
  const { mutateAsync: submitScore, isPending: isSubmitting } = useSubmitScore();

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const s = stateRef.current;

    ctx.fillStyle = "#000814";
    ctx.fillRect(0, 0, W, H);

    // Player
    ctx.font = `${PLAYER_W}px serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("🚀", s.playerX + PLAYER_W / 2, H - 50);

    // Obstacles
    s.obstacles.forEach((o) => {
      ctx.font = `${OBSTACLE_W}px serif`;
      ctx.fillText(o.emoji, o.x + OBSTACLE_W / 2, o.y + OBSTACLE_H / 2);
    });

    // Score
    ctx.fillStyle = "#00f5ff";
    ctx.font = "bold 14px monospace";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    if (s.running) {
      const elapsed = Math.floor((Date.now() - s.startTime) / 1000);
      ctx.fillText(`${elapsed}s`, 8, 8);
    }
  }, []);

  const gameLoop = useCallback(() => {
    const s = stateRef.current;
    if (!s.running) return;
    s.frame++;

    const spd = 3;
    if (keysRef.current.has("ArrowLeft") || keysRef.current.has("a")) s.playerX = Math.max(0, s.playerX - spd);
    if (keysRef.current.has("ArrowRight") || keysRef.current.has("d")) s.playerX = Math.min(W - PLAYER_W, s.playerX + spd);

    // Spawn
    const obstSpeed = SPEED[diffRef.current];
    if (s.frame % 40 === 0) {
      s.obstacles.push({
        x: Math.random() * (W - OBSTACLE_W),
        y: -OBSTACLE_H,
        speed: obstSpeed + Math.random() * 2,
        emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
      });
    }

    s.obstacles = s.obstacles.map((o) => ({ ...o, y: o.y + o.speed })).filter((o) => o.y < H + 40);

    // Collision
    const px = s.playerX, py = H - 50 - PLAYER_H / 2;
    for (const o of s.obstacles) {
      if (o.x < px + PLAYER_W - 6 && o.x + OBSTACLE_W > px + 6 &&
          o.y < py + PLAYER_H - 6 && o.y + OBSTACLE_H > py + 6) {
        s.running = false;
        sfx.die(muted);
        const elapsed = Math.floor((Date.now() - s.startTime) / 1000);
        setScore(elapsed);
        setGameState("over");
        return;
      }
    }

    draw();
    rafRef.current = requestAnimationFrame(gameLoop);
  }, [draw, muted]);

  const startGame = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    const s = stateRef.current;
    s.playerX = W / 2 - PLAYER_W / 2;
    s.obstacles = [];
    s.running = true;
    s.frame = 0;
    s.startTime = Date.now();
    setScore(0);
    setSubmitted(false);
    setGameState("playing");
    rafRef.current = requestAnimationFrame(gameLoop);
  }, [gameLoop]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => keysRef.current.add(e.key);
    const up = (e: KeyboardEvent) => keysRef.current.delete(e.key);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onTouch = (e: TouchEvent) => {
      const rect = canvas.getBoundingClientRect();
      stateRef.current.playerX = (e.touches[0].clientX - rect.left) * (W / rect.width) - PLAYER_W / 2;
    };
    canvas.addEventListener("touchmove", onTouch, { passive: true });
    return () => canvas.removeEventListener("touchmove", onTouch);
  }, []);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);
  useEffect(() => { if (gameState === "idle") draw(); }, [gameState, draw]);

  const handleSubmit = async () => {
    try {
      await submitScore({ game: "avoidgame", score: BigInt(score), difficulty });
      setSubmitted(true);
      sfx.submit(muted);
      toast.success("Score submitted!");
    } catch { toast.error("Failed to submit score"); }
  };

  return (
    <div className="flex flex-col h-full">
      <GameHeader title="AVOID!" emoji="🚀" score={score} difficulty={difficulty} onDifficultyChange={setDifficulty} muted={muted} onMuteToggle={() => setMuted((m) => !m)} gameActive={gameState === "playing"} />
      <div className="flex-1 flex flex-col items-center justify-center p-4 gap-3 relative">
        <div className="relative">
          <canvas ref={canvasRef} width={W} height={H} className="border border-primary/30 rounded" style={{ maxWidth: "100%", maxHeight: "65vh", display: "block" }} />
          {gameState === "idle" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm rounded">
              <div className="pixel-font text-primary text-sm mb-2 text-glow-cyan animate-pulse-glow">AVOID!</div>
              <div className="text-muted-foreground text-xs font-display mb-6 text-center">Dodge falling objects with ←→. Survive as long as possible!</div>
              <button type="button" onClick={startGame} className="btn-neon-cyan border px-6 py-3 pixel-font text-xs rounded">START GAME</button>
            </div>
          )}
          {gameState === "over" && (
            <GameOver score={score} personalBest={Math.max(personalBest, submitted ? score : 0)} onSubmit={handleSubmit} onPlayAgain={startGame} isSubmitting={isSubmitting} submitted={submitted} game="avoidgame" difficulty={difficulty} />
          )}
        </div>
        <div className="text-xs text-muted-foreground font-display">←→ / A-D or touch to dodge</div>
      </div>
    </div>
  );
}
