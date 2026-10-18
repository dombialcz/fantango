Original prompt: i want to create a game like tango from linkedin. Can you create a summary for that game? I want a game that has three daily levels - they should be random and the seed is current date taken from the browser. The game should be in JS. Can you summarise the rules for the game and figure out how to make sure the levels are solvable with enough hints for the user. We need to figure out or find an algorithm for creating these puzzles so they can always be solved

## 2026-10-16

- Created `GAME_DESIGN.md` with the verified Tango rules, deterministic browser-date seeding, CSP generation, uniqueness testing, no-guess logical validation, hint design, difficulty grading, and a production fallback strategy.
- Confirmed that the published LinkedIn rules do not include the classical Takuzu rule requiring all rows and columns to be unique.
- Enumerated the 6×6 solution space under the published rules: 14 legal balanced row patterns and 11,222 completed grids.

## Next steps

- Generated and saved three production art assets: a dark-fantasy vault background, a transparent gold coin token, and a transparent hooded-thief token.
- Implemented deterministic daily generation, a constraint solver, uniqueness counting, non-guessing logical validation, and three difficulty profiles as pure JavaScript modules.
- Added a single-canvas responsive game UI with mouse and keyboard controls, undo, reset, explainable hints, auto-check highlighting, local progress persistence, win states, and fullscreen support.
- Added generator regression tests and a GitHub Pages deployment workflow.
- Generator test covers determinism plus 730 consecutive dates: 2,190 independently generated daily puzzles across the three difficulties.

## Completed implementation

- Browser-tested and visually inspected the initial board, invalid-move highlighting, correct cell cycling, contextual hints, undo, reset, all three difficulty views, the full win flow, and progression to the next unfinished heist.
- Confirmed the browser runs produced no console or page errors.
- Final generator suite passes across 730 consecutive dates (2,190 puzzles), including uniqueness, logical completion, valid answers, deterministic replay, and distinct daily boards.
- Created and pushed the public GitHub repository at `https://github.com/dombialcz/fantango`.
- Enabled GitHub Pages through the workflow deployment and verified a successful HTTP 200 response.
- Loaded and visually inspected the deployed build at `https://dombialcz.github.io/fantango/`; generated puzzle state and all artwork loaded with no console errors.

## Future ideas

- Tune difficulty scoring with anonymized playtest data.
- Add optional sound and reduced-motion settings.
- Add a shareable, spoiler-free daily result card.

## 2026-10-17

- Reworked predefined cells as solid warm golden-brown stone slabs with subtle bevels and fixed paving cracks.
- Removed the yellow top-left predefined-cell marker; the stone material alone now distinguishes fixed clues.
- Added a close button and `Esc` shortcut to the completion popup so the solved board can be reviewed.
- Revisiting a previously completed level now opens directly in review mode instead of covering it again.
- Added independent four-second grace timers for wrong marks, so quick mouse cycling does not count as a misstep.
- A wrong mark now counts once only after it remains unchanged for the full grace period; correcting, clearing, undoing, or resetting it cancels that pending misstep.
- Verified the grace period, correction cancellation, one-time counting, and concurrent timers in browser playtests with no console errors.
- Added dedicated desktop, portrait-phone, and compact landscape-phone canvas layouts with touch-sized puzzle cells and controls.
- Browser-tested touch marking, difficulty tabs, hints, rotation with state preservation, the solved-puzzle overlay, closing it for review, and advancing to the next heist at 390×844 and 844×390 viewports.

## Vaultbound auto-battler

