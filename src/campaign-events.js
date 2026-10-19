import { ENCOUNTERS } from './event-catalogue.js';
export const WINDFALLS = [
  { id: 'W01', pool: 'windfall', title: 'The forgotten pay chest', description: 'A broken pay chest lies behind a fallen banner. There is nobody here to claim it. Your heroes look from the scattered coins to you.', guaranteed: true,
    choices: [
      { label: 'Distribute it evenly', effect: 'Shared gold', text: 'You put a share into every waiting hand. For a little longer, the company remembers what it is fighting for.' },
      { label: 'Keep the whole cache', effect: 'Kept gold', text: 'The whole chest goes into the town treasury. The company shoulders its packs and moves on.' },
    ] },
  { id: 'W02', pool: 'windfall', title: 'The apothecary’s satchel', description: 'A dust-covered satchel holds two sealed healing potions. The glass is unbroken and the contents still clear. You could use them below, or sell them to fund the town.', guaranteed: true,
    choices: [
      { label: 'Keep the healing potions', effect: 'Potions', text: 'You divide the intact bottles between the company’s packs. Two more chances to bring someone home.' },
      { label: 'Sell the sealed potions', effect: 'Sold potions', text: 'A passing provisioner buys the sealed bottles. The gold will serve the town above.' },
    ] },
];
export const EVENTS = [...ENCOUNTERS, ...WINDFALLS];
export const EVENT_BY_ID = Object.fromEntries(EVENTS.map(e => [e.id, e]));
export function seededRandom(seed) {
  let value = seed >>> 0;
  return () => { value += 0x6D2B79F5; let t = Math.imul(value ^ value >>> 15, 1 | value); t ^= t + Math.imul(t ^ t >>> 7, 61 | t); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
function shuffle(values, random) {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [result[i], result[j]] = [result[j], result[i]]; }
  return result;
}
export function createEventCampaign(flavor, seed) {
  const random = seededRandom(seed);
  const selected = shuffle([
    ...shuffle(EVENTS.filter(e => e.pool === 'general'), random).slice(0, 5),
    ...shuffle(EVENTS.filter(e => e.pool === flavor), random).slice(0, 3), ...WINDFALLS,
  ], random);
  let at = 2 + Math.floor(random() * 4);
  return { seed, clears: 0, next: 0, pending: null, dayPower: 1, nextCommand: null, nextAttack: 1, activeAttack: 1, nextDayRerolls: 0,
    plan: selected.map((event, i) => { if (i) at += 2 + Math.floor(random() * 2); return { id: event.id, at, outcomeRoll: random(), rewardRoll: random(), targetRoll: random() }; }),
  };
}
export function eventChance(choice, tone) {
  return choice.kind === 'selfish' && !['no-progress', 'costly-setback'].includes(tone) ? .34 : .66;
}
export function resolveEvent(entry, choiceIndex, tone) {
  const event = EVENT_BY_ID[entry.id];
  const choice = event?.choices[choiceIndex];
  if (!choice) return null;
  const favourable = event.guaranteed || entry.outcomeRoll < eventChance(choice, tone);
  return { choice: choice.label, favourable, ...(event.guaranteed ? { text: choice.text, effect: choice.effect } : favourable ? choice.good : choice.bad) };
}
const goldUnit = day => 1 + Math.floor((day - 1) / 4);
export function effectPreview(effect, day, potionRatio = .2) {
  const g = goldUnit(day);
  return ({
    'Small cache': `Gain ${2 * g} gold`, 'Large cache': `Gain ${4 * g} gold`, 'Lost purse': `Lose up to ${g} gold; if empty, start next battle at 35 Command`,
    Restore: `Heal the most wounded hero by 25% max HP; if all healthy, gain ${2 * g} gold`,
    'Shared care': `Heal everyone by 10% max HP; if all healthy, gain ${2 * g} gold`,
    Feast: `Heal everyone by 20% max HP; if all healthy, gain ${4 * g} gold`,
    Wound: 'One frontliner loses 15% max HP, nonlethal', 'Deep wound': 'One frontliner loses 25% max HP, nonlethal', 'Party strain': 'Everyone loses 10% max HP, nonlethal',
    Resolve: 'Start next battle with 65 Command', Fervour: 'Start next battle with 80 Command', Doubt: 'Start next battle with 35 Command', Dismay: 'Start next battle with 0 Command',
    Edge: '+5% attack damage next battle', 'Ruthless edge': '+10% attack damage next battle', Hesitation: '−5% attack damage next battle', Discord: '−10% attack damage next battle',
    'One contract favour': day === 10 ? `Gain ${2 * g} gold (final-day payment)` : 'One extra free reroll tomorrow',
    'Two contract favours': day === 10 ? `Gain ${4 * g} gold (final-day payment)` : 'Two extra free rerolls tomorrow',
    'Shared gold': 'Gain 2–4 gold; everyone gains +5% damage and healing for the rest of today',
    'Kept gold': 'Gain 10–14 gold', Potions: `Restore 2 potions for this expedition (${Math.round(potionRatio * 100)}% max HP each)`, 'Sold potions': 'Gain 6–9 gold',
  })[effect];
}
export function applyEventEffect(state, effect, entry) {
  const e = state.events, g = goldUnit(state.day);
  const party = state.party.filter(u => u.hp > 0);
  const grantGold = (amount, note = '') => { state.gold += amount; return `Gained ${amount} gold${note}.`; };
  const randomAmount = (low, high) => low + Math.floor(entry.rewardRoll * (high - low + 1));
  if (effect === 'Small cache' || effect === 'Large cache') return grantGold((effect === 'Small cache' ? 2 : 4) * g);
  if (effect === 'Shared gold') { e.dayPower *= 1.05; return `${grantGold(randomAmount(2, 4))} Everyone gains +5% damage and healing until the day ends.`; }
  if (effect === 'Kept gold') return grantGold(randomAmount(10, 14));
  if (effect === 'Sold potions') return grantGold(randomAmount(6, 9));
  if (effect === 'Potions') { state.potionsRemaining += 2; return `Restored 2 healing potions; ${state.potionsRemaining} remain for this expedition.`; }
  if (effect === 'Lost purse') { const lost = Math.min(g, state.gold); if (lost) { state.gold -= lost; return `Lost ${lost} gold.`; } e.nextCommand = 35; return 'There was no gold to take. The dispute leaves you starting the next battle with 35 Command.'; }
  if (['Restore', 'Shared care', 'Feast'].includes(effect)) {
    const wounded = party.filter(u => u.hp < u.maxHp);
    if (!wounded.length) return grantGold((effect === 'Feast' ? 4 : 2) * g, ' instead; everyone was already healthy');
    const worst = Math.max(...wounded.map(u => 1 - u.hp / u.maxHp));
    const tied = wounded.filter(u => Math.abs(1 - u.hp / u.maxHp - worst) < 1e-9);
    const targets = effect === 'Restore' ? [tied[Math.floor(entry.targetRoll * tied.length)]] : wounded;
    const ratio = effect === 'Restore' ? .25 : effect === 'Feast' ? .2 : .1;
    return targets.map(u => { const restored = Math.min(u.maxHp - u.hp, Math.max(1, Math.round(u.maxHp * ratio))); u.hp += restored; return `${u.label} recovered ${restored} HP`; }).join('; ') + '.';
  }
  if (['Wound', 'Deep wound', 'Party strain'].includes(effect)) {
    const front = party.filter(u => u.row === 'front'); const pool = front.length ? front : party;
    const targets = effect === 'Party strain' ? party : pool.length ? [pool[Math.floor(entry.targetRoll * pool.length)]] : [];
    const ratio = effect === 'Wound' ? .15 : effect === 'Deep wound' ? .25 : .1;
    return targets.map(u => { const lost = Math.min(u.hp - 1, Math.ceil(u.maxHp * ratio)); u.hp -= lost; return `${u.label} lost ${lost} HP (nonlethal)`; }).join('; ') + '.';
  }
  if (['Resolve', 'Fervour', 'Doubt', 'Dismay'].includes(effect)) { e.nextCommand = { Resolve: 65, Fervour: 80, Doubt: 35, Dismay: 0 }[effect]; return `Next battle begins with ${e.nextCommand} Command. This survives retreat.`; }
  if (['Edge', 'Ruthless edge', 'Hesitation', 'Discord'].includes(effect)) { e.nextAttack = { Edge: 1.05, 'Ruthless edge': 1.1, Hesitation: .95, Discord: .9 }[effect]; return `${effectPreview(effect, state.day)}. This survives retreat.`; }
  if (effect === 'One contract favour' || effect === 'Two contract favours') { const count = effect === 'One contract favour' ? 1 : 2; if (state.day === 10) return grantGold(count * 2 * g, ' as a final-day payment'); e.nextDayRerolls += count; return `Earned ${count} extra free reroll${count === 1 ? '' : 's'} for tomorrow.`; }
  throw new Error(`Unknown event effect: ${effect}`);
}
