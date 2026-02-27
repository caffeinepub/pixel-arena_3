import { useState, useEffect } from "react";
import { useInternetIdentity } from "./hooks/useInternetIdentity";
import { useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { Loader2, Trophy, User, LogOut, Gamepad2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StarField } from "./components/StarField";
import { GameModal, type GameKey } from "./components/GameModal";
import { LeaderboardModal } from "./components/LeaderboardModal";
import { ProfileModal } from "./components/ProfileModal";
import {
  useGetCallerUserProfile,
  useGetPersonalStats,
} from "./hooks/useQueries";

type GameCategory = "action" | "puzzle" | "arcade" | "casual";

interface GameInfo {
  key: GameKey;
  name: string;
  emoji: string;
  description: string;
  color: string;
  glowColor: string;
  category: GameCategory;
}

const GAMES: GameInfo[] = [
  // ── ACTION ──────────────────────────────────────────────────────────
  { key: "snake", name: "SNAKE", emoji: "🐍", description: "Classic snake! Eat food, grow longer. Don't hit the walls.", color: "oklch(0.82 0.2 145)", glowColor: "0.82 0.2 145", category: "action" },
  { key: "whacamole", name: "WHACK-A-MOLE", emoji: "🔨", description: "Smash those moles before they disappear!", color: "oklch(0.75 0.2 30)", glowColor: "0.75 0.2 30", category: "action" },
  { key: "reaction", name: "REACTION", emoji: "⚡", description: "Click when green! 5 rounds of pure reflex.", color: "oklch(0.6 0.22 300)", glowColor: "0.6 0.22 300", category: "action" },
  { key: "flappy", name: "FLAPPY BIRD", emoji: "🐦", description: "Tap to flap. Dodge the pipes. Score = pipes cleared!", color: "oklch(0.82 0.18 100)", glowColor: "0.82 0.18 100", category: "action" },
  { key: "asteroids", name: "ASTEROIDS", emoji: "☄️", description: "Rotate, thrust, and shoot. Split asteroids for points!", color: "oklch(0.78 0.18 195)", glowColor: "0.78 0.18 195", category: "action" },
  { key: "spaceshooter", name: "SPACE SHOOTER", emoji: "🚀", description: "Move to dodge. Ship auto-fires at alien invaders!", color: "oklch(0.7 0.2 270)", glowColor: "0.7 0.2 270", category: "action" },
  { key: "fruitslicer", name: "FRUIT SLICER", emoji: "🍎", description: "Click fruits before they vanish! Miss 3 = game over.", color: "oklch(0.8 0.22 30)", glowColor: "0.8 0.22 30", category: "action" },
  { key: "avoidgame", name: "AVOID!", emoji: "🏃", description: "Dodge falling objects. Survive as long as possible!", color: "oklch(0.75 0.22 25)", glowColor: "0.75 0.22 25", category: "action" },
  { key: "bubbleshooter", name: "BUBBLE SHOOTER", emoji: "🫧", description: "Aim and shoot bubbles. Match 3+ to pop for points!", color: "oklch(0.8 0.18 230)", glowColor: "0.8 0.18 230", category: "action" },
  // ── PUZZLE ──────────────────────────────────────────────────────────
  { key: "memory", name: "MEMORY", emoji: "🃏", description: "Match emoji pairs before the timer runs out!", color: "oklch(0.85 0.18 195)", glowColor: "0.85 0.18 195", category: "puzzle" },
  { key: "minesweeper", name: "MINESWEEPER", emoji: "💣", description: "Reveal safe cells. Flag mines. Clear the board!", color: "oklch(0.72 0.18 140)", glowColor: "0.72 0.18 140", category: "puzzle" },
  { key: "game2048", name: "2048", emoji: "🔢", description: "Slide tiles to merge. Reach the magic number 2048!", color: "oklch(0.78 0.2 60)", glowColor: "0.78 0.2 60", category: "puzzle" },
  { key: "tictactoe", name: "TIC TAC TOE", emoji: "✕", description: "Play 5 rounds vs CPU. Minimax AI won't go easy!", color: "oklch(0.82 0.18 260)", glowColor: "0.82 0.18 260", category: "puzzle" },
  { key: "connectfour", name: "CONNECT FOUR", emoji: "🔵", description: "Drop discs to connect 4 in a row vs CPU!", color: "oklch(0.75 0.2 200)", glowColor: "0.75 0.2 200", category: "puzzle" },
  { key: "sudoku", name: "SUDOKU", emoji: "🔲", description: "Fill a 6×6 grid. Every row, col, and box needs 1–6.", color: "oklch(0.8 0.14 160)", glowColor: "0.8 0.14 160", category: "puzzle" },
  { key: "sliderpuzzle", name: "SLIDER PUZZLE", emoji: "🔢", description: "Slide tiles to order 1–15. Fewer moves = more bonus!", color: "oklch(0.78 0.18 250)", glowColor: "0.78 0.18 250", category: "puzzle" },
  { key: "cardmatching", name: "CARD MATCHING", emoji: "🃏", description: "Larger memory game: 5×4 grid, 10 pairs to match!", color: "oklch(0.75 0.2 280)", glowColor: "0.75 0.2 280", category: "puzzle" },
  { key: "numbermemory", name: "NUMBER MEMORY", emoji: "🧠", description: "See digits, type them back. Each round gets longer!", color: "oklch(0.7 0.18 320)", glowColor: "0.7 0.18 320", category: "puzzle" },
  // ── ARCADE ──────────────────────────────────────────────────────────
  { key: "blocks", name: "BLOCK STACKER", emoji: "🟦", description: "Stack falling tetrominoes to clear lines!", color: "oklch(0.78 0.18 260)", glowColor: "0.78 0.18 260", category: "arcade" },
  { key: "pong", name: "PONG", emoji: "🏓", description: "Classic Pong vs CPU. First to 5 points wins!", color: "oklch(0.85 0.18 195)", glowColor: "0.85 0.18 195", category: "arcade" },
  { key: "breakout", name: "BREAKOUT", emoji: "🧱", description: "Bounce ball off paddle to destroy all the bricks!", color: "oklch(0.75 0.22 350)", glowColor: "0.75 0.22 350", category: "arcade" },
  { key: "simonsays", name: "SIMON SAYS", emoji: "🔴", description: "Watch the flashing sequence, then repeat it!", color: "oklch(0.7 0.2 30)", glowColor: "0.7 0.2 30", category: "arcade" },
  { key: "clicker", name: "COOKIE CLICKER", emoji: "🍪", description: "Click cookies, buy upgrades, maximize in 60s!", color: "oklch(0.8 0.18 60)", glowColor: "0.8 0.18 60", category: "arcade" },
  { key: "diceroll", name: "DICE ROLL", emoji: "🎲", description: "Roll 5 dice × 5 rounds. Score = total pips!", color: "oklch(0.75 0.2 30)", glowColor: "0.75 0.2 30", category: "arcade" },
  { key: "typingspeed", name: "TYPING SPEED", emoji: "⌨️", description: "Type the sentence as fast as you can. Score = WPM!", color: "oklch(0.82 0.18 180)", glowColor: "0.82 0.18 180", category: "arcade" },
  // ── CASUAL ──────────────────────────────────────────────────────────
  { key: "wordscramble", name: "WORD SCRAMBLE", emoji: "🔤", description: "Unscramble 10 words. Faster answers score more!", color: "oklch(0.8 0.2 140)", glowColor: "0.8 0.2 140", category: "casual" },
  { key: "mathquiz", name: "MATH QUIZ", emoji: "🧮", description: "30 seconds of rapid arithmetic. Click the right answer!", color: "oklch(0.82 0.22 80)", glowColor: "0.82 0.22 80", category: "casual" },
  { key: "colormatch", name: "COLOR MATCH", emoji: "🎨", description: "Name the INK color, not the word! Tricky brain test.", color: "oklch(0.78 0.22 300)", glowColor: "0.78 0.22 300", category: "casual" },
  { key: "guessnumber", name: "GUESS NUMBER", emoji: "🎯", description: "Guess a hidden number with higher/lower hints. 3 rounds!", color: "oklch(0.72 0.18 340)", glowColor: "0.72 0.18 340", category: "casual" },
  { key: "spellingbee", name: "SPELLING BEE", emoji: "🐝", description: "Make words from 7 letters. Center letter required! 90s.", color: "oklch(0.82 0.22 80)", glowColor: "0.82 0.22 80", category: "casual" },
];

const CATEGORY_LABELS: Record<GameCategory | "all", string> = {
  all: "ALL",
  action: "ACTION",
  puzzle: "PUZZLE",
  arcade: "ARCADE",
  casual: "CASUAL",
};

const CATEGORY_COLORS: Record<GameCategory | "all", string> = {
  all: "0.85 0.18 195",
  action: "0.75 0.22 25",
  puzzle: "0.75 0.18 260",
  arcade: "0.82 0.22 300",
  casual: "0.82 0.2 140",
};

const AVATAR_COLORS = [
  "#00f5ff", "#bf00ff", "#00ff88", "#ff6b35",
  "#ff0066", "#ffcc00", "#0066ff", "#ffffff",
];
const AVATAR_ICONS = ["👾", "🤖", "🦊", "🐉", "🦄", "🎯", "🚀", "🌟"];

export default function App() {
  const { login, clear, loginStatus, identity, isInitializing } = useInternetIdentity();
  const queryClient = useQueryClient();
  const isAuthenticated = !!identity;

  const { data: userProfile, isLoading: profileLoading, isFetched: profileFetched } =
    useGetCallerUserProfile();

  const { data: personalStats } = useGetPersonalStats();

  const [activeGame, setActiveGame] = useState<GameKey | null>(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [leaderboardGame, setLeaderboardGame] = useState("snake");
  const [activeCategory, setActiveCategory] = useState<GameCategory | "all">("all");

  const showProfileSetup = isAuthenticated && !profileLoading && profileFetched && !userProfile?.username;

  const bestScores: Record<string, number> = {};
  if (personalStats?.bestScores) {
    for (const [game, score] of personalStats.bestScores) {
      bestScores[game] = Number(score);
    }
  }

  const handleLogin = async () => {
    try {
      await login();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg === "User is already authenticated") {
        await clear();
        setTimeout(() => { void login(); }, 300);
      }
    }
  };

  const handleLogout = async () => {
    await clear();
    queryClient.clear();
    toast.success("Logged out");
  };

  const avatarIndex = userProfile?.username ? Number(userProfile.avatar ?? 0) : 0;

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(t);
  }, []);

  const filteredGames = activeCategory === "all" ? GAMES : GAMES.filter((g) => g.category === activeCategory);

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050510]">
        <StarField />
        <div className="relative z-10 flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-primary" size={32} />
          <div className="pixel-font text-primary text-xs">LOADING...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050510] text-foreground overflow-x-hidden">
      <StarField />
      <Toaster
        theme="dark"
        toastOptions={{
          style: {
            background: "oklch(0.12 0.03 260)",
            border: "1px solid oklch(0.85 0.18 195 / 0.3)",
            color: "oklch(0.95 0.01 210)",
          },
        }}
      />

      {/* Background orbs */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute rounded-full animate-float" style={{ width: 800, height: 800, top: "-300px", left: "-300px", background: "radial-gradient(circle, oklch(0.85 0.18 195 / 0.12) 0%, oklch(0.85 0.18 195 / 0.04) 40%, transparent 70%)", animationDuration: "9s" }} />
        <div className="absolute rounded-full animate-float" style={{ width: 700, height: 700, bottom: "-200px", right: "-200px", background: "radial-gradient(circle, oklch(0.6 0.22 300 / 0.1) 0%, oklch(0.6 0.22 300 / 0.03) 40%, transparent 70%)", animationDuration: "12s", animationDelay: "4s" }} />
        <div className="absolute" style={{ width: 900, height: 500, top: 0, left: "50%", transform: "translateX(-50%)", background: "radial-gradient(ellipse at 50% 20%, oklch(0.85 0.18 195 / 0.09) 0%, oklch(0.85 0.18 195 / 0.03) 40%, transparent 70%)", pointerEvents: "none" }} />
        <div className="hero-scan absolute inset-0" />
      </div>

      <div className="relative z-10">
        {/* Navigation */}
        <header className="sticky top-0 z-40 backdrop-blur-xl" style={{ borderBottom: "1px solid oklch(0.85 0.18 195 / 0.1)", background: "oklch(0.06 0.02 260 / 0.85)", boxShadow: "0 1px 0 oklch(0.85 0.18 195 / 0.08), 0 4px 20px oklch(0 0 0 / 0.4)" }}>
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center border border-primary/40" style={{ background: "radial-gradient(circle, oklch(0.85 0.18 195 / 0.2), transparent)", boxShadow: "0 0 15px oklch(0.85 0.18 195 / 0.3)" }}>
                <Gamepad2 size={18} className="text-primary" />
              </div>
              <div>
                <div className="pixel-font text-sm text-primary text-glow-cyan animate-flicker leading-none">PIXEL ARENA</div>
                <div className="text-xs text-muted-foreground font-display">Gaming Hub</div>
              </div>
            </div>

            <nav className="flex items-center gap-2">
              {isAuthenticated ? (
                <>
                  <Button variant="ghost" size="sm" onClick={() => setShowLeaderboard(true)} className="text-muted-foreground hover:text-primary font-display">
                    <Trophy size={15} className="mr-1.5" />
                    <span className="hidden sm:inline">Leaderboard</span>
                  </Button>
                  <button type="button" onClick={() => setShowProfile(true)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border/30 bg-muted/20 hover:border-secondary/50 transition-all font-display text-sm">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-sm" style={{ backgroundColor: `${AVATAR_COLORS[avatarIndex]}22`, border: `1px solid ${AVATAR_COLORS[avatarIndex]}66` }}>
                      {AVATAR_ICONS[avatarIndex]}
                    </div>
                    <span className="hidden sm:inline text-foreground/80">{userProfile?.username || "Player"}</span>
                  </button>
                  <Button variant="ghost" size="icon" onClick={() => { void handleLogout(); }} className="text-muted-foreground hover:text-destructive w-8 h-8" title="Logout">
                    <LogOut size={15} />
                  </Button>
                </>
              ) : (
                <Button onClick={() => { void handleLogin(); }} disabled={loginStatus === "logging-in"} className="btn-neon-cyan border font-display font-bold">
                  {loginStatus === "logging-in" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <User size={15} className="mr-2" />}
                  {loginStatus === "logging-in" ? "Connecting..." : "Connect"}
                </Button>
              )}
            </nav>
          </div>
        </header>

        <main>
          {/* Hero */}
          <section className="relative pt-20 pb-14 px-4 text-center overflow-hidden">
            <div className="absolute bottom-0 left-0 right-0 h-px pointer-events-none" style={{ background: "linear-gradient(90deg, transparent, oklch(0.85 0.18 195 / 0.3) 30%, oklch(0.85 0.18 195 / 0.5) 50%, oklch(0.85 0.18 195 / 0.3) 70%, transparent)", boxShadow: "0 0 20px oklch(0.85 0.18 195 / 0.3)" }} />
            <div className="absolute bottom-0 left-0 right-0 h-20 pointer-events-none" style={{ background: "linear-gradient(to top, oklch(0.85 0.18 195 / 0.04), transparent)" }} />

            <div className={mounted ? "animate-hero-entrance" : "opacity-0"}>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border font-display text-xs mb-8 animate-badge-entrance"
                style={{ borderColor: "oklch(0.85 0.18 195 / 0.35)", background: "oklch(0.85 0.18 195 / 0.06)", color: "oklch(0.85 0.18 195)", animationDelay: "0.4s", opacity: 0, animationFillMode: "forwards" }}>
                <Zap size={11} />
                <span>30+ GAMES &nbsp;·&nbsp; LEADERBOARDS &nbsp;·&nbsp; ACHIEVEMENTS</span>
              </div>

              <div className="mb-5">
                <h1 className="pixel-font block leading-none mb-1" style={{ fontSize: "clamp(2.5rem, 8vw, 5.5rem)", letterSpacing: "0.08em", color: "oklch(0.92 0.18 195)", animation: "pulse-glow 2s ease-in-out infinite" }}>PIXEL</h1>
                <h1 className="pixel-font block leading-none" style={{ fontSize: "clamp(2.5rem, 8vw, 5.5rem)", letterSpacing: "0.08em", color: "oklch(0.78 0.22 300)", animation: "arena-glow 2.4s ease-in-out infinite", animationDelay: "0.3s" }}>ARENA</h1>
              </div>

              <div className="flex items-center justify-center gap-2 mb-5">
                <div className="h-px w-16 bg-gradient-to-r from-transparent to-primary/40" />
                <div className="w-1.5 h-1.5 rounded-sm rotate-45 bg-primary/60" />
                <div className="w-1 h-1 rounded-sm rotate-45 bg-secondary/60" />
                <div className="w-1.5 h-1.5 rounded-sm rotate-45 bg-primary/60" />
                <div className="h-px w-16 bg-gradient-to-l from-transparent to-primary/40" />
              </div>

              <p className="font-display text-base sm:text-lg max-w-md mx-auto mb-8 leading-relaxed" style={{ color: "oklch(0.65 0.04 240)" }}>
                The ultimate retro gaming hub.<br />
                <span style={{ color: "oklch(0.75 0.06 240)" }}>Play classics, climb leaderboards, earn glory.</span>
              </p>

              {!isAuthenticated && (
                <Button onClick={() => { void handleLogin(); }} disabled={loginStatus === "logging-in"} size="lg" className="btn-neon-cyan border font-pixel text-xs px-10 py-5 relative overflow-hidden group">
                  {loginStatus === "logging-in" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Gamepad2 size={16} className="mr-2" />}
                  PLAY NOW
                </Button>
              )}

              {isAuthenticated && userProfile?.username && (
                <div className="flex items-center justify-center gap-6 flex-wrap">
                  {personalStats?.bestScores && personalStats.bestScores.length > 0 && (
                    <div className="flex items-center gap-2 text-sm font-display px-4 py-2 rounded-lg border" style={{ borderColor: "oklch(0.75 0.18 50 / 0.3)", background: "oklch(0.75 0.18 50 / 0.06)", color: "oklch(0.75 0.14 60)" }}>
                      <Trophy size={14} className="text-yellow-400" />
                      {personalStats.bestScores.reduce((sum, [, s]) => sum + Number(s), 0).toLocaleString()} total pts
                    </div>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => setShowLeaderboard(true)} className="font-display text-sm" style={{ color: "oklch(0.85 0.18 195)" }}>
                    View Leaderboards →
                  </Button>
                </div>
              )}
            </div>
          </section>

          {/* Game Grid */}
          <section className="max-w-7xl mx-auto px-4 pt-8 pb-24">
            {/* Section label */}
            <div className="flex items-center gap-4 mb-6">
              <div className="h-px flex-1" style={{ background: "linear-gradient(to right, transparent, oklch(0.85 0.18 195 / 0.2))" }} />
              <div className="pixel-font text-xs" style={{ color: "oklch(0.85 0.18 195 / 0.6)" }}>SELECT GAME</div>
              <div className="h-px flex-1" style={{ background: "linear-gradient(to left, transparent, oklch(0.85 0.18 195 / 0.2))" }} />
            </div>

            {/* Category filter tabs */}
            <div className="flex flex-wrap gap-2 justify-center mb-8">
              {(["all", "action", "puzzle", "arcade", "casual"] as const).map((cat) => {
                const isActive = activeCategory === cat;
                const glowColor = CATEGORY_COLORS[cat];
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setActiveCategory(cat)}
                    className="px-4 py-1.5 rounded-full font-display text-xs font-bold border transition-all duration-200"
                    style={{
                      borderColor: isActive ? `oklch(${glowColor} / 0.8)` : `oklch(${glowColor} / 0.25)`,
                      background: isActive ? `oklch(${glowColor} / 0.15)` : `oklch(${glowColor} / 0.04)`,
                      color: isActive ? `oklch(${glowColor})` : `oklch(${glowColor} / 0.5)`,
                      boxShadow: isActive ? `0 0 14px oklch(${glowColor} / 0.35)` : "none",
                    }}
                  >
                    {CATEGORY_LABELS[cat]}
                    {cat !== "all" && (
                      <span className="ml-1.5 opacity-60">{GAMES.filter((g) => g.category === cat).length}</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Games grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {filteredGames.map((game, i) => {
                const best = bestScores[game.key];
                return (
                  <article
                    key={game.key}
                    className={`game-card rounded-xl p-4 flex flex-col gap-3 animate-slide-in-up stagger-${Math.min(i + 1, 6)}`}
                    style={{
                      animationFillMode: "forwards",
                      ["--game-color" as string]: game.glowColor,
                    }}
                  >
                    {/* Icon + best score */}
                    <div className="flex items-start justify-between gap-2">
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl border shrink-0 transition-all duration-300"
                        style={{
                          background: `radial-gradient(circle, oklch(${game.glowColor} / 0.18), oklch(${game.glowColor} / 0.04))`,
                          borderColor: `oklch(${game.glowColor} / 0.45)`,
                          boxShadow: `0 0 14px oklch(${game.glowColor} / 0.22), inset 0 0 8px oklch(${game.glowColor} / 0.06)`,
                        }}
                      >
                        {game.emoji}
                      </div>
                      {isAuthenticated && best !== undefined ? (
                        <div className="text-right shrink-0 min-w-0">
                          <div className="text-xs font-display mb-0.5 truncate" style={{ color: "oklch(0.45 0.05 240)", fontSize: "0.6rem" }}>BEST</div>
                          <div className="pixel-font text-sm leading-none truncate" style={{ color: game.color, textShadow: `0 0 10px oklch(${game.glowColor} / 0.5)` }}>
                            {best.toLocaleString()}
                          </div>
                        </div>
                      ) : null}
                    </div>

                    {/* Name + description */}
                    <div className="flex-1 min-w-0">
                      <h2 className="pixel-font leading-relaxed mb-1 truncate" style={{ fontSize: "0.6rem", color: game.color, textShadow: `0 0 8px oklch(${game.glowColor} / 0.35)` }}>
                        {game.name}
                      </h2>
                      <p className="font-display leading-snug line-clamp-2" style={{ fontSize: "0.65rem", color: "oklch(0.5 0.04 240)" }}>
                        {game.description}
                      </p>
                    </div>

                    {/* CTA */}
                    <div className="flex items-center gap-1.5 mt-auto">
                      <button
                        type="button"
                        onClick={() => { if (isAuthenticated) setActiveGame(game.key); else void handleLogin(); }}
                        className="flex-1 py-2 px-2 rounded-lg border font-display font-bold transition-all duration-200 truncate"
                        style={{
                          fontSize: "0.65rem",
                          color: game.color,
                          borderColor: `oklch(${game.glowColor} / 0.45)`,
                          background: `oklch(${game.glowColor} / 0.08)`,
                        }}
                        onMouseEnter={(e) => {
                          const el = e.currentTarget as HTMLButtonElement;
                          el.style.boxShadow = `0 0 16px oklch(${game.glowColor} / 0.4)`;
                          el.style.background = `oklch(${game.glowColor} / 0.16)`;
                          el.style.borderColor = `oklch(${game.glowColor} / 0.7)`;
                        }}
                        onMouseLeave={(e) => {
                          const el = e.currentTarget as HTMLButtonElement;
                          el.style.boxShadow = "none";
                          el.style.background = `oklch(${game.glowColor} / 0.08)`;
                          el.style.borderColor = `oklch(${game.glowColor} / 0.45)`;
                        }}
                      >
                        {isAuthenticated ? "▶ PLAY" : "🔐 LOGIN"}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setLeaderboardGame(game.key); setShowLeaderboard(true); }}
                        className="py-2 px-2 rounded-lg border transition-all duration-200"
                        style={{ borderColor: "oklch(0.25 0.05 260)", color: "oklch(0.45 0.05 240)" }}
                        onMouseEnter={(e) => {
                          const el = e.currentTarget as HTMLButtonElement;
                          el.style.borderColor = "oklch(0.75 0.18 50 / 0.5)";
                          el.style.color = "oklch(0.75 0.18 50)";
                          el.style.boxShadow = "0 0 8px oklch(0.75 0.18 50 / 0.25)";
                        }}
                        onMouseLeave={(e) => {
                          const el = e.currentTarget as HTMLButtonElement;
                          el.style.borderColor = "oklch(0.25 0.05 260)";
                          el.style.color = "oklch(0.45 0.05 240)";
                          el.style.boxShadow = "none";
                        }}
                        title="Leaderboard"
                      >
                        <Trophy size={12} />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </main>

        <footer className="border-t border-border/20 py-6 px-4 text-center">
          <div className="text-xs text-muted-foreground font-display flex items-center justify-center gap-2">
            <Gamepad2 size={12} />
            <span>© {new Date().getFullYear()}. Built with</span>
            <span className="text-primary">❤</span>
            <span>using</span>
            <a
              href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:text-primary/80 transition-colors"
            >
              caffeine.ai
            </a>
          </div>
        </footer>
      </div>

      {/* Modals */}
      <GameModal game={activeGame} onClose={() => setActiveGame(null)} bestScores={bestScores} />
      <LeaderboardModal open={showLeaderboard} onClose={() => setShowLeaderboard(false)} initialGame={leaderboardGame} />
      <ProfileModal open={showProfile || showProfileSetup} onClose={() => setShowProfile(false)} isSetup={showProfileSetup && !showProfile} />
    </div>
  );
}
