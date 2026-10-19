import test from 'node:test';
import assert from 'node:assert/strict';
import {classCounts,recordClassSelection,classSelectionBonus,boostedOfferLevel,classCrowdingMultiplier} from '../src/class-balance.js';

const types=['knight','thief','bard','cleric','barbarian','ranger','mage'];
const team=(...classes)=>classes.map(type=>({type}));
test('selection bonus has no opening-day bonus and includes all ties, even unused classes',()=>{
  assert.deepEqual(classSelectionBonus([],1,types).classes,[]);
  const history=recordClassSelection([],1,team('knight','knight','thief','mage'),types);
  const bonus=classSelectionBonus(history,2,types);
  assert.deepEqual(bonus.classes,['bard','cleric','barbarian','ranger']);
  assert.deepEqual(bonus.days,[1]);assert.equal(bonus.averages.knight,2);
  const allTied=recordClassSelection([],1,team(...types),types);
  assert.deepEqual(classSelectionBonus(allTied,2,types).classes,types);
});
test('only previous two calendar days count, with a daily class-count average',()=>{
  let history=recordClassSelection([],1,team('mage','mage','mage','mage'),types);
  history=recordClassSelection(history,2,team('knight','thief','bard','cleric'),types);
  history=recordClassSelection(history,3,team('barbarian','ranger','mage','knight'),types);
  const bonus=classSelectionBonus(history,4,types);
  assert.deepEqual(bonus.days,[2,3]);
  assert.deepEqual(bonus.classes,['thief','bard','cleric','barbarian','ranger','mage']);
  assert.equal(bonus.averages.knight,1);assert.equal(bonus.averages.mage,.5);
  assert.deepEqual(classSelectionBonus(history,6,types).classes,[]);
  assert.deepEqual(classSelectionBonus(history,3,types).days,[1,2]); // Ignore today's departure.
});
test('departure snapshots cannot be changed by deaths or duplicated by repeated writes',()=>{
  const heroes=team('knight','knight','mage');
  const history=recordClassSelection([],1,heroes,types);heroes.pop();
  assert.equal(history[0].counts.mage,1);
  const replaced=recordClassSelection(history,1,team('thief'),types);
  assert.equal(replaced.length,1);assert.equal(replaced[0].counts.knight,0);assert.equal(replaced[0].counts.thief,1);
  assert.deepEqual(classCounts(team('unknown','mage'),types),{knight:0,thief:0,bard:0,cleric:0,barbarian:0,ranger:0,mage:1});
});
test('underused offers gain exactly one level after Tavern rolls, capped at five',()=>{
  const bonus={classes:['mage','bard']};
  for(const level of [1,2,3,4,5]){
    assert.equal(boostedOfferLevel(level,'mage',bonus),Math.min(5,level+1));
    assert.equal(boostedOfferLevel(level,'knight',bonus),level);
  }
});
test('crowding is one flat 20% penalty for three or more, never for just two',()=>{
  for(const count of [0,1,2]) assert.equal(classCrowdingMultiplier(count),1);
  for(const count of [3,4,5,8]) assert.equal(classCrowdingMultiplier(count),.8);
});

test('later campaigns allow underused contracts at six but never seven or eight', () => {
  assert.equal(boostedOfferLevel(5, 'mage', {classes:['mage']}, 6), 6);
  assert.equal(boostedOfferLevel(5, 'mage', {classes:['mage']}, 8), 6);
  assert.equal(boostedOfferLevel(5, 'knight', {classes:['mage']}, 8), 5);
});
