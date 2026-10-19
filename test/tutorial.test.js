import test from 'node:test';
import assert from 'node:assert/strict';
import { createTutorial, tutorialAction as act, advanceTutorial, lessonDone, practiceHero } from '../src/tutorial-state.js';
import { HERO_TYPES, HERO_NAMES, heroPower } from '../src/hero-data.js';
import { buildingEffects } from '../src/town.js';
import { COMMAND_MAX, commandPower } from '../src/battle-commands.js';

function prepared() {
  const s = createTutorial();
  act(s,'roll'); act(s,'hire','knight'); act(s,'hire','ranger'); act(s,'next'); act(s,'train'); act(s,'next'); act(s,'fortify'); act(s,'next');
  return s;
}
test('tutorial gates lessons and keeps recruitment and spending idempotent', () => {
  const s = createTutorial();
  act(s,'next'); act(s,'visit',4); act(s,'hire','knight');
  assert.equal(s.step,0); assert.equal(s.heroes.length,0);
  act(s,'roll'); act(s,'hire','knight'); act(s,'hire','knight'); act(s,'hire','invalid'); act(s,'next');
  assert.equal(s.step,0); assert.equal(s.heroes.length,1);
  act(s,'hire','ranger'); assert.ok(lessonDone(s));
  act(s,'next'); act(s,'train'); act(s,'train');
  assert.equal(s.heroes[0].level,2); assert.equal(s.heroes[1].level,1); assert.equal(s.gold,9);
  act(s,'next'); act(s,'fortify'); act(s,'fortify');
  assert.equal(s.buildings.knight.level,2); assert.equal(s.gold,6);
  act(s,'visit',0); assert.equal(s.step,0); assert.equal(s.heroes.length,2);
});
test('practice stats use campaign definitions and isolate state between runs', () => {
  const s = prepared(), fresh = createTutorial();
  const knight = practiceHero('knight',2,s.buildings);
  assert.equal(knight.name,HERO_NAMES.knight[0]);
  assert.equal(knight.maxHp,heroPower(2) * HERO_TYPES.knight.hp);
  assert.equal(knight.damage,heroPower(2) * HERO_TYPES.knight.damage);
  assert.equal(knight.armor,buildingEffects('knight',s.buildings.knight).damageReduction);
  assert.equal(fresh.buildings.knight.level,1); assert.equal(fresh.gold,10); assert.equal(fresh.heroes.length,0);
});
test('guided battle pauses at decisions, applies orders/healing, rewards once and returns', () => {
  const s = prepared(); act(s,'fight'); act(s,'pause');
  advanceTutorial(s,60000); assert.equal(s.elapsed,0);
  act(s,'pause'); advanceTutorial(s,60000);
  assert.equal(s.phase,'realtime'); assert.equal(s.paused,true);
  assert.equal(s.enemyHits,1); assert.equal(s.lastHit.damage,60); assert.equal(s.party[0].hp,110);
  const stoppedAt = s.elapsed; advanceTutorial(s,60000); assert.equal(s.elapsed,stoppedAt);
  act(s,'hold'); assert.equal(s.phase,'realtime');
  act(s,'pause'); assert.equal(s.phase,'try-pause'); assert.equal(s.paused,false);
  act(s,'pause'); assert.equal(s.phase,'order'); assert.equal(s.paused,true); assert.equal(s.pausePracticed,true);
  const hp = s.party[0].hp, command = s.command;
  advanceTutorial(s,60000); assert.equal(s.party[0].hp,hp);
  act(s,'potion'); assert.equal(s.phase,'order');
  act(s,'hold'); assert.equal(s.phase,'potion'); assert.equal(s.command,command - 50);
  assert.equal(s.holdRemaining,commandPower('hold',1).durationMs);
  act(s,'hold'); assert.equal(s.command,command - 50);
  act(s,'potion'); act(s,'heal','ranger'); assert.equal(s.phase,'target');
  act(s,'heal','knight'); assert.equal(s.potions,0); assert.ok(s.party[0].hp > hp); assert.ok(s.party[0].hp <= s.party[0].maxHp);
  assert.equal(s.phase,'finish'); assert.equal(s.healed,34); act(s,'heal','knight'); assert.equal(s.potions,0);
  act(s,'pause'); const held = JSON.stringify(s); advanceTutorial(s,60000); assert.equal(JSON.stringify(s),held);
  act(s,'pause'); advanceTutorial(s,60000); assert.equal(s.phase,'won'); assert.equal(s.gold,7); assert.ok(s.command <= COMMAND_MAX);
  const reward = s.gold; advanceTutorial(s,60000); assert.equal(s.gold,reward);
  act(s,'next'); act(s,'next'); assert.equal(s.step,4);
  act(s,'return'); act(s,'return'); assert.ok(lessonDone(s)); act(s,'next'); assert.equal(s.step,5);
  assert.ok(s.party.every(h=>h.hp>0));
});

