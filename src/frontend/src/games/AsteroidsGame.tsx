import { useState, useEffect, useRef, useCallback } from "react";
import { GameHeader } from "../components/GameHeader";
import { GameOver } from "../components/GameOver";
import { Difficulty, useSubmitScore } from "../hooks/useQueries";
import { sfx } from "../utils/audio";
import { toast } from "sonner";

const W = 500;
const H = 400;

interface Vec { x: number; y: number; }
interface Asteroid { x: number; y: number; vx: number; vy: number; r: number; angle: number; }
interface Bullet { x: number; y: number; vx: number; vy: number; life: number; }

function randomAsteroid(size: number): Asteroid {
  const side = Math.floor(Math.random() * 4);
  let x = 0, y = 0;
  if (side === 0) { x = Math.random() * W; y = -size; }
  else if (side === 1) { x = W + size; y = Math.random() * H; }
  else if (side === 2) { x = Math.random() * W; y = H + size; }
  else { x = -size; y = Math.random() * H; }
  const speed = 1 + Math.random() * 2;
  const angle = Math.random() * Math.PI * 2;
  return { x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, r: size, angle: 0 };
}

interface AsteroidsGameProps { personalBest: number; }

export function AsteroidsGame({ personalBest }: AsteroidsGameProps) {
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
    ship: { x: W / 2, y: H / 2, angle: -Math.PI / 2, vx: 0, vy: 0 } as Vec & { angle: number; vx: number; vy: number },
    asteroids: [] as Asteroid[],
    bullets: [] as Bullet[],
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

    // Asteroids
    s.asteroids.forEach((a) => {
      ctx.save();
      ctx.translate(a.x, a.y);
      ctx.rotate(a.angle);
      ctx.beginPath();
      const pts = 8;
      for (let i = 0; i < pts; i++) {
        const ang = (i / pts) * Math.PI * 2;
        const dist = a.r * (0.8 + Math.sin(ang * 3) * 0.2);
        if (i === 0) ctx.moveTo(Math.cos(ang) * dist, Math.sin(ang) * dist);
        else ctx.lineTo(Math.cos(ang) * dist, Math.sin(ang) * dist);
      }
      ctx.closePath();
      ctx.strokeStyle = "#00f5ff";
      ctx.shadowColor = "#00f5ff";
      ctx.shadowBlur = 6;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    });

    // Bullets
    s.bullets.forEach((b) => {
      ctx.beginPath();
      ctx.arc(b.x, b.y, 2, 0, Math.PI * 2);
      ctx.fillStyle = "#ffcc00";
      ctx.shadowColor = "#ffcc00";
      ctx.shadowBlur = 8;
      ctx.fill();
    });

    // Ship
    if (s.invincible % 4 < 2) {
      ctx.save();
      ctx.translate(s.ship.x, s.ship.y);
      ctx.rotate(s.ship.angle);
      ctx.beginPath();
      ctx.moveTo(18, 0);
      ctx.lineTo(-12, -10);
      ctx.lineTo(-6, 0);
      ctx.lineTo(-12, 10);
      ctx.closePath();
      ctx.strokeStyle = "#bf00ff";
      ctx.shadowColor = "#bf00ff";
      ctx.shadowBlur = 10;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }

    // HUD
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#fff";
    ctx.font = "14px monospace";
    ctx.textAlign = "left";
    ctx.fillText(`♥ ${s.lives}`, 10, 20);

    ctx.shadowBlur = 0;
  }, []);

  const gameLoop = useCallback(() => {
    const s = stateRef.current;
    if (!s.running) return;
    s.frame++;
    if (s.invincible > 0) s.invincible--;

    const spd = diffRef.current === Difficulty.easy ? 1 : diffRef.current === Difficulty.medium ? 1.4 : 1.8;

    // Ship controls
    if (keysRef.current.has("ArrowLeft") || keysRef.current.has("a")) s.ship.angle -= 0.05;
    if (keysRef.current.has("ArrowRight") || keysRef.current.has("d")) s.ship.angle += 0.05;
    if (keysRef.current.has("ArrowUp") || keysRef.current.has("w")) {
      s.ship.vx += Math.cos(s.ship.angle) * 0.2 * spd;
      s.ship.vy += Math.sin(s.ship.angle) * 0.2 * spd;
    }

    s.ship.vx *= 0.99; s.ship.vy *= 0.99;
    s.ship.x = ((s.ship.x + s.ship.vx) + W) % W;
    s.ship.y = ((s.ship.y + s.ship.vy) + H) % H;

    // Shoot
    s.shootCooldown--;
    if ((keysRef.current.has(" ") || keysRef.current.has("ArrowUp")) && s.shootCooldown <= 0) {
      s.bullets.push({
        x: s.ship.x + Math.cos(s.ship.angle) * 20,
        y: s.ship.y + Math.sin(s.ship.angle) * 20,
        vx: Math.cos(s.ship.angle) * 10 + s.ship.vx,
        vy: Math.sin(s.ship.angle) * 10 + s.ship.vy,
        life: 60,
      });
      s.shootCooldown = 12;
    }

    // Move bullets
    s.bullets = s.bullets.map((b) => ({ ...b, x: b.x + b.vx, y: b.y + b.vy, life: b.life - 1 }))
      .filter((b) => b.life > 0 && b.x > 0 && b.x < W && b.y > 0 && b.y < H);

    // Move asteroids
    s.asteroids = s.asteroids.map((a) => ({
      ...a,
      x: ((a.x + a.vx) + W) % W,
      y: ((a.y + a.vy) + H) % H,
      angle: a.angle + 0.01,
    }));

    // Spawn
    if (s.frame % 120 === 0) s.asteroids.push(randomAsteroid(30 + Math.random() * 20));

    // Bullet-asteroid collision
    const newAsteroids: Asteroid[] = [...s.asteroids];
    const newBullets: Bullet[] = [...s.bullets];
    for (let bi = newBullets.length - 1; bi >= 0; bi--) {
      const b = newBullets[bi];
      for (let ai = newAsteroids.length - 1; ai >= 0; ai--) {
        const a = newAsteroids[ai];
        const dist = Math.hypot(b.x - a.x, b.y - a.y);
        if (dist < a.r) {
          newBullets.splice(bi, 1);
          newAsteroids.splice(ai, 1);
          if (a.r > 16) {
            newAsteroids.push({ ...randomAsteroid(a.r / 2), x: a.x, y: a.y });
            newAsteroids.push({ ...randomAsteroid(a.r / 2), x: a.x, y: a.y });
          }
          s.score += a.r > 25 ? 20 : a.r > 14 ? 50 : 100;
          setScore(s.score);
          sfx.eat(muted);
          break;
        }
      }
    }
    s.bullets = newBullets;
    s.asteroids = newAsteroids;

    // Ship-asteroid collision
    if (s.invincible === 0) {
      for (const a of s.asteroids) {
        if (Math.hypot(s.ship.x - a.x, s.ship.y - a.y) < a.r + 12) {
          s.lives--;
          s.invincible = 120;
          sfx.die(muted);
          if (s.lives <= 0) {
            s.running = false;
            setScore(s.score);
            setGameState("over");
            return;
          }
          break;
        }
      }
    }

    draw();
    rafRef.current = requestAnimationFrame(gameLoop);
  }, [draw, muted]);

  const startGame = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    const s = stateRef.current;
    s.ship = { x: W / 2, y: H / 2, angle: -Math.PI / 2, vx: 0, vy: 0 };
    s.asteroids = [randomAsteroid(35), randomAsteroid(30), randomAsteroid(28)];
    s.bullets = []; s.lives = 3; s.score = 0; s.running = true; s.frame = 0; s.shootCooldown = 0; s.invincible = 0;
    setScore(0); setSubmitted(false); setGameState("playing");
    rafRef.current = requestAnimationFrame(gameLoop);
  }, [gameLoop]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => keysRef.current.add(e.key);
    const up = (e: KeyboardEvent) => keysRef.current.delete(e.key);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);
  useEffect(() => { if (gameState === "idle") draw(); }, [gameState, draw]);

  const handleSubmit = async () => {
    try {
      await submitScore({ game: "asteroids", score: BigInt(score), difficulty });
      setSubmitted(true);
      sfx.submit(muted);
      toast.success("Score submitted!");
    } catch { toast.error("Failed to submit score"); }
  };

  return (
    <div className="flex flex-col h-full">
      <GameHeader title="ASTEROIDS" emoji="☄️" score={score} difficulty={difficulty} onDifficultyChange={setDifficulty} muted={muted} onMuteToggle={() => setMuted((m) => !m)} gameActive={gameState === "playing"} />
      <div className="flex-1 flex flex-col items-center justify-center p-4 gap-3 relative">
        <div className="relative">
          <canvas ref={canvasRef} width={W} height={H} className="border border-primary/30 rounded" style={{ maxWidth: "100%", maxHeight: "65vh", display: "block" }} />
          {gameState === "idle" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm rounded">
              <div className="pixel-font text-primary text-sm mb-2 text-glow-cyan animate-pulse-glow">ASTEROIDS</div>
              <div className="text-muted-foreground text-xs font-display mb-4 text-center">Arrow keys / WASD to move. Space to shoot.</div>
              <button type="button" onClick={startGame} className="btn-neon-cyan border px-6 py-3 pixel-font text-xs rounded">START GAME</button>
            </div>
          )}
          {gameState === "over" && (
            <GameOver score={score} personalBest={Math.max(personalBest, submitted ? score : 0)} onSubmit={handleSubmit} onPlayAgain={startGame} isSubmitting={isSubmitting} submitted={submitted} game="asteroids" difficulty={difficulty} />
          )}
        </div>
        <div className="text-xs text-muted-foreground font-display">↑ Thrust · ←→ Rotate · Space Shoot</div>
      </div>
    </div>
  );
}
