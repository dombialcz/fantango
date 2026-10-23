import { cappedCombatPercent } from './combat-rules.js';

export const INVASIONS = ['undead', 'demons', 'assassins', 'orcs'];
export const LEGACIES = {
  orcs: [
    { id: 'orc-damage', name: 'Warchief’s resolve', description: 'All heroes deal 10% more damage.', damageMultiplier: 1.1 },
    { id: 'orc-health', name: 'Unbroken company', description: 'All heroes gain 20% maximum health.', healthMultiplier: 1.2 },
  ],
  undead: [
    { id: 'undead-potions', name: 'Life from the ashes', description: 'Potion recovery gains 50 percentage points: 60–100% with Alchemist levels 1–5.', potionRecoveryBonus: .5 },
    { id: 'undead-command', name: 'Voices of the fallen', description: 'Begin each fight with 30 extra Command: 80 instead of 50. Event consequences can override this.', startingCommandBonus: 30 },
  ],
  demons: [
    { id: 'demon-crit', name: 'Hellforged edge', description: 'All heroes gain 5 percentage points of critical-hit chance.', critChance: .05 },
    { id: 'demon-armor', name: 'Ember ward', description: 'All heroes gain 5 percentage points of damage reduction.', damageReduction: .05 },
  ],
  assassins: [
    { id: 'guild-gold', name: 'Liberated coffers', description: 'Gain 3 extra gold every morning, including day one.', dailyGold: 3 },
    { id: 'guild-evasion', name: 'A step ahead', description: 'All heroes gain 5 percentage points of evasion.', evasionChance: .05 },
  ],
};
const byId = Object.fromEntries(Object.values(LEGACIES).flat().map(reward => [reward.id, reward]));
export function createJourney() { return { completed: [], legacies: [] }; }
export function remainingInvasions(journey = createJourney()) {
  return INVASIONS.filter(flavor => !journey.completed.some(campaign => campaign.flavorKey === flavor));
}
export function heroLevelCap(journey = createJourney()) { return Math.min(8, 5 + journey.completed.length); }
// Each completed invasion raises the next campaign's enemy health by 50%.
export function campaignEnemyHealthMultiplier(journey = createJourney()) { return 1.5 ** journey.completed.length; }
export function heroLevelSpeed(level) { return 1 + (Math.min(5, Math.max(1, level)) - 1) * .15; }
export function heroTrainingCost(level, cap = 5) { return level >= cap ? null : level * level; }
export function legacyRewards(journey = createJourney()) { return journey.legacies.map(id => byId[id]).filter(Boolean); }
export function legacyEffects(journey) {
  const effects = { damageMultiplier: 1, healthMultiplier: 1, critChance: 0, damageReduction: 0, evasionChance: 0, potionRecoveryBonus: 0, startingCommandBonus: 0, dailyGold: 0 };
  for (const reward of legacyRewards(journey)) for (const key of Object.keys(effects)) {
    if (key.endsWith('Multiplier')) effects[key] *= reward[key] ?? 1;
    else effects[key] += reward[key] ?? 0;
  }
  return effects;
}
export function applyLegacyHeroEffects(effects, journey) {
  const legacy = legacyEffects(journey);
  return { ...effects, healthMultiplier: effects.healthMultiplier * legacy.healthMultiplier,
    damageMultiplier: effects.damageMultiplier * legacy.damageMultiplier,
    critChance: cappedCombatPercent(effects.critChance + legacy.critChance),
    damageReduction: cappedCombatPercent(effects.damageReduction + legacy.damageReduction),
    evasionChance: cappedCombatPercent(effects.evasionChance + legacy.evasionChance) };
}
export function potionRecoveryChance(alchemistLevel, journey) {
  return Math.min(1, Math.max(1, Math.min(5, alchemistLevel)) * .1 + legacyEffects(journey).potionRecoveryBonus);
}
export function campaignSummary(state) {
  return { campaignId: state.campaignId, town: { name: state.town.name }, flavorKey: state.flavorKey,
    bossType: state.bossType, day: state.victoryDay ?? state.day, gold: state.gold,
    clears: state.events.clears, fallen: state.graves.map(grave => ({ ...grave })),
    survivors: state.party.filter(unit => unit.hp > 0).map(unit => ({ ...unit.hero })),
    chronicle: state.chronicle.map(entry => ({ ...entry })), victoryAchieved: true };
}
