import { lazy, Suspense } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { SnakeGame } from "../games/SnakeGame";
import { MemoryGame } from "../games/MemoryGame";
import { WhackaMoleGame } from "../games/WhackaMoleGame";
import { BlockStackerGame } from "../games/BlockStackerGame";
import { ReactionGame } from "../games/ReactionGame";

const PongGame = lazy(() => import("../games/PongGame").then((m) => ({ default: m.PongGame })));
const BreakoutGame = lazy(() => import("../games/BreakoutGame").then((m) => ({ default: m.BreakoutGame })));
const MinesweeperGame = lazy(() => import("../games/MinesweeperGame").then((m) => ({ default: m.MinesweeperGame })));
const Game2048 = lazy(() => import("../games/Game2048").then((m) => ({ default: m.Game2048 })));
const FlappyGame = lazy(() => import("../games/FlappyGame").then((m) => ({ default: m.FlappyGame })));
const AsteroidsGame = lazy(() => import("../games/AsteroidsGame").then((m) => ({ default: m.AsteroidsGame })));
const WordScrambleGame = lazy(() => import("../games/WordScrambleGame").then((m) => ({ default: m.WordScrambleGame })));
const MathQuizGame = lazy(() => import("../games/MathQuizGame").then((m) => ({ default: m.MathQuizGame })));
const ColorMatchGame = lazy(() => import("../games/ColorMatchGame").then((m) => ({ default: m.ColorMatchGame })));
const SimonSaysGame = lazy(() => import("../games/SimonSaysGame").then((m) => ({ default: m.SimonSaysGame })));
const TypingSpeedGame = lazy(() => import("../games/TypingSpeedGame").then((m) => ({ default: m.TypingSpeedGame })));
const NumberMemoryGame = lazy(() => import("../games/NumberMemoryGame").then((m) => ({ default: m.NumberMemoryGame })));
const TicTacToeGame = lazy(() => import("../games/TicTacToeGame").then((m) => ({ default: m.TicTacToeGame })));
const ConnectFourGame = lazy(() => import("../games/ConnectFourGame").then((m) => ({ default: m.ConnectFourGame })));
const SudokuGame = lazy(() => import("../games/SudokuGame").then((m) => ({ default: m.SudokuGame })));
const BubbleShooterGame = lazy(() => import("../games/BubbleShooterGame").then((m) => ({ default: m.BubbleShooterGame })));
const FruitSlicerGame = lazy(() => import("../games/FruitSlicerGame").then((m) => ({ default: m.FruitSlicerGame })));
const SpaceShooterGame = lazy(() => import("../games/SpaceShooterGame").then((m) => ({ default: m.SpaceShooterGame })));
const SliderPuzzleGame = lazy(() => import("../games/SliderPuzzleGame").then((m) => ({ default: m.SliderPuzzleGame })));
const DiceRollGame = lazy(() => import("../games/DiceRollGame").then((m) => ({ default: m.DiceRollGame })));
const ClickerGame = lazy(() => import("../games/ClickerGame").then((m) => ({ default: m.ClickerGame })));
const GuessNumberGame = lazy(() => import("../games/GuessNumberGame").then((m) => ({ default: m.GuessNumberGame })));
const CardMatchingGame = lazy(() => import("../games/CardMatchingGame").then((m) => ({ default: m.CardMatchingGame })));
const AvoidGame = lazy(() => import("../games/AvoidGame").then((m) => ({ default: m.AvoidGame })));
const SpellingBeeGame = lazy(() => import("../games/SpellingBeeGame").then((m) => ({ default: m.SpellingBeeGame })));

export type GameKey =
  | "snake" | "memory" | "whacamole" | "blocks" | "reaction"
  | "pong" | "breakout" | "minesweeper" | "game2048" | "flappy"
  | "asteroids" | "wordscramble" | "mathquiz" | "colormatch" | "simonsays"
  | "typingspeed" | "numbermemory" | "tictactoe" | "connectfour" | "sudoku"
  | "bubbleshooter" | "fruitslicer" | "spaceshooter" | "sliderpuzzle" | "diceroll"
  | "clicker" | "guessnumber" | "cardmatching" | "avoidgame" | "spellingbee";

