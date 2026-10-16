# Fantango — game and generation design

## Product summary

Fantango is a short daily logic game inspired by LinkedIn Tango. The player fills a 6×6 board with two symbols (for example, sun and moon) while satisfying row, column, adjacency, and relationship clues.

Each browser date unlocks three independent puzzles:

- **Easy** — direct deductions and generous clues.
- **Medium** — longer deduction chains and fewer immediately forced cells.
- **Hard** — sparse clues and deeper, but still explainable, deduction chains.

The same date, difficulty, and generator version must always produce the same puzzle. Each difficulty gets a separate seed, so the three levels are different boards rather than three clue sets for one answer.

## Rules

1. Every cell contains exactly one of two symbols: sun or moon.
2. Every row and column contains the same number of each symbol. On a 6×6 board, that means three suns and three moons.
3. Three identical symbols may not appear consecutively, horizontally or vertically.
4. Cells on either side of an `=` clue must contain the same symbol.
5. Cells on either side of a `×` clue must contain different symbols.

Important: classical Takuzu/Binairo sometimes adds a rule forbidding duplicate rows and columns. LinkedIn's published Tango rules do not include that rule, so Fantango should not silently enforce it.

## Daily deterministic seed

Read the calendar date from the browser in the browser's local timezone:

```js
function localDateKey(now = new Date()) {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const seedText = `${localDateKey()}|easy|fantango-generator-v1`;
```

Use `easy`, `medium`, and `hard` in the seed for the three levels. Hash the string to a 32-bit integer (for example with `xmur3`) and pass it to a small deterministic PRNG such as `mulberry32`. All shuffling and random choices in generation must use this PRNG; never use `Math.random()`.

Using the browser's local date means the daily rollover happens at each player's local midnight. It also means two players in different timezones can briefly be on different dates. If a single worldwide puzzle is wanted later, use a server-provided date or explicitly use UTC instead.

Store progress under a versioned key such as:

```text
fantango:v1:2026-10-16:easy
```

Changing the generator algorithm can otherwise change an existing day's board, so the generator version must be explicit and old versions should remain stable while their saved games can still exist.

## Board generation

Represent sun/moon as `0/1`. Generation has four separate jobs: create a completed board, create clues, prove uniqueness, and grade human solvability.

### 1. Create a completed valid board

For a 6×6 board, first enumerate all six-bit row patterns that:

- contain exactly three `0`s and three `1`s; and
- contain neither `000` nor `111`.

There are only 14 valid row patterns. Build a six-row grid with seeded randomized backtracking:

1. Shuffle the 14 patterns with the seeded PRNG.
2. Add one row at a time.
3. Reject a row as soon as a column would have more than three of either value.
4. Reject it if it creates a vertical run of three equal values.
5. At row six, require every column to have three of each value.

This produces only valid full boards. There are 11,222 completed 6×6 boards under the published Tango rules, so the search space is small. A completed board is not yet a puzzle: the clues still need to force that board uniquely.

### 2. Derive a clue pool from the answer

Every completed board provides two kinds of truthful clue:

- a fixed symbol in any of its 36 cells; and
- an `=` or `×` relationship on any horizontal or vertical neighboring pair.

Begin a generation attempt with all cell values visible plus a seeded, well-distributed sample of relationship clues. Then remove clues in seeded random order. Keep a removal only if the puzzle remains unique and the no-guess logic solver can still finish it. Once enough clues have been removed, score the candidate against the requested difficulty band. Bias the clue layout so it is spread across the board rather than clustered in one corner.

An alternative implementation can add clues to an empty puzzle until the solution becomes unique, then minimize them. The removal method is simpler because it starts in an obviously valid state.

### 3. Prove uniqueness with a CSP solver

Implement a solver that propagates constraints and then backtracks when propagation stalls. It should count solutions only up to two:

- `0` solutions: broken clue set;
- `1` solution: acceptable;
- `2` solutions: ambiguous, so stop counting and reject it.

Propagation should repeatedly apply:

- relationship clues: known `A` determines `B` across `=` or `×`;
- triples: `AA_`, `_AA`, and `A_A` force the blank to be the opposite symbol;
- balance: after a row/column has three of one symbol, all remaining cells take the other symbol;
- balance completion: if all remaining blanks are needed to reach a symbol's quota, fill them with that symbol;
- contradiction checks for too many of a symbol, impossible remaining quotas, a run of three, or a violated relationship.

If unresolved, branch on an empty cell, try `0` and `1`, and stop as soon as the second complete solution is found. A 36-cell board is small enough for this to run comfortably in JavaScript.

