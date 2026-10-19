import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const base = process.argv[2] ?? 'http://127.0.0.1:4188';
await mkdir('output/hero-defenses', {recursive:true});
const browser=await chromium.launch();
try {
  const context=await browser.newContext({viewport:{width:1440,height:1000}});
  await context.addInitScript(()=>{window.requestAnimationFrame=()=>0;Math.random=()=>.75;});
  await context.route('**/src/dungeon.js',async route=>{
    const response=await route.fetch();
    await route.fulfill({response,body:`${await response.text()}
      window.defenseTest={get state(){return state;},dealDamage,actEnemy,buildParty,makeEnemy,render,damageReductionFor,
        stage(){
          state.town.prefix={};state.town.settlement={};state.floor=1;state.flavorKey='undead';state.bossType=null;
          state.buildings=createTownBuildings();Math.random=()=>.75;
          state.party=buildParty(['knight','thief','ranger','mage'].map((type,index)=>({id:index+1,type,name:HERO_TYPES[type].label,level:1,active:true})));
          prepareFloor();state.enemies=[makeEnemy('orc')];state.enemies[0].damage=100;
          state.battlePaused=true;state.commandMeter=0;state.expeditionStartCount=4;render();
        }
      };`});
  });
  const page=await context.newPage();const errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',e=>{if(e.type()==='error')errors.push(e.text());});
  await page.goto(`${base}/dungeon.html`);await page.waitForFunction(()=>window.defenseTest);
  const stage=()=>page.evaluate(()=>window.defenseTest.stage());
  await stage();
  assert.equal(await page.locator('[data-rank="hero-front"] [data-unit-type="thief"]').count(),1);
  assert.equal(await page.locator('[data-rank="hero-back"] [data-unit-type="thief"]').count(),0);

  for (const targetIndex of [1,3]) {
    await stage();
    const result=await page.evaluate(index=>{
      const {state,dealDamage,render}=window.defenseTest;const [knight]=state.party,target=state.party[index];
      const before=target.hp;Math.random=()=>.1;const damage=dealDamage(target,100,state.enemies[0]);render();
      return {damage,hp:knight.hp,protected:target.hp===before,log:state.battleLog[0],trail:state.combatEffects.some(effect=>effect.kind==='intercept'&&effect.targetId===target.id)};
    },targetIndex);
    assert.equal(result.damage,20);assert.equal(result.hp,80);assert.ok(result.protected&&result.trail);assert.match(result.log,/intercepts/);
    assert.equal(await page.locator('[data-unit-type="knight"] .battle-unit__status').textContent(),'INTERCEPT');
    await page.screenshot({path:`output/hero-defenses/intercept-${targetIndex}.png`});
  }
  await stage();
  assert.deepEqual(await page.evaluate(()=>{
    const {state,dealDamage}=window.defenseTest;const [knight,rogue]=state.party;
    const values=[.5,.2];Math.random=()=>values.shift()??.9;
    const damage=dealDamage(rogue,100,state.enemies[0]);return {damage,knight:knight.hp,rogue:rogue.hp};
  }),{damage:25,knight:100,rogue:35});

  for(const roll of [.09999,.1]) {
    await stage();
    const result=await page.evaluate(roll=>{
      const {state,dealDamage,render}=window.defenseTest;state.party[0].frozenMs=1000;Math.random=()=>roll;
      const damage=dealDamage(state.party[1],100,state.enemies[0]);render();
      return {damage,hp:state.party[1].hp,meter:state.commandMeter,intercept:state.party[0].interceptFlash??0};
    },roll);
    assert.equal(result.damage,roll<.1?0:25);assert.equal(result.hp,roll<.1?60:35);assert.equal(result.intercept,0);
    if(roll<.1){assert.equal(result.meter,0);assert.equal(await page.locator('[data-unit-type="thief"] .battle-unit__status').textContent(),'EVADE');await page.screenshot({path:'output/hero-defenses/dodge.png'});}
  }

  await stage();
  assert.deepEqual(await page.evaluate(()=>{
    const {state,dealDamage,makeEnemy,actEnemy}=window.defenseTest;Math.random=()=>.2;
    actEnemy(makeEnemy('infernalDragon',1));return state.party.map(hero=>hero.hp);
  }),[87,44,80,50]);
  await stage();
  assert.match(await page.evaluate(()=>{
    const {state,makeEnemy,actEnemy}=window.defenseTest;state.party[0].hp=0;Math.random=()=>0;
    actEnemy(makeEnemy('infernalDragon',1));return state.battleLog[0];
  }),/front row evades/);
  await stage();
  assert.equal(await page.evaluate(()=>{
    const {state,actEnemy}=window.defenseTest;const values=[.75,.1,0];Math.random=()=>values.shift()??.9;
    actEnemy(state.enemies[0]);
    return state.battleLog.some(copy=>copy==='Orc strikes Knight.')&&!state.battleLog.some(copy=>copy==='Orc strikes Thief.');
  }),true);

  await stage();
  assert.equal(await page.evaluate(()=>{
    const {state,dealDamage}=window.defenseTest;state.divineAegisMs=1000;
    Math.random=()=>{throw Error('Invulnerability must not roll for interception or evasion');};
    return dealDamage(state.party[1],100,state.enemies[0]);
  }),0);

  for(const roll of [.89999,.9]) {
    await stage();
    assert.equal(await page.evaluate(roll=>{
      const {state,dealDamage}=window.defenseTest;state.party[0].hp=0;state.party[1].evasionChance=50;Math.random=()=>roll;
      return dealDamage(state.party[1],100,state.enemies[0]);
    },roll),roll<.9?0:25);
    await stage();
    assert.equal(await page.evaluate(roll=>{
      const {state,dealDamage}=window.defenseTest;state.party[2].critChance=50;Math.random=()=>roll;
      return dealDamage(state.enemies[0],100,state.party[2]);
    },roll),roll<.9?50:25);
  }
  await stage();
  assert.equal(await page.evaluate(()=>{
    const {state,dealDamage}=window.defenseTest;state.party[0].hp=0;const target=state.party[1];
    target.damageReduction=50;target.evasionChance=0;state.holdLineMs=1000;state.holdArmorBonus=50;state.town.prefix.enemyDamage=.01;Math.random=()=>.9;
    return dealDamage(target,400,state.enemies[0]);
  }),10);
  await stage();
  assert.equal(await page.evaluate(()=>{
    const {state,dealDamage}=window.defenseTest;state.holdLineMs=1000;state.holdArmorBonus=.1;state.town.prefix.enemyDamage=.99;
    Math.random=()=>.1;return dealDamage(state.party[1],400,state.enemies[0]);
  }),69);
  await stage();
  const fatal=await page.evaluate(()=>{
    const {state,dealDamage}=window.defenseTest;state.party[0].hp=1;Math.random=()=>.1;
    dealDamage(state.party[1],100,state.enemies[0]);return {knight:state.party[0].hp,rogue:state.party[1].hp,meter:state.commandMeter,log:state.battleLog};
  });
  assert.equal(fatal.knight,0);assert.equal(fatal.rogue,60);assert.equal(fatal.meter,.6);assert.ok(fatal.log.some(copy=>copy.includes('defeats Knight')));

  // Real build, town stacking and recruitment inspection all agree with combat stats.
  await stage();
  await page.evaluate(()=>{
    const {state,render}=window.defenseTest;state.view='tavern';state.rolledToday=true;
    state.town.prefix={evasion:.01};state.town.settlement={classType:'thief',evasion:.02};
    state.buildings.thief={level:4,pathA:3,pathB:0};
    state.offers=[{id:90,type:'thief',name:'Nyx',level:1,active:false},{id:91,type:'knight',name:'Aldric',level:1,active:false}];
    state.selectedOfferId=90;render();
  });
  assert.match(await page.locator('[data-offer="90"] small').textContent(),/Front row/);
  assert.match(await page.locator('.hero-dodge-help summary').textContent(),/Dodge\s+28%/);
  await page.screenshot({path:'output/hero-defenses/rogue-roster.png',fullPage:true});
  await page.locator('[data-offer="91"]').click();
  assert.match(await page.locator('.hero-behavior').textContent(),/50% chance to intercept/);
  assert.match(await page.locator('.hero-behavior').textContent(),/20% damage reduction/);

  for(const [name,width,height] of [['desktop',1440,1000],['phone',390,844],['small-phone',320,740],['landscape',844,390]]) {
    await page.setViewportSize({width,height});await stage();
    await page.evaluate(()=>{const {state,dealDamage,render}=window.defenseTest;Math.random=()=>.1;dealDamage(state.party[1],100,state.enemies[0]);render();});
    await page.evaluate(()=>Promise.all([...document.querySelectorAll('#battle-screen img')].map(image=>image.decode())));
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    assert.ok(await page.locator('[data-command]').evaluateAll((buttons,height)=>buttons.every(button=>button.getBoundingClientRect().bottom<=height),height));
    await page.screenshot({path:`output/hero-defenses/battle-${name}.png`});
  }
  await page.setViewportSize({width:1440,height:1000});await stage();
  await page.evaluate(()=>{const {state,render}=window.defenseTest;state.view='town';state.gold=100;render();});
  await page.locator('[data-district="thief"]').click();
  await page.locator('.town-inspector [data-open-upgrade="thief"]').click();
  const evasionUpgrade=page.locator('.town-upgrade-dialog [data-upgrade="thief"][data-path="pathA"]');
  assert.match(await evasionUpgrade.textContent(),/EVASION/);assert.match(await evasionUpgrade.textContent(),/\+5% dodge/);
  await evasionUpgrade.click();
  assert.deepEqual(await page.evaluate(()=>{
    const {state,buildParty}=window.defenseTest;const rogue=buildParty([{id:1,type:'thief',name:'Nyx',level:1}])[0];
    return {gold:state.gold,dodge:rogue.evasionChance,crit:rogue.critChance,row:rogue.row};
  }),{gold:97,dodge:.1+.05,crit:0,row:'front'});
  await page.screenshot({path:'output/hero-defenses/guild-upgrade.png',fullPage:true});
  await page.locator('[data-district="knight"]').click();
  assert.match(await page.locator('.town-inspector .town-benefit').textContent(),/20% damage reduction/);
  await page.screenshot({path:'output/hero-defenses/barracks.png',fullPage:true});
  assert.deepEqual(errors,[]);
  console.log('Rogue front/dodge, Knight interception/armor, AoE/shield/freeze/death, 90% runtime caps, roster stats and four battle layouts passed.');
  await context.close();
} finally {await browser.close();}
