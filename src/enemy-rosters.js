export const FLAVOR_ROSTERS = Object.freeze({
  undead: Object.freeze({
    common: "skeleton",
    heavy: "zombie",
    ranged: "boneMage",
    special: "necromancer",
  }),
  demons: Object.freeze({
    common: "cultist",
    heavy: "demon",
    ranged: "warlock",
    special: "archdemon",
  }),
  assassins: Object.freeze({
    common: "cutthroat",
    heavy: "enforcer",
    ranged: "marksman",
    special: "assassin",
  }),
  orcs: Object.freeze({ common: "goblin", heavy: "orc", ranged: "goblinArcher", special: "orcShaman" }),
});

export function enemyTypeForRoll(flavorKey, floor, roll) {
  const roster = FLAVOR_ROSTERS[flavorKey];
  if (!roster) throw new Error(`Unknown campaign flavor: ${flavorKey}`);
  if (floor >= 2 && roll > 0.78) return roster.ranged;
  if (roll > 0.48) return roster.heavy;
  return roster.common;
}
