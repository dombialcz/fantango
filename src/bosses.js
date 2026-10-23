// Boss choice is made once, at the campaign's first floor-10 encounter.
export const CAMPAIGN_BOSSES = Object.freeze({
  undead: Object.freeze(["evilSpirit", "lich"]),
  demons: Object.freeze(["infernalDragon", "vaultTyrant"]),
  assassins: Object.freeze(["shadowAssassin", "guildMaster"]),
  orcs: Object.freeze(["burningWarlord", "elderShaman"]),
});

export const BOSS_RULES = Object.freeze({ freezeEvery: 3, freezeMs: 2000, summonEvery: 2, enemyCap: 10, evasion: .2, allyDamage: 1.25, allySpeed: 1.15, healRatio: .12 });
export const BOSS_DEFINITIONS = Object.freeze({
  infernalDragon: { label: "Infernal Dragon", row: "back", hp: 750, damage: 65, interval: 1900, color: "#d77a38", glyph: "D", skill: "rowAttack", summary: "Fire breath hits every frontliner. If no frontliners remain, it hits the back row." },
  vaultTyrant: { label: "Vault Tyrant", row: "front", hp: 750, damage: 65, interval: 1800, color: "#b85c4d", glyph: "V", skill: "rowAttack", summary: "A crushing cleave hits the entire front row, or the back row if the front is empty." },
  evilSpirit: { label: "Evil Spirit", row: "back", hp: 750, damage: 55, interval: 1800, color: "#ae91db", glyph: "E", skill: "freeze", summary: "Every third attack freezes all heroes for 2 seconds. Orders and potions still work." },
  lich: { label: "Lich", row: "back", hp: 600, damage: 40, interval: 1900, color: "#966ac2", glyph: "L", skill: "summon", summary: "Every second attack summons a random skeleton, zombie or bone mage. At most 10 living enemies." },
  shadowAssassin: { label: "Shadow Assassin", row: "back", hp: 650, damage: 75, interval: 1500, color: "#725a89", glyph: "S", skill: "assassin", critChance: .2, summary: "Critical hits deal double damage with a 20% chance. Evades 20% of hits. Blinks forward to strike the lowest-health hero, then retreats." },
  guildMaster: { label: "Guild Master", row: "back", hp: 480, damage: 45, interval: 1700, color: "#b49a5c", glyph: "G", skill: "empower", escorts: ["cutthroat", "enforcer", "marksman"], summary: "While alive, grants allies +25% damage and +15% attack speed. Arrives with three guild guards." },
  burningWarlord: { label: "Burning Warlord", row: "front", hp: 800, damage: 120, interval: 2000, color: "#bd6a3b", glyph: "W", skill: "heavyStrike", summary: "Deals devastating single-target damage to the front row, only reaching the rear when the front falls." },
  elderShaman: { label: "Elder Shaman", row: "back", hp: 480, damage: 35, interval: 1900, color: "#779a65", glyph: "S", skill: "heal", escorts: ["goblin", "orc", "orc"], summary: "Each attack also heals the most wounded ally for 12% of their maximum health. Brings three warband guards." },
});

export function rollCampaignBoss(flavor, random = Math.random) {
  const choices = CAMPAIGN_BOSSES[flavor];
  if (!choices) throw new Error(`Unknown boss campaign: ${flavor}`);
  return choices[random() < .5 ? 0 : 1];
}