interface GameModalProps {
  game: GameKey | null;
  onClose: () => void;
  bestScores: Record<string, number>;
}

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="animate-spin text-primary" size={28} />
    </div>
  );
}

export function GameModal({ game, onClose, bestScores }: GameModalProps) {
  const pb = (key: string) => bestScores[key] ?? 0;

  return (
    <Dialog open={!!game} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="max-w-2xl p-0 border-border/40 bg-card/95 backdrop-blur-xl overflow-hidden"
        style={{
          boxShadow: "0 0 60px oklch(0.85 0.18 195 / 0.15), 0 0 120px oklch(0.85 0.18 195 / 0.05)",
          maxHeight: "92vh",
        }}
      >
        <div className="flex flex-col overflow-y-auto" style={{ minHeight: "500px", maxHeight: "92vh" }}>
          <Suspense fallback={<LoadingFallback />}>
            {game === "snake" && <SnakeGame personalBest={pb("snake")} />}
            {game === "memory" && <MemoryGame personalBest={pb("memory")} />}
            {game === "whacamole" && <WhackaMoleGame personalBest={pb("whacamole")} />}
            {game === "blocks" && <BlockStackerGame personalBest={pb("blocks")} />}
            {game === "reaction" && <ReactionGame personalBest={pb("reaction")} />}
            {game === "pong" && <PongGame personalBest={pb("pong")} />}
            {game === "breakout" && <BreakoutGame personalBest={pb("breakout")} />}
            {game === "minesweeper" && <MinesweeperGame personalBest={pb("minesweeper")} />}
            {game === "game2048" && <Game2048 personalBest={pb("game2048")} />}
            {game === "flappy" && <FlappyGame personalBest={pb("flappy")} />}
            {game === "asteroids" && <AsteroidsGame personalBest={pb("asteroids")} />}
            {game === "wordscramble" && <WordScrambleGame personalBest={pb("wordscramble")} />}
            {game === "mathquiz" && <MathQuizGame personalBest={pb("mathquiz")} />}
            {game === "colormatch" && <ColorMatchGame personalBest={pb("colormatch")} />}
            {game === "simonsays" && <SimonSaysGame personalBest={pb("simonsays")} />}
            {game === "typingspeed" && <TypingSpeedGame personalBest={pb("typingspeed")} />}
            {game === "numbermemory" && <NumberMemoryGame personalBest={pb("numbermemory")} />}
            {game === "tictactoe" && <TicTacToeGame personalBest={pb("tictactoe")} />}
            {game === "connectfour" && <ConnectFourGame personalBest={pb("connectfour")} />}
            {game === "sudoku" && <SudokuGame personalBest={pb("sudoku")} />}
            {game === "bubbleshooter" && <BubbleShooterGame personalBest={pb("bubbleshooter")} />}
            {game === "fruitslicer" && <FruitSlicerGame personalBest={pb("fruitslicer")} />}
            {game === "spaceshooter" && <SpaceShooterGame personalBest={pb("spaceshooter")} />}
            {game === "sliderpuzzle" && <SliderPuzzleGame personalBest={pb("sliderpuzzle")} />}
            {game === "diceroll" && <DiceRollGame personalBest={pb("diceroll")} />}
            {game === "clicker" && <ClickerGame personalBest={pb("clicker")} />}
            {game === "guessnumber" && <GuessNumberGame personalBest={pb("guessnumber")} />}
            {game === "cardmatching" && <CardMatchingGame personalBest={pb("cardmatching")} />}
            {game === "avoidgame" && <AvoidGame personalBest={pb("avoidgame")} />}
            {game === "spellingbee" && <SpellingBeeGame personalBest={pb("spellingbee")} />}
          </Suspense>
        </div>
      </DialogContent>
    </Dialog>
  );
}
