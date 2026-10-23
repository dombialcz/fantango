import test from 'node:test';
import assert from 'node:assert/strict';
import { createJourney, heroLevelCap, campaignEnemyHealthMultiplier, heroLevelSpeed, heroTrainingCost, remainingInvasions, legacyEffects, applyLegacyHeroEffects, potionRecoveryChance } from '../src/campaign-journey.js';

test('four distinct invasions unlock caps five through eight without automatic levels', () => {
  const j = createJourney();
  for (const [i, flavorKey] of ['orcs','undead','demons','assassins'].entries()) {
    assert.equal(heroLevelCap(j), 5+i);
    assert.ok(remainingInvasions(j).includes(flavorKey));
    j.completed.push({flavorKey});
    assert.ok(!remainingInvasions(j).includes(flavorKey));
  }
  assert.deepEqual(remainingInvasions(j), []); assert.equal(heroLevelCap(j), 8);
});
test('enemy health compounds by fifty percent per completed invasion and resets with a fresh journey', () => {
  for (const order of [['orcs','undead','demons'], ['demons','assassins','orcs']]) {
    const journey = createJourney();
    for (const [index, multiplier] of [1, 1.5, 2.25, 3.375].entries()) {
      assert.equal(campaignEnemyHealthMultiplier(journey), multiplier);
      if (index < order.length) journey.completed.push({flavorKey: order[index]});
    }
  }
  assert.equal(campaignEnemyHealthMultiplier(createJourney()), 1);
  assert.equal(campaignEnemyHealthMultiplier(), 1);
});
test('higher training respects the active cap and level speed stops growing at five', () => {
  assert.equal(heroTrainingCost(5,5), null); assert.equal(heroTrainingCost(5,6),25);
  assert.equal(heroTrainingCost(6,7),36); assert.equal(heroTrainingCost(7,8),49); assert.equal(heroTrainingCost(8,8),null);
  assert.equal(heroLevelSpeed(1),1); assert.equal(heroLevelSpeed(5),1.6); assert.equal(heroLevelSpeed(8),1.6);
});
test('Alchemist recovery spans ten to fifty percent, plus fifty points for the Undead choice', () => {
  const j = createJourney();
  assert.deepEqual([1,2,3,4,5].map(level => Math.round(potionRecoveryChance(level,j)*100)), [10,20,30,40,50]);
  j.legacies.push('undead-potions');
  assert.deepEqual([1,2,3,4,5].map(level => Math.round(potionRecoveryChance(level,j)*100)), [60,70,80,90,100]);
  assert.equal(potionRecoveryChance(99,j),1);
});
test('legacy choices apply to all new heroes and stack without bypassing combat caps', () => {
  const j = {completed:[],legacies:['orc-damage','demon-armor','guild-evasion','undead-command']};
  const base = {healthMultiplier:1,damageMultiplier:1,critChance:.89,damageReduction:.88,evasionChance:.89};
  const e = applyLegacyHeroEffects(base,j);
  assert.equal(e.damageMultiplier,1.1);assert.equal(e.damageReduction,.9);assert.equal(e.evasionChance,.9);
  assert.equal(legacyEffects(j).startingCommandBonus,30);
  assert.equal(legacyEffects({legacies:['guild-gold']}).dailyGold,3);
  assert.equal(applyLegacyHeroEffects(base,{legacies:['orc-health','demon-crit']}).healthMultiplier,1.2);
  assert.equal(base.healthMultiplier,1);
});