- Added a second playable game at `dungeon.html` while keeping the original Fantango puzzle at the site root.
- Implemented the ten-day campaign, daily contract reel, duplicate hero offers, locked bench, active-party caps, escalating reroll costs, persistent gold, square-cost upgrades, five hero levels, permanent deaths, and survivor healing/level-ups.
- Implemented seven hero classes with class-specific rows, health, damage, targeting, attack-speed scaling, bard buffs, cleric healing, and the mage's level-based multi-target attacks.
- Implemented unlimited procedurally generated dungeon floors with logarithmic stat scaling, floor gold, Continue/Flee decisions, automatic retreat thresholds, and three campaign flavors: undead necromancers, rear-row demons, and blinking assassins.
- Added responsive desktop, portrait-phone, and compact landscape battle/tavern layouts plus deterministic testing hooks (`advanceTime` and `render_game_to_text`).
- Generated matching transparent dark-fantasy portraits for the knight, bard, cleric, ranger, mage, and barbarian, while reusing the existing thief portrait.
- Browser-tested recruitment, bench limits, floor combat, floor victory, gold rewards, flee/next-day progression, survivor level-ups, upgrade costs, reroll escalation/reset, portrait touch play, and compact landscape rendering with no console or page errors.

## Vaultbound combat readability pass

- Added a new transparent thief portrait matching the realistic painterly style, visible faces, blue rim lighting, and navy/bronze palette of the other Vaultbound heroes; the original hooded token remains unchanged for Fantango.
- Slowed battles by staggering opening attacks, increasing attack intervals, applying a shared combat pacing coefficient, and raising goblin health while preserving every class's relative health, damage, targeting, and speed identity.
- Added animated attacker-to-target strike trails, separate gold attacker and red target highlights, green healing trails, and ordinary strike messages in the battle log so front- and back-row behavior is readable.
- Replaced the full-screen result modal and blackout with a compact center panel that leaves every surviving hero card and health bar visible on desktop and mobile.
- Measured eight randomized opening floors at ×1 speed: seven resolved in roughly 6–12 seconds and one weak composition automatically retreated after 27 seconds; ×2 remains available.
- Browser-tested desktop and portrait combat visuals, the compact result panel, Flee → Next Day interaction, and the new thief artwork with no console or page errors.

### Future tuning

- Revisit the shared pacing coefficient after playtesting later floors and higher-level teams, where attack-speed scaling may shorten battles again.

## Vaultbound battle pause

- Added Pause/Resume buttons beside the battle-speed control on desktop, portrait, and compact layouts, plus a `P` keyboard shortcut.
- Pausing freezes battle time, attack timers, health changes, targeting effects, and the current combat frame until resumed.
- Added a clear in-canvas paused-state banner without obscuring the party rows and moved the Fantango link away from the battle controls.
- Verified button and keyboard pause/resume flows, including a ten-second deterministic paused advance with unchanged time and HP, on desktop and portrait mobile with no browser errors.

## Vaultbound retreat and gold pacing

- Added a red Flee button during active battles on desktop, compact, and portrait layouts. It preserves living heroes, ends the day, and removes half of the player's current gold, rounded up.
- Mid-battle fleeing remains available while paused, and its live gold cost is displayed directly on the button.
- Automatic retreat at two survivors now opens a distinct `Party Defeated` info panel with the message: “The party is defeated, remaining heroes flee.”
- Flattened dungeon income to exactly 1 gold for every completed floor.
- Browser-tested paused mid-battle retreat, survivor preservation, gold payment, the two-survivor auto-retreat, one-gold floor rewards, and desktop/portrait/compact layouts with no console or page errors.

## Vaultbound contract inspection and leveled offers

- Changed the contract reel to a two-step interaction: clicking an offered hero now selects and inspects the contract without changing the bench, and a separate free Hire button confirms recruitment.
- Added selected-contract state, highlighting, class/level/power details, bench-full handling, and responsive Hire controls on desktop and portrait mobile.
- Added sequential daily bonus-level rolls: the first roll is `(day - 1) × 10%`, each subsequent roll is half the previous chance, rolls below 10% are omitted, and generated contracts stop at level 4.
- Added an adjacent simplified odds readout such as `L2 40% → L3 20% → L4 10%`; day 1 clearly reports that no bonus rolls are available.
- Added unit tests for the day 1–5 probability examples, sequential failure behavior, and the level-4 offer cap.
- Browser-tested selection without recruitment, free hiring, active-bench placement, exact daily odds through day 5, forced level-4 offers, and desktop/portrait layouts with no console or page errors.

## Vaultbound retreat level-up rebalance

