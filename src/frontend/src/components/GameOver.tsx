import { Trophy, RotateCcw, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Difficulty } from "../hooks/useQueries";

interface GameOverProps {
  score: number;
  personalBest: number;
  onSubmit: () => void;
  onPlayAgain: () => void;
  isSubmitting: boolean;
  submitted: boolean;
  game: string;
  difficulty: Difficulty;
}

const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  [Difficulty.easy]: "EASY",
  [Difficulty.medium]: "MEDIUM",
  [Difficulty.hard]: "HARD",
};

export function GameOver({
  score,
  personalBest,
  onSubmit,
  onPlayAgain,
  isSubmitting,
  submitted,
  difficulty,
}: GameOverProps) {
  const isNewBest = score > personalBest;

  return (
    <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/80 backdrop-blur-sm">
      <div className="animate-game-over text-center p-8 rounded-xl border border-primary/40 bg-card/90 max-w-sm w-full mx-4"
        style={{ boxShadow: "0 0 40px oklch(0.85 0.18 195 / 0.2), 0 0 80px oklch(0.85 0.18 195 / 0.1)" }}>

        <div className="pixel-font text-2xl text-destructive mb-2 animate-flicker">
          GAME OVER
        </div>

        {isNewBest && (
          <div className="pixel-font text-xs text-accent mb-4 text-glow-green animate-pulse-glow">
            ★ NEW HIGH SCORE! ★
          </div>
        )}

        <div className="my-6">
          <div className="text-muted-foreground text-sm font-display mb-1">FINAL SCORE</div>
          <div className="pixel-font text-4xl text-primary text-glow-cyan">
            {score.toLocaleString()}
          </div>
        </div>

        <div className="flex justify-center gap-8 mb-6 text-sm font-display">
          <div>
            <div className="text-muted-foreground text-xs">PERSONAL BEST</div>
            <div className="text-foreground font-bold flex items-center gap-1 justify-center">
              <Trophy size={12} className="text-yellow-400" />
              {personalBest.toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground text-xs">DIFFICULTY</div>
            <div className="text-foreground font-bold">{DIFFICULTY_LABEL[difficulty]}</div>
          </div>
        </div>

        <div className="flex gap-3 justify-center">
          {!submitted ? (
            <Button
              onClick={onSubmit}
              disabled={isSubmitting}
              className="btn-neon-green border font-display font-bold flex items-center gap-2"
            >
              <Upload size={14} />
              {isSubmitting ? "SAVING..." : "SUBMIT SCORE"}
            </Button>
          ) : (
            <div className="text-accent text-sm font-display font-bold flex items-center gap-2">
              ✓ Score Saved!
            </div>
          )}
          <Button
            onClick={onPlayAgain}
            variant="outline"
            className="border-border/50 hover:border-primary/50 font-display font-bold flex items-center gap-2"
          >
            <RotateCcw size={14} />
            PLAY AGAIN
          </Button>
        </div>
      </div>
    </div>
  );
}
