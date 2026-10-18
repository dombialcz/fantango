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

Vaultbound is a second dark-fantasy game in this repository: a ten-day auto-battler dungeon campaign. Inspect heroes on a slot-machine-style contract reel, hire them for free, lock a bench, pay escalating reroll costs, buy level upgrades, and choose after every cleared floor whether to flee with the survivors or continue deeper. Later days can roll level 2–4 contracts using progressively halved bonus-level chances; level 5 remains upgrade-only.

The Mayor’s Quarter is a second screen where expedition gold upgrades one building for each hero class. Every building begins at level 1, costs 3/6/9/12 gold to reach levels 2–5, and asks the player to choose one of two permanent-for-the-campaign bonuses at each level. Buildings persist from day to day, then the whole town resets when the ten-day campaign ends. The contract reel remains the core loop: town bonuses shape the heroes it offers rather than replacing recruitment.

Mage Guild level determines how many enemies every Mage can hit, while its chosen upgrades add health or speed. Hunter’s Lodge level sets Ranger attack speed, while its upgrades add critical-hit chance or damage. The other districts similarly specialize Knights, Thieves, Bards, Clerics, and Barbarians.

The active party grows from four to eight slots over the campaign. Surviving heroes heal after each day, while defeated heroes are lost. Each campaign rolls one of three enemy flavors: Undead Uprising, Demonic Invasion, or Assassins' Guild.

Heroes who retreat automatically are guaranteed to gain a level. When the player chooses Flee, each eligible survivor instead has an 80% level-up chance, reduced by 10 percentage points for every other fleeing hero, to a minimum of 0%.

Vaultbound supports mouse, touch, portrait phones, and short landscape screens. Every cleared floor awards 1 gold. You can flee safely between floors, or flee during a battle by sacrificing half your current gold (rounded up). Press `T` to switch between the contract reel and town, `R` to reroll, `Enter` to begin or continue an expedition, `P` to pause or resume, `Space` to toggle battle speed, and `F` for fullscreen.
