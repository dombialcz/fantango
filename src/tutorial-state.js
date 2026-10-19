import { HERO_TYPES, HERO_NAMES, heroPower } from './hero-data.js';
import { ENEMY_TYPES } from './enemy-data.js';
import { buildingEffects, createTownBuildings, buildingUpgradeCost, alchemistSupplies } from './town.js';
import { heroTrainingCost, heroLevelSpeed } from './campaign-journey.js';
import { BATTLE_COMMANDS, COMMAND_START, COMMAND_MAX, COMMAND_GAIN_PER_DAMAGE, commandPower } from './battle-commands.js';
import { COMBAT_DAMAGE_SCALE, COMBAT_INTERVAL_SCALE, totalDamageReduction } from './combat-rules.js';
import { enemyHealthMultiplier, floorGoldReward } from './dungeon-progression.js';

// A stronger opening strike makes injury and healing visible in this teaching encounter.
export const PRACTICE_OPENING_STRIKE_MULTIPLIER = 20;

export const LESSONS = ['Recruit', 'Train', 'Town', 'Battle', 'Choose'];
export function createTutorial() {
  return { step: 0, unlocked: 0, gold: 10, rolled: false, heroes: [], trained: false, fortified: false, returned: false, floor: 1, delved: false, fleeConfirmation: false, escapeGoldLost: 0, exitType: null,
    buildings: createTownBuildings(), phase: 'ready', party: [], enemies: [], command: COMMAND_START,
    potions: alchemistSupplies(1).count, elapsed: 0, holdRemaining: 0, enemyHits: 0, paused: false, pausePracticed: false, lastHit: null, log: [], healed: 0 };
}
export function practiceHero(type, level, buildings) {
  const definition = HERO_TYPES[type];
  const effects = buildingEffects(type, buildings[type]);
  const power = heroPower(level);
  const maxHp = power * definition.hp * effects.healthMultiplier;
  return { type, name: HERO_NAMES[type][0], level, power, maxHp, hp: maxHp,
    damage: power * definition.damage * effects.damageMultiplier, armor: effects.damageReduction,
    interval: definition.interval * COMBAT_INTERVAL_SCALE / (effects.speedMultiplier * (['mage', 'ranger'].includes(type) ? 1 : heroLevelSpeed(level))) };
}
export function lessonDone(state, step = state.step) {
  return [state.heroes.length === 2, state.trained, state.fortified, state.phase === 'won' || state.floor > 1, state.returned, true][step];
}
function addLog(state, text) { state.log.unshift(text); state.log = state.log.slice(0, 3); }
function startBattle(state) {
  state.party = state.heroes.map(hero => ({ ...practiceHero(hero.type, hero.level, state.buildings), timer: 0 }));
  state.enemies = ['skeleton', 'zombie'].map(type => ({ type, name: ENEMY_TYPES[type].label,
    maxHp: ENEMY_TYPES[type].hp * enemyHealthMultiplier(1), hp: ENEMY_TYPES[type].hp * enemyHealthMultiplier(1),
    damage: ENEMY_TYPES[type].damage, interval: ENEMY_TYPES[type].interval * COMBAT_INTERVAL_SCALE, timer: 0 }));
  Object.assign(state, { phase: 'watch', command: COMMAND_START, elapsed: 0, enemyHits: 0, holdRemaining: 0, paused: false, pausePracticed: false, lastHit: null, log: [] });
  addLog(state, 'Your heroes attack automatically. Watch the front line.');
}
export function tutorialAction(state, action, target) {
  if (action === 'visit' && Number.isInteger(Number(target)) && Number(target) >= 0 && Number(target) <= state.unlocked) state.step = Number(target);
  if (action === 'next' && lessonDone(state) && state.step < 5) { state.step++; state.unlocked = Math.max(state.unlocked, state.step); }
  if (state.step === 0) {
    if (action === 'roll') state.rolled = true;
    if (action === 'hire' && state.rolled && ['knight', 'ranger'].includes(target) && !state.heroes.some(h => h.type === target)) state.heroes.push({ type: target, level: 1 });
  }
  if (state.step === 1 && action === 'train' && !state.trained) {
    const hero = state.heroes.find(h => h.type === 'knight');
    if (hero && state.gold >= heroTrainingCost(hero.level)) { state.gold -= heroTrainingCost(hero.level); hero.level++; state.trained = true; }
  }
  if (state.step === 2 && action === 'fortify' && !state.fortified) {
    const cost = buildingUpgradeCost(state.buildings.knight.level);
    if (state.gold >= cost) { state.gold -= cost; state.buildings.knight.level++; state.fortified = true; }
  }
  if (state.step === 3 || (state.step === 4 && state.delved && !state.returned)) {
    if (action === 'fight' && ['ready', 'lost'].includes(state.phase)) startBattle(state);
    if (action === 'pause') {
      if (state.phase === 'realtime') {
        state.phase = 'try-pause'; state.paused = false;
        addLog(state, 'Combat resumed. You can pause again whenever you need.');
      } else if (state.phase === 'try-pause') {
        state.phase = 'order'; state.paused = true; state.pausePracticed = true;
        addLog(state, 'You paused the fight. Orders and potions still work while paused.');
      } else if (['watch', 'finish'].includes(state.phase)) state.paused = !state.paused;
    }
    if (action === 'hold' && state.phase === 'order' && state.command >= BATTLE_COMMANDS.hold.cost) {
      state.command -= BATTLE_COMMANDS.hold.cost;
      state.holdRemaining = commandPower('hold', 1).durationMs;
      state.phase = 'potion';
      addLog(state, 'Hold the Line protects the front row and boosts its damage for six seconds.');
    }
    if (action === 'potion' && state.phase === 'potion' && state.potions > 0) state.phase = 'target';
    if (action === 'heal' && state.phase === 'target' && target === 'knight' && state.potions > 0) {
      const hero = state.party.find(h => h.type === target);
      const amount = Math.min(hero.maxHp - hero.hp, Math.max(1, Math.round(hero.maxHp * alchemistSupplies(1).healRatio)));
      hero.hp += amount; state.healed = amount; state.potions--; state.phase = 'finish'; state.paused = false;
      addLog(state, `A potion restores ${amount} health to ${hero.name}. The fight resumes.`);
    }
  }
  if (state.step === 4 && !state.returned) {
    if (action === 'return' && state.phase === 'won') { state.returned = true; state.exitType = 'safe'; }
    if (action === 'delve' && state.phase === 'won' && !state.delved) {
      state.delved = true; state.floor = 2; state.phase = 'finish'; state.paused = false;
      state.command = COMMAND_START; state.holdRemaining = 0; state.lastHit = null;
      for (const hero of state.party) hero.timer = 0;
      const scale = 1 + Math.log2(state.floor) * .45;
      state.enemies = ['skeleton','zombie'].map(type => ({type, name:ENEMY_TYPES[type].label,
        maxHp:ENEMY_TYPES[type].hp * scale * enemyHealthMultiplier(state.floor),
        hp:ENEMY_TYPES[type].hp * scale * enemyHealthMultiplier(state.floor),
        damage:ENEMY_TYPES[type].damage * scale, interval:ENEMY_TYPES[type].interval * COMBAT_INTERVAL_SCALE, timer:0}));
      addLog(state, 'You enter floor 2. Wounds and remaining supplies carry into the next fight.');
    }
    if (action === 'flee' && state.phase === 'finish') { state.paused = true; state.fleeConfirmation = true; }
    if (action === 'flee-cancel' && state.fleeConfirmation) state.fleeConfirmation = false;
    if (action === 'flee-confirm' && state.fleeConfirmation) {
      state.escapeGoldLost = Math.ceil(state.gold / 2); state.gold -= state.escapeGoldLost;
      state.fleeConfirmation = false; state.returned = true; state.exitType = 'fled'; state.phase = 'escaped';
      addLog(state, `The company escapes. ${state.escapeGoldLost} gold paid; ${state.gold} gold kept.`);
    }
  }
  return state;
}
export function advanceTutorial(state, ms) {
  if (![3,4].includes(state.step) || state.returned || state.paused || !['watch', 'try-pause', 'finish'].includes(state.phase) || !Number.isFinite(ms)) return;
  let remaining = Math.min(60000, Math.max(0, ms));
  while (remaining > 0 && !state.paused && ['watch', 'try-pause', 'finish'].includes(state.phase)) {
    const delta = Math.min(50, remaining); remaining -= delta; state.elapsed += delta;
    state.holdRemaining = Math.max(0, state.holdRemaining - delta);
    for (const hero of state.party.filter(h => h.hp > 0)) {
      hero.timer += delta;
      if (hero.timer < hero.interval) continue;
      hero.timer -= hero.interval;
      const target = state.enemies.find(e => e.hp > 0);
      if (!target) break;
      const buff = hero.type === 'knight' && state.holdRemaining > 0 ? 1 + commandPower('hold', 1).damageBonus : 1;
      const damage = Math.min(target.hp, Math.max(1, Math.round(hero.damage * buff * COMBAT_DAMAGE_SCALE)));
      target.hp = Math.max(0, target.hp - damage);
      state.command = Math.min(COMMAND_MAX, state.command + damage * COMMAND_GAIN_PER_DAMAGE);
      addLog(state, `${hero.name} hits ${target.name} for ${Math.round(damage)} damage.`);
    }
    if (state.enemies.every(e => e.hp <= 0)) {
      state.phase = 'won'; state.gold += floorGoldReward(1);
      addLog(state, `Floor cleared. Your company earns ${floorGoldReward(1)} gold.`); break;
    }
    for (const enemy of state.enemies.filter(e => e.hp > 0)) {
      enemy.timer += delta;
      if (enemy.timer < enemy.interval) continue;
      enemy.timer -= enemy.interval;
      const target = state.party.find(h => h.hp > 0);
      if (!target) break;
      const armor = totalDamageReduction(target.armor, state.holdRemaining > 0 ? commandPower('hold', 1).armorBonus : 0);
      const openingStrike = state.enemyHits === 0;
      const rawDamage = enemy.damage * (openingStrike ? PRACTICE_OPENING_STRIKE_MULTIPLIER : 1);
      const damage = Math.min(target.hp, Math.max(1, Math.round(rawDamage * (1 - armor) * COMBAT_DAMAGE_SCALE)));
      target.hp = Math.max(0, target.hp - damage); state.enemyHits++;
      state.lastHit = { target: target.type, source: enemy.name, damage };
      state.command = Math.min(COMMAND_MAX, state.command + damage * COMMAND_GAIN_PER_DAMAGE);
      addLog(state, `${enemy.name}${openingStrike ? '’s heavy practice strike hits' : ' hits'} ${target.name} for ${Math.round(damage)} damage.`);
      // Stop at the attack itself: no other timer or attack advances past this teaching moment.
      if (state.phase === 'watch') {
        state.phase = 'realtime'; state.paused = true;
        addLog(state, 'Practice paused after the hit. Combat is real time; Pause and Resume let you set the pace.');
        break;
      }
      if (state.phase === 'try-pause') {
        state.phase = 'order'; state.paused = true;
        addLog(state, 'Practice paused again to explain orders. You can also pause at any moment yourself.');
        break;
      }
    }
    if (state.party.every(h => h.hp <= 0)) { state.phase = 'lost'; break; }
  }
}
