// Town identity: a strong party-wide advantage, a settlement perk, and a class drawback.
import { cappedCombatPercent } from "./combat-rules.js";
export const PREFIXES = [
  { name: "Walled", bonus: "Enemies deal 10% less damage", enemyDamage: 0.9 },
  { name: "Grand", bonus: "Start with 6 extra gold", gold: 6 },
  { name: "Silent", bonus: "All heroes gain +10 percentage points of dodge chance", evasion: 0.1 },
  { name: "Oaken", bonus: "All heroes gain 15% maximum health", health: 1.15 },
  { name: "Windy", bonus: "All heroes attack 10% faster", speed: 1.1 },
  { name: "Ashen", bonus: "All heroes gain +10 percentage points of crit chance", crit: 0.1 },
];
export const SETTLEMENTS = [
  { name: "Reach", bonus: "Rangers deal 3% more damage", classType: "ranger", damage: 1.03 },
  { name: "Haven", bonus: "Knights take 3% less damage", classType: "knight", reduction: 0.03 },
  { name: "Hollow", bonus: "Thieves gain +2 percentage points of dodge chance", classType: "thief", evasion: 0.02 },
  { name: "Sanctum", bonus: "Clerics restore 3% more health", classType: "cleric", healing: 1.03 },
  { name: "Spire", bonus: "Mages deal 3% more damage", classType: "mage", damage: 1.03 },
  { name: "Hold", bonus: "Barbarians gain 3% maximum health", classType: "barbarian", health: 1.03 },
  { name: "Market", bonus: "Bard buffs are 3% stronger", classType: "bard", bardBuff: 1.03 },
  { name: "Estate", bonus: "Gain 1 extra gold at the start of each day", dailyGold: 1 },
  { name: "Crossing", bonus: "One additional free reroll each day", freeRerolls: 1 },
];
export const GEOGRAPHIES = [
  { format: (n) => `on the ${n} River`, classType: "cleric", label: "Cleric", flavor: "River bells guide the weary home." },
  { format: (n) => `upon ${n} Hill`, classType: "barbarian", label: "Barbarian", flavor: "Old challenges are settled on the windswept hill." },
  { format: (n) => `beneath Mount ${n}`, classType: "mage", label: "Mage", flavor: "Strange lights burn beneath the mountain." },
  { format: (n) => `by ${n} Wood`, classType: "ranger", label: "Ranger", flavor: "Beyond the last hearth, the forest keeps its secrets." },
  { format: (n) => `along the ${n} Road`, classType: "bard", label: "Bard", flavor: "Every road brings another song and another stranger." },
  { format: (n) => `near Fort ${n}`, classType: "knight", label: "Knight", flavor: "The watch keeps a light above the gates." },
  { format: (n) => `beside ${n} Marsh`, classType: "thief", label: "Thief", flavor: "Hidden paths wind between the reeds and lanterns." },
];
// Keep these proper names free of terrain words: every name pairs with every
// geography, so e.g. "River" here would produce "on the River River".
export const PLACE_NAMES = ["Alm", "Deir", "Ilth", "Vey", "Orin", "Eld", "Morn", "Aster", "Thalen", "Brann"];
export function createTownIdentity(random = Math.random) {
  const pick = (items) => items[Math.floor(random() * items.length)];
  const prefix = pick(PREFIXES);
  const settlement = pick(SETTLEMENTS);
  const geography = pick(GEOGRAPHIES);
  const place = pick(PLACE_NAMES);
  const stat = pick(geography.classType === "bard" ? ["power", "health"] : ["power", "damage", "health"]);
  const penalty = { classType: geography.classType, stat, multiplier: 0.8 };
  return { balanceVersion: 2, prefix, settlement, penalty,
    name: `${prefix.name} ${settlement.name} ${geography.format(place)}`,
    flavor: geography.flavor,
    bonuses: [prefix.bonus, settlement.bonus, townPenaltyText(penalty)],
  };
}
const CLASS_LABELS = Object.fromEntries(GEOGRAPHIES.map(g => [g.classType, g.label]));
export function townPenaltyText(penalty) {
  if (!penalty) return "";
  const stat = { power: "power (health, damage and healing)", damage: "attack damage", health: "maximum health" }[penalty.stat];
  return `${penalty.classType === "thief" ? "Thieves" : CLASS_LABELS[penalty.classType] + "s"} lose 20% ${stat}${penalty.classType === "bard" && penalty.stat === "power" ? "; their blessings are also 20% weaker" : ""}`;
}

// Legacy saves receive a deterministic health drawback, never a reroll on reload.
export function upgradeTownIdentity(town) {
  if (town.balanceVersion === 2) return town;
  const { favoredClass, ...rest } = town;
  const prefix = PREFIXES.find(p => p.name === town.prefix.name) ?? town.prefix;
  const settlement = SETTLEMENTS.find(s => s.name === town.settlement.name) ?? town.settlement;
  const classType = CLASS_LABELS[favoredClass] ? favoredClass : "cleric";
  const penalty = { classType, stat: "health", multiplier: 0.8 };
  return { ...rest, balanceVersion: 2, prefix, settlement, penalty,
    bonuses: [prefix.bonus, settlement.bonus, townPenaltyText(penalty)] };
}

export function townHeroEffects(type, building, town) {
  const prefix = town.prefix;
  const penalty = town.penalty?.classType === type ? town.penalty : null;
  const modifier = stat => penalty?.stat === stat ? penalty.multiplier : 1;
  const local = town.settlement.classType === type ? town.settlement : {};
  return { ...building,
    powerMultiplier: (building.powerMultiplier ?? 1) * modifier("power"),
    healthMultiplier: building.healthMultiplier * (prefix.health ?? 1) * (local.health ?? 1) * modifier("health"),
    speedMultiplier: building.speedMultiplier * (prefix.speed ?? 1),
    damageMultiplier: building.damageMultiplier * (local.damage ?? 1) * modifier("damage"),
    damageReduction: cappedCombatPercent(1 - (1 - building.damageReduction) * (1 - (local.reduction ?? 0))),
    critChance: cappedCombatPercent(building.critChance + (prefix.crit ?? 0) + (local.crit ?? 0)),
    evasionChance: cappedCombatPercent((building.evasionChance ?? 0) + (prefix.evasion ?? 0) + (local.evasion ?? 0)),
    healRatio: building.healRatio * (local.healing ?? 1),
    bardBuff: building.bardBuff * (local.bardBuff ?? 1) * (type === "bard" ? modifier("power") : 1),
  };
}
export function rollTownClass(classes, town, random = Math.random) {
  return classes[Math.floor(random() * classes.length)];
}
export function townRollCost(state) {
  return !state.rolledToday || state.freeRerollsRemaining > 0 ? 0 : state.rerollCost;
}
