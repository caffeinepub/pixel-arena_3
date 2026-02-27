import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Medal } from "lucide-react";
import { useGetLeaderboard } from "../hooks/useQueries";
import type { ScoreEntry } from "../backend.d";

const GAMES = [
  { key: "snake", label: "Snake", emoji: "🐍" },
  { key: "memory", label: "Memory", emoji: "🃏" },
  { key: "whacamole", label: "Whack", emoji: "🔨" },
  { key: "blocks", label: "Blocks", emoji: "🟦" },
  { key: "reaction", label: "React", emoji: "⚡" },
];

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: "text-green-400",
  medium: "text-yellow-400",
  hard: "text-red-400",
};

function shortenPrincipal(p: string): string {
  if (p.length <= 10) return p;
  return `${p.slice(0, 5)}...${p.slice(-4)}`;
}

function RankIcon({ rank }: { rank: number }) {
  if (rank === 1) return <Trophy size={14} className="text-yellow-400" />;
  if (rank === 2) return <Medal size={14} className="text-gray-300" />;
  if (rank === 3) return <Medal size={14} className="text-amber-600" />;
  return <span className="text-muted-foreground text-xs">{rank}</span>;
}

function LeaderboardTab({ game }: { game: string }) {
  const { data: entries, isLoading } = useGetLeaderboard(game);

  if (isLoading) {
    return (
      <div className="space-y-2 p-2">
        {Array.from({ length: 5 }, (_, k) => (
          <Skeleton key={`skel-${k + 1}`} className="h-10 w-full bg-muted/40" />
        ))}
      </div>
    );
  }

  if (!entries || entries.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground font-display">
        <div className="text-4xl mb-3">🏆</div>
        <div>No scores yet. Be the first!</div>
      </div>
    );
  }

  const sorted = [...entries].sort((a, b) => Number(b.score - a.score));

  return (
    <Table>
      <TableHeader>
        <TableRow className="border-border/30">
          <TableHead className="text-muted-foreground font-display text-xs w-12">#</TableHead>
          <TableHead className="text-muted-foreground font-display text-xs">Player</TableHead>
          <TableHead className="text-muted-foreground font-display text-xs text-right">Score</TableHead>
          <TableHead className="text-muted-foreground font-display text-xs text-right">Diff</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.slice(0, 10).map((entry: ScoreEntry, i) => (
          <TableRow
            key={`${entry.player.toString()}-${i}`}
            className={`border-border/20 transition-colors ${
              i === 0 ? "bg-yellow-500/5" : i === 1 ? "bg-gray-400/5" : ""
            }`}
          >
            <TableCell className="py-2">
              <div className="flex items-center justify-center w-6">
                <RankIcon rank={i + 1} />
              </div>
            </TableCell>
            <TableCell className="py-2 font-display text-sm">
              {shortenPrincipal(entry.player.toString())}
            </TableCell>
            <TableCell className="py-2 text-right">
              <span className="font-pixel text-xs text-primary">
                {Number(entry.score).toLocaleString()}
              </span>
            </TableCell>
            <TableCell className="py-2 text-right">
              <Badge
                variant="outline"
                className={`text-xs border-border/40 ${DIFFICULTY_COLORS[entry.difficulty] ?? ""}`}
              >
                {entry.difficulty}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

interface LeaderboardModalProps {
  open: boolean;
  onClose: () => void;
  initialGame?: string;
}

export function LeaderboardModal({ open, onClose, initialGame = "snake" }: LeaderboardModalProps) {
  const [activeGame, setActiveGame] = useState(initialGame);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="max-w-lg border-border/40 bg-card/95 backdrop-blur-xl"
        style={{ boxShadow: "0 0 40px oklch(0.85 0.18 195 / 0.15), 0 0 80px oklch(0.85 0.18 195 / 0.05)" }}
      >
        <DialogHeader>
          <DialogTitle className="pixel-font text-primary text-sm text-glow-cyan">
            🏆 LEADERBOARD
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeGame} onValueChange={setActiveGame}>
          <TabsList className="grid grid-cols-5 bg-muted/30 h-9">
            {GAMES.map((g) => (
              <TabsTrigger
                key={g.key}
                value={g.key}
                className="text-xs data-[state=active]:bg-primary/20 data-[state=active]:text-primary"
              >
                <span className="hidden sm:inline">{g.emoji} </span>{g.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {GAMES.map((g) => (
            <TabsContent key={g.key} value={g.key} className="mt-3 max-h-80 overflow-y-auto">
              <LeaderboardTab game={g.key} />
            </TabsContent>
          ))}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
