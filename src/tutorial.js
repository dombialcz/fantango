import { HERO_TYPES, HERO_NAMES } from './hero-data.js';
import { ENEMY_TYPES } from './enemy-data.js';
import { ENEMY_PORTRAITS } from './enemy-art.js';
import { BATTLE_BACKDROPS } from './battle-backdrop.js';
import { BUILDING_DEFINITIONS, buildingEffects, buildingUpgradeCost, createTownBuildings, alchemistSupplies } from './town.js';
import { BATTLE_COMMANDS, COMMAND_MAX, commandPower } from './battle-commands.js';
import { heroTrainingCost } from './campaign-journey.js';
import { BOSS_FLOOR, enemyHealthMultiplier, floorGoldReward } from './dungeon-progression.js';
import { createTutorial, LESSONS, practiceHero, lessonDone, tutorialAction, advanceTutorial } from './tutorial-state.js';

const root = document.querySelector('#tutorial-root');
let state = createTutorial();
const number = value => Math.round(value);
const pct = value => `${number(value * 100)}%`;
const button = (action, label, options = '') => `<button type="button" data-action="${action}" ${options}>${label}</button>`;
const coin = value => `<span class="gold"><img src="assets/coin-token.png" alt="" />${value} <span>gold</span></span>`;
const headings = ['Every company needs a front line.', 'Give your defender an edge.', 'A stronger town. A stronger company.', 'Let them fight. Know when to help.', 'How far will you go?'];
const introductions = [
  'Start with two heroes whose strengths complement each other.',
  'Training improves one hero. Watch Aveline’s stats change.',
  'District upgrades benefit every hero of that class.',
  'Heroes attack on their own. You decide when to use orders and supplies.',
  'Each cleared floor brings a choice: continue deeper, or end today’s expedition.',
];
function heroCard(type) {
  const def = HERO_TYPES[type], hired = state.heroes.some(h => h.type === type);
  const stats = practiceHero(type, 1, state.buildings);
  return `<article class="recruit-card ${hired ? 'is-hired' : ''}"><div class="portrait-area"><span class="card-level">LEVEL 1</span><img src="${def.image}" alt="${def.label}" /></div><div class="card-copy"><span class="eyebrow">${def.row === 'front' ? 'FRONT ROW · DEFENDER' : 'BACK ROW · ATTACKER'}</span><h3>${HERO_NAMES[type][0]}</h3><p>${type === 'knight' ? `Heavy armor absorbs ${pct(buildingEffects('knight', state.buildings.knight).damageReduction)} of incoming damage.` : 'Her arrows reach the enemy back row first.'}</p><div class="mini-stats"><span><strong>${number(stats.maxHp)}</strong> health</span><span><strong>${number(stats.damage)}</strong> damage</span></div>${button('hire', hired ? '✓ Recruited' : `Recruit ${HERO_NAMES[type][0]}`, `data-target="${type}" ${hired ? 'disabled' : ''}`)}</div></article>`;
}
function partyStrip() {
  return `<div class="party-strip"><div><span class="eyebrow">YOUR PRACTICE COMPANY</span><small>Two heroes to learn the basics · four active slots on day one in the game</small></div><div class="party-mini">${['knight', 'ranger'].map(type => { const hero = state.heroes.find(h => h.type === type); return `<span class="${hero ? 'filled' : ''}">${hero ? `<img src="${HERO_TYPES[type].image}" alt="" /><b>${HERO_NAMES[type][0]}</b><small>Lv ${hero.level}</small>` : '<span aria-hidden="true">＋</span><small>Waiting for a hero</small>'}</span>`; }).join('')}</div></div>`;
}
function recruitScene() {
  return `<div class="scene-heading"><span class="eyebrow">THE TAVERN</span><span class="scene-caption">Your first roll each day is free</span></div>${state.rolled ? `<div class="recruit-grid">${heroCard('knight')}${heroCard('ranger')}</div>` : `<div class="sealed-contracts"><div class="sealed-art"><img src="assets/town/levels/tavern-1.webp" alt="Tavern" /></div><span class="eyebrow">STRANGERS BECOME A COMPANY</span><h2>Two contracts await.</h2><p>Open a fixed pair of practice contracts.<br />In the game, each roll offers a random selection.</p>${button('roll', 'Reveal practice heroes <span aria-hidden="true">→</span>', 'class="primary"')}</div>`}${partyStrip()}`;
}
function trainScene() {
  const hero = state.heroes.find(h => h.type === 'knight');
  const before = practiceHero('knight', 1, state.buildings), after = practiceHero('knight', 2, state.buildings);
  return `<div class="scene-heading"><span class="eyebrow">HERO TRAINING</span><span class="scene-caption">One hero · a lasting improvement</span></div><div class="feature-scene"><div class="feature-portrait"><img src="${HERO_TYPES.knight.image}" alt="Aveline, your armored knight" /><span class="level-seal">LEVEL ${hero.level}</span></div><div class="feature-copy"><span class="eyebrow">${HERO_TYPES.knight.label} · FRONT ROW</span><h2>${HERO_NAMES.knight[0]}</h2><p>More health to hold the front.<br />More damage with every strike.</p><dl class="stat-comparison"><div><dt>Health</dt><dd>${number(before.maxHp)} <span>→</span> <strong>${number(after.maxHp)}</strong></dd></div><div><dt>Damage</dt><dd>${number(before.damage)} <span>→</span> <strong>${number(after.damage)}</strong></dd></div><div><dt>Power</dt><dd>${before.power} <span>→</span> <strong>${after.power}</strong></dd></div></dl>${button('train', state.trained ? '✓ Aveline is level 2' : `Train to level 2 · ${heroTrainingCost(1)} gold`, `class="primary" ${state.trained ? 'disabled' : ''}`)}</div></div><p class="scene-footnote">The same stats as the game, before town traits or other bonuses. Damage here is the hero’s rating; armor and battle scaling affect each hit.</p>`;
}
function townScene() {
  const before = buildingEffects('knight', createTownBuildings().knight).damageReduction;
  const after = buildingEffects('knight', {level: 2}).damageReduction;
  return `<div class="scene-heading"><span class="eyebrow">${BUILDING_DEFINITIONS.knight.name.toUpperCase()}</span><span class="scene-caption">Town improvements last across expeditions</span></div><div class="feature-scene building-feature"><div class="feature-portrait"><img src="assets/town/levels/knight-${state.fortified ? 2 : 1}.webp" alt="Barracks at level ${state.buildings.knight.level}" /><span class="level-seal">LEVEL ${state.buildings.knight.level}</span></div><div class="feature-copy"><span class="eyebrow">THE DEFENDER’S DISTRICT</span><h2>The ${BUILDING_DEFINITIONS.knight.name}</h2><p>Better armor for every Knight in your company, including future recruits.</p><dl class="stat-comparison"><div><dt>Damage reduction</dt><dd>${pct(before)} <span>→</span> <strong>${pct(after)}</strong></dd></div></dl>${button('fortify', state.fortified ? '✓ Barracks upgraded' : `Upgrade to level 2 · ${buildingUpgradeCost(1)} gold`, `class="primary" ${state.fortified ? 'disabled' : ''}`)}</div></div><p class="scene-footnote">Hero training improves one person. A district upgrade helps its entire class. Both use the same gold.</p>`;
}
function unitCard(unit, enemy = false) {
  const image = enemy ? ENEMY_PORTRAITS[unit.type].image : HERO_TYPES[unit.type].image;
  const target = !enemy && unit.type === 'knight' && state.phase === 'target';
  const hit = !enemy && state.phase === 'realtime' && state.lastHit?.target === unit.type;
  const wounded = unit.hp > 0 && unit.hp <= unit.maxHp * .75;
  return `<${target ? 'button type="button" data-action="heal" data-target="knight"' : 'article'} class="battle-unit ${enemy ? 'enemy' : ''} ${unit.hp <= 0 ? 'fallen' : ''} ${target ? 'heal-target' : ''} ${hit ? 'was-hit' : ''} ${wounded ? 'is-wounded' : ''}" data-unit="${unit.type}">
    <span class="battle-unit__portrait"><img src="${image}" alt="" /></span>
    <div class="battle-unit__info"><h3>${unit.name}</h3><span class="unit-class">${enemy ? 'Enemy · Front line' : `${HERO_TYPES[unit.type].label} · L${unit.level} · ${HERO_TYPES[unit.type].row === 'front' ? 'Front line' : 'Rear guard'}`}</span><div class="health-track"><span style="width:${pct(Math.max(0,unit.hp) / unit.maxHp)}"></span></div><small>${number(unit.hp)} / ${number(unit.maxHp)} HP${target ? ' · Heal Aveline →' : ''}</small></div>
    ${hit ? `<span class="damage-taken">−${state.lastHit.damage} HP</span>` : ''}
  </${target ? 'button' : 'article'}>`;
}
function battleScene() {
  const started = state.phase !== 'ready';
  const party = started ? state.party : state.heroes.map(h => practiceHero(h.type, h.level, state.buildings));
  const enemies = started ? state.enemies : ['skeleton','zombie'].map(type => ({type, name:ENEMY_TYPES[type].label, hp:ENEMY_TYPES[type].hp * enemyHealthMultiplier(1), maxHp:ENEMY_TYPES[type].hp * enemyHealthMultiplier(1)}));
  const instructions = {
    ready: 'Meet your first opponents.',
    watch: state.paused ? 'Battle paused. Take a breath. Your orders still work.' : 'Real-time combat · your heroes attack automatically.',
    realtime: 'Battle paused · Aveline has been hit.',
    'try-pause': 'Battle running · try Pause whenever you’re ready.',
    order: 'Battle paused · issue Hold the Line.',
    potion: 'Battle paused · prepare a healing potion.',
    target: 'Battle paused · choose Aveline to restore her health.',
    finish: state.paused ? 'Battle paused. Take a breath. Your orders still work.' : 'Battle running · pause or resume whenever you need.',
    won: 'Floor cleared · delve deeper or return safely.', escaped: 'The company has escaped.', lost: 'Try the practice fight again.',
  };
  const runningPhase = ['watch','try-pause','finish'].includes(state.phase);
  const canPause = runningPhase || state.phase === 'realtime';
  const optionalFight = state.step === 4 && state.delved && !state.returned;
  const pauseLabel = state.paused ? 'Resume' : 'Pause';
  const lesson = state.phase === 'realtime' ? `<section class="realtime-lesson" aria-labelledby="realtime-title"><span class="eyebrow">PAUSED AFTER THE FIRST HIT</span><h3 id="realtime-title">Combat happens in real time.</h3><p>Aveline just lost <strong>${state.lastHit.damage} HP</strong>. We paused so you can see the damage. You can pause at any moment to think, issue orders or use a potion.</p><p>Use <strong>Resume</strong> below, then try <strong>Pause</strong> yourself.</p></section>` : '';
  return `<div class="scene-heading"><span class="eyebrow">FLOOR ${state.floor} · UNDEAD UPRISING</span><span class="scene-caption">${optionalFight ? 'Pressing deeper · wounds carry over' : 'Guided fight'}</span></div>
    <div class="battle-arena" style="--battle-art:url('${BATTLE_BACKDROPS.undead.image}')">
      <div class="battle-notice" role="status"><span class="status-dot ${runningPhase && !state.paused ? 'live' : ''}"></span>${instructions[state.phase]}</div>
      <div class="formation"><div class="battle-side"><span class="eyebrow">YOUR COMPANY</span>${party.map(h => unitCard(h)).join('')}</div><span class="versus" aria-hidden="true">⚔</span><div class="battle-side"><span class="eyebrow">THE OPPOSITION · FRONT LINE</span>${enemies.map(e => unitCard(e,true)).join('')}</div></div>
      ${lesson}
    </div>
    <section class="battle-tools" aria-label="Battle commands"><div class="command-tool"><div><span class="eyebrow">COMMAND</span><strong>${number(state.command)} <small>/ ${COMMAND_MAX}</small></strong><div class="command-track"><span style="width:${pct(state.command / COMMAND_MAX)}"></span></div></div>${button('hold', `<img src="assets/commands/hold.webp" alt="" /><span>${BATTLE_COMMANDS.hold.label}<small>${BATTLE_COMMANDS.hold.cost} Command</small></span>`, `class="tool-button" ${state.phase === 'order' ? '' : 'disabled'}`)}</div><span class="hold-status">${state.holdRemaining > 0 && state.phase !== 'won' ? `HOLD THE LINE · ${(state.holdRemaining / 1000).toFixed(1)}s` : 'THE MAYOR’S ORDERS'}</span></section>
    <footer class="battle-control-bar"><div class="practice-supplies"><span class="eyebrow">ALCHEMIST’S SUPPLIES</span>${button('potion', `<img src="assets/items/healing-potion.webp" alt="" /><span>Healing potion<small>${state.potions} left · ${pct(alchemistSupplies(1).healRatio)} maximum HP</small></span>`, `class="tool-button potion-tool" ${state.phase === 'potion' ? '' : 'disabled'}`)}</div><div class="practice-battle-actions">${optionalFight && state.phase === 'finish' ? button('flee', 'Flee', 'class="flee-warning"') : ''}${['ready','lost'].includes(state.phase) ? button('fight', state.phase === 'lost' ? 'Retry practice fight' : 'Start practice fight', 'class="primary"') : ['won'].includes(state.phase) ? `<span class="floor-reward">✓ Floor reward: ${floorGoldReward(1)} gold</span>` : button('pause', canPause ? pauseLabel : 'Paused', `class="pause-control ${['realtime','try-pause'].includes(state.phase) ? 'pause-spotlight' : ''}" aria-pressed="${state.paused}" ${canPause ? '' : 'disabled'} aria-label="${canPause ? pauseLabel : 'Battle paused for the tutorial'}"`)}<small>${state.phase === 'realtime' ? 'Resume here, then try Pause' : ['order','potion','target'].includes(state.phase) ? 'Paused for this lesson' : state.phase === 'won' ? 'Ready to return to town' : 'Pause or resume at any moment'}</small></div></footer>
    <p class="scene-footnote battle-practice-note">${optionalFight ? 'You can flee during this fight, losing half your gold. Clear the floor to return safely with no escape cost.' : 'Practice enemies open with a heavy strike. Watch Aveline’s health.'}</p>
    <ol class="battle-log" aria-label="Recent combat events">${state.log.map(line => `<li>${line}</li>`).join('')}</ol>`;
}
function returnScene() {
  if (state.delved && !state.returned && state.phase !== 'won') return battleScene();
  const escaped = state.exitType === 'fled';
  const secondClear = state.delved && state.phase === 'won';
  const title = state.returned ? (escaped ? 'A costly escape. A living company.' : 'Both heroes return safely.') : secondClear ? 'Another floor. Another choice.' : 'Will you delve deeper or return safely?';
  const copy = state.returned ? (escaped ? `You fled during combat and paid ${state.escapeGoldLost} gold. You keep ${state.gold} gold and your surviving heroes. Leaving after a cleared floor would have kept all your gold.` : `You returned between floors, keeping all ${state.gold} gold and both heroes. Tomorrow brings a free roll, full health and a fresh expedition.`) : secondClear ? 'You earned more gold by pressing on. In the full game, every cleared floor offers the same choice. This practice ends with a safe return.' : 'The floor is clear. Push on for more gold against stronger enemies, carrying your wounds and remaining supplies. Or end today’s expedition and bring everyone home with all your gold.';
  return `<div class="scene-heading"><span class="eyebrow">${escaped ? "BATTLE ABANDONED" : `FLOOR ${state.floor} CLEARED`}</span><span class="scene-caption">${state.returned ? 'Expedition ended' : 'Your company. Your decision.'}</span></div><div class="homecoming"><img class="home-art" src="assets/town/town-landscape.webp" alt="Your company’s town beneath the mountains" /><div class="home-copy"><span class="eyebrow">${state.returned ? 'THE COMPANY COMES HOME' : 'FORTUNE FAVOURS THE BRAVE. SO DOES CAUTION.'}</span><h2>${title}</h2><p>${copy}</p><div class="survivors">${state.heroes.map(hero => `<span><img src="${HERO_TYPES[hero.type].image}" alt="" />${HERO_NAMES[hero.type][0]}<small>Level ${hero.level}</small></span>`).join('')}</div>
    ${state.returned ? `<p class="choice-result" role="status">✓ ${escaped ? `${state.escapeGoldLost} gold lost · ${state.gold} gold kept` : `All ${state.gold} gold kept · no escape cost`}</p>` : `<div class="expedition-choices">${!state.delved ? `<section><h3>Delve deeper</h3><p>Enter floor 2. More danger, another gold reward. Health and supplies carry over.</p>${button('delve', 'Delve deeper →', 'class="primary"')}</section>` : ''}<section><h3>Return safely</h3><p>End the expedition between fights. Keep your surviving heroes and all ${state.gold} gold.</p>${button('return', 'Return safely to town', 'class="secondary"')}</section></div>`}
    <aside class="escape-explanation"><h3>If a fight looks dire, you can still flee.</h3><p>During combat, <strong>Flee</strong> saves your surviving heroes but costs <strong>half your gold, rounded up</strong>. Between floors, returning is free.</p><p>${state.returned ? 'Knowing when to turn back is part of leading the company.' : `With ${state.gold} gold, a mid-fight escape would cost ${Math.ceil(state.gold / 2)} gold; you would keep ${Math.floor(state.gold / 2)}.`}</p></aside>
  </div></div>`;
}
function fleeDialog() {
  const cost = Math.ceil(state.gold / 2);
  return `<dialog class="practice-flee-dialog" aria-labelledby="practice-flee-title" aria-describedby="practice-flee-copy"><span class="eyebrow">LEAVE THE EXPEDITION</span><h2 id="practice-flee-title">Abandon this battle?</h2><p id="practice-flee-copy">Your surviving heroes will return to town. Fleeing during a fight costs half your gold, rounded up. Returning between floors is free.</p><dl class="escape-costs"><div><dt>Your gold</dt><dd>${state.gold}</dd></div><div><dt>Gold lost on escape</dt><dd>${cost}</dd></div><div><dt>Gold you keep</dt><dd>${state.gold - cost}</dd></div></dl><p class="paused-note">Combat is paused. Cancelling keeps it paused.</p><div class="escape-actions">${button('flee-cancel', 'Stay in the fight', 'autofocus')}${button('flee-confirm', `Flee · lose ${cost} gold`, 'class="flee-warning"')}</div></dialog>`;
}
function finishScene() {
  return `<section class="completion" aria-labelledby="lesson-title"><span class="completion-mark" aria-hidden="true">✦</span><span class="eyebrow">TUTORIAL COMPLETE</span><h1 id="lesson-title" tabindex="-1">You’re ready to lead.</h1><p>Recruit a balanced company. Spend with a plan.<br />Help them in battle. Know when to press on, and when to come home.</p><div class="completion-party">${state.heroes.map(h => `<img src="${HERO_TYPES[h.type].image}" alt="${HERO_NAMES[h.type][0]}" />`).join('')}</div><div class="completion-note"><h2>The choice is yours</h2><p>Delve deeper for more rewards, or return safely between floors with all your gold. If a fight turns dire, Flee saves your surviving heroes at the cost of half your gold, rounded up.</p></div><div class="completion-note"><h2>Beyond the practice grounds</h2><p>Fill your active party, explore more classes and face choices between battles. Reach floor ${BOSS_FLOOR} and defeat the boss within ten days to save the town.</p><p>Three or more active heroes of one class each lose 20% health and damage. A varied company is a useful starting point.</p></div><a class="primary button-link" href="dungeon.html">Enter Vaultbound <span aria-hidden="true">→</span></a><small>Opens the game with your existing campaign, if you have one.</small></section>`;
}
function coachCopy() {
  const copy = [
    [state.rolled ? 'Recruit both heroes.' : 'Reveal your first contracts.', 'Aveline holds the front row. Arwen attacks from behind her. Hiring a revealed hero is free.', 'In the game, your first daily roll is free; later rolls cost gold. Hired heroes stay in your company when you reroll.'],
    ['Train Aveline to level 2.', `Spend ${heroTrainingCost(1)} gold to raise her power, health and damage. Arwen stays at level 1.`, 'Select a hired hero to train them in the game. A hero’s training cost increases with their level.'],
    ['Upgrade the Barracks.', `Spend ${buildingUpgradeCost(1)} gold for stronger Knight armor. This is separate from training Aveline.`, 'Each class has a district. The Tavern improves the odds of higher-level contracts; the Alchemist provides potions.'],
    [state.phase === 'realtime' ? 'You set the pace.' : state.phase === 'try-pause' ? 'Try pausing the fight.' : state.phase === 'order' ? 'Issue Hold the Line.' : state.phase === 'potion' ? 'Prepare a healing potion.' : state.phase === 'target' ? 'Choose your wounded Knight.' : state.phase === 'won' ? 'Your first floor is clear.' : state.phase === 'finish' ? 'Let the company finish.' : 'Start the practice fight.', state.phase === 'realtime' ? `Aveline just took ${state.lastHit.damage} damage. Combat happens in real time, but you can pause at any moment. Use Resume below to let the fight move, then try Pause. Orders and potions work while paused.` : state.phase === 'try-pause' ? 'The fight is moving again. Press Pause below to stop it yourself. We will also pause at the next enemy hit so you have time for the next lesson.' : state.phase === 'order' ? `Damage fills your Command meter. Spend ${BATTLE_COMMANDS.hold.cost} on your Knight’s order: ${number(commandPower('hold',1).armorBonus * 100)} extra percentage points of damage reduction and +${pct(commandPower('hold',1).damageBonus)} damage for the front row for six seconds.` : ['potion','target'].includes(state.phase) ? `A potion restores up to ${pct(alchemistSupplies(1).healRatio)} of a hero’s maximum health. Prepare it, then choose Aveline. Combat stays paused while you learn.` : state.phase === 'won' ? 'The company earns gold for clearing a floor. Now decide whether to press on or go home.' : state.phase === 'finish' ? `The potion restored ${state.healed} health. You can pause and resume the fight whenever you need.` : 'Attacks happen automatically. This practice fight pauses to introduce one battle order and a potion.', 'Orders need a living hero of the matching class and enough Command. Potions are limited supplies; the Alchemist replenishes them for each expedition.'],
    [state.delved && !state.returned && state.phase !== 'won' ? 'Deeper is a risk worth weighing.' : 'Delve deeper, or return safely?', state.delved && !state.returned && state.phase !== 'won' ? `Your heroes entered floor 2 with their wounds and remaining supplies. If the fight looks dire, use Flee. Escaping now costs ${Math.ceil(state.gold / 2)} gold; the confirmation shows the exact loss. You can also finish the fight and then return for free.` : 'More floors mean more rewards and stronger enemies. Returning after a cleared floor keeps all your gold. Fleeing during a fight saves survivors but costs half your gold, rounded up.', 'Survivors keep their levels and return fully healed on the next day. Health and remaining potions carry between floors. Fallen heroes are lost; the Cemetery remembers them.'],
  ];
  return copy[state.step];
}
function render(focusHeading = false) {
  const detailsOpen = root.querySelector('.coach details')?.open;
  const summaryFocused = document.activeElement === root.querySelector('.coach summary');
  const focus = document.activeElement?.closest('[data-action]');
  const previousFocus = focus ? {action: focus.dataset.action, target: focus.dataset.target} : null;
  const done = lessonDone(state);
  const content = state.step === 5 ? finishScene() : `<section class="lesson-intro"><div><span class="eyebrow">LESSON ${String(state.step + 1).padStart(2,'0')} / 05</span><h1 id="lesson-title" tabindex="-1">${headings[state.step]}</h1><p>${introductions[state.step]}</p></div><div class="practice-wallet"><span class="eyebrow">PRACTICE PURSE</span>${coin(state.gold)}</div></section><div class="lesson-layout"><section class="practice-scene" aria-label="Practice activity">${[recruitScene, trainScene, townScene, battleScene, returnScene][state.step]()}</section><aside class="coach" aria-label="Lesson instructions"><div class="coach-top"><span class="eyebrow">YOUR NEXT MOVE</span><span class="coach-number">${String(state.step + 1).padStart(2,'0')}</span></div><h2>${done ? ['A company takes shape.','Stronger already.','A town that protects.','A well-led company.',state.exitType === 'fled' ? 'You brought them back alive.' : 'Home, with everyone.'][state.step] : coachCopy()[0]}</h2><p>${done ? ['Your defender and attacker are ready. Next, make one of them stronger.','Aveline is level 2. Next, see how the town helps your entire company.','Every Knight now benefits from the improved Barracks. Time to put your company to work.','An order, a potion and a floor cleared. Next, bring your heroes home.',state.exitType === 'fled' ? `You paid ${state.escapeGoldLost} gold to escape and kept your survivors. Returning between cleared floors would have been free.` : 'You kept both heroes and all your gold. That is a successful expedition.'][state.step] : coachCopy()[1]}</p><div class="task-status ${done ? 'done' : ''}" role="status"><span aria-hidden="true">${done ? '✓' : '○'}</span>${done ? 'Lesson complete' : state.step === 3 && state.phase === 'target' ? 'Select Aveline in the formation' : ['Recruit both heroes to continue','Train Aveline to continue','Upgrade the Barracks to continue','Finish the guided fight to continue','Choose how your expedition ends'][state.step]}</div>${button('next', state.step === 4 ? 'Finish tutorial →' : state.step === 3 && done ? 'Choose your next move →' : 'Next lesson →', `class="primary next-button" ${done ? '' : 'disabled'}`)}<details><summary>Why this matters</summary><p>${coachCopy()[2]}</p></details><div class="sandbox-note"><span aria-hidden="true">◇</span><p>Practice freely. Your campaign and saved progress are untouched.</p></div></aside></div>`;
  root.innerHTML = `<nav class="lesson-nav" aria-label="Tutorial lessons">${LESSONS.map((name,index) => `<button type="button" data-action="visit" data-target="${index}" ${index > state.unlocked ? 'disabled' : ''} ${state.step === index ? 'aria-current="step"' : ''}><span>${index < state.unlocked ? '✓' : String(index+1).padStart(2,'0')}</span><b>${name}</b></button>`).join('')}</nav>${content}<p class="sr-only" id="tutorial-announcement" role="status" aria-live="polite"></p>${state.fleeConfirmation ? fleeDialog() : ''}`;
  if (state.fleeConfirmation) root.querySelector('.practice-flee-dialog').showModal();
  if (detailsOpen && root.querySelector('.coach details')) root.querySelector('.coach details').open = true;
  if (summaryFocused && !focusHeading) root.querySelector('.coach summary')?.focus({preventScroll:true});
  if (focusHeading && !state.fleeConfirmation) root.querySelector('#lesson-title').focus();
  else if (previousFocus) [...root.querySelectorAll('[data-action]')].find(el => el.dataset.action === previousFocus.action && el.dataset.target === previousFocus.target && !el.disabled)?.focus({preventScroll:true});
}
root.addEventListener('click', event => {
  const control = event.target.closest('[data-action]');
  if (!control || control.disabled) return;
  const previousStep = state.step, previousPhase = state.phase;
  tutorialAction(state, control.dataset.action, control.dataset.target);
  render(previousStep !== state.step);
  if (control.dataset.action === 'delve') root.querySelector('[data-action="pause"]')?.focus();
  if (control.dataset.action === 'flee-cancel') root.querySelector('[data-action="flee"]')?.focus({preventScroll:true});
  if (previousPhase === 'target' && state.phase === 'finish') root.querySelector('[data-action="pause"]')?.focus({preventScroll:true});
  else if (['roll','hire','train','fortify','return','flee-confirm'].includes(control.dataset.action)) {
    const nextTarget = lessonDone(state) ? '[data-action="next"]' : control.dataset.action === 'roll' ? '[data-action="hire"]' : '[data-action="hire"]:not(:disabled)';
    root.querySelector(nextTarget)?.focus({preventScroll:true});
  } else if (control.dataset.action === 'pause' && state.phase === 'order') root.querySelector('[data-action="hold"]')?.focus({preventScroll:true});
  else if (control.dataset.action === 'hold') root.querySelector('[data-action="potion"]')?.focus({preventScroll:true});
  else if (control.dataset.action === 'potion') root.querySelector('[data-action="heal"]')?.focus({preventScroll:true});
});
root.addEventListener('cancel', event => {
  if (!event.target.matches('.practice-flee-dialog')) return;
  event.preventDefault(); tutorialAction(state,'flee-cancel'); render();
  root.querySelector('[data-action="flee"]')?.focus({preventScroll:true});
}, true);
document.querySelector('#restart').addEventListener('click', () => { state = createTutorial(); render(true); });
let previousFrame = performance.now();
function updateBattleReadout() {
  for (const unit of [...state.party, ...state.enemies]) {
    const card = root.querySelector(`[data-unit="${unit.type}"]`);
    if (!card) continue;
    card.classList.toggle('fallen', unit.hp <= 0);
    card.classList.toggle('is-wounded', unit.hp > 0 && unit.hp <= unit.maxHp * .75);
    card.querySelector('.health-track > span').style.width = pct(Math.max(0, unit.hp) / unit.maxHp);
    card.querySelector('small').textContent = `${number(unit.hp)} / ${number(unit.maxHp)} HP`;
  }
  const meter = root.querySelector('.command-tool strong');
  if (meter) meter.innerHTML = `${number(state.command)} <small>/ ${COMMAND_MAX}</small>`;
  const fill = root.querySelector('.command-track > span');
  if (fill) fill.style.width = pct(state.command / COMMAND_MAX);
  const timer = root.querySelector('.hold-status');
  if (timer) timer.textContent = state.holdRemaining > 0 && state.phase !== 'won' ? `HOLD THE LINE · ${(state.holdRemaining / 1000).toFixed(1)}s` : 'THE MAYOR’S ORDERS';
  const log = root.querySelector('.battle-log');
  const lines = state.log.map(line => `<li>${line}</li>`).join('');
  if (log && log.innerHTML !== lines) log.innerHTML = lines;
}
function tick(now) {
  const delta = Math.min(100, Math.max(0, now - previousFrame)); previousFrame = now;
  if (!document.hidden && [3,4].includes(state.step) && ['watch','try-pause','finish'].includes(state.phase) && !state.paused) {
    const previousPhase = state.phase;
    const oldFocused = document.activeElement === root.querySelector('[data-action="pause"]');
    advanceTutorial(state, delta);
    if (previousPhase !== state.phase) {
      render();
      if (state.phase === 'realtime') {
        root.querySelector('[data-action="pause"]')?.focus();
        root.querySelector('#tutorial-announcement').textContent = 'Aveline has been hit. Battle paused. Combat is real time; you can pause at any moment. Use Resume to continue.';
      }
      if (state.phase === 'order') {
        root.querySelector('[data-action="hold"]')?.focus({preventScroll:true});
        root.querySelector('#tutorial-announcement').textContent = 'Practice paused. Issue Hold the Line.';
      }
      if (state.phase === 'won' && (oldFocused || state.step === 4)) root.querySelector(state.step === 4 ? '[data-action="return"]' : '[data-action="next"]')?.focus({preventScroll:true});
    } else updateBattleReadout();
  }
  requestAnimationFrame(tick);
}
window.advanceTime = ms => { advanceTutorial(state, ms); render(); };
window.render_game_to_text = () => JSON.stringify({ mode:'tutorial', lesson:state.step + 1, lessonName: LESSONS[state.step] ?? 'Complete', unlocked:state.unlocked, complete:state.step===5,
  gold:state.gold, lessonDone:lessonDone(state), rolled:state.rolled, heroes:state.heroes, buildings:state.buildings, phase:state.phase,
  paused:state.paused, pausePracticed:state.pausePracticed, lastHit:state.lastHit, elapsed:state.elapsed, command:number(state.command), potions:state.potions, healed:state.healed, holdRemaining:state.holdRemaining,
  party:state.party.map(({type,hp,maxHp})=>({type,hp,maxHp})), enemies:state.enemies.map(({type,hp,maxHp})=>({type,hp,maxHp})), returned:state.returned, floor:state.floor, delved:state.delved, fleeConfirmation:state.fleeConfirmation, exitType:state.exitType, escapeGoldLost:state.escapeGoldLost });
render(); requestAnimationFrame(tick);
