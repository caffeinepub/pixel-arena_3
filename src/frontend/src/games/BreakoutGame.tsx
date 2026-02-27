import { useState, useEffect, useRef, useCallback } from "react";
import { GameHeader } from "../components/GameHeader";
import { GameOver } from "../components/GameOver";
import { Difficulty, useSubmitScore } from "../hooks/useQueries";
import { sfx } from "../utils/audio";
import { toast } from "sonner";

const W = 480;
const H = 360;
const PADDLE_W = 80;
const PADDLE_H = 10;
const BALL_R = 7;
const BRICK_ROWS = 5;
const BRICK_COLS = 10;
const BRICK_W = 42;
const BRICK_H = 16;
const BRICK_GAP = 4;
const BRICK_TOP = 40;

const BALL_SPEED: Record<Difficulty, number> = {
  [Difficulty.easy]: 4,
  [Difficulty.medium]: 5.5,
  [Difficulty.hard]: 7,
};

const BRICK_COLORS = ["#ff0066", "#ff6b35", "#ffcc00", "#00ff88", "#00f5ff"];

interface BreakoutGameProps {
  personalBest: number;
}

function makeBricks() {
  const bricks: { x: number; y: number; alive: boolean; color: string }[] = [];
  for (let r = 0; r < BRICK_ROWS; r++) {
    for (let c = 0; c < BRICK_COLS; c++) {
      bricks.push({
        x: c * (BRICK_W + BRICK_GAP) + 5,
        y: r * (BRICK_H + BRICK_GAP) + BRICK_TOP,
        alive: true,
        color: BRICK_COLORS[r],
      });
    }
  }
  return bricks;
}

