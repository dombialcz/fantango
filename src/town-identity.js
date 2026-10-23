// Town identity: a modest party-wide advantage, a settlement perk, and local recruitment availability.
import { heroPower } from "./hero-data.js";
import { cappedCombatPercent } from "./combat-rules.js";
export const PREFIXES = [
  { name: "Walled", bonus: "Enemies deal 5% less damage", enemyDamage: 0.95 },
  { name: "Grand", bonus: "Start with 3 extra gold", gold: 3 },
  { name: "Silent", bonus: "All heroes gain +4 percentage points of dodge chance", evasion: 0.04 },
  { name: "Oaken", bonus: "All heroes gain 10% maximum health", health: 1.1 },
  { name: "Windy", bonus: "All heroes attack 6% faster", speed: 1.06 },
  { name: "Ashen", bonus: "All heroes gain +3 percentage points of crit chance", crit: 0.03 },
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
  const scarceClass = geography.classType;
  const commonClass = settlement.classType && settlement.classType !== scarceClass
    ? settlement.classType : pick(GEOGRAPHIES.map(g => g.classType).filter(type => type !== scarceClass));
  const recruitment = { commonClass, scarceClass };
  return { balanceVersion: 4, prefix, settlement, recruitment,
    name: `${prefix.name} ${settlement.name} ${geography.format(place)}`,
    flavor: geography.flavor,
    bonuses: [prefix.bonus, settlement.bonus, ...recruitmentTraits(recruitment)],
  };
}
const CLASS_LABELS = Object.fromEntries(GEOGRAPHIES.map(g => [g.classType, g.label]));
export function recruitmentTraits(recruitment) {
  return [`${CLASS_LABELS[recruitment.commonClass]} contracts are 40% more likely`, `${CLASS_LABELS[recruitment.scarceClass]} contracts are 40% less likely`];
}
export function townRecruitmentText(town, type) {
  if (town.recruitment?.commonClass === type) return "Common here: 20% chance per contract";
  if (town.recruitment?.scarceClass === type) return "Scarce here: 8.6% chance per contract";
  return null;
}
export function upgradeTownIdentity(town) {
  if (town.balanceVersion === 4) return town;
  const { favoredClass, penalty, ...rest } = town;
  const prefix = PREFIXES.find(p => p.name === town.prefix.name) ?? town.prefix;
  const settlement = SETTLEMENTS.find(s => s.name === town.settlement.name) ?? town.settlement;
  const previousClass = penalty?.classType ?? favoredClass;
  const scarceClass = CLASS_LABELS[previousClass] ? previousClass : "cleric";
  const commonClass = settlement.classType && settlement.classType !== scarceClass ? settlement.classType
    : GEOGRAPHIES.find(g => g.classType !== scarceClass).classType;
  const recruitment = { commonClass, scarceClass };
  return { ...rest, balanceVersion: 4, prefix, settlement, recruitment,
    bonuses: [prefix.bonus, settlement.bonus, ...recruitmentTraits(recruitment)] };
}

// Update assigned Bard blessings without selecting new recipients. Older saves
// rounded their blessing percent, so recover its exact amount from stored power.
export function rebaseTownPower(unit, oldTown, newTown) {
  const oldPenalty = oldTown.penalty;
  const powerFactor = oldPenalty?.classType === unit.type && oldPenalty.stat === "power" ? oldPenalty.multiplier : 1;
  const oldBardFactor = oldPenalty?.classType === "bard" && ["power", "blessing"].includes(oldPenalty.stat) ? oldPenalty.multiplier : 1;
  const newBardFactor = newTown.penalty?.classType === "bard" ? newTown.penalty.multiplier : 1;
  const unpenalizedPower = unit.power / powerFactor;
  const level = unit.hero?.level ?? 1;
  const candidates = [heroPower(level), heroPower(Math.max(1, level - 1))];
  const difference = base => Math.abs(unpenalizedPower / base - 1 - (unit.bardBuffPercent ?? 0) / 100);
  const basePower = unit.basePower ?? candidates.sort((a,b) => difference(a) - difference(b))[0];
  const oldBuff = unit.bardBuffAmount ?? Math.max(0, unpenalizedPower / basePower - 1);
  const bardBuffAmount = oldBuff * newBardFactor / oldBardFactor;
  return { basePower, bardBuffAmount, bardBuffPercent: Math.round(bardBuffAmount * 100),
    power: Number((basePower * (1 + bardBuffAmount)).toFixed(10)) };
}

export function townHeroEffects(type, building, town) {
  const prefix = town.prefix;
  const local = town.settlement.classType === type ? town.settlement : {};
  return { ...building,
    powerMultiplier: building.powerMultiplier ?? 1,
    healthMultiplier: building.healthMultiplier * (prefix.health ?? 1) * (local.health ?? 1),
    speedMultiplier: building.speedMultiplier * (prefix.speed ?? 1),
    damageMultiplier: building.damageMultiplier * (local.damage ?? 1),
    damageReduction: cappedCombatPercent(1 - (1 - building.damageReduction) * (1 - (local.reduction ?? 0))),
    critChance: cappedCombatPercent(building.critChance + (prefix.crit ?? 0) + (local.crit ?? 0)),
    evasionChance: cappedCombatPercent((building.evasionChance ?? 0) + (prefix.evasion ?? 0) + (local.evasion ?? 0)),
    healRatio: building.healRatio * (local.healing ?? 1),
    bardBuff: building.bardBuff * (local.bardBuff ?? 1),
  };
}
export function rollTownClass(classes, town, random = Math.random) {
  const weight = type => type === town.recruitment?.commonClass ? 1.4 : type === town.recruitment?.scarceClass ? .6 : 1;
  let roll = random() * classes.reduce((sum,type) => sum + weight(type), 0);
  for (const type of classes) { roll -= weight(type); if (roll < 0) return type; }
  return classes.at(-1);
}
export function townRollCost(state) {
  return !state.rolledToday || state.freeRerollsRemaining > 0 ? 0 : state.rerollCost;
}
