# Pixel Arena — 30+ Games Expansion

## Current State
- 5 games: Snake, Memory Match, Whack-a-Mole, Block Stacker, Reaction Speed Test
- Backend stores scores, profiles, achievements for those 5 games
- GameModal routes to each game by key; GameKey is a union of 5 string literals
- getPersonalStats hardcodes the 5 game names in Motoko
- 6 achievements

## Requested Changes (Diff)

### Add
- 25+ new browser-playable games to reach 30+ total:
  1. **Pong** — classic 2-player vs CPU paddle ball
  2. **Breakout** — ball + paddle, destroy brick wall
  3. **Minesweeper** — classic grid, flag mines, reveal safe cells
  4. **2048** — slide tiles to merge to 2048
  5. **Flappy Bird** — tap to flap, avoid pipes
  6. **Asteroids** — rotate/thrust, shoot asteroids
  7. **Pac-Man Lite** — dot-eating maze with ghost AI
  8. **Crossword Lite** — mini word puzzle (fill letters)
  9. **Word Scramble** — unscramble 5 letters, timed
  10. **Math Quiz** — rapid arithmetic questions, timed
  11. **Color Match** — click the matching color name/swatch
  12. **Simon Says** — repeat the color sequence
  13. **Typing Speed** — type the shown sentence as fast as possible
  14. **Number Memory** — memorize growing number sequences
  15. **Tic Tac Toe** — vs CPU, 3 difficulty levels
  16. **Connect Four** — drop discs, 4 in a row vs CPU
  17. **Sudoku Lite** — 6x6 sudoku puzzle
  18. **Bubble Shooter** — aim and shoot colored bubbles
  19. **Fruit Slicer** — click/swipe fruit quickly
  20. **Pixel Paint** — draw on a 16x16 grid
  21. **Tower Defense Lite** — place towers, survive waves
  22. **Space Shooter** — vertical scrolling shoot-em-up
  23. **Dice Roll** — press roll, highest sum wins in 5 rounds
  24. **Clicker** — cookie-clicker style auto-increment
  25. **Slider Puzzle** — classic 15-puzzle (4x4 grid)

- New achievements tied to new games
- Game category filter/tabs on the home grid (Action, Puzzle, Arcade, Casual)

### Modify
- `GameKey` type in GameModal to include all 30 game keys
- `getPersonalStats` in backend to use dynamic game list instead of hardcoded 5
- Hero badge text: "30+ GAMES · LEADERBOARDS · ACHIEVEMENTS"
- Game grid section: add category filter tabs above the grid
- App.tsx GAMES array: add all new game entries

### Remove
- Nothing removed

## Implementation Plan
1. Update backend Motoko: make `getPersonalStats` dynamic (no hardcoded game list)
2. Create 25 new game components in `src/frontend/src/games/`
3. Update `GameModal.tsx` to add all new GameKey values and route to new games
4. Update `App.tsx` GAMES array with all 30+ games and add category filter UI
5. Add new achievements for new games in backend
6. Validate and build