export function BreakoutGame({ personalBest }: BreakoutGameProps) {
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.easy);
  const [muted, setMuted] = useState(false);
  const [gameState, setGameState] = useState<"idle" | "playing" | "over">("idle");
  const [score, setScore] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const mouseXRef = useRef(W / 2);
  const diffRef = useRef(difficulty);
  useEffect(() => { diffRef.current = difficulty; }, [difficulty]);

  const stateRef = useRef({
    paddleX: W / 2 - PADDLE_W / 2,
    ballX: W / 2, ballY: H - 60,
    ballVX: 3, ballVY: -4,
    bricks: makeBricks(),
    running: false,
    score: 0,
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

    // Bricks
    s.bricks.forEach((b) => {
      if (!b.alive) return;
      ctx.fillStyle = b.color;
      ctx.shadowColor = b.color;
      ctx.shadowBlur = 6;
      ctx.fillRect(b.x, b.y, BRICK_W, BRICK_H);
    });

    // Paddle
    ctx.fillStyle = "#00f5ff";
    ctx.shadowColor = "#00f5ff";
    ctx.shadowBlur = 12;
    ctx.fillRect(s.paddleX, H - 30, PADDLE_W, PADDLE_H);

    // Ball
    ctx.beginPath();
    ctx.arc(s.ballX, s.ballY, BALL_R, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = "#ffffff";
    ctx.shadowBlur = 16;
    ctx.fill();
    ctx.shadowBlur = 0;
  }, []);

  const gameLoop = useCallback(() => {
    const s = stateRef.current;
    if (!s.running) return;

    s.paddleX = Math.max(0, Math.min(W - PADDLE_W, mouseXRef.current - PADDLE_W / 2));
    s.ballX += s.ballVX;
    s.ballY += s.ballVY;

    // Wall bounce
    if (s.ballX <= BALL_R || s.ballX >= W - BALL_R) s.ballVX *= -1;
    if (s.ballY <= BALL_R) s.ballVY *= -1;

    // Paddle collision
    if (
      s.ballY + BALL_R >= H - 30 &&
      s.ballY + BALL_R <= H - 20 &&
      s.ballX >= s.paddleX &&
      s.ballX <= s.paddleX + PADDLE_W
    ) {
      s.ballVY = -Math.abs(s.ballVY);
      const rel = (s.ballX - (s.paddleX + PADDLE_W / 2)) / (PADDLE_W / 2);
      s.ballVX = rel * 5;
    }

    // Ball out
    if (s.ballY > H + 20) {
      s.running = false;
      sfx.die(muted);
      setScore(s.score);
      setGameState("over");
      return;
    }

    // Brick collision
    for (const b of s.bricks) {
      if (!b.alive) continue;
      if (
        s.ballX + BALL_R > b.x && s.ballX - BALL_R < b.x + BRICK_W &&
        s.ballY + BALL_R > b.y && s.ballY - BALL_R < b.y + BRICK_H
      ) {
        b.alive = false;
        s.ballVY *= -1;
        s.score += 10;
        setScore(s.score);
        sfx.eat(muted);
        break;
      }
    }

    // Win
    if (s.bricks.every((b) => !b.alive)) {
      s.running = false;
      setScore(s.score + 500);
      setGameState("over");
      return;
    }

    draw();
    rafRef.current = requestAnimationFrame(gameLoop);
  }, [draw, muted]);

  const startGame = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    const speed = BALL_SPEED[diffRef.current];
    const s = stateRef.current;
    s.paddleX = W / 2 - PADDLE_W / 2;
    s.ballX = W / 2; s.ballY = H - 60;
    s.ballVX = speed * 0.7; s.ballVY = -speed;
    s.bricks = makeBricks();
    s.running = true;
    s.score = 0;
    setScore(0);
    setSubmitted(false);
    setGameState("playing");
    rafRef.current = requestAnimationFrame(gameLoop);
  }, [gameLoop]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseXRef.current = (e.clientX - rect.left) * (W / rect.width);
    };
    const onTouchMove = (e: TouchEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseXRef.current = (e.touches[0].clientX - rect.left) * (W / rect.width);
    };
    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("touchmove", onTouchMove, { passive: true });
    return () => {
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("touchmove", onTouchMove);
    };
  }, []);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);
  useEffect(() => { if (gameState === "idle") draw(); }, [gameState, draw]);

  const handleSubmit = async () => {
    try {
      await submitScore({ game: "breakout", score: BigInt(score), difficulty });
      setSubmitted(true);
      sfx.submit(muted);
      toast.success("Score submitted!", { description: `${score} pts on ${difficulty}` });
    } catch { toast.error("Failed to submit score"); }
  };

  return (
    <div className="flex flex-col h-full">
      <GameHeader title="BREAKOUT" emoji="🧱" score={score} difficulty={difficulty} onDifficultyChange={setDifficulty} muted={muted} onMuteToggle={() => setMuted((m) => !m)} gameActive={gameState === "playing"} />
      <div className="flex-1 flex flex-col items-center justify-center p-4 gap-3 relative">
        <div className="relative">
          <canvas ref={canvasRef} width={W} height={H} className="border border-primary/30 rounded" style={{ maxWidth: "100%", maxHeight: "65vh", display: "block" }} />
          {gameState === "idle" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm rounded">
              <div className="pixel-font text-primary text-sm mb-2 text-glow-cyan animate-pulse-glow">BREAKOUT</div>
              <div className="text-muted-foreground text-xs font-display mb-6 text-center">Move mouse to control paddle. Destroy all bricks!</div>
              <button type="button" onClick={startGame} className="btn-neon-cyan border px-6 py-3 pixel-font text-xs rounded">START GAME</button>
            </div>
          )}
          {gameState === "over" && (
            <GameOver score={score} personalBest={Math.max(personalBest, submitted ? score : 0)} onSubmit={handleSubmit} onPlayAgain={startGame} isSubmitting={isSubmitting} submitted={submitted} game="breakout" difficulty={difficulty} />
          )}
        </div>
        <div className="text-xs text-muted-foreground font-display">Move mouse / touch to control paddle</div>
      </div>
    </div>
  );
}
