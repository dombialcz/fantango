# Fantango

A dark-fantasy daily logic game about a thief, a treasury, and a perfectly balanced plan. Fantango generates three deterministic puzzles every day—Easy, Medium, and Hard—using the player's local browser date.

Play by filling the 6×6 vault with coins and thieves:

- every row and column contains three of each;
- no three matching symbols can be consecutive;
- `=` means neighboring cells match;
- `×` means neighboring cells differ.

Every published puzzle is checked by two solvers: a backtracking solver proves the solution is unique, and a non-guessing logic solver proves the hint system can explain a path to the answer.

## Run locally

```bash
npm run serve
```

Then open <http://localhost:4173>.

## Test the generator

```bash
npm test
```

The game is plain HTML, CSS, and JavaScript with no runtime dependencies. Generated artwork lives in `assets/` and is optimized for the web.

## Controls

- Click a cell, or use arrow keys and Space, to cycle empty → coin → thief.
- `H` gives an explainable hint.
- `Z` undoes the last mark.
- `R` resets the active heist.
- `1`, `2`, `3` switch difficulty.
- `F` toggles fullscreen.

Fantango is an original implementation inspired by binary logic puzzles. It is not affiliated with LinkedIn.

