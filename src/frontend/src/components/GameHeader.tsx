import { Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Difficulty } from "../hooks/useQueries";

interface GameHeaderProps {
  title: string;
  score: number;
  difficulty: Difficulty;
  onDifficultyChange: (d: Difficulty) => void;
  muted: boolean;
  onMuteToggle: () => void;
  gameActive: boolean;
  emoji: string;
}

const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  [Difficulty.easy]: "text-green-400 border-green-400/50",
  [Difficulty.medium]: "text-yellow-400 border-yellow-400/50",
  [Difficulty.hard]: "text-red-400 border-red-400/50",
};

export function GameHeader({
  title,
  score,
  difficulty,
  onDifficultyChange,
  muted,
  onMuteToggle,
  gameActive,
  emoji,
}: GameHeaderProps) {
  return (
    <div className="flex items-center justify-between p-3 border-b border-border/30 bg-black/30">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{emoji}</span>
        <div>
          <div className="pixel-font text-xs text-primary">{title}</div>
          <div className="font-mono text-2xl font-bold text-foreground mt-0.5">
            {score.toLocaleString()}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Difficulty selector */}
        <div className="flex gap-1">
          {([Difficulty.easy, Difficulty.medium, Difficulty.hard] as const).map((d) => (
            <button
              key={d}
              onClick={() => !gameActive && onDifficultyChange(d)}
              disabled={gameActive}
              type="button"
              className={`px-2 py-1 text-xs pixel-font border rounded transition-all ${
                difficulty === d
                  ? `${DIFFICULTY_COLORS[d]} bg-white/5`
                  : "text-muted-foreground border-border/30 hover:border-border/60"
              } ${gameActive ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
            >
              {d.charAt(0).toUpperCase()}
            </button>
          ))}
        </div>

        {/* Mute button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onMuteToggle}
          className="w-8 h-8 text-muted-foreground hover:text-primary"
        >
          {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </Button>
      </div>
    </div>
  );
}
