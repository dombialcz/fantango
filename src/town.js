import { cappedCombatPercent } from "./combat-rules.js";

export const BUILDING_DEFINITIONS = {
  knight: {
    name: "Barracks",
    classLabel: "Knight",
    commandLabel: "HOLD THE LINE",
    core: (level) => `${Math.round(cappedCombatPercent(.2 + (level - 1) * .05) * 100)}% damage reduction · 50% intercept`,
    pathA: { label: "FORTIFY", short: "+15% health" },
    pathB: { label: "DRILL", short: "+10% speed" },
  },
  thief: {
    name: "Thieves’ Guild",
    classLabel: "Thief",
    commandLabel: "PILFER",
    core: (level) => `20% base dodge · +${(level - 1) * 15}% damage to wounded foes`,
    pathA: { label: "EVASION", short: "+5% dodge" },
    pathB: { label: "HASTE", short: "+10% speed" },
  },
  bard: {
    name: "Bard College",
    classLabel: "Bard",
    commandLabel: "RALLY",
    core: (level) => `ally buff +${20 + (level - 1) * 5}% power`,
    pathA: { label: "VIGOR", short: "+15% health" },
    pathB: { label: "CHORUS", short: "+1 buff target" },
  },
  cleric: {
    name: "Temple",
    classLabel: "Cleric",
    commandLabel: "DIVINE AEGIS",
    core: (level) => `healing ${10 + (level - 1) * 3}% of power`,
    pathA: { label: "SANCTUARY", short: "+15% health" },
    pathB: { label: "DEVOTION", short: "+10% speed" },
  },
  barbarian: {
    name: "Fighting Pit",
    classLabel: "Barbarian",
    commandLabel: "BLOODLUST",
    core: (level) => `+${(level - 1) * 10}% damage`,
    pathA: { label: "HARDEN", short: "+15% health" },
    pathB: { label: "SAVAGERY", short: "+5% crit" },
  },
  ranger: {
    name: "Hunter’s Lodge",
    classLabel: "Ranger",
    commandLabel: "MARK PREY",
    core: (level) => `+${(level - 1) * 10}% attack speed`,
    pathA: { label: "DEADEYE", short: "+5% crit" },
    pathB: { label: "DRAW", short: "+12% damage" },
  },
  mage: {
    name: "Mage Guild",
    classLabel: "Mage",
    commandLabel: "TIME FREEZE",
    core: (level) => `${level} spell target${level === 1 ? "" : "s"}`,
    pathA: { label: "WARDING", short: "+15% health" },
    pathB: { label: "QUICKEN", short: "+10% speed" },
  },
  alchemist: {
    name: "Alchemist",
    classLabel: "Supplies",
    utility: true,
    glyph: "⚗",
    color: "#71c9a5",
    core: (level) => {
      const supplies = alchemistSupplies(level);
      return `${supplies.count} potion${supplies.count === 1 ? "" : "s"} • heal ${Math.round(supplies.healRatio * 100)}%`;
    },
  },
  tavern: {
    name: "Tavern",
    classLabel: "Contracts",
    utility: true,
    glyph: "◆",
    color: "#d7ae5d",
    core: (level) => {
      const odds = [
        "level 1 contracts only",
        "L2 10%",
        "L2 20% → L3 10%",
        "L2 30% → L3 15%",
        "L2 40% → L3 20% → L4 10%",
      ];
      return odds[Math.max(1, Math.min(5, level)) - 1];
    },
  },
};

export function alchemistSupplies(level) {
  const clamped = Math.max(1, Math.min(5, level));
  if (clamped === 1) return { count: 1, healRatio: 0.2 };
  if (clamped === 2) return { count: 2, healRatio: 0.2 };
  if (clamped === 3) return { count: 3, healRatio: 0.2 };
  if (clamped === 4) return { count: 3, healRatio: 0.33 };
  return { count: 3, healRatio: 0.5 };
}

export function createTownBuildings() {
  return Object.fromEntries(
    Object.keys(BUILDING_DEFINITIONS).map((type) => [type, { level: 1, pathA: 0, pathB: 0 }]),
  );
}

export function buildingUpgradeCost(level) {
  return level >= 5 ? null : level * 3;
}

export function buildingEffects(type, building) {
  const level = building?.level ?? 1;
  const pathA = building?.pathA ?? 0;
  const pathB = building?.pathB ?? 0;
  const effects = {
    healthMultiplier: 1,
    speedMultiplier: 1,
    damageMultiplier: 1,
    damageReduction: 0,
    critChance: 0,
    evasionChance: 0,
    executeBonus: 0,
    bardBuff: 0.2,
    bardTargets: 1,
    healRatio: 0.1,
    mageTargets: 1,
  };

  if (type === "knight") {
    effects.damageReduction = .2 + (level - 1) * 0.05;
    effects.healthMultiplier += pathA * 0.15;
    effects.speedMultiplier += pathB * 0.1;
  } else if (type === "thief") {
    effects.executeBonus = (level - 1) * 0.15;
    effects.evasionChance = .2 + pathA * 0.05;
    effects.speedMultiplier += pathB * 0.1;
  } else if (type === "bard") {
    effects.bardBuff = 0.2 + (level - 1) * 0.05;
    effects.healthMultiplier += pathA * 0.15;
    effects.bardTargets += pathB;
  } else if (type === "cleric") {
    effects.healRatio = 0.1 + (level - 1) * 0.03;
    effects.healthMultiplier += pathA * 0.15;
    effects.speedMultiplier += pathB * 0.1;
  } else if (type === "barbarian") {
    effects.damageMultiplier += (level - 1) * 0.1;
    effects.healthMultiplier += pathA * 0.15;
    effects.critChance = pathB * 0.05;
  } else if (type === "ranger") {
    effects.speedMultiplier += (level - 1) * 0.1;
    effects.critChance = pathA * 0.05;
    effects.damageMultiplier += pathB * 0.12;
  } else if (type === "mage") {
    effects.mageTargets = level;
    effects.healthMultiplier += pathA * 0.15;
    effects.speedMultiplier += pathB * 0.1;
  }

  for (const key of ["damageReduction", "critChance", "evasionChance"]) effects[key] = cappedCombatPercent(effects[key]);
  return effects;
}
