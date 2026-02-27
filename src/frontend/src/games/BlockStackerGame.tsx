import { useState, useEffect, useRef, useCallback } from "react";
import { GameHeader } from "../components/GameHeader";
import { GameOver } from "../components/GameOver";
import { Difficulty, useSubmitScore } from "../hooks/useQueries";
import { sfx } from "../utils/audio";
import { toast } from "sonner";

const COLS = 10;
const ROWS = 20;
const CELL = 24;

type Board = (string | null)[][];

const TETROMINOES: { shape: number[][]; color: string }[] = [
  { shape: [[1, 1, 1, 1]], color: "#00f5ff" }, // I
  { shape: [[1, 1], [1, 1]], color: "#bf00ff" }, // O
  { shape: [[0, 1, 0], [1, 1, 1]], color: "#ff6b35" }, // T
  { shape: [[1, 0, 0], [1, 1, 1]], color: "#0066ff" }, // J
  { shape: [[0, 0, 1], [1, 1, 1]], color: "#ff8800" }, // L
  { shape: [[0, 1, 1], [1, 1, 0]], color: "#00ff88" }, // S
  { shape: [[1, 1, 0], [0, 1, 1]], color: "#ff0055" }, // Z
];

const SPEED: Record<Difficulty, number> = {
  [Difficulty.easy]: 800,
  [Difficulty.medium]: 500,
  [Difficulty.hard]: 250,
};

function emptyBoard(): Board {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

function rotate(shape: number[][]): number[][] {
  const rows = shape.length;
  const cols = shape[0].length;
  return Array.from({ length: cols }, (_, c) =>
    Array.from({ length: rows }, (__, r) => shape[rows - 1 - r][c])
  );
}

function canPlace(board: Board, shape: number[][], x: number, y: number): boolean {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = x + c;
      const ny = y + r;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return false;
      if (ny >= 0 && board[ny][nx]) return false;
    }
  }
  return true;
}

function placePiece(board: Board, shape: number[][], x: number, y: number, color: string): Board {
  const newBoard = board.map((row) => [...row]);
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (shape[r][c] && y + r >= 0) {
        newBoard[y + r][x + c] = color;
      }
    }
  }
  return newBoard;
}

function clearLines(board: Board): { board: Board; linesCleared: number } {
  const newBoard = board.filter((row) => row.some((cell) => !cell));
  const linesCleared = ROWS - newBoard.length;
  while (newBoard.length < ROWS) newBoard.unshift(Array(COLS).fill(null));
  return { board: newBoard, linesCleared };
}

function randomPiece() {
  const t = TETROMINOES[Math.floor(Math.random() * TETROMINOES.length)];
  return { shape: t.shape, color: t.color, x: Math.floor(COLS / 2) - 1, y: -t.shape.length + 1 };
}

interface BlockStackerGameProps {
  personalBest: number;
}

