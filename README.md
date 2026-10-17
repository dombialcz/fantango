# Fantango

A dark-fantasy daily logic game about a thief, a treasury, and a perfectly balanced plan. Fantango generates three deterministic puzzles every day—Easy, Medium, and Hard—using the player's local browser date.

**Play online:** [dombialcz.github.io/fantango](https://dombialcz.github.io/fantango/)

**Play Vaultbound:** [dombialcz.github.io/fantango/dungeon.html](https://dombialcz.github.io/fantango/dungeon.html)

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

## Vaultbound

Vaultbound is a second dark-fantasy game in this repository: a ten-day auto-battler dungeon campaign. Recruit free heroes from a slot-machine-style contract reel, lock a bench, pay escalating reroll costs, buy level upgrades, and choose after every cleared floor whether to flee with the survivors or continue deeper.

The active party grows from four to eight slots over the campaign. Surviving heroes heal and gain a level after each day, while defeated heroes are lost. Each campaign rolls one of three enemy flavors: Undead Uprising, Demonic Invasion, or Assassins' Guild.

Vaultbound supports mouse, touch, portrait phones, and short landscape screens. Every cleared floor awards 1 gold. You can flee safely between floors, or flee during a battle by sacrificing half your current gold (rounded up). Press `R` to reroll, `Enter` to begin or continue an expedition, `P` to pause or resume, `Space` to toggle battle speed, and `F` for fullscreen.
