import test from 'node:test';
import assert from 'node:assert/strict';
import { cappedCombatPercent, interceptingKnight, totalDamageReduction } from '../src/combat-rules.js';
import { townHeroEffects, PREFIXES, SETTLEMENTS } from '../src/town-identity.js';
import { buildingEffects } from '../src/town.js';

test('dodge, crit and reduction clamp at exactly 90%, even with stacked town bonuses',()=>{
  for(const [input,expected] of [[-1,0],[0,0],[.2,.2],[.9,.9],[1,.9],[999,.9],[undefined,0]]) assert.equal(cappedCombatPercent(input),expected);
  for(const prefix of PREFIXES) for(const settlement of SETTLEMENTS) for(const type of ['knight','thief','ranger','barbarian']) {
    const result=townHeroEffects(type,buildingEffects(type,{level:100,pathA:100,pathB:100}),{prefix,settlement});
    for(const key of ['damageReduction','critChance','evasionChance']) assert.ok(result[key]>=0&&result[key]<=.9);
  }
  const rogue=townHeroEffects('thief',buildingEffects('thief',{level:5,pathA:4}),{prefix:PREFIXES[2],settlement:SETTLEMENTS[2]});
  assert.ok(Math.abs(rogue.evasionChance-.43)<1e-10);assert.equal(rogue.critChance,0);
  assert.equal(totalDamageReduction(.9,.4,.99),.9);
  assert.ok(Math.abs(totalDamageReduction(.2,.1,.99)-.307)<1e-10);
});

test('single-target interception has one 50% roll, never chains or includes dead/frozen/self knights',()=>{
  const ally={id:'ally'},a={id:'a',type:'knight',hp:100},b={id:'b',type:'knight',hp:100};
  let values=[.49999,.75];assert.equal(interceptingKnight([a,b],ally,()=>values.shift()),b);
  let calls=0;assert.equal(interceptingKnight([a,b],ally,()=>{calls++;return .5}),null);assert.equal(calls,1);
  assert.equal(interceptingKnight([a],a,()=>0),null);
  assert.equal(interceptingKnight([{...a,hp:0},{...b,frozenMs:1}],ally,()=>0),null);
  assert.equal(interceptingKnight([],ally,()=>{throw Error('unnecessary roll')}),null);
  values=[0,0];assert.equal(interceptingKnight([a,b],a,()=>values.shift()),b);
});
