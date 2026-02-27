import { useState, useEffect, useRef, useCallback } from "react";
import { GameHeader } from "../components/GameHeader";
import { GameOver } from "../components/GameOver";
import { Difficulty, useSubmitScore } from "../hooks/useQueries";
import { sfx } from "../utils/audio";
import { toast } from "sonner";

const W = 360;
const H = 500;

interface Enemy { x: number; y: number; speed: number; type: number; hp: number; }
interface Bullet { x: number; y: number; speed: number; friendly: boolean; }
interface Particle { x: number; y: number; vx: number; vy: number; life: number; color: string; }

const ENEMY_SPEED: Record<Difficulty, number> = { [Difficulty.easy]: 1.5, [Difficulty.medium]: 2.5, [Difficulty.hard]: 3.5 };

interface SpaceShooterGameProps { personalBest: number; }

export function SpaceShooterGame({ personalBest }: SpaceShooterGameProps) {
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
    playerX: W / 2, playerY: H - 60,
    enemies: [] as Enemy[],
    bullets: [] as Bullet[],
    particles: [] as Particle[],
    lives: 3, score: 0, running: false, frame: 0, shootCooldown: 0,
    invincible: 0,
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

    // Stars
    if (s.frame % 3 === 0) {
      const starX = Math.random() * W;
      ctx.fillStyle = "rgba(255,255,255,0.3)";
      ctx.fillRect(starX, 0, 1, 1);
    }

    // Bullets
    s.bullets.forEach((b) => {
      ctx.fillStyle = b.friendly ? "#ffcc00" : "#ff0066";
      ctx.shadowColor = b.friendly ? "#ffcc00" : "#ff0066";
      ctx.shadowBlur = 8;
      ctx.fillRect(b.x - 2, b.y - 6, 4, 12);
    });

    // Enemies
    s.enemies.forEach((e) => {
      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.fillStyle = e.type === 0 ? "#bf00ff" : e.type === 1 ? "#ff6b35" : "#ff0066";
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(0, -14);
      ctx.lineTo(12, 8);
      ctx.lineTo(0, 4);
      ctx.lineTo(-12, 8);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    });

    // Particles
    s.particles.forEach((p) => {
      ctx.globalAlpha = p.life / 30;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, 3, 3);
    });
    ctx.globalAlpha = 1;

    // Player
    if (s.invincible % 4 < 2) {
      ctx.save();
      ctx.translate(s.playerX, s.playerY);
      ctx.fillStyle = "#00f5ff";
      ctx.shadowColor = "#00f5ff";
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.moveTo(0, -18);
      ctx.lineTo(14, 10);
      ctx.lineTo(0, 4);
      ctx.lineTo(-14, 10);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // HUD
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#00f5ff";
    ctx.font = "12px monospace";
    ctx.textAlign = "left";
    ctx.fillText(`♥ ${s.lives}`, 8, 18);
    ctx.shadowBlur = 0;
  }, []);

  const gameLoop = useCallback(() => {
    const s = stateRef.current;
    if (!s.running) return;
    s.frame++;
    if (s.invincible > 0) s.invincible--;

    const speed = 4;
    if (keysRef.current.has("ArrowLeft") || keysRef.current.has("a")) s.playerX = Math.max(20, s.playerX - speed);
    if (keysRef.current.has("ArrowRight") || keysRef.current.has("d")) s.playerX = Math.min(W - 20, s.playerX + speed);

    // Auto fire
    s.shootCooldown--;
    if (s.shootCooldown <= 0) {
      s.bullets.push({ x: s.playerX, y: s.playerY - 20, speed: 10, friendly: true });
      s.shootCooldown = 12;
    }

    // Spawn enemies
    const eSpeed = ENEMY_SPEED[diffRef.current];
    if (s.frame % 60 === 0) {
      for (let i = 0; i < 2; i++) {
        s.enemies.push({ x: 30 + Math.random() * (W - 60), y: -20, speed: eSpeed, type: Math.floor(Math.random() * 3), hp: 1 });
      }
    }

    // Move enemies
    s.enemies = s.enemies.map((e) => ({ ...e, y: e.y + e.speed }));

    // Move bullets
    s.bullets = s.bullets.map((b) => ({ ...b, y: b.y - b.speed })).filter((b) => b.y > -10 && b.y < H + 10);

    // Move particles
    s.particles = s.particles.map((p) => ({ ...p, x: p.x + p.vx, y: p.y + p.vy, life: p.life - 1 })).filter((p) => p.life > 0);

    // Bullet-enemy collision
    for (let bi = s.bullets.length - 1; bi >= 0; bi--) {
      if (!s.bullets[bi].friendly) continue;
      for (let ei = s.enemies.length - 1; ei >= 0; ei--) {
        const dx = s.bullets[bi].x - s.enemies[ei].x;
        const dy = s.bullets[bi].y - s.enemies[ei].y;
        if (Math.abs(dx) < 14 && Math.abs(dy) < 14) {
          s.enemies[ei].hp--;
          s.bullets.splice(bi, 1);
          if (s.enemies[ei].hp <= 0) {
            for (let k = 0; k < 6; k++) s.particles.push({ x: s.enemies[ei].x, y: s.enemies[ei].y, vx: (Math.random()-0.5)*4, vy: (Math.random()-0.5)*4, life: 20, color: "#ffcc00" });
            s.enemies.splice(ei, 1);
            s.score += 10;
            setScore(s.score);
            sfx.eat(muted);
          }
          break;
        }
      }
    }

    // Enemy-player collision / reach bottom
    for (let ei = s.enemies.length - 1; ei >= 0; ei--) {
      const e = s.enemies[ei];
      if (e.y > H) { s.enemies.splice(ei, 1); continue; }
      if (s.invincible === 0 && Math.abs(e.x - s.playerX) < 18 && Math.abs(e.y - s.playerY) < 18) {
        s.enemies.splice(ei, 1);
        s.lives--;
        s.invincible = 90;
        sfx.die(muted);
        if (s.lives <= 0) {
          s.running = false;
          setScore(s.score);
          setGameState("over");
          return;
        }
      }
    }

    draw();
    rafRef.current = requestAnimationFrame(gameLoop);
  }, [draw, muted]);

  const startGame = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    const s = stateRef.current;
    s.playerX = W / 2; s.playerY = H - 60;
    s.enemies = []; s.bullets = []; s.particles = [];
    s.lives = 3; s.score = 0; s.running = true; s.frame = 0; s.shootCooldown = 0; s.invincible = 0;
    setScore(0); setSubmitted(false); setGameState("playing");
    rafRef.current = requestAnimationFrame(gameLoop);
  }, [gameLoop]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => { e.preventDefault(); keysRef.current.add(e.key); };
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
      stateRef.current.playerX = (e.touches[0].clientX - rect.left) * (W / rect.width);
    };
    canvas.addEventListener("touchmove", onTouch, { passive: true });
    return () => canvas.removeEventListener("touchmove", onTouch);
  }, []);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);
  useEffect(() => { if (gameState === "idle") draw(); }, [gameState, draw]);

  const handleSubmit = async () => {
    try {
      await submitScore({ game: "spaceshooter", score: BigInt(score), difficulty });
      setSubmitted(true);
      sfx.submit(muted);
      toast.success("Score submitted!");
    } catch { toast.error("Failed to submit score"); }
  };

  return (
    <div className="flex flex-col h-full">
      <GameHeader title="SPACE SHOOTER" emoji="🚀" score={score} difficulty={difficulty} onDifficultyChange={setDifficulty} muted={muted} onMuteToggle={() => setMuted((m) => !m)} gameActive={gameState === "playing"} />
      <div className="flex-1 flex flex-col items-center justify-center p-4 gap-3 relative">
        <div className="relative">
          <canvas ref={canvasRef} width={W} height={H} className="border border-primary/30 rounded" style={{ maxWidth: "100%", maxHeight: "68vh", display: "block" }} />
          {gameState === "idle" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm rounded">
              <div className="pixel-font text-primary text-sm mb-2 text-glow-cyan animate-pulse-glow">SPACE SHOOTER</div>
              <div className="text-muted-foreground text-xs font-display mb-6 text-center">←→ to move. Ship auto-fires. Survive!</div>
              <button type="button" onClick={startGame} className="btn-neon-cyan border px-6 py-3 pixel-font text-xs rounded">START GAME</button>
            </div>
          )}
          {gameState === "over" && (
            <GameOver score={score} personalBest={Math.max(personalBest, submitted ? score : 0)} onSubmit={handleSubmit} onPlayAgain={startGame} isSubmitting={isSubmitting} submitted={submitted} game="spaceshooter" difficulty={difficulty} />
          )}
        </div>
        <div className="text-xs text-muted-foreground font-display">←→ / A-D to move · auto-fires</div>
      </div>
    </div>
  );
}
