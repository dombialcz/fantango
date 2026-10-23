import test from 'node:test';
import assert from 'node:assert/strict';
import { PREFIXES, SETTLEMENTS, GEOGRAPHIES, PLACE_NAMES, createTownIdentity, townHeroEffects, rollTownClass, townRollCost, townPenaltyText, upgradeTownIdentity } from '../src/town-identity.js';
import { buildingEffects } from '../src/town.js';

test('every town combination has three visible traits and a cosmetic place name', () => {
  for (let p = 0; p < PREFIXES.length; p++) for (let s = 0; s < SETTLEMENTS.length; s++) for (let g = 0; g < GEOGRAPHIES.length; g++) {
    const rolls = [(p + .5) / PREFIXES.length, (s + .5) / SETTLEMENTS.length, (g + .5) / GEOGRAPHIES.length, 0, .5];
    const town = createTownIdentity(() => rolls.shift());
    assert.ok(town.name.startsWith(`${PREFIXES[p].name} ${SETTLEMENTS[s].name} `));
    assert.ok(town.name.includes('Alm'));
    assert.equal(town.bonuses.length, 3);
    assert.equal(town.penalty.classType, GEOGRAPHIES[g].classType);
    assert.equal(town.penalty.multiplier, .8);
    assert.equal(town.bonuses[2], townPenaltyText(town.penalty));
    assert.ok(!town.bonuses.some(b => /recruitment/.test(b)));
  }
});
test('the complete town name pool avoids repeated terrain and redundant pairings', () => {
  const names = new Set();
  for (let p = 0; p < PREFIXES.length; p++) for (let s = 0; s < SETTLEMENTS.length; s++) for (let g = 0; g < GEOGRAPHIES.length; g++) for (let n = 0; n < PLACE_NAMES.length; n++) {
    const rolls = [(p + .5) / PREFIXES.length, (s + .5) / SETTLEMENTS.length, (g + .5) / GEOGRAPHIES.length, (n + .5) / PLACE_NAMES.length, .5];
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
    assert.equal(effects.critChance, base.critChance + .1 + (settlement.crit ?? 0));
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
test('town drawback does not bias recruitment toward or away from any class', () => {
  const classes = ['knight', 'thief', 'bard', 'cleric', 'barbarian', 'ranger', 'mage'];
  const counts = Object.fromEntries(classes.map(c => [c, 0]));
  for (let i = 0; i < 7000; i++) counts[rollTownClass(classes, { favoredClass: 'cleric', penalty: { classType: 'mage' } }, () => (i + .5) / 7000)]++;
  for (const c of classes) assert.equal(counts[c], 1000);
});

test('each drawback reduces exactly one stat category for its class and stacks multiplicatively', () => {
  for (const classType of GEOGRAPHIES.map(g => g.classType)) for (const stat of ['power', 'damage', 'health']) {
    const base = buildingEffects(classType, { level: 3, pathA: 1, pathB: 1 });
    const town = { prefix: PREFIXES[3], settlement: SETTLEMENTS.find(s => s.classType === classType), penalty: { classType, stat, multiplier: .8 } };
    const before = townHeroEffects(classType, base, { ...town, penalty: null });
    const after = townHeroEffects(classType, base, town);
    for (const [key,category] of [['powerMultiplier','power'],['damageMultiplier','damage'],['healthMultiplier','health']]) assert.ok(Math.abs(after[key] - before[key] * (stat === category ? .8 : 1)) < 1e-10);
    assert.equal(after.critChance, before.critChance);
    assert.equal(after.speedMultiplier, before.speedMultiplier);
    assert.equal(after.bardBuff, before.bardBuff * (classType === 'bard' && stat === 'power' ? .8 : 1));
    const other = classType === 'mage' ? 'knight' : 'mage';
    assert.deepEqual(townHeroEffects(other, buildingEffects(other), town), townHeroEffects(other, buildingEffects(other), { ...town, penalty: null }));
  }
});

test('all penalty variants are reachable and Bards never draw a meaningless attack penalty', () => {
  for (let g = 0; g < GEOGRAPHIES.length; g++) {
    const seen = new Set();
    for (const last of [.1,.5,.9]) {
      const rolls = [0,0,(g+.5)/GEOGRAPHIES.length,0,last];
      const town = createTownIdentity(() => rolls.shift());
      seen.add(town.penalty.stat);
      assert.equal(town.penalty.classType, GEOGRAPHIES[g].classType);
    }
    assert.deepEqual([...seen].sort(), GEOGRAPHIES[g].classType === 'bard' ? ['health','power'] : ['damage','health','power']);
  }
});

test('prefixes grant meaningful advantages without changing the settlement perks', () => {
  assert.deepEqual(PREFIXES.map(p => p.name), ['Walled','Grand','Silent','Oaken','Windy','Ashen']);
  assert.equal(PREFIXES[0].enemyDamage,.9);assert.equal(PREFIXES[1].gold,6);
  assert.equal(PREFIXES[2].evasion,.1);assert.equal(PREFIXES[3].health,1.15);
  assert.equal(PREFIXES[4].speed,1.1);assert.equal(PREFIXES[5].crit,.1);
});

test('legacy towns migrate once, preserving names and class while replacing recruitment with a stable drawback', () => {
  for (const geography of GEOGRAPHIES) {
    const old = { name: 'Ashen Hold on the Alm River', prefix: {name:'Ashen',crit:.01}, settlement: SETTLEMENTS[5], favoredClass: geography.classType, bonuses: ['old','old','recruitment +10%'] };
    const town = upgradeTownIdentity(old);
    assert.equal(town.name, old.name);assert.equal(town.prefix.crit,.1);
    assert.deepEqual(town.penalty,{classType:geography.classType,stat:'health',multiplier:.8});
    assert.equal(town.favoredClass,undefined);assert.equal(town.bonuses[2],townPenaltyText(town.penalty));
    assert.equal(upgradeTownIdentity(town),town);
    assert.equal(old.prefix.crit,.01);
  }
});
