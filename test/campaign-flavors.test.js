import test from 'node:test';
import assert from 'node:assert/strict';
import { createCampaignFlavor, restoreCampaignFlavor, campaignProfile, campaignEncounter, CAMPAIGN_PATTERNS } from '../src/campaign-flavors.js';
import { FLAVOR_ROSTERS } from '../src/enemy-rosters.js';
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
