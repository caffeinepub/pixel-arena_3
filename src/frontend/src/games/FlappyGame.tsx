import { useState, useEffect, useRef, useCallback } from "react";
import { GameHeader } from "../components/GameHeader";
import { GameOver } from "../components/GameOver";
import { Difficulty, useSubmitScore } from "../hooks/useQueries";
import { sfx } from "../utils/audio";
import { toast } from "sonner";

const W = 400;
const H = 500;
const BIRD_X = 80;
const BIRD_R = 14;
const PIPE_W = 52;
const GAP: Record<Difficulty, number> = { [Difficulty.easy]: 160, [Difficulty.medium]: 130, [Difficulty.hard]: 105 };
const GRAVITY = 0.45;
const FLAP = -8;
const PIPE_SPEED: Record<Difficulty, number> = { [Difficulty.easy]: 2.5, [Difficulty.medium]: 3.5, [Difficulty.hard]: 5 };

interface FlappyGameProps { personalBest: number; }

export function FlappyGame({ personalBest }: FlappyGameProps) {
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.easy);
  const [muted, setMuted] = useState(false);
  const [gameState, setGameState] = useState<"idle" | "playing" | "over">("idle");
  const [score, setScore] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const diffRef = useRef(difficulty);
  useEffect(() => { diffRef.current = difficulty; }, [difficulty]);

  const stateRef = useRef({
    birdY: H / 2, velY: 0,
    pipes: [] as { x: number; gap: number; passed: boolean }[],
    running: false, score: 0, frame: 0,
  });

  const { mutateAsync: submitScore, isPending: isSubmitting } = useSubmitScore();

  const flap = useCallback(() => {
    if (!stateRef.current.running) return;
    stateRef.current.velY = FLAP;
    sfx.eat(muted);
  }, [muted]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const s = stateRef.current;

    ctx.fillStyle = "#000814";
    ctx.fillRect(0, 0, W, H);

    // Pipes
    s.pipes.forEach((p) => {
      ctx.fillStyle = "#00ff88";
      ctx.shadowColor = "#00ff88";
      ctx.shadowBlur = 8;
      ctx.fillRect(p.x, 0, PIPE_W, p.gap - GAP[diffRef.current] / 2);
      ctx.fillRect(p.x, p.gap + GAP[diffRef.current] / 2, PIPE_W, H);
    });

    // Bird
    ctx.beginPath();
    ctx.arc(BIRD_X, s.birdY, BIRD_R, 0, Math.PI * 2);
    ctx.fillStyle = "#ffcc00";
    ctx.shadowColor = "#ffcc00";
    ctx.shadowBlur = 16;
    ctx.fill();

    // Score
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.font = "bold 28px monospace";
    ctx.textAlign = "center";
    ctx.fillText(String(s.score), W / 2, 40);
  }, []);

  const gameLoop = useCallback(() => {
    const s = stateRef.current;
    if (!s.running) return;
    s.frame++;

    s.velY += GRAVITY;
    s.birdY += s.velY;

    const speed = PIPE_SPEED[diffRef.current];
    const gap = GAP[diffRef.current];

    // Spawn pipes
    if (s.frame % 90 === 0) {
      const gapCenter = 100 + Math.random() * (H - 200);
      s.pipes.push({ x: W, gap: gapCenter, passed: false });
    }

    // Move pipes
    s.pipes = s.pipes.map((p) => ({ ...p, x: p.x - speed })).filter((p) => p.x > -PIPE_W);

    // Score
    s.pipes.forEach((p) => {
      if (!p.passed && p.x + PIPE_W < BIRD_X) {
        p.passed = true;
        s.score++;
        setScore(s.score);
        sfx.eat(muted);
      }
    });

    // Collision
    const hitWall = s.birdY - BIRD_R <= 0 || s.birdY + BIRD_R >= H;
    const hitPipe = s.pipes.some(
      (p) =>
        BIRD_X + BIRD_R > p.x && BIRD_X - BIRD_R < p.x + PIPE_W &&
        (s.birdY - BIRD_R < p.gap - gap / 2 || s.birdY + BIRD_R > p.gap + gap / 2)
    );

    if (hitWall || hitPipe) {
      s.running = false;
      sfx.die(muted);
      setScore(s.score);
      setGameState("over");
      return;
    }

    draw();
    rafRef.current = requestAnimationFrame(gameLoop);
  }, [draw, muted]);

  const startGame = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    const s = stateRef.current;
    s.birdY = H / 2; s.velY = 0;
    s.pipes = []; s.running = true; s.score = 0; s.frame = 0;
    setScore(0); setSubmitted(false); setGameState("playing");
    rafRef.current = requestAnimationFrame(gameLoop);
  }, [gameLoop]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.code === "Space") { e.preventDefault(); flap(); } };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [flap]);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);
  useEffect(() => { if (gameState === "idle") draw(); }, [gameState, draw]);

  const handleSubmit = async () => {
    try {
      await submitScore({ game: "flappy", score: BigInt(score), difficulty });
      setSubmitted(true);
      sfx.submit(muted);
      toast.success("Score submitted!");
    } catch { toast.error("Failed to submit score"); }
  };

  return (
    <div className="flex flex-col h-full">
      <GameHeader title="FLAPPY BIRD" emoji="🐦" score={score} difficulty={difficulty} onDifficultyChange={setDifficulty} muted={muted} onMuteToggle={() => setMuted((m) => !m)} gameActive={gameState === "playing"} />
      <div className="flex-1 flex flex-col items-center justify-center p-4 gap-3 relative">
        <div className="relative">
          <canvas ref={canvasRef} width={W} height={H} onClick={flap} className="border border-primary/30 rounded cursor-pointer" style={{ maxWidth: "100%", maxHeight: "65vh", display: "block" }} />
          {gameState === "idle" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm rounded">
              <div className="pixel-font text-primary text-sm mb-2 text-glow-cyan animate-pulse-glow">FLAPPY BIRD</div>
              <div className="text-muted-foreground text-xs font-display mb-6 text-center">Space or click to flap. Avoid the pipes!</div>
              <button type="button" onClick={startGame} className="btn-neon-cyan border px-6 py-3 pixel-font text-xs rounded">START GAME</button>
            </div>
          )}
          {gameState === "over" && (
            <GameOver score={score} personalBest={Math.max(personalBest, submitted ? score : 0)} onSubmit={handleSubmit} onPlayAgain={startGame} isSubmitting={isSubmitting} submitted={submitted} game="flappy" difficulty={difficulty} />
          )}
        </div>
        <div className="text-xs text-muted-foreground font-display">Space / click / tap to flap</div>
      </div>
    </div>
  );
}