export function BlockStackerGame({ personalBest }: BlockStackerGameProps) {
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.easy);
  const [muted, setMuted] = useState(false);
  const [gameState, setGameState] = useState<"idle" | "playing" | "over">("idle");
  const [score, setScore] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [board, setBoard] = useState<Board>(emptyBoard());
  const [current, setCurrent] = useState(randomPiece());
  const [lines, setLines] = useState(0);

  const boardRef = useRef<Board>(emptyBoard());
  const currentRef = useRef(randomPiece());
  const gameStateRef = useRef<"idle" | "playing" | "over">("idle");
  const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { mutateAsync: submitScore, isPending: isSubmitting } = useSubmitScore();

  const spawnPiece = useCallback(() => {
    const piece = randomPiece();
    if (!canPlace(boardRef.current, piece.shape, piece.x, piece.y)) {
      sfx.die(muted);
      gameStateRef.current = "over";
      setGameState("over");
      return;
    }
    currentRef.current = piece;
    setCurrent({ ...piece });
  }, [muted]);

  const lockPiece = useCallback(() => {
    const { shape, color, x, y } = currentRef.current;
    const newBoard = placePiece(boardRef.current, shape, x, y, color);
    const { board: clearedBoard, linesCleared } = clearLines(newBoard);
    boardRef.current = clearedBoard;
    setBoard(clearedBoard);

    if (linesCleared > 0) {
      sfx.clear(muted);
      const pts = [0, 100, 250, 400, 600][linesCleared] ?? 600;
      setScore((s) => s + pts);
      setLines((l) => l + linesCleared);
    }

    spawnPiece();
  }, [muted, spawnPiece]);

  const drop = useCallback(() => {
    if (gameStateRef.current !== "playing") return;
    const p = currentRef.current;
    if (canPlace(boardRef.current, p.shape, p.x, p.y + 1)) {
      currentRef.current = { ...p, y: p.y + 1 };
      setCurrent({ ...currentRef.current });
    } else {
      lockPiece();
    }
  }, [lockPiece]);

  const startGame = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    const b = emptyBoard();
    boardRef.current = b;
    setBoard(b);
    const piece = randomPiece();
    currentRef.current = piece;
    setCurrent({ ...piece });
    setScore(0);
    setLines(0);
    setSubmitted(false);
    gameStateRef.current = "playing";
    setGameState("playing");
  }, []);

  useEffect(() => {
    if (gameState !== "playing") return;
    intervalRef.current = setInterval(drop, SPEED[difficulty]);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [gameState, difficulty, drop]);

  useEffect(() => {
    if (gameState !== "playing") return;

    const handleKey = (e: KeyboardEvent) => {
      if (gameStateRef.current !== "playing") return;
      const p = { ...currentRef.current };

      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
        if (canPlace(boardRef.current, p.shape, p.x - 1, p.y)) {
          currentRef.current = { ...p, x: p.x - 1 };
          setCurrent({ ...currentRef.current });
        }
      } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
        if (canPlace(boardRef.current, p.shape, p.x + 1, p.y)) {
          currentRef.current = { ...p, x: p.x + 1 };
          setCurrent({ ...currentRef.current });
        }
      } else if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") {
        e.preventDefault();
        if (canPlace(boardRef.current, p.shape, p.x, p.y + 1)) {
          currentRef.current = { ...p, y: p.y + 1 };
          setCurrent({ ...currentRef.current });
        } else {
          lockPiece();
        }
      } else if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
        e.preventDefault();
        const rotated = rotate(p.shape);
        if (canPlace(boardRef.current, rotated, p.x, p.y)) {
          currentRef.current = { ...p, shape: rotated };
          setCurrent({ ...currentRef.current });
        }
      } else if (e.key === " ") {
        e.preventDefault();
        // Hard drop
        let ny = p.y;
        while (canPlace(boardRef.current, p.shape, p.x, ny + 1)) ny++;
        currentRef.current = { ...p, y: ny };
        setCurrent({ ...currentRef.current });
        setTimeout(() => lockPiece(), 10);
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [gameState, lockPiece]);

  const handleSubmit = async () => {
    try {
      await submitScore({ game: "blocks", score: BigInt(score), difficulty });
      setSubmitted(true);
      sfx.submit(muted);
      toast.success("Score submitted!", { description: `${score} pts on ${difficulty}` });
    } catch {
      toast.error("Failed to submit score");
    }
  };

  // Ghost piece
  let ghostY = current.y;
  if (gameState === "playing") {
    while (canPlace(boardRef.current, current.shape, current.x, ghostY + 1)) ghostY++;
  }

  return (
    <div className="flex flex-col h-full">
      <GameHeader
        title="BLOCK STACKER"
        emoji="🟦"
        score={score}
        difficulty={difficulty}
        onDifficultyChange={setDifficulty}
        muted={muted}
        onMuteToggle={() => setMuted((m) => !m)}
        gameActive={gameState === "playing"}
      />

      <div className="flex-1 flex items-center justify-center p-4 gap-6 relative overflow-auto">
        {gameState === "idle" && (
          <div className="text-center">
            <div className="pixel-font text-primary text-sm mb-2 text-glow-cyan animate-pulse-glow">
              BLOCK STACKER
            </div>
            <div className="text-muted-foreground text-xs font-display mb-2 space-y-1">
              <div>← → : Move</div>
              <div>↑ / W : Rotate</div>
              <div>↓ : Soft drop</div>
              <div>Space : Hard drop</div>
            </div>
            <button
              type="button"
              onClick={startGame}
              className="btn-neon-cyan border px-6 py-3 pixel-font text-xs rounded mt-4"
            >
              START GAME
            </button>
          </div>
        )}

        {gameState !== "idle" && (
          <div className="relative">
            {/* Board */}
            <div
              className="relative border border-primary/30"
              style={{
                width: COLS * CELL,
                height: ROWS * CELL,
                backgroundColor: "rgba(0, 0, 20, 0.95)",
                boxShadow: "inset 0 0 20px rgba(0, 245, 255, 0.05), 0 0 20px rgba(0, 245, 255, 0.1)",
              }}
            >
              {/* Placed cells */}
              {board.flatMap((row, r) =>
                row.flatMap((cell, c) => {
                  const top = r * CELL + 1;
                  const left = c * CELL + 1;
                  return cell
                    ? [
                        <div
                          key={`cell-top${top}left${left}`}
                          className="absolute"
                          style={{
                            left,
                            top,
                            width: CELL - 2,
                            height: CELL - 2,
                            backgroundColor: cell,
                            boxShadow: `inset 2px 2px 4px rgba(255,255,255,0.2), inset -2px -2px 4px rgba(0,0,0,0.3)`,
                          }}
                        />,
                      ]
                    : [];
                })
              )}

              {/* Ghost piece */}
              {gameState === "playing" && ghostY !== current.y &&
                current.shape.flatMap((row, r) =>
                  row.flatMap((cell, c) => {
                    const top = (ghostY + r) * CELL + 1;
                    const left = (current.x + c) * CELL + 1;
                    return cell
                      ? [
                          <div
                            key={`ghost-top${top}left${left}`}
                            className="absolute border border-white/20"
                            style={{
                              left,
                              top,
                              width: CELL - 2,
                              height: CELL - 2,
                              backgroundColor: `${current.color}33`,
                            }}
                          />,
                        ]
                      : [];
                  })
                )}

              {/* Current piece */}
              {gameState === "playing" &&
                current.shape.flatMap((row, r) =>
                  row.flatMap((cell, c) => {
                    const top = (current.y + r) * CELL + 1;
                    const left = (current.x + c) * CELL + 1;
                    return cell && current.y + r >= 0
                      ? [
                          <div
                            key={`cur-top${top}left${left}`}
                            className="absolute"
                            style={{
                              left,
                              top,
                              width: CELL - 2,
                              height: CELL - 2,
                              backgroundColor: current.color,
                              boxShadow: `0 0 8px ${current.color}80, inset 2px 2px 4px rgba(255,255,255,0.3)`,
                            }}
                          />,
                        ]
                      : [];
                  })
                )}
            </div>

            {/* Lines cleared info */}
            <div className="mt-2 text-center text-xs font-display text-muted-foreground">
              Lines: {lines}
            </div>

            {gameState === "over" && (
              <GameOver
                score={score}
                personalBest={Math.max(personalBest, submitted ? score : 0)}
                onSubmit={handleSubmit}
                onPlayAgain={startGame}
                isSubmitting={isSubmitting}
                submitted={submitted}
                game="blocks"
                difficulty={difficulty}
              />
            )}
          </div>
        )}

        {gameState === "playing" && (
          <div className="text-xs font-display text-muted-foreground space-y-2 hidden sm:block">
            <div className="pixel-font text-xs text-primary mb-3">CONTROLS</div>
            <div>← → Move</div>
            <div>↑ Rotate</div>
            <div>↓ Drop</div>
            <div>Space Hard drop</div>
          </div>
        )}
      </div>
    </div>
  );
}
