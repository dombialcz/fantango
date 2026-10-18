# Fantango

A dark-fantasy daily logic game about a thief, a treasury, and a perfectly balanced plan. Fantango generates three deterministic puzzles every day—Easy, Medium, and Hard—using the player's local browser date.

**Play online:** [dombialcz.github.io/fantango](https://dombialcz.github.io/fantango/)

**Play Vaultbound:** [dombialcz.github.io/fantango/dungeon.html](https://dombialcz.github.io/fantango/dungeon.html)

**Play Mastermind:** [dombialcz.github.io/fantango/mastermind.html](https://dombialcz.github.io/fantango/mastermind.html)

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

Vaultbound is a second dark-fantasy game in this repository: a ten-day auto-battler dungeon campaign. Inspect heroes on a slot-machine-style contract reel, hire them for free, lock a bench, pay escalating reroll costs, buy level upgrades, and choose after every cleared floor whether to flee with the survivors or continue deeper. Tavern upgrades can roll level 2–4 contracts using progressively halved bonus-level chances; level 5 remains upgrade-only.

The Mayor’s Quarter is a second screen where expedition gold upgrades nine buildings: one for each hero class, plus the Alchemist and Tavern. Every building begins at level 1 and costs 3/6/9/12 gold to reach levels 2–5. Class buildings ask the player to choose one of two permanent-for-the-campaign bonuses at each level. Buildings persist from day to day, then the whole town resets when the ten-day campaign ends. The contract reel remains the core loop: town bonuses shape the heroes it offers rather than replacing recruitment.

Each day starts in town, then moves to preparing the company and entering the dungeon. No contracts are generated until the player explicitly rolls, so Tavern upgrades can improve even the first daily offers. The first roll is free; subsequent rerolls cost 1, 2, 3 gold and so on, resetting each day. Visiting town does not refresh offers or reset prices. The responsive recruitment screen separates the animated contract reel, Hire buttons directly under each offer, the locked active party and reserves, and hero inspection/training controls. A painted town landscape adds grass, cobbled paths, crooked trees, ruined walls, and a distant graveyard without tying the interface to fixed map coordinates. See [the landscape prompt](assets/town/TOWN_LANDSCAPE.md).

Browser regression checks: `node scripts/check-roster-ui.mjs` and `node scripts/check-battle-ui.mjs` (run a local server first; an optional first argument changes the base URL).

The town uses a responsive HTML/CSS interface with nine illustrated districts and a building inspector (a bottom sheet on phones). Every building has five distinct architectural images: upgrades add rooms, wings, towers, and defenses. The 45 building sprites and seven command paintings are delivered as compressed WebP images. See [art direction and packaging notes](assets/town/ART_DIRECTION.md) and [the complete prompt set](assets/ART_PROMPTS.json).

Mage Guild level determines how many enemies every Mage can hit, while its chosen upgrades add health or speed. Hunter’s Lodge level sets Ranger attack speed, while its upgrades add critical-hit chance or damage. The other districts similarly specialize Knights, Thieves, Bards, Clerics, and Barbarians.

During battle, dealing and receiving damage fills a shared Command meter. All seven illustrated commands are visible from the start in a docked command deck, including their costs, matching hero counts, availability, and active timers. Every class building grants a tactical command whose strength scales with up to four living heroes of its class: Barracks provide Hold the Line, the Thieves’ Guild provides victory-conditional Pilfer, Bard College provides Rally, the Temple provides Divine Aegis, the Fighting Pit provides the health-sacrificing Bloodlust sweep, Hunter’s Lodge provides targeted Mark Prey, and the Mage Guild provides Time Freeze. Commands remain usable while paused, and Mark Prey lets the player select its enemy target. The battle screen uses responsive HTML/CSS formation rows and strike trails, and results leave surviving heroes and their health visible.

The Alchemist stocks each daily expedition with healing potions. Levels 1–3 provide one, two, then three potions that restore 20% of maximum health; level 4 keeps three potions and raises healing to 33%, and level 5 raises it to 50%. Supplies persist between floors but replenish at the beginning of the next day’s expedition. Tavern level—not campaign day—sets contract quality: its five levels provide no bonus roll, then `L2 10%`, `L2 20% → L3 10%`, `L2 30% → L3 15%`, and `L2 40% → L3 20% → L4 10%`.

The active party grows from four to eight slots over the campaign. Surviving heroes heal after each day, while defeated heroes are lost. Each campaign rolls one of three complete enemy rosters: Undead Uprising fields skeletons, zombies, bone mages, and necromancers; Demonic Invasion fields cultists, demons, warlocks, and archdemons; and the Assassins' Guild fields cutthroats, enforcers, marksmen, and teleporting assassins.

Floor 10 is the victory milestone. It replaces the normal enemy group with the high-health Vault Tyrant, whose cleave damages every hero in the defending row. Defeating it marks the campaign victorious, but the player may continue to floors 11 and beyond until the current expedition ends or the ten-day limit expires, preserving the deepest floor as the run’s record.

### Mastermind

Mastermind is Vaultbound’s daily hero-code side game. Easy, Medium, and Hard use ordered parties of five, six, and seven classes, each with ten guesses. The party name identifies one triplet, an optional pair, and one exact singleton; class portraits and the decoded clue words remain visible while playing. Feedback reports how many heroes are in the correct position and how many are present in another position. A ten-row board keeps all attempts visible, and the interface can be switched between English and Polish. Daily answers are generated from the browser’s local date and each challenge’s difficulty, with progress saved locally.

Heroes who retreat automatically are guaranteed to gain a level. When the player chooses Flee, each eligible survivor instead has an 80% level-up chance, reduced by 10 percentage points for every other fleeing hero, to a minimum of 0%.

Vaultbound supports mouse, touch, portrait phones, and short landscape screens. Every cleared floor awards gold equal to the current campaign day: 1 gold on day 1 through 10 gold on day 10. You can flee safely between floors, or flee during a battle by sacrificing half your current gold (rounded up). During battle, select a command directly or select Potion and then a wounded hero. Press `1`–`7` to cast commands, `Esc` to cancel targeting, `T` to switch between the contract reel and town, `R` to reroll, `Enter` to begin or continue an expedition, `P` to pause or resume, `Space` to toggle battle speed, and `F` for fullscreen.