- Replaced guaranteed leveling for every survivor with retreat-based rewards: automatic retreats grant every eligible survivor a level, while player-triggered retreats roll independently for each hero.
- Manual Flee starts at an 80% level-up chance and loses 10 percentage points for every other fleeing hero, with a 0% minimum (one hero 80%, four heroes 50%, eight heroes 10%).
- Applied manual odds to both the in-battle Flee button and the post-floor Flee choice; the in-battle control continues to show its half-gold penalty alongside the level-up chance.
- The result panel now reports the actual number of survivors who earned a level, and the next day upgrades only those heroes while healing all survivors.
- Added unit tests for the complete party-size chance curve, the automatic 100% guarantee, and independent manual rolls.
- Browser-tested forced all-success and all-failure manual retreats, post-floor retreat, automatic two-survivor retreat, next-day levels, and desktop/portrait/compact visuals with no console or page errors.

## Vaultbound mayoral town

- Added the Mayor’s Quarter as a second screen beside the contract reel, with one class building for every hero type and responsive desktop, portrait-phone, and compact-landscape layouts.
- Added four town upgrades per building. Each level asks the mayor to choose one of two paths and costs 3, 6, 9, then 12 gold; class bonuses stack across the ten-day campaign.
- Reworked Mages so Mage Guild level controls their number of spell targets, with Warding and Quicken choices for health or speed.
- Reworked Rangers so Hunter’s Lodge level controls attack speed, with Deadeye and Draw choices for critical-hit chance or damage.
- Added class-wide building effects for Knight damage reduction, Thief wounded-target damage, Bard buff strength and targets, Cleric healing, and Barbarian damage.
- Town progress persists between daily expeditions and resets only when the ten-day campaign ends and a new campaign begins.
- Added unit tests for town defaults, costs, caps, and upgrade-path effects, and browser-tested building purchases, combat integration, day-to-day persistence, campaign reset, and all responsive layouts with no console or page errors.

## Vaultbound Alchemist and Tavern progression

- Expanded the Mayor’s Quarter from seven to nine buildings with two pathless utility upgrades: the Alchemist and Tavern.
- Added per-expedition healing supplies: Alchemist levels provide 1×20%, 2×20%, 3×20%, 3×33%, then 3×50% maximum-health potions. Supplies persist between floors and restock at the beginning of each daily expedition.
- Added an explicit battle interaction on every layout: select Potion, choose a highlighted wounded hero, apply capped healing, consume one supply, and record the result in the battle log. Potion targeting works while combat is paused.
- Moved higher-level contract probabilities entirely from campaign day to Tavern level. Existing offers remain unchanged; rerolls and future daily offers use the current Tavern odds.
- Reworked the nine-building town into a 3×3 desktop grid, 5×2 compact-landscape grid, and two-page portrait layout.
- Added unit coverage for all five Alchemist supply levels and the Tavern probability curve, then browser-tested Tavern upgrades/rerolls and potion targeting/healing on desktop and portrait mobile with no console or page errors.

### Future tuning

- Revisit whether potion supplies should replenish per daily expedition or per floor after playtesting; the current balance treats them as expedition-long resources.

## Vaultbound escalating gold and floor-10 victory

- Changed every floor reward from a flat 1 gold to the current campaign day: day 1 pays 1 gold per clear, increasing through day 10 at 10 gold per clear.
- Added floor 10 as the campaign’s victory milestone and replaced its procedural enemy group with a unique Vault Tyrant boss.
- Made the Vault Tyrant a high-health front-row enemy with a cleave that damages every living hero in the defending row.
- Clearing floor 10 records victory and the victory day, changes the campaign status in the header, and keeps Continue available so the player can push floors 11+ for a deeper record.
- Added an end-of-day campaign outcome that distinguishes a recorded victory from running out of the ten-day clock before defeating the boss.
- Added pure unit tests for the complete day 1–10 gold curve and boss-floor boundary, then browser-tested day-2 rewards, the full-strength boss and cleave, the victory overlay, post-victory continuation, and portrait-mobile boss layout with no console or page errors.
