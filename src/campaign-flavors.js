import { ENEMY_TYPES } from './enemy-data.js';
import { FLAVOR_ROSTERS } from './enemy-rosters.js';

// These plans are deliberately not announced to the player. Enemy identities
// and abilities stay consistent; the mix changes after floor five.
export const CAMPAIGN_PATTERNS = Object.freeze({
  orcs: ['goblinHost', 'orcVanguard'],
  undead: ['restlessLegion', 'boneConclave'],
  assassins: ['ambushParty', 'guildBulwark'],
  demons: ['cultistHost', 'infernalBattery'],
});
const PROFILES = {
  goblinHost: { size: 1.4, weights: [.7,.1,.15,.05], cap: [12,3,3,1] },
  orcVanguard: { size: .85, weights: [.15,.65,.15,.05], cap: [3,8,2,1] },
  restlessLegion: { size: 1.35, weights: [.75,.1,.05,.1], cap: [12,3,2,1], guarantee: 'special' },
  boneConclave: { size: 1, weights: [.4,.15,.4,.05], cap: [8,4,2,1], guarantee: 'ranged' },
  ambushParty: { size: 1.1, weights: [.3,.1,.35,.25], cap: [8,3,3,2], guarantee: 'special' },
  guildBulwark: { size: .85, weights: [.15,.65,.15,.05], cap: [4,8,2,1] },
  cultistHost: { size: 1.35, weights: [.7,.15,.1,.05], cap: [12,4,2,1] },
  infernalBattery: { size: .9, weights: [.15,.35,.4,.1], cap: [4,6,3,1], guarantee: 'ranged' },
};
const ROLES = ['common','heavy','ranged','special'];
export function createCampaignFlavor(faction, random = Math.random) {
  const pair = CAMPAIGN_PATTERNS[faction];
  if (!pair) throw Error(`Unknown campaign faction: ${faction}`);
  const first = random() < .5 ? 0 : 1;
  return { version: 1, faction, opening: pair[first], closing: pair[1-first] };
}
export function restoreCampaignFlavor(faction, campaignId) {
  let hash = 0;
  for (const c of String(campaignId)) hash = (Math.imul(hash,31) + c.charCodeAt(0)) >>> 0;
  return createCampaignFlavor(faction, () => hash / 2 ** 32);
}
export function campaignProfile(plan, floor) {
  return floor <= 5 ? plan.opening : plan.closing;
}

function pressure(type) {
  const unit = ENEMY_TYPES[type];
  // A bounded planning estimate, not an assertion of equal encounter win rates.
  if (type === 'necromancer') return ENEMY_TYPES.skeleton.damage / ENEMY_TYPES.skeleton.interval;
  return unit.damage / unit.interval * (1 + (unit.critChance ?? 0)) * (type === 'boneMage' ? 3.8 / 3 : 1);
}
export function campaignEncounter(faction, floor, plan, random = Math.random) {
  const profile = PROFILES[campaignProfile(plan,floor)];
  if (!profile || plan.faction !== faction) throw Error('Invalid campaign flavor');
  const roster = FLAVOR_ROSTERS[faction];
  const baseline = Math.min(2 + Math.ceil(floor * .58), 10);
  const total = Math.max(3, Math.min(12, Math.ceil(baseline * profile.size)));
  const counts = [0,0,0,0], types = [];
  function add(index) { counts[index]++; types.push(roster[ROLES[index]]); }
  if (floor >= 2 && profile.guarantee) add(ROLES.indexOf(profile.guarantee));
  while (types.length < total) {
    const weights = profile.weights.map((w,i) => counts[i] < profile.cap[i] && (floor >= 2 || i < 2) ? w : 0);
    let roll = random() * weights.reduce((sum,w) => sum+w,0);
    let index = weights.findIndex(w => { roll -= w; return roll < 0; });
    if (index < 0) index = weights.findLastIndex(w => w > 0);
    if (index < 0) break;
    add(index);
  }
  const reference = floor >= 2 ? [.48,.3,.22] : [.48,.52,0];
  const expected = metric => baseline * reference.reduce((sum,w,i) => sum + w * metric(roster[ROLES[i]]),0);
  const clamp = x => Math.max(.55,Math.min(1.3,x));
  // More bodies do not automatically mean much more HP and damage. Preserve
  // differences in targeting/turn count while keeping raw budgets comparable.
  const healthScale = clamp(expected(type => ENEMY_TYPES[type].hp) / types.reduce((sum,type) => sum+ENEMY_TYPES[type].hp,0));
  const damageScale = clamp(expected(pressure) / types.reduce((sum,type) => sum+pressure(type),0));
  return { types, healthScale, damageScale };
}
