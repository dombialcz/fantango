// Campaign identity: small, independent bonuses; geographical names are cosmetic.
export const PREFIXES = [
  { name: "Walled", bonus: "Enemies deal 1% less damage", enemyDamage: 0.99 },
  { name: "Grand", bonus: "Start with 1 extra gold", gold: 1 },
  { name: "Silent", bonus: "All heroes gain 1% evasion", evasion: 0.01 },
  { name: "Oak’s", bonus: "All heroes gain 1% maximum health", health: 1.01 },
  { name: "Windy", bonus: "All heroes attack 1% faster", speed: 1.01 },
  { name: "Ashen", bonus: "All heroes gain +1 percentage point of crit chance", crit: 0.01 },
];
export const SETTLEMENTS = [
  { name: "Reach", bonus: "Rangers deal 3% more damage", classType: "ranger", damage: 1.03 },
  { name: "Haven", bonus: "Knights take 3% less damage", classType: "knight", reduction: 0.03 },
  { name: "Hollow", bonus: "Thieves gain +2 percentage points of crit chance", classType: "thief", crit: 0.02 },
  { name: "Sanctum", bonus: "Clerics restore 3% more health", classType: "cleric", healing: 1.03 },
  { name: "Spire", bonus: "Mages deal 3% more damage", classType: "mage", damage: 1.03 },
  { name: "Hold", bonus: "Barbarians gain 3% maximum health", classType: "barbarian", health: 1.03 },
  { name: "Market", bonus: "Bard buffs are 3% stronger", classType: "bard", bardBuff: 1.03 },
  { name: "Estate", bonus: "Gain 1 extra gold at the start of each day", dailyGold: 1 },
  { name: "Crossing", bonus: "One additional free reroll each day", freeRerolls: 1 },
];
export const GEOGRAPHIES = [
  { format: (n) => `on the ${n}`, classType: "cleric", label: "Cleric", flavor: "River bells guide the weary home." },
  { format: (n) => `upon ${n} Hill`, classType: "barbarian", label: "Barbarian", flavor: "Old challenges are settled on the windswept hill." },
  { format: (n) => `beneath Mount ${n}`, classType: "mage", label: "Mage", flavor: "Strange lights burn beneath the mountain." },
  { format: (n) => `by ${n} Wood`, classType: "ranger", label: "Ranger", flavor: "Beyond the last hearth, the forest keeps its secrets." },
  { format: (n) => `at ${n} Crossroads`, classType: "bard", label: "Bard", flavor: "Every road brings another song and another stranger." },
  { format: (n) => `behind ${n} Walls`, classType: "knight", label: "Knight", flavor: "The watch keeps a light above the gates." },
  { format: (n) => `beside ${n} Marsh`, classType: "thief", label: "Thief", flavor: "Hidden paths wind between the reeds and lanterns." },
];
const NAMES = ["Alm", "Deir", "Ilth", "Vey", "Orin", "Eld", "Morn", "Aster", "Thalen", "Brann"];
export function createTownIdentity(random = Math.random) {
  const pick = (items) => items[Math.floor(random() * items.length)];
  const prefix = pick(PREFIXES);
  const settlement = pick(SETTLEMENTS);
  const geography = pick(GEOGRAPHIES);
  const place = pick(NAMES);
  return { prefix, settlement, favoredClass: geography.classType,
    name: `${prefix.name} ${settlement.name} ${geography.format(place)}`,
    flavor: geography.flavor,
    bonuses: [prefix.bonus, settlement.bonus, `${geography.label} recruitment weight +10%`],
  };
}
export function townHeroEffects(type, building, town) {
  const prefix = town.prefix;
  const local = town.settlement.classType === type ? town.settlement : {};
  return { ...building,
    healthMultiplier: building.healthMultiplier * (prefix.health ?? 1) * (local.health ?? 1),
    speedMultiplier: building.speedMultiplier * (prefix.speed ?? 1),
    damageMultiplier: building.damageMultiplier * (local.damage ?? 1),
    damageReduction: 1 - (1 - building.damageReduction) * (1 - (local.reduction ?? 0)),
    critChance: building.critChance + (prefix.crit ?? 0) + (local.crit ?? 0),
    healRatio: building.healRatio * (local.healing ?? 1),
    bardBuff: building.bardBuff * (local.bardBuff ?? 1),
  };
}
export function rollTownClass(classes, town, random = Math.random) {
  let roll = random() * (classes.length + 0.1);
  for (const type of classes) {
    roll -= type === town.favoredClass ? 1.1 : 1;
    if (roll < 0) return type;
  }
  return classes.at(-1);
}
export function townRollCost(state) {
  return !state.rolledToday || state.freeRerollsRemaining > 0 ? 0 : state.rerollCost;
}
