import test from 'node:test';
import assert from 'node:assert/strict';
import { PREFIXES, SETTLEMENTS, GEOGRAPHIES, PLACE_NAMES, createTownIdentity, townHeroEffects, rollTownClass, townRollCost, recruitmentTraits, upgradeTownIdentity, rebaseTownPower } from '../src/town-identity.js';
import { buildingEffects } from '../src/town.js';

test('every town combination has three visible traits and a cosmetic place name', () => {
  for (let p = 0; p < PREFIXES.length; p++) for (let s = 0; s < SETTLEMENTS.length; s++) for (let g = 0; g < GEOGRAPHIES.length; g++) {
    const rolls = [(p + .5) / PREFIXES.length, (s + .5) / SETTLEMENTS.length, (g + .5) / GEOGRAPHIES.length, 0, .5];
    const town = createTownIdentity(() => rolls.shift());
    assert.ok(town.name.startsWith(`${PREFIXES[p].name} ${SETTLEMENTS[s].name} `));
    assert.ok(town.name.includes('Alm'));
    assert.equal(town.bonuses.length, 4);
    assert.equal(town.recruitment.scarceClass, GEOGRAPHIES[g].classType);
    assert.notEqual(town.recruitment.commonClass,town.recruitment.scarceClass);
    assert.deepEqual(town.bonuses.slice(2),recruitmentTraits(town.recruitment));
    assert.equal(town.penalty,undefined);
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
    assert.equal(effects.critChance, base.critChance + .03 + (settlement.crit ?? 0));
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
test('scarce and common classes are exactly 40% below and above normal contract probability', () => {
 const classes=GEOGRAPHIES.map(g=>g.classType),counts=Object.fromEntries(classes.map(c=>[c,0]));
 const town={recruitment:{commonClass:'mage',scarceClass:'cleric'}};
 for(let i=0;i<7000;i++)counts[rollTownClass(classes,town,()=>(i+.5)/7000)]++;
 for(const c of classes)assert.equal(counts[c],c==='mage'?1400:c==='cleric'?600:1000);
});

test('recruitment availability has no effect on any class combat stats',()=>{
 for(const type of GEOGRAPHIES.map(g=>g.classType)) {
  const base=buildingEffects(type,{level:3,pathA:1,pathB:1});
  const town={prefix:PREFIXES[3],settlement:SETTLEMENTS.find(s=>s.classType===type),recruitment:{commonClass:'mage',scarceClass:type}};
  assert.deepEqual(townHeroEffects(type,base,town),townHeroEffects(type,base,{...town,recruitment:null}));
 }
});

test('prefixes grant meaningful advantages without changing the settlement perks', () => {
  assert.deepEqual(PREFIXES.map(p => p.name), ['Walled','Grand','Silent','Oaken','Windy','Ashen']);
  assert.equal(PREFIXES[0].enemyDamage,.95);assert.equal(PREFIXES[1].gold,3);
  assert.equal(PREFIXES[2].evasion,.04);assert.equal(PREFIXES[3].health,1.1);
  assert.equal(PREFIXES[4].speed,1.06);assert.equal(PREFIXES[5].crit,.03);
});

test('legacy towns migrate once, preserving names and class while replacing recruitment with a stable drawback', () => {
  for (const geography of GEOGRAPHIES) {
    const old = { name: 'Ashen Hold on the Alm River', prefix: {name:'Ashen',crit:.01}, settlement: SETTLEMENTS[5], favoredClass: geography.classType, bonuses: ['old','old','recruitment +10%'] };
    const town = upgradeTownIdentity(old);
    assert.equal(town.name, old.name);assert.equal(town.prefix.crit,.03);
    assert.equal(town.recruitment.scarceClass,geography.classType);
    assert.notEqual(town.recruitment.commonClass,geography.classType);
    assert.equal(town.penalty,undefined);
    assert.equal(town.favoredClass,undefined);assert.deepEqual(town.bonuses.slice(2),recruitmentTraits(town.recruitment));
    assert.equal(upgradeTownIdentity(town),town);
    assert.equal(old.prefix.crit,.01);
  }
});

test('older drawbacks keep their class as scarcity without a stat penalty', () => {
  for (const stat of ['power','health','damage']) {
    const old = {balanceVersion:2,name:'Grand Hold on the Alm River',prefix:{name:'Grand',gold:6},settlement:SETTLEMENTS[5],penalty:{classType:'barbarian',stat,multiplier:.8}};
    const town = upgradeTownIdentity(old);
    assert.equal(town.balanceVersion,4);assert.equal(town.prefix.gold,3);
    assert.equal(town.recruitment.scarceClass,'barbarian');assert.equal(town.penalty,undefined);
    const effects = townHeroEffects('barbarian',buildingEffects('barbarian'),town);
    assert.equal(effects.healthMultiplier,1.03);assert.equal(effects.powerMultiplier,1);
  }
});

test('saved combat power restores old penalties and rebases exact assigned Bard blessings', () => {
  const unit = {type:'knight',hero:{level:1},power:120.6,bardBuffPercent:21};
  const oldTown = {penalty:{classType:'bard',stat:'power',multiplier:.8}};
  const newTown = {recruitment:{commonClass:'mage',scarceClass:'bard'}};
  const fromBard = rebaseTownPower(unit,oldTown,newTown);
  assert.equal(fromBard.power,125.75);
  assert.ok(Math.abs(fromBard.bardBuffAmount-.2575)<1e-10);
  const restored = rebaseTownPower({...unit,type:'mage',power:96.48},{penalty:{classType:'mage',stat:'power',multiplier:.8}},{penalty:{classType:'mage',stat:'damage',multiplier:.9}});
  assert.equal(restored.power,120.6);
  // Returned heroes can already have levelled up; combat power is still level one.
  assert.equal(rebaseTownPower({...unit,hero:{level:2}},oldTown,newTown).power,125.75);
});
