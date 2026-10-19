import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import { CAMPAIGN_BOSSES, BOSS_DEFINITIONS } from '../src/bosses.js';

const baseURL = process.argv[2] ?? 'http://127.0.0.1:4176';
await mkdir('output/boss-check', { recursive: true });
const browser = await chromium.launch();
const errors = [];
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.addInitScript(() => { window.requestAnimationFrame = () => 0; Math.random = () => .75; });
  await context.route('**/src/dungeon.js', async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: `${await response.text()}
      window.bossTest = { get state() { return state; }, resetCampaign, finishDay, advanceDay, makeEnemy, generateEnemies, actEnemy, actHero, dealDamage, updateBattle, enemyInterval, enemyEmpowered, continueExpedition, render,
        stage(flavor, type, lateCompany = false) {
          state.conclusion=null; state.victoryAchieved=false; state.victoryDay=null; state.campaignId=crypto.randomUUID();
          state.events.clears=0; state.events.next=0; state.events.pending=null; state.events.plan.forEach(event=>event.at=9999);
          state.flavorKey = flavor; state.bossType = type; state.floor = 10; state.day = lateCompany ? 9 : 1;
          const classes = lateCompany ? ['knight', 'knight', 'cleric', 'cleric', 'ranger', 'mage', 'barbarian', 'bard'] : ['knight', 'cleric', 'ranger', 'mage'];
          state.party = buildParty(classes.map((type, index) => ({ id: 500 + index, name: HERO_TYPES[type].label, type, level: 5, active: true })));
          state.expeditionStartCount = classes.length; state.commandMeter = 0;
          prepareFloor(); state.battlePaused = true; render();
        }
      };` });
  });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto(`${baseURL}/dungeon.html`);
  await page.waitForFunction(() => window.bossTest);
  const stage = async (flavor, type, lateCompany = false) => page.evaluate(([f,t,late]) => window.bossTest.stage(f,t,late), [flavor,type,lateCompany]);
  for (const [flavor, choices] of Object.entries(CAMPAIGN_BOSSES)) for (const type of choices) {
    await stage(flavor, type);
    const boss = page.locator('.battle-unit.is-boss');
    assert.equal(await boss.count(), 1);
    assert.equal(await boss.getAttribute('data-enemy-type'), type);
    assert.equal(await page.locator('.battle-header h1').textContent(), BOSS_DEFINITIONS[type].label);
    await page.locator('.battle-boss-intel').waitFor({ state: 'visible' });
    await boss.locator('img').evaluate(image => image.decode());
    assert.equal(await boss.evaluate(card => getComputedStyle(card).borderTopColor), 'rgb(228, 182, 83)');
    assert.equal(await page.locator('[data-side="enemy"]').count(), 1 + (BOSS_DEFINITIONS[type].escorts?.length ?? 0));
    // Hit, freeze and focus targeting must never erase the boss's golden border.
    await page.evaluate(() => {
      const {state,render} = window.bossTest;
      state.enemies[0].flash = 400; state.enemyFreezeMs = 1000;
      state.commandTargeting = 'mark'; render();
    });
    assert.equal(await boss.evaluate(card => getComputedStyle(card).borderTopColor), 'rgb(228, 182, 83)');
    await page.screenshot({ path: `output/boss-check/${type}.png` });
  }

  // Actual encounter selection is stable even when a later random roll changes.
  for (const [flavor, choices] of Object.entries(CAMPAIGN_BOSSES)) for (const roll of [.1,.9]) {
    const chosen = await page.evaluate(([flavor,roll]) => {
      const {state,generateEnemies}=window.bossTest;state.flavorKey=flavor;state.bossType=null;
      Math.random=()=>roll;const first=generateEnemies(10)[0].type;
      Math.random=()=>1-roll;const second=generateEnemies(10)[0].type;Math.random=()=>.75;
      return {first,second};
    },[flavor,roll]);
    assert.equal(chosen.first, choices[roll<.5?0:1]);assert.equal(chosen.first,chosen.second);
  }

  await stage('demons', 'infernalDragon');
  assert.equal(await page.evaluate(() => {
    const {state,actEnemy} = window.bossTest;
    const before = state.party.map(hero => hero.hp);
    actEnemy(state.enemies[0]);
    return state.party.every((hero,index) => hero.row === 'front' ? hero.hp < before[index] : hero.hp === before[index]);
  }), true);
  assert.equal(await page.evaluate(() => {
    const {state,actEnemy} = window.bossTest;
    state.party.filter(hero => hero.row === 'front').forEach(hero => hero.hp = 0);
    const rear = state.party.filter(hero => hero.row === 'back'), before = rear.map(hero => hero.hp);
    actEnemy(state.enemies[0]);
    return rear.every((hero,index) => hero.hp < before[index]);
  }), true);

  await stage('undead', 'evilSpirit');
  const freeze = await page.evaluate(() => {
    const {state,actEnemy,updateBattle,render} = window.bossTest;
    for (let i = 0; i < 3; i++) actEnemy(state.enemies[0]);
    const starts = state.party.map(hero => hero.frozenMs);
    state.party.forEach(hero => hero.timer = 5000); state.enemies[0].timer = 99999;
    updateBattle(500); const paused = state.party.map(hero => hero.frozenMs);
    state.battlePaused = false; updateBattle(1000);
    const frozen = state.party.map(hero => [hero.frozenMs,hero.timer]);
    updateBattle(1500); const thawed = state.party.map(hero => [hero.frozenMs,hero.timer]);
    state.battlePaused = true; render(); return {starts,paused,frozen,thawed};
  });
  assert.deepEqual(freeze.starts, [2000,2000,2000,2000]);
  assert.deepEqual(freeze.paused, freeze.starts);
  assert.ok(freeze.frozen.every(([time,timer]) => time === 1000 && timer === 5000));
  assert.ok(freeze.thawed.every(([time,timer]) => time === 0 && timer === 4500));
  await stage('undead', 'evilSpirit');
  await page.evaluate(() => { const {state,actEnemy,render} = window.bossTest; for(let i=0;i<3;i++) actEnemy(state.enemies[0]); render(); });
  assert.equal(await page.locator('[data-side="hero"].is-frozen').count(), 4);
  await page.screenshot({path:'output/boss-check/party-frozen.png'});
  await page.locator('[data-command="aegis"]').click();
  await page.locator('[data-side="hero"].is-targetable').first().click();
  assert.equal(await page.locator('[data-side="hero"].is-shielded.is-frozen').count(),1);
  await page.evaluate(()=>{const {state,render}=window.bossTest;state.potionsRemaining=1;render();});
  const wounded=page.locator('[data-side="hero"]').filter({hasText:'Cleric'});
  const hpBefore=await wounded.locator('.battle-unit__hp').textContent();
  await page.locator('[data-battle-action="potion"]').click();await page.locator('[data-side="hero"].is-targetable').first().click();
  assert.notEqual(await wounded.locator('.battle-unit__hp').textContent(),hpBefore);
  assert.equal(await page.locator('[data-side="hero"].is-frozen').count(),4);
  assert.equal(await page.evaluate(() => {
    const {state,updateBattle} = window.bossTest;
    state.enemyFreezeMs = 2000; state.enemies[0].timer = 0;
    const attacks = state.enemies[0].attacks;
    state.battlePaused = false; updateBattle(1000); state.battlePaused = true;
    return state.enemies[0].attacks === attacks;
  }), true);

  await stage('undead', 'lich');
  const summons = await page.evaluate(() => {
    const {state,actEnemy} = window.bossTest;
    const boss = state.enemies[0];
    for (const roll of [.05,.4,.9]) { Math.random = () => roll; boss.attacks = 1; actEnemy(boss); }
    const types = state.enemies.slice(1).map(enemy => enemy.type);
    for(let i=0;i<30;i++) { boss.attacks=1; actEnemy(boss); }
    Math.random = () => .75;
    return {types,count:state.enemies.filter(enemy=>enemy.hp>0).length};
  });
  assert.deepEqual(summons.types,['skeleton','zombie','boneMage']); assert.equal(summons.count,10);

  await stage('assassins','shadowAssassin');
  const evasion = await page.evaluate(() => {
    const {state,dealDamage,actEnemy,updateBattle} = window.bossTest;
    const boss=state.enemies[0], before=boss.hp;
    Math.random=()=>.199; dealDamage(boss,100,state.party[0]); const evaded=boss.hp===before;
    Math.random=()=>.2; dealDamage(boss,100,state.party[0]); const hit=boss.hp<before;
    actEnemy(boss); const forward=boss.row==='front';
    state.party.forEach(hero=>hero.timer=99999);boss.timer=99999;
    state.battlePaused=false;updateBattle(400);state.battlePaused=true;
    Math.random=()=>.75;
    return {evaded,hit,forward,returned:boss.row==='back'};
  });
  assert.deepEqual(evasion,{evaded:true,hit:true,forward:true,returned:true});
  await stage('assassins','shadowAssassin');
  assert.equal(await page.evaluate(()=>{
    const {state,actEnemy,updateBattle}=window.bossTest;const boss=state.enemies[0];actEnemy(boss);
    state.enemyFreezeMs=1000;boss.timer=99999;state.party.forEach(hero=>hero.timer=99999);
    state.battlePaused=false;updateBattle(1000);updateBattle(1);const held=boss.row==='front';
    updateBattle(350);state.battlePaused=true;return held&&boss.row==='back';
  }),true);

  await stage('assassins','guildMaster');
  const buff = await page.evaluate(() => {
    const {state,enemyInterval,enemyEmpowered,actEnemy,render}=window.bossTest;
    const boss=state.enemies[0],ally=state.enemies[1];
    const fast=enemyInterval(ally),active=enemyEmpowered(ally),self=enemyEmpowered(boss);
    state.town.prefix={};state.party.forEach(hero=>hero.damageReduction=0);
    const total=()=>state.party.reduce((sum,hero)=>sum+hero.hp,0);
    let before=total();actEnemy(ally);const stronger=before-total();
    boss.hp=0;before=total();actEnemy(ally);const normal=before-total();render();
    return {active,self,ratio:enemyInterval(ally)/fast,removed:!enemyEmpowered(ally),stronger,normal};
  });
  assert.equal(buff.active,true);assert.equal(buff.self,false);assert.equal(buff.removed,true);assert.ok(Math.abs(buff.ratio-1.15)<.0001);
  assert.ok(buff.stronger>buff.normal);
  assert.equal(await page.locator('.battle-unit__status').filter({hasText:'EMPOWERED'}).count(),0);

  await stage('orcs','elderShaman');
  const healing = await page.evaluate(() => {
    const {state,actEnemy}=window.bossTest;
    const boss=state.enemies[0],ally=state.enemies[1];ally.hp=1;
    actEnemy(boss);const healed=ally.hp===1+Math.round(ally.maxHp*.12);
    ally.hp=ally.maxHp-1;actEnemy(boss);const capped=ally.hp===ally.maxHp;
    ally.hp=0;actEnemy(boss);return {healed,capped,dead:ally.hp===0};
  });
  assert.deepEqual(healing,{healed:true,capped:true,dead:true});
  await stage('orcs','burningWarlord');
  assert.equal(await page.evaluate(() => {
    const {state,actEnemy}=window.bossTest;const before=state.party.map(hero=>hero.hp);actEnemy(state.enemies[0]);
    return state.party.filter((hero,index)=>hero.hp<before[index]).length===1 && state.party.filter(hero=>hero.row==='back').every((hero,index)=>hero.hp===before[index+2]);
  }),true);

  // All eight encounters conclude the invasion and cannot continue beyond floor ten.
  for (const [flavor,choices] of Object.entries(CAMPAIGN_BOSSES)) for (const type of choices) {
    await stage(flavor,type);
    const result=await page.evaluate(()=>{
      const {state,updateBattle,continueExpedition,generateEnemies}=window.bossTest;
      const chosen=state.bossType;generateEnemies(10);const stable=state.bossType===chosen;
      state.enemies.forEach(enemy=>enemy.hp=0);state.battlePaused=false;updateBattle(1);
      const won=state.victoryAchieved&&state.view==='campaign_victory',copy=state.resultCopy;
      continueExpedition();return {stable,won,copy,floor:state.floor,stopped:state.view==='campaign_victory'};
    });
    assert.ok(result.stable&&result.won&&result.stopped);assert.equal(result.floor,10);assert.ok(result.copy.includes(BOSS_DEFINITIONS[type].label));
  }
  // Full timed fights use a day-nine company at its actual eight-hero capacity.
  for (const [flavor,choices] of Object.entries(CAMPAIGN_BOSSES)) for (const type of choices) {
    await stage(flavor,type,true);
    const outcome=await page.evaluate(()=>{
      const {state,updateBattle}=window.bossTest;
      for(let frame=0;frame<1900&&state.view==='battle';frame++) {
        state.battlePaused=false;state.commandMeter=0;updateBattle(50);
      }
      return {view:state.view,time:state.battleTime,victory:state.victoryAchieved};
    });
    assert.notEqual(outcome.view,'battle',`${type} never resolved`);
    assert.equal(outcome.view,'campaign_victory',`${type} should be beatable by a full late-campaign level-five company`);
  }
  await stage('undead','evilSpirit');
  assert.deepEqual(await page.evaluate(()=>{
    const t=window.bossTest;t.finishDay('Retreated.');t.advanceDay();
    const retained=t.state.bossType==='evilSpirit'&&t.state.day===2;
    t.resetCampaign();return {retained,reset:t.state.bossType===null&&t.state.day===1};
  }),{retained:true,reset:true});
  await stage('demons','infernalDragon');
  await page.evaluate(()=>window.bossTest.resetCampaign());
  await stage('undead','lich');
  assert.equal(await page.locator('.battle-unit.is-boss img').getAttribute('src'),'assets/enemies/lich.webp');
  for(const [name,width,height] of [['desktop',1440,1000],['phone',390,844],['small-phone',320,740],['landscape',844,390]]) {
    await page.setViewportSize({width,height});await stage('orcs','elderShaman');
    await page.evaluate(()=>Promise.all([...document.querySelectorAll('#battle-screen img')].map(image=>image.decode())));
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    assert.ok(await page.locator('[data-command]').evaluateAll((buttons,height)=>buttons.every(button=>button.getBoundingClientRect().bottom<=height),height));
    await page.screenshot({path:`output/boss-check/escort-${name}.png`});
  }
  assert.deepEqual(errors,[]);
  await page.setViewportSize({width:1100,height:1000});
  await page.setContent(`<style>body{background:#14212a;color:#efd39b;font:16px Georgia;padding:20px}main{display:grid;grid-template-columns:repeat(4,1fr);gap:20px}figure{margin:0;text-align:center}img{width:190px;height:230px;object-fit:contain}figcaption{margin-top:5px}</style><main>${[...Object.entries(BOSS_DEFINITIONS).map(([id,boss])=>[id,boss.label]),['goblin','Goblin'],['orc','Orc'],['goblinArcher','Goblin Archer'],['orcShaman','Orc Hexer']].map(([id,label])=>`<figure><img src="${baseURL}/assets/enemies/${id}.webp"><figcaption>${label}</figcaption></figure>`).join('')}</main>`);
  await page.evaluate(()=>Promise.all([...document.images].map(image=>image.decode())));
  await page.screenshot({path:'output/boss-check/portrait-gallery.png',fullPage:true});
  console.log('All 8 bosses: portraits, permanent gold borders, abilities, pause/freeze, escorts, victory/conclusion and four viewport layouts passed.');
  await context.close();
} finally {await browser.close();}
