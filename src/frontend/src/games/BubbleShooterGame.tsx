import { useState, useEffect, useRef, useCallback } from "react";
import { GameHeader } from "../components/GameHeader";
import { GameOver } from "../components/GameOver";
import { Difficulty, useSubmitScore } from "../hooks/useQueries";
import { sfx } from "../utils/audio";
import { toast } from "sonner";

const W = 360;
const H = 480;
const BUBBLE_R = 18;
const COLS = 9;
const ROW_H = BUBBLE_R * 1.8;
const COLORS = ["#ff0066", "#00f5ff", "#00ff88", "#ffcc00", "#bf00ff"];

function makeGrid(rows: number): (string | null)[][] {
  return Array.from({ length: rows }, () =>
    Array.from({ length: COLS }, () => Math.random() < 0.85 ? COLORS[Math.floor(Math.random() * COLORS.length)] : null)
  );
}

interface Bubble { x: number; y: number; vx: number; vy: number; color: string; }

interface BubbleShooterGameProps { personalBest: number; }

export function BubbleShooterGame({ personalBest }: BubbleShooterGameProps) {
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.easy);
  const [muted, setMuted] = useState(false);
  const [gameState, setGameState] = useState<"idle" | "playing" | "over">("idle");
  const [score, setScore] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const diffRef = useRef(difficulty);
  useEffect(() => { diffRef.current = difficulty; }, [difficulty]);

  const { mutateAsync: submitScore, isPending: isSubmitting } = useSubmitScore();

  const stateRef = useRef({
    grid: makeGrid(5) as (string | null)[][],
    currentBubble: null as Bubble | null,
    nextColor: COLORS[0],
    aimAngle: -Math.PI / 2,
    running: false,
    score: 0,
    shotsLeft: 30,
  });

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const s = stateRef.current;

    ctx.fillStyle = "#000814";
    ctx.fillRect(0, 0, W, H);

    // Grid
    s.grid.forEach((row, r) => {
      row.forEach((color, c) => {
        if (!color) return;
        const x = c * BUBBLE_R * 2 + BUBBLE_R + (r % 2 === 1 ? BUBBLE_R : 0);
        const y = r * ROW_H + BUBBLE_R;
        ctx.beginPath();
        ctx.arc(x, y, BUBBLE_R - 1, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 8;
        ctx.fill();
      });
    });

    // Aim line
    const cannon = { x: W / 2, y: H - 30 };
    ctx.strokeStyle = "rgba(255,255,255,0.2)";
    ctx.setLineDash([8, 8]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cannon.x, cannon.y);
    ctx.lineTo(cannon.x + Math.cos(s.aimAngle) * 100, cannon.y + Math.sin(s.aimAngle) * 100);
    ctx.stroke();
    ctx.setLineDash([]);

    // Current bubble
    ctx.beginPath();
    ctx.arc(cannon.x, cannon.y, BUBBLE_R - 1, 0, Math.PI * 2);
    ctx.fillStyle = s.nextColor;
    ctx.shadowColor = s.nextColor;
    ctx.shadowBlur = 14;
    ctx.fill();

    // Moving bubble
    if (s.currentBubble) {
      ctx.beginPath();
      ctx.arc(s.currentBubble.x, s.currentBubble.y, BUBBLE_R - 1, 0, Math.PI * 2);
      ctx.fillStyle = s.currentBubble.color;
      ctx.shadowColor = s.currentBubble.color;
      ctx.shadowBlur = 14;
      ctx.fill();
    }

    // HUD
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#00f5ff";
    ctx.font = "12px monospace";
    ctx.textAlign = "left";
    ctx.textBaseline = "bottom";
    ctx.fillText(`Shots: ${s.shotsLeft}`, 8, H - 8);
  }, []);

  const snapBubble = useCallback((bx: number, by: number, color: string) => {
    const s = stateRef.current;
    // Find closest grid cell
    let bestR = 0, bestC = 0, bestDist = Infinity;
    for (let r = 0; r < s.grid.length; r++) {
      for (let c = 0; c < s.grid[r].length; c++) {
        if (s.grid[r][c]) continue;
        const x = c * BUBBLE_R * 2 + BUBBLE_R + (r % 2 === 1 ? BUBBLE_R : 0);
        const y = r * ROW_H + BUBBLE_R;
        const d = Math.hypot(bx - x, by - y);
        if (d < bestDist) { bestDist = d; bestR = r; bestC = c; }
      }
    }
    // Add to grid
    while (s.grid.length <= bestR) s.grid.push(Array(COLS).fill(null));
    s.grid[bestR][bestC] = color;

    // Find matches (flood fill)
    const toCheck = [[bestR, bestC]];
    const visited = new Set([`${bestR},${bestC}`]);
    const matched: [number, number][] = [];
    while (toCheck.length) {
      const [r, c] = toCheck.pop()!;
      if (s.grid[r]?.[c] !== color) continue;
      matched.push([r, c]);
      const neighbors = [[r-1,c],[r+1,c],[r,c-1],[r,c+1],[r-1,c+(r%2?1:-1)],[r+1,c+(r%2?1:-1)]];
      for (const [nr, nc] of neighbors) {
        const key = `${nr},${nc}`;
        if (!visited.has(key) && nr >= 0 && nc >= 0 && nc < COLS && s.grid[nr]?.[nc] === color) {
          visited.add(key);
          toCheck.push([nr, nc]);
        }
      }
    }
    if (matched.length >= 3) {
      matched.forEach(([r, c]) => { s.grid[r][c] = null; });
      s.score += matched.length * 10;
      setScore(s.score);
      sfx.eat(muted);
    }

    // Win condition
    const allEmpty = s.grid.every((row) => row.every((c) => !c));
    if (allEmpty || s.shotsLeft <= 0) {
      s.running = false;
      setScore(s.score);
      setGameState("over");
    }
  }, [muted]);

  const gameLoop = useCallback(() => {
    const s = stateRef.current;
    if (!s.running) return;

    if (s.currentBubble) {
      s.currentBubble.x += s.currentBubble.vx;
      s.currentBubble.y += s.currentBubble.vy;

      // Wall bounce
      if (s.currentBubble.x <= BUBBLE_R || s.currentBubble.x >= W - BUBBLE_R) s.currentBubble.vx *= -1;

      // Hit top or grid bubble
      let hitGrid = false;
      for (const row of s.grid) {
        for (let c = 0; c < row.length; c++) {
          if (!row[c]) continue;
          const r2 = s.grid.indexOf(row);
          const gx = c * BUBBLE_R * 2 + BUBBLE_R + (r2 % 2 === 1 ? BUBBLE_R : 0);
          const gy = r2 * ROW_H + BUBBLE_R;
          if (Math.hypot(s.currentBubble.x - gx, s.currentBubble.y - gy) < BUBBLE_R * 2 - 2) {
            hitGrid = true;
            break;
          }
        }
        if (hitGrid) break;
      }

      if (s.currentBubble.y <= BUBBLE_R || hitGrid) {
        snapBubble(s.currentBubble.x, s.currentBubble.y, s.currentBubble.color);
        s.currentBubble = null;
        s.nextColor = COLORS[Math.floor(Math.random() * COLORS.length)];
      }
    }

    draw();
    rafRef.current = requestAnimationFrame(gameLoop);
  }, [draw, snapBubble]);

  const shoot = useCallback((angle: number) => {
    const s = stateRef.current;
    if (!s.running || s.currentBubble) return;
    const speed = 12;
    s.currentBubble = {
      x: W / 2, y: H - 30,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color: s.nextColor,
    };
    s.shotsLeft--;
    sfx.eat(muted);
  }, [muted]);

  const startGame = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    const s = stateRef.current;
    s.grid = makeGrid(5);
    s.currentBubble = null;
    s.nextColor = COLORS[Math.floor(Math.random() * COLORS.length)];
    s.aimAngle = -Math.PI / 2;
    s.running = true;
    s.score = 0;
    s.shotsLeft = diffRef.current === Difficulty.easy ? 40 : diffRef.current === Difficulty.medium ? 30 : 20;
    setScore(0); setSubmitted(false); setGameState("playing");
    rafRef.current = requestAnimationFrame(gameLoop);
  }, [gameLoop]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left) * (W / rect.width);
      const my = (e.clientY - rect.top) * (H / rect.height);
      const angle = Math.atan2(my - (H - 30), mx - W / 2);
      stateRef.current.aimAngle = Math.max(-Math.PI + 0.1, Math.min(-0.1, angle));
    };
    const onClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left) * (W / rect.width);
      const my = (e.clientY - rect.top) * (H / rect.height);
      const angle = Math.atan2(my - (H - 30), mx - W / 2);
      shoot(Math.max(-Math.PI + 0.1, Math.min(-0.1, angle)));
    };
    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("click", onClick);
    return () => { canvas.removeEventListener("mousemove", onMouseMove); canvas.removeEventListener("click", onClick); };
  }, [shoot]);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);
  useEffect(() => { if (gameState === "idle") draw(); }, [gameState, draw]);

  const handleSubmit = async () => {
    try {
      await submitScore({ game: "bubbleshooter", score: BigInt(score), difficulty });
      setSubmitted(true);
      sfx.submit(muted);
      toast.success("Score submitted!");
    } catch { toast.error("Failed to submit score"); }
  };

  return (
    <div className="flex flex-col h-full">
      <GameHeader title="BUBBLE SHOOTER" emoji="🫧" score={score} difficulty={difficulty} onDifficultyChange={setDifficulty} muted={muted} onMuteToggle={() => setMuted((m) => !m)} gameActive={gameState === "playing"} />
      <div className="flex-1 flex flex-col items-center justify-center p-4 gap-3 relative">
        <div className="relative">
          <canvas ref={canvasRef} width={W} height={H} className="border border-primary/30 rounded cursor-crosshair" style={{ maxWidth: "100%", maxHeight: "65vh", display: "block" }} />
          {gameState === "idle" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm rounded">
              <div className="pixel-font text-primary text-sm mb-2 text-glow-cyan animate-pulse-glow">BUBBLE SHOOTER</div>
              <div className="text-muted-foreground text-xs font-display mb-6 text-center">Aim and click to shoot. Match 3+ same-color bubbles!</div>
              <button type="button" onClick={startGame} className="btn-neon-cyan border px-6 py-3 pixel-font text-xs rounded">START GAME</button>
            </div>
          )}
          {gameState === "over" && (
            <GameOver score={score} personalBest={Math.max(personalBest, submitted ? score : 0)} onSubmit={handleSubmit} onPlayAgain={startGame} isSubmitting={isSubmitting} submitted={submitted} game="bubbleshooter" difficulty={difficulty} />
          )}
        </div>
        <div className="text-xs text-muted-foreground font-display">Move mouse to aim · Click to shoot</div>
      </div>
    </div>
  );
}
