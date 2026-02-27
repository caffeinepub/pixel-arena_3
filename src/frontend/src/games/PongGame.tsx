import { useState, useEffect, useRef, useCallback } from "react";
import { GameHeader } from "../components/GameHeader";
import { GameOver } from "../components/GameOver";
import { Difficulty, useSubmitScore } from "../hooks/useQueries";
import { sfx } from "../utils/audio";
import { toast } from "sonner";

const W = 600;
const H = 400;
const PADDLE_H = 80;
const PADDLE_W = 12;
const BALL_SIZE = 10;
const WIN_SCORE = 5;

const CPU_SPEED: Record<Difficulty, number> = {
  [Difficulty.easy]: 2.5,
  [Difficulty.medium]: 4,
  [Difficulty.hard]: 6,
};

interface PongGameProps {
  personalBest: number;
}

export function PongGame({ personalBest }: PongGameProps) {
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.easy);
  const [muted, setMuted] = useState(false);
  const [gameState, setGameState] = useState<"idle" | "playing" | "over">("idle");
  const [score, setScore] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const stateRef = useRef({
    ballX: W / 2, ballY: H / 2,
    ballVX: 4, ballVY: 3,
    playerY: H / 2 - PADDLE_H / 2,
    cpuY: H / 2 - PADDLE_H / 2,
    playerScore: 0, cpuScore: 0,
    running: false,
  });
  const mouseYRef = useRef(H / 2);

  const { mutateAsync: submitScore, isPending: isSubmitting } = useSubmitScore();

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const s = stateRef.current;

    ctx.fillStyle = "#000814";
    ctx.fillRect(0, 0, W, H);

    // Center line
    ctx.setLineDash([10, 10]);
    ctx.strokeStyle = "rgba(0,245,255,0.2)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(W / 2, 0);
    ctx.lineTo(W / 2, H);
    ctx.stroke();
    ctx.setLineDash([]);

    // Scores
    ctx.fillStyle = "rgba(0,245,255,0.8)";
    ctx.font = "bold 36px monospace";
    ctx.textAlign = "center";
    ctx.fillText(String(s.playerScore), W / 4, 50);
    ctx.fillText(String(s.cpuScore), (3 * W) / 4, 50);

    // Player paddle
    ctx.fillStyle = "#00f5ff";
    ctx.shadowColor = "#00f5ff";
    ctx.shadowBlur = 12;
    ctx.fillRect(20, s.playerY, PADDLE_W, PADDLE_H);

    // CPU paddle
    ctx.fillStyle = "#bf00ff";
    ctx.shadowColor = "#bf00ff";
    ctx.fillRect(W - 20 - PADDLE_W, s.cpuY, PADDLE_W, PADDLE_H);

    // Ball
    ctx.fillStyle = "#ffcc00";
    ctx.shadowColor = "#ffcc00";
    ctx.shadowBlur = 16;
    ctx.fillRect(s.ballX - BALL_SIZE / 2, s.ballY - BALL_SIZE / 2, BALL_SIZE, BALL_SIZE);

    ctx.shadowBlur = 0;
  }, []);

  const resetBall = useCallback((s: typeof stateRef.current, dir: number) => {
    s.ballX = W / 2; s.ballY = H / 2;
    s.ballVX = dir * 4; s.ballVY = (Math.random() - 0.5) * 6;
  }, []);

  const endGame = useCallback((s: typeof stateRef.current) => {
    s.running = false;
    setGameState("over");
    setScore(s.playerScore * 100);
  }, []);

  const difficultyRef = useRef(difficulty);
  useEffect(() => { difficultyRef.current = difficulty; }, [difficulty]);

  const gameLoop = useCallback(() => {
    const s = stateRef.current;
    if (!s.running) return;

    // Move player paddle toward mouse
    const targetY = mouseYRef.current - PADDLE_H / 2;
    s.playerY = Math.max(0, Math.min(H - PADDLE_H, targetY));

    // Move CPU paddle
    const cpuCenter = s.cpuY + PADDLE_H / 2;
    const spd = CPU_SPEED[difficultyRef.current];
    if (cpuCenter < s.ballY - 5) s.cpuY = Math.min(H - PADDLE_H, s.cpuY + spd);
    else if (cpuCenter > s.ballY + 5) s.cpuY = Math.max(0, s.cpuY - spd);

    // Move ball
    s.ballX += s.ballVX;
    s.ballY += s.ballVY;

    // Wall bounce
    if (s.ballY <= 0 || s.ballY >= H) s.ballVY *= -1;

    // Player paddle collision
    if (
      s.ballX - BALL_SIZE / 2 <= 20 + PADDLE_W &&
      s.ballX - BALL_SIZE / 2 >= 20 &&
      s.ballY >= s.playerY &&
      s.ballY <= s.playerY + PADDLE_H
    ) {
      s.ballVX = Math.abs(s.ballVX) * 1.05;
      const relHit = (s.ballY - (s.playerY + PADDLE_H / 2)) / (PADDLE_H / 2);
      s.ballVY = relHit * 5;
    }

    // CPU paddle collision
    if (
      s.ballX + BALL_SIZE / 2 >= W - 20 - PADDLE_W &&
      s.ballX + BALL_SIZE / 2 <= W - 20 &&
      s.ballY >= s.cpuY &&
      s.ballY <= s.cpuY + PADDLE_H
    ) {
      s.ballVX = -Math.abs(s.ballVX) * 1.05;
      const relHit = (s.ballY - (s.cpuY + PADDLE_H / 2)) / (PADDLE_H / 2);
      s.ballVY = relHit * 5;
    }

    // Clamp speed
    const maxSpeed = 12;
    const speed2 = Math.sqrt(s.ballVX ** 2 + s.ballVY ** 2);
    if (speed2 > maxSpeed) { s.ballVX = (s.ballVX / speed2) * maxSpeed; s.ballVY = (s.ballVY / speed2) * maxSpeed; }

    // Scoring
    if (s.ballX < 0) {
      s.cpuScore++;
      sfx.die(muted);
      resetBall(s, 1);
      if (s.cpuScore >= WIN_SCORE) { endGame(s); return; }
    } else if (s.ballX > W) {
      s.playerScore++;
      sfx.eat(muted);
      setScore(s.playerScore * 100);
      resetBall(s, -1);
      if (s.playerScore >= WIN_SCORE) { endGame(s); return; }
    }

    draw();
    rafRef.current = requestAnimationFrame(gameLoop);
  }, [draw, muted, resetBall, endGame]);

  const startGame = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    const s = stateRef.current;
    s.ballX = W / 2; s.ballY = H / 2;
    s.ballVX = 4; s.ballVY = 3;
    s.playerY = H / 2 - PADDLE_H / 2;
    s.cpuY = H / 2 - PADDLE_H / 2;
    s.playerScore = 0; s.cpuScore = 0;
    s.running = true;
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
      const scaleY = H / rect.height;
      mouseYRef.current = (e.clientY - rect.top) * scaleY;
    };
    const onTouchMove = (e: TouchEvent) => {
      const rect = canvas.getBoundingClientRect();
      const scaleY = H / rect.height;
      mouseYRef.current = (e.touches[0].clientY - rect.top) * scaleY;
    };
    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("touchmove", onTouchMove, { passive: true });
    return () => {
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("touchmove", onTouchMove);
    };
  }, []);

  useEffect(() => {
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  useEffect(() => {
    if (gameState === "idle") draw();
  }, [gameState, draw]);

  const handleSubmit = async () => {
    try {
      await submitScore({ game: "pong", score: BigInt(score), difficulty });
      setSubmitted(true);
      sfx.submit(muted);
      toast.success("Score submitted!", { description: `${score} pts on ${difficulty}` });
    } catch {
      toast.error("Failed to submit score");
    }
  };

  return (
    <div className="flex flex-col h-full">
      <GameHeader
        title="PONG"
        emoji="🏓"
        score={score}
        difficulty={difficulty}
        onDifficultyChange={setDifficulty}
        muted={muted}
        onMuteToggle={() => setMuted((m) => !m)}
        gameActive={gameState === "playing"}
      />
      <div className="flex-1 flex flex-col items-center justify-center p-4 gap-3 relative">
        <div className="relative">
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            className="border border-primary/30 rounded"
            style={{ maxWidth: "100%", maxHeight: "60vh", display: "block" }}
          />
          {gameState === "idle" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm rounded">
              <div className="pixel-font text-primary text-sm mb-2 text-glow-cyan animate-pulse-glow">PONG</div>
              <div className="text-muted-foreground text-xs font-display mb-6 text-center">Move mouse to control paddle. First to 5 wins!</div>
              <button type="button" onClick={startGame} className="btn-neon-cyan border px-6 py-3 pixel-font text-xs rounded">START GAME</button>
            </div>
          )}
          {gameState === "over" && (
            <GameOver
              score={score}
              personalBest={Math.max(personalBest, submitted ? score : 0)}
              onSubmit={handleSubmit}
              onPlayAgain={startGame}
              isSubmitting={isSubmitting}
              submitted={submitted}
              game="pong"
              difficulty={difficulty}
            />
          )}
        </div>
        <div className="text-xs text-muted-foreground font-display">Move mouse / touch to control your paddle</div>
      </div>
    </div>
  );
}
