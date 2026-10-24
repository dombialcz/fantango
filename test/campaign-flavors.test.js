import test from 'node:test';
import assert from 'node:assert/strict';
import { createCampaignFlavor, restoreCampaignFlavor, campaignProfile, campaignEncounter, CAMPAIGN_PATTERNS } from '../src/campaign-flavors.js';
import { FLAVOR_ROSTERS } from '../src/enemy-rosters.js';
import { ENEMY_TYPES } from '../src/enemy-data.js';
import { COMBAT_INTERVAL_SCALE } from '../src/combat-rules.js';
import { createRng } from '../src/random.js';

test('each faction has two persistent opposite orders with a floor-six change', () => {
 for (const faction of Object.keys(CAMPAIGN_PATTERNS)) {
  const a=createCampaignFlavor(faction,()=>0),b=createCampaignFlavor(faction,()=>.99);
  assert.equal(a.opening,b.closing);assert.equal(a.closing,b.opening);
  assert.equal(campaignProfile(a,1),campaignProfile(a,5));
  assert.notEqual(campaignProfile(a,5),campaignProfile(a,6));
  assert.equal(campaignProfile(a,6),campaignProfile(a,9));
  assert.deepEqual(restoreCampaignFlavor(faction,'saved-campaign'),restoreCampaignFlavor(faction,'saved-campaign'));
 }
});
test('seeded formations stay bounded, faction-specific and repeatable', () => {
 for (const faction of Object.keys(CAMPAIGN_PATTERNS)) for(const order of [0,.99]) for(let floor=1;floor<=9;floor++) for(let seed=0;seed<30;seed++) {
  const plan=createCampaignFlavor(faction,()=>order);
  const a=campaignEncounter(faction,floor,plan,createRng(String(seed))),b=campaignEncounter(faction,floor,plan,createRng(String(seed)));
  assert.deepEqual(a,b);assert.ok(a.types.length>=3&&a.types.length<=12);
  assert.ok(a.types.every(type=>Object.values(FLAVOR_ROSTERS[faction]).includes(type)));
  assert.ok(a.healthScale>=.55&&a.healthScale<=1.3);
  assert.ok(a.damageScale>=.55&&a.damageScale<=1.3);
  if(faction==='undead')assert.ok(a.types.filter(type=>type==='necromancer').length<=1);
 }
});
test('Orc swarm and vanguard produce materially different bodies and compositions',()=>{
 const sample=order=>{
  const plan=createCampaignFlavor('orcs',()=>order);let total=0,goblins=0,orcs=0;
  for(let i=0;i<500;i++) {const e=campaignEncounter('orcs',4,plan,createRng(String(i)));total+=e.types.length;goblins+=e.types.filter(t=>t==='goblin').length;orcs+=e.types.filter(t=>t==='orc').length;}
  return {total,goblins,orcs};
 };
 const swarm=sample(0),vanguard=sample(.99);
 assert.ok(swarm.total>vanguard.total*1.3);assert.ok(swarm.goblins>vanguard.goblins*2);assert.ok(vanguard.orcs>swarm.orcs*2);
});
test('undead openings reliably introduce necromancers or bone mages by floor two',()=>{
 for(let seed=0;seed<100;seed++) {
  assert.ok(campaignEncounter('undead',2,createCampaignFlavor('undead',()=>0),createRng(String(seed))).types.includes('necromancer'));
  assert.ok(campaignEncounter('undead',2,createCampaignFlavor('undead',()=>.99),createRng(String(seed))).types.includes('boneMage'));
 }
});


test('Assassin slowdown survives encounter normalization without buffing its allies', () => {
 assert.equal(ENEMY_TYPES.assassin.interval * COMBAT_INTERVAL_SCALE, 1650);
 const oldPressure = type => {
  const unit = ENEMY_TYPES[type];
  return unit.damage / (type === 'assassin' ? 780 : unit.interval) * (1 + (unit.critChance ?? 0));
 };
 const roster = FLAVOR_ROSTERS.assassins;
 let checked = 0;
 for (const order of [0,.99]) for (let floor=2;floor<=9;floor++) for(let seed=0;seed<100;seed++) {
  const encounter = campaignEncounter('assassins',floor,createCampaignFlavor('assassins',()=>order),createRng(String(seed)));
  if (!encounter.types.includes('assassin')) continue;
  const baseline = Math.min(2 + Math.ceil(floor * .58),10);
  const reference = baseline * (.48 * oldPressure(roster.common) + .3 * oldPressure(roster.heavy) + .22 * oldPressure(roster.ranged));
  const oldScale = Math.max(.55,Math.min(1.3,reference / encounter.types.reduce((sum,type)=>sum+oldPressure(type),0)));
  assert.ok(encounter.damageScale <= oldScale + 1e-12, 'slower Assassins must not raise formation damage');
  const dpsRatio = encounter.damageScale / oldScale * 780 / ENEMY_TYPES.assassin.interval;
  assert.ok(dpsRatio <= .71, 'at least 29% less sustained Assassin damage before rounding');
  checked++;
 }
 assert.ok(checked > 500);
 // The floor-ten boss has separate pacing and is unaffected.
 assert.equal(ENEMY_TYPES.shadowAssassin.interval,1500);
});
