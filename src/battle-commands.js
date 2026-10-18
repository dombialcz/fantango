export const COMMAND_MAX = 100;
export const COMMAND_START = 50;
export const COMMAND_GAIN_PER_DAMAGE = 0.6;

export const BATTLE_COMMANDS = Object.freeze({
  hold: Object.freeze({ classType: "knight", label: "Hold the Line", shortLabel: "HOLD", cost: 50 }),
  pilfer: Object.freeze({ classType: "thief", label: "Pilfer", shortLabel: "PILFER", cost: 100 }),
  rally: Object.freeze({ classType: "bard", label: "Rally", shortLabel: "RALLY", cost: 45 }),
  aegis: Object.freeze({ classType: "cleric", label: "Divine Aegis", shortLabel: "AEGIS", cost: 70 }),
  bloodlust: Object.freeze({ classType: "barbarian", label: "Bloodlust", shortLabel: "BLOODLUST", cost: 60 }),
  mark: Object.freeze({ classType: "ranger", label: "Mark Prey", shortLabel: "MARK PREY", cost: 40 }),
  freeze: Object.freeze({ classType: "mage", label: "Time Freeze", shortLabel: "FREEZE", cost: 65 }),
});

export const COMMAND_IDS = Object.freeze(Object.keys(BATTLE_COMMANDS));

function cappedCount(count) {
  return Math.max(0, Math.min(4, Math.floor(count)));
}

export function commandPower(commandId, matchingHeroes) {
  const count = cappedCount(matchingHeroes);
  switch (commandId) {
    case "freeze":
      return { durationMs: count ? 2000 + count * 750 : 0 };
    case "aegis":
      return { durationMs: count ? 1000 + count * 500 : 0 };
    case "rally":
      return { durationMs: count ? 6000 : 0, speedBonus: count * 0.15 };
    case "mark":
      return { durationMs: count ? 6000 : 0, speedBonus: count * 0.2 };
    case "hold":
      return { durationMs: count ? 6000 : 0, armorBonus: count / 10, damageBonus: count / 10 };
    case "pilfer":
      return { gold: count };
    case "bloodlust":
      return { damageMultiplier: count ? 1.25 + (count - 1) * 0.5 : 0, healthCostRatio: 0.1 };
    default:
      throw new Error(`Unknown battle command: ${commandId}`);
  }
}