Do not publish a puzzle unless `countSolutions(puzzle, 2) === 1` and the one solution is the originally generated board.

### 4. Prove no-guess human solvability

Uniqueness alone does not mean the puzzle feels fair. Run a second solver that is deliberately not allowed to branch. It records a sequence of explainable deductions using the same rules a player can see:

- same/different relationship propagation;
- prevent-three patterns (`AA_`, `_AA`, `A_A`);
- row/column quota completion;
- optional hard-level contradiction deductions, where trying one value immediately violates a visible rule.

Reject any generated puzzle if this logic solver stalls before completion. The recorded deduction trace becomes both the proof that no guessing is needed and the source for contextual hints.

## Difficulty grading

Do not grade only by the number of visible clues. Grade the actual solution trace. Useful measurements are:

- number of deduction steps;
- hardest technique used;
- length of the longest dependency chain;
- number of board states with only one available deduction;
- how late row/column balance becomes useful;
- starting counts and spatial distribution of fixed cells and relationship clues.

Suggested initial profiles for playtesting:

| Level | Allowed hardest technique | Desired feel |
| --- | --- | --- |
| Easy | relationship, prevent-three, quota fill | several obvious opening moves and multiple choices most of the time |
| Medium | the same techniques in longer chains | fewer opening moves; deductions alternate across rows and columns |
| Hard | long chains and at most shallow, explainable contradiction | frequent bottlenecks, but never blind guessing |

Exact numeric score bands should be tuned from playtest data. The generator should retry with `seed + attemptNumber` until a candidate lands in the requested band. Because the attempt sequence is deterministic, every browser still receives the same result for the same date.

## Hint system

The human-solver trace makes hints safe and useful:

1. First check whether the player's entries make the board contradictory. If so, highlight an incorrect player-entered cell rather than giving a new answer.
2. Otherwise run the logic solver from the current state and choose the next explainable forced move.
3. First hint: highlight the relevant row, column, pair, or three-cell pattern.
4. Second hint: explain the rule in one sentence.
5. Optional reveal: place the forced symbol, mark the run as having used a hint, and allow undo.

Example explanations:

- “These two cells are suns, so the third cell cannot also be a sun.”
- “This row already has three moons; every remaining cell must be a sun.”
- “The `×` means these two cells must be different.”

Since the puzzle has exactly one solution, a last-resort hint can always reveal a correct cell. The preferred path is to use the deduction trace so hints teach the player instead of behaving like an answer key.

## Acceptance pipeline and guaranteed fallback

For each date and difficulty:

```text
date + difficulty + generator version
              ↓
        deterministic PRNG
              ↓
       generate full board
              ↓
   place and remove truthful clues
              ↓
  exactly one solution? ── no → retry
              ↓ yes
 logic solver completes? ─ no → retry/add clue
              ↓ yes
 difficulty in target band? no → retry/tune clues
              ↓ yes
          publish puzzle
```

Use an attempt cap to protect page load time. For a production-strength guarantee, ship a small bank of prevalidated easy, medium, and hard puzzles. If runtime generation reaches the cap, select a fallback deterministically from that bank with the same date seed. The player should never see a failed or unverified board.

The strongest production option is to run this generator ahead of time during development, save a large validated catalogue, and use the browser date only to choose three entries. Runtime generation can still be kept for an unlimited-play mode. Both approaches satisfy deterministic daily randomness; the catalogue approach removes device-performance and rare-generation-failure risk.

## Recommended JavaScript modules

```text
src/daily-seed.js   local date key, string hash, seeded PRNG
src/constraints.js  rule validation and propagation
src/solver.js       solution counter and human logic solver
src/generator.js    full-board generation and clue removal
src/difficulty.js   trace scoring and level profiles
src/hints.js        hint selection and explanations
src/storage.js      daily progress, completion, streaks
src/game.js         UI state and interactions
```

## Definition of done for the generator

Before a build is accepted:

- generate thousands of dates for all three difficulties;
- assert every board satisfies all Tango rules;
- assert every clue agrees with its stored answer;
- assert every puzzle has exactly one solution;
- assert the non-branching logic solver completes it;
- assert repeated generation with the same seed is byte-for-byte identical;
- assert easy, medium, and hard seeds produce three distinct boards;
- measure generation time on a modest phone;
- test date rollover and restoration from `localStorage`.

## References

- [LinkedIn Help: Play Tango game on LinkedIn](https://www.linkedin.com/help/linkedin/answer/a6861672)
- [Takuzu generator using randomized backtracking and human-strategy validation](https://github.com/pollendo/Takuzu)