test('practice pauses again safely if the player waits after resuming', () => {
  const s = prepared(); act(s,'fight'); advanceTutorial(s,60000);
  assert.equal(s.phase,'realtime');
  act(s,'pause'); advanceTutorial(s,60000);
  assert.equal(s.phase,'order'); assert.equal(s.paused,true); assert.equal(s.pausePracticed,false);
  assert.ok(s.party.every(h=>h.hp>0));
  const snapshot = JSON.stringify(s); advanceTutorial(s,60000); assert.equal(JSON.stringify(s),snapshot);
});

function atChoice() {
  const s=prepared(); act(s,'fight'); advanceTutorial(s,60000); act(s,'pause'); act(s,'pause');
  act(s,'hold'); act(s,'potion'); act(s,'heal','knight'); advanceTutorial(s,60000); act(s,'next');
  return s;
}
test('safe return keeps all gold, while delving carries wounds and supplies into a rewarding second floor', () => {
  const safe=atChoice(); act(safe,'return'); assert.equal(safe.gold,7); assert.equal(safe.exitType,'safe');
  act(safe,'delve'); assert.equal(safe.floor,1); assert.ok(lessonDone(safe));
  const deeper=atChoice(), hp=deeper.party.map(h=>h.hp);
  act(deeper,'delve'); assert.equal(deeper.floor,2); assert.equal(deeper.gold,7); assert.equal(deeper.potions,0);
  assert.deepEqual(deeper.party.map(h=>h.hp),hp); assert.equal(lessonDone(deeper),false);
  act(deeper,'return'); assert.equal(deeper.returned,false);
  advanceTutorial(deeper,60000); assert.equal(deeper.phase,'won'); assert.equal(deeper.gold,8);
  assert.ok(deeper.party.every(h=>h.hp>0)); act(deeper,'delve'); assert.equal(deeper.floor,2);
  act(deeper,'return'); assert.equal(deeper.gold,8); assert.equal(deeper.exitType,'safe');
});
test('mid-fight escape freezes combat, cancellation keeps it paused, and confirmation charges only once', () => {
  const s=atChoice(); act(s,'flee'); assert.equal(s.fleeConfirmation,false);
  act(s,'delve'); act(s,'flee'); assert.equal(s.paused,true); assert.equal(s.fleeConfirmation,true);
  const before=JSON.stringify(s); advanceTutorial(s,60000); assert.equal(JSON.stringify(s),before);
  act(s,'flee-cancel'); assert.equal(s.fleeConfirmation,false); assert.equal(s.paused,true); assert.equal(s.gold,7);
  act(s,'flee-confirm'); assert.equal(s.gold,7); assert.equal(s.returned,false);
  act(s,'flee'); act(s,'flee-confirm'); assert.equal(s.escapeGoldLost,4); assert.equal(s.gold,3);
  assert.equal(s.exitType,'fled'); assert.ok(lessonDone(s));
  act(s,'flee-confirm'); act(s,'return'); advanceTutorial(s,60000); assert.equal(s.gold,3);
  act(s,'next'); assert.equal(s.step,5);
  for (const gold of [0,1,2,8]) {
    const run=atChoice(); run.gold=gold; act(run,'delve'); act(run,'flee'); act(run,'flee-confirm');
    assert.equal(run.escapeGoldLost,Math.ceil(gold/2)); assert.equal(run.gold,Math.floor(gold/2));
  }
});
