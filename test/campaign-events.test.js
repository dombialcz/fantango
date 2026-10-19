import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { EVENTS, EVENT_BY_ID, createEventCampaign, resolveEvent, applyEventEffect, effectPreview, eventChance } from '../src/campaign-events.js';
import { chronicleText, recordChronicle } from '../src/campaign-chronicle.js';
const entry = { rewardRoll: .5, targetRoll: .5 };
function campaign() {
 return { day: 1, gold: 10, events: createEventCampaign('undead', 1), potionsRemaining: 0, party: [
  { label: 'Knight', row: 'front', hp: 30, maxHp: 100 }, { label: 'Mage', row: 'back', hp: 20, maxHp: 50 }, { label: 'Dead', row: 'front', hp: 0, maxHp: 100 },
 ] };
}
test('plans contain eight risky encounters and two windfalls, with distinct pre-generated rolls and spaced cumulative clears', () => {
 for (const flavor of ['undead', 'demons', 'assassins', 'orcs']) for (let seed = 0; seed < 100; seed++) {
  const plan = createEventCampaign(flavor, seed).plan;
  assert.deepEqual(plan, createEventCampaign(flavor, seed).plan);
  assert.equal(new Set(plan.map(e => e.id)).size, 10);
  assert.equal(plan.filter(e => EVENT_BY_ID[e.id].pool === flavor).length, 3);
  assert.equal(plan.filter(e => EVENT_BY_ID[e.id].pool === 'general').length, 5);
  assert.equal(plan.filter(e => EVENT_BY_ID[e.id].guaranteed).length, 2);
  assert.ok(plan[0].at >= 2 && plan[0].at <= 5);
  plan.forEach((e, i) => { if (i) assert.ok([2, 3].includes(e.at - plan[i - 1].at)); for (const key of ['outcomeRoll', 'rewardRoll', 'targetRoll']) assert.ok(e[key] >= 0 && e[key] < 1); });
 }
});
test('all 42 events have two complete choices, effect previews and distinct tiny SVGs', () => {
 assert.equal(EVENTS.length, 42);
 const art = new Set();
 for (const e of EVENTS) {
  art.add(readFileSync(new URL(`../assets/events/${e.id}.svg`, import.meta.url), 'utf8'));
  assert.equal(e.choices.length, 2);
  for (const c of e.choices) for (const effect of e.guaranteed ? [c.effect] : [c.good.effect, c.bad.effect]) {
   assert.ok(effectPreview(effect, 1)); assert.ok(effectPreview(effect, 10));
   const s = campaign(); assert.ok(applyEventEffect(s, effect, entry));
   assert.ok(s.gold >= 0); assert.equal(s.party[2].hp, 0); assert.ok(s.party.slice(0, 2).every(h => h.hp >= 1 && h.hp <= h.maxHp));
  }
 }
 assert.equal(art.size, 42);
});
test('outlook changes only selfish uncertain choices; windfalls always succeed', () => {
 assert.equal(eventChance({ kind: 'compassionate' }, 'opening'), .66);
 assert.equal(eventChance({ kind: 'selfish' }, 'progress'), .34);
 assert.equal(eventChance({ kind: 'selfish' }, 'clean-retreat'), .34);
 assert.equal(eventChance({ kind: 'selfish' }, 'costly-setback'), .66);
 assert.equal(resolveEvent({ id: 'G01', outcomeRoll: .5 }, 1, 'progress').favourable, false);
 assert.equal(resolveEvent({ id: 'G01', outcomeRoll: .5 }, 1, 'no-progress').favourable, true);
 assert.equal(resolveEvent({ id: 'W01', outcomeRoll: .999 }, 1, 'progress').favourable, true);
});
test('health effects are nonlethal, select living frontliners, and convert unusable healing to gold', () => {
 const s = campaign(); s.party[0].hp = 1;
 applyEventEffect(s, 'Deep wound', entry); assert.equal(s.party[0].hp, 1); assert.equal(s.party[1].hp, 20);
 s.party[0].hp = 0; applyEventEffect(s, 'Wound', entry); assert.equal(s.party[1].hp, 12);
 for (const u of s.party) if (u.hp > 0) u.hp = u.maxHp;
 applyEventEffect(s, 'Feast', entry); assert.equal(s.gold, 14);
});
test('potions and gold windfalls have exact ranges; Command zero and final-day favour conversions are preserved', () => {
 const s = campaign();
 applyEventEffect(s, 'Shared gold', { ...entry, rewardRoll: 0 }); assert.equal(s.gold, 12); assert.equal(s.events.dayPower, 1.05);
 applyEventEffect(s, 'Kept gold', { ...entry, rewardRoll: .999 }); assert.equal(s.gold, 26);
 applyEventEffect(s, 'Potions', entry); assert.equal(s.potionsRemaining, 2);
 applyEventEffect(s, 'Dismay', entry); assert.equal(s.events.nextCommand, 0);
 applyEventEffect(s, 'Two contract favours', entry); assert.equal(s.events.nextDayRerolls, 2);
 s.day = 10; applyEventEffect(s, 'Two contract favours', entry); assert.equal(s.gold, 38); assert.equal(s.events.nextDayRerolls, 2);
});
test('chronicle export retains names, days, event choices and their consequences', () => {
 const s = { day: 4, town: { name: 'Grand Haven' }, flavorKey: 'undead', chronicle: [] };
 recordChronicle(s, 'upgrade', 'Mage Guild upgraded to level 4.');
 recordChronicle(s, 'event', 'We opened the cage. Gained 2 gold.', 3);
 assert.match(chronicleText(s), /Day 4\nMage Guild upgraded to level 4.\nFloor 3 · We opened the cage. Gained 2 gold./);
});
