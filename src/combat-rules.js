export const COMBAT_DAMAGE_SCALE = 0.25;
export const COMBAT_INTERVAL_SCALE = 1.5;

export const COMBAT_PERCENT_CAP = .9;
export const KNIGHT_INTERCEPT_CHANCE = .5;

export function cappedCombatPercent(value = 0) {
  return Math.max(0, Math.min(COMBAT_PERCENT_CAP, Number(value) || 0));
}

// One roll per single-target attack, not one roll per knight. No interception chains.
export function interceptingKnight(party, target, random = Math.random) {
  const available = party.filter(unit => unit.type === "knight" && unit.hp > 0
    && unit.id !== target.id && !(unit.frozenMs > 0));
  if (!available.length || random() >= KNIGHT_INTERCEPT_CHANCE) return null;
  return available[Math.floor(random() * available.length)];
}

export function totalDamageReduction(base, armorBonus = 0, enemyDamageMultiplier = 1) {
  return cappedCombatPercent(1 - (1 - cappedCombatPercent(base + armorBonus)) * enemyDamageMultiplier);
}

// Stable ties preserve party order; dead and fully healed heroes are ineligible.
export function mostWoundedAlly(party) {
  return party.reduce((target, ally) => ally.hp > 0 && ally.hp < ally.maxHp
    && (!target || ally.maxHp - ally.hp > target.maxHp - target.hp) ? ally : target, null);
}
