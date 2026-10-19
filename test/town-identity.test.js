import test from 'node:test';
import assert from 'node:assert/strict';
import { PREFIXES, SETTLEMENTS, GEOGRAPHIES, PLACE_NAMES, createTownIdentity, townHeroEffects, rollTownClass, townRollCost } from '../src/town-identity.js';
import { buildingEffects } from '../src/town.js';

test('every town combination has three visible traits and a cosmetic place name', () => {
  for (let p = 0; p < PREFIXES.length; p++) for (let s = 0; s < SETTLEMENTS.length; s++) for (let g = 0; g < GEOGRAPHIES.length; g++) {
    const rolls = [(p + .5) / PREFIXES.length, (s + .5) / SETTLEMENTS.length, (g + .5) / GEOGRAPHIES.length, 0];
    const town = createTownIdentity(() => rolls.shift());
    assert.ok(town.name.startsWith(`${PREFIXES[p].name} ${SETTLEMENTS[s].name} `));
    assert.ok(town.name.includes('Alm'));
    assert.equal(town.bonuses.length, 3);
    assert.equal(town.favoredClass, GEOGRAPHIES[g].classType);
  }
});
test('the complete town name pool avoids repeated terrain and redundant pairings', () => {
  const names = new Set();
  for (let p = 0; p < PREFIXES.length; p++) for (let s = 0; s < SETTLEMENTS.length; s++) for (let g = 0; g < GEOGRAPHIES.length; g++) for (let n = 0; n < PLACE_NAMES.length; n++) {
    const rolls = [(p + .5) / PREFIXES.length, (s + .5) / SETTLEMENTS.length, (g + .5) / GEOGRAPHIES.length, (n + .5) / PLACE_NAMES.length];
    const town = createTownIdentity(() => rolls.shift());
    const words = town.name.toLowerCase().match(/[a-z]+/g);
    const terrain = words.filter(word => /^(river|hill|mount|wood|road|fort|marsh|hold|hollow|spire|reach|haven|sanctum|market|estate|crossing)$/.test(word));
    assert.equal(new Set(terrain).size, terrain.length, town.name);
    assert.doesNotMatch(town.name, /\bWalled\b.*\bWalls\b|\bCrossing\b.*\bCrossroads\b|Oak[’']s/i);
    assert.ok(town.name.includes(PLACE_NAMES[n]), town.name);
    names.add(town.name);
  }
  assert.equal(names.size, PREFIXES.length * SETTLEMENTS.length * GEOGRAPHIES.length * PLACE_NAMES.length);
});
test('class traits affect only the matching class and stack with buildings', () => {
  for (const settlement of SETTLEMENTS.filter(s => s.classType)) {
    const town = { prefix: PREFIXES[5], settlement };
    const base = buildingEffects(settlement.classType, { level: 3, pathA: 1, pathB: 1 });
    const effects = townHeroEffects(settlement.classType, base, town);
    assert.equal(effects.critChance, base.critChance + .01 + (settlement.crit ?? 0));
    assert.equal(effects.damageMultiplier, base.damageMultiplier * (settlement.damage ?? 1));
    assert.equal(effects.healthMultiplier, base.healthMultiplier * (settlement.health ?? 1));
    assert.equal(effects.healRatio, base.healRatio * (settlement.healing ?? 1));
    assert.equal(effects.bardBuff, base.bardBuff * (settlement.bardBuff ?? 1));
    assert.ok(effects.damageReduction >= base.damageReduction - 1e-10);
    const other = settlement.classType === 'mage' ? 'knight' : 'mage';
    assert.equal(townHeroEffects(other, buildingEffects(other), town).damageMultiplier, 1);
  }
});
test('Crossing adds a free reroll without changing the paid price', () => {
  assert.equal(townRollCost({ rolledToday: false, freeRerollsRemaining: 1, rerollCost: 1 }), 0);
  assert.equal(townRollCost({ rolledToday: true, freeRerollsRemaining: 1, rerollCost: 1 }), 0);
  assert.equal(townRollCost({ rolledToday: true, freeRerollsRemaining: 0, rerollCost: 1 }), 1);
  assert.equal(townRollCost({ rolledToday: true, freeRerollsRemaining: 0, rerollCost: 2 }), 2);
});
test('geography uses 10% relative weight rather than ten percentage points', () => {
  const classes = ['knight', 'thief', 'bard', 'cleric', 'barbarian', 'ranger', 'mage'];
  const counts = Object.fromEntries(classes.map(c => [c, 0]));
  for (let i = 0; i < 7100; i++) counts[rollTownClass(classes, { favoredClass: 'cleric' }, () => (i + .5) / 7100)]++;
  for (const c of classes) assert.equal(counts[c], c === 'cleric' ? 1100 : 1000);
});
