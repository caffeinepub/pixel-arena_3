import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  useGetPlayerSummary,
  useGetAchievements,
  useSaveProfile,
} from "../hooks/useQueries";

const AVATAR_COLORS = [
  { bg: "#00f5ff", label: "Cyan" },
  { bg: "#bf00ff", label: "Magenta" },
  { bg: "#00ff88", label: "Green" },
  { bg: "#ff6b35", label: "Orange" },
  { bg: "#ff0066", label: "Pink" },
  { bg: "#ffcc00", label: "Gold" },
  { bg: "#0066ff", label: "Blue" },
  { bg: "#ffffff", label: "White" },
];

const AVATAR_ICONS = ["👾", "🤖", "🦊", "🐉", "🦄", "🎯", "🚀", "🌟"];

interface Achievement {
  id: string;
  label: string;
  description: string;
  icon: string;
}

const ALL_ACHIEVEMENTS: Achievement[] = [
  { id: "first_game", label: "First Steps", description: "Play your first game", icon: "🎮" },
  { id: "high_scorer", label: "High Scorer", description: "Score > 1000 in any game", icon: "⭐" },
  { id: "speed_demon", label: "Speed Demon", description: "Reaction score > 500", icon: "⚡" },
  { id: "memory_master", label: "Memory Master", description: "Memory score > 800", icon: "🧠" },
  { id: "snake_king", label: "Snake King", description: "Snake score > 1200", icon: "🐍" },
  { id: "dedicated", label: "Dedicated Player", description: "Play 10+ games", icon: "🏆" },
];

interface ProfileModalProps {
  open: boolean;
  onClose: () => void;
  isSetup?: boolean;
}

export function ProfileModal({ open, onClose, isSetup = false }: ProfileModalProps) {
  const { data: summary, isLoading: summaryLoading } = useGetPlayerSummary();
  const { data: achievements, isLoading: achievementsLoading } = useGetAchievements();
  const { mutateAsync: saveProfile, isPending: isSaving } = useSaveProfile();

  const [username, setUsername] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState(0);

  useEffect(() => {
    if (summary) {
      setUsername(summary.username || "");
      setSelectedAvatar(Number(summary.avatar) || 0);
    }
  }, [summary]);

  const handleSave = async () => {
    if (!username.trim()) {
      toast.error("Please enter a username");
      return;
    }
    try {
      await saveProfile({ username: username.trim(), avatar: BigInt(selectedAvatar) });
      toast.success("Profile saved!", { description: `Welcome, ${username}!` });
      if (isSetup) onClose();
    } catch {
      toast.error("Failed to save profile");
    }
  };

  const unlockedIds = new Set(achievements?.map((a) => a.achievementId) ?? []);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && !isSetup) onClose(); }}>
      <DialogContent
        className="max-w-md border-border/40 bg-card/95 backdrop-blur-xl overflow-y-auto max-h-[90vh]"
        style={{ boxShadow: "0 0 40px oklch(0.6 0.22 300 / 0.15), 0 0 80px oklch(0.6 0.22 300 / 0.05)" }}
      >
        <DialogHeader>
          <DialogTitle className="pixel-font text-secondary text-sm" style={{ textShadow: "0 0 10px oklch(0.6 0.22 300 / 0.8)" }}>
            {isSetup ? "🎮 SETUP PROFILE" : "👾 YOUR PROFILE"}
          </DialogTitle>
        </DialogHeader>

        {summaryLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-8 w-full bg-muted/40" />
            <Skeleton className="h-20 w-full bg-muted/40" />
          </div>
        ) : (
          <div className="space-y-5">
            {/* Stats row */}
            {!isSetup && summary && (
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "POINTS", value: Number(summary.totalPoints).toLocaleString(), color: "text-primary" },
                  { label: "GAMES", value: Number(summary.gamesPlayed).toString(), color: "text-secondary" },
                  { label: "BADGES", value: Number(summary.achievementCount).toString(), color: "text-accent" },
                ].map((stat) => (
                  <div key={stat.label} className="text-center p-3 rounded-lg bg-muted/20 border border-border/30">
                    <div className={`pixel-font text-lg ${stat.color}`}>{stat.value}</div>
                    <div className="text-xs text-muted-foreground font-display mt-1">{stat.label}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Avatar picker */}
            <div>
              <Label className="text-sm font-display text-muted-foreground mb-2 block">
                CHOOSE AVATAR
              </Label>
              <div className="grid grid-cols-4 gap-2">
                {AVATAR_COLORS.map((av, i) => (
                  <button
                    key={av.label}
                    type="button"
                    onClick={() => setSelectedAvatar(i)}
                    className={`w-full aspect-square rounded-lg flex items-center justify-center text-2xl transition-all border-2 ${
                      selectedAvatar === i
                        ? "border-primary scale-105"
                        : "border-border/30 hover:border-border/60 hover:scale-105"
                    }`}
                    style={{
                      background: `radial-gradient(circle, ${av.bg}22, ${av.bg}08)`,
                      boxShadow: selectedAvatar === i ? `0 0 15px ${av.bg}60` : "none",
                    }}
                    title={av.label}
                  >
                    <span style={{ filter: selectedAvatar === i ? `drop-shadow(0 0 6px ${av.bg})` : "none" }}>
                      {AVATAR_ICONS[i]}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Username */}
            <div>
              <Label htmlFor="username" className="text-sm font-display text-muted-foreground mb-1.5 block">
                USERNAME
              </Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your alias..."
                maxLength={24}
                className="bg-muted/20 border-border/40 focus:border-primary/60 font-display"
                onKeyDown={(e) => { if (e.key === "Enter") { void handleSave(); } }}
              />
            </div>

            <Button
              onClick={() => { void handleSave(); }}
              disabled={isSaving}
              className="w-full btn-neon-magenta border font-display font-bold"
            >
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isSaving ? "SAVING..." : isSetup ? "CREATE PROFILE" : "SAVE CHANGES"}
            </Button>

            {/* Achievements */}
            {!isSetup && (
              <div>
                <div className="text-sm font-display text-muted-foreground mb-2 flex items-center gap-2">
                  <span>ACHIEVEMENTS</span>
                  {achievementsLoading && <Loader2 size={12} className="animate-spin" />}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {ALL_ACHIEVEMENTS.map((ach) => {
                    const unlocked = unlockedIds.has(ach.id);
                    return (
                      <div
                        key={ach.id}
                        className={`p-3 rounded-lg border flex items-center gap-3 transition-all ${
                          unlocked
                            ? "border-accent/40 bg-accent/5"
                            : "border-border/20 bg-muted/10 opacity-50 grayscale"
                        }`}
                        style={unlocked ? { boxShadow: "0 0 10px oklch(0.82 0.2 145 / 0.2)" } : {}}
                      >
                        <span className="text-2xl">{ach.icon}</span>
                        <div>
                          <div className={`text-xs font-display font-bold ${unlocked ? "text-foreground" : "text-muted-foreground"}`}>
                            {ach.label}
                          </div>
                          <div className="text-xs text-muted-foreground">{ach.description}</div>
                        </div>
                        {unlocked && (
                          <Badge variant="outline" className="ml-auto text-xs border-accent/40 text-accent">
                            ✓
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
