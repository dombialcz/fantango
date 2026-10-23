import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const base=process.argv[2]??'http://127.0.0.1:4188';
await mkdir('output/class-balance',{recursive:true});
const browser=await chromium.launch();
try {
  const context=await browser.newContext({viewport:{width:1440,height:1000}});
  await context.addInitScript(()=>{requestAnimationFrame=()=>0;Math.random=()=>.99;});
  await context.route('**/src/dungeon.js',async route=>{
    const response=await route.fetch();
    await route.fulfill({response,body:`${await response.text()}
      window.balanceTest={get state(){return state;},buildParty,makeHero,startExpedition,finishDay,advanceDay,render,persist,actHero,makeEnemy,dealDamage,selectionBonus,
        stage(){resetCampaign();state.town.prefix={};state.town.settlement={};state.view='tavern';
          state.bench=['knight','knight','knight','thief','knight'].map((type,index)=>({id:100+index,type,name:HERO_TYPES[type].label+' '+index,level:1,active:index<4}));
          state.selectedHeroId=100;state.events.plan.forEach(event=>event.at=9999);render();},
        roster(){state.view='tavern';render();}
      };`});
  });
  const page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  await page.goto(`${base}/dungeon.html`);await page.waitForFunction(()=>window.balanceTest);
  const snapshot=()=>page.evaluate(()=>JSON.parse(render_game_to_text()));
  await page.evaluate(()=>window.balanceTest.stage());
  assert.deepEqual((await snapshot()).classBalance.offerBonus.classes,[]);
  assert.match(await page.locator('.reel-variety').textContent(),/No bonus yet/);
  assert.match(await page.locator('.company-balance').textContent(),/Knight ×3.*−20%/);
  assert.equal(await page.locator('.company-hero.is-crowded').count(),3);
  assert.equal(await page.locator('.hero-stats span').nth(1).locator('b').textContent(),'80');
  assert.equal(await page.locator('.hero-stats span').nth(2).locator('b').textContent(),'64');
  assert.match(await page.locator('.hero-balance-note').textContent(),/Crowded ranks.*−20% health & damage/);
  await page.locator('[data-hero="104"]').click();
  assert.equal(await page.locator('.hero-stats span').nth(1).locator('b').textContent(),'100'); // Reserve is not penalized.

  await page.locator('[data-roster-action="cancel-swap"]').click();

  // A single click reserves a hero and removes the penalty immediately in preparation.
  await page.locator('[data-hero="102"]').click();
  assert.equal(await page.locator('.company-hero.is-crowded').count(),0);
  await page.locator('[data-hero="100"]').click();
  assert.equal(await page.locator('.hero-stats span').nth(1).locator('b').textContent(),'100');
  await page.locator('[data-roster-action="cancel-swap"]').click();
  await page.locator('[data-hero="102"]').click();

  await page.locator('[data-roster-action="start"]').click();
  if (await page.locator('.roster-departure-dialog').evaluate(dialog => dialog.open)) await page.locator('[data-departure="confirm"]').click();
  let state=await snapshot();
  assert.equal(state.classBalance.selectionHistory.length,1);
  assert.equal(state.classBalance.selectionHistory[0].counts.knight,3); // Excludes fourth Knight on the bench.
  assert.equal(state.party[0].maxHp,80);assert.equal(state.party[0].crowdingPenaltyPercent,20);
  assert.equal(state.party[3].maxHp,60);assert.equal(state.party[3].evasionChance,.1);
  assert.equal(state.party[0].damageMultiplier,.8);
  assert.equal(await page.locator('[data-unit="hero-100"] .battle-unit__status').textContent(),'CROWDED −20%');
  const strike=await page.evaluate(()=>{
    const {state,actHero,makeEnemy}=window.balanceTest;state.enemies=[makeEnemy('skeleton')];
    state.enemies[0].hp=1000;state.enemies[0].maxHp=1000;state.enemies[0].damageReduction=0;
    const before=state.enemies[0].hp;actHero(state.party[0]);return before-state.enemies[0].hp;
  });assert.equal(strike,16); // 80 damage × .8 crowding × .25 battle pacing.
  await page.evaluate(()=>{const {state,dealDamage,render}=window.balanceTest;dealDamage(state.party[0],100000,state.enemies[0],{area:true});state.battlePaused=true;render();});
  state=await snapshot();assert.equal(state.party[0].crowdingPenaltyPercent,20);
  assert.equal(state.party[0].maxHp,81); // Cemetery stacks on the already-penalized base; death cannot clear crowding.
  await page.locator('#battle-screen img').evaluateAll(images=>Promise.all(images.map(image=>image.decode())));
  await page.screenshot({path:'output/class-balance/battle.png'});

  await page.evaluate(()=>{const t=window.balanceTest;t.finishDay('Test return');t.advanceDay();t.state.view='tavern';t.render();});
  state=await snapshot();
  assert.deepEqual(state.classBalance.offerBonus.days,[1]);
  assert.deepEqual(state.classBalance.offerBonus.classes,['bard','cleric','barbarian','ranger','mage']);
  const existingLevels=state.bench.map(hero=>hero.level);
  await page.locator('[data-roster-action="roll"]').click();await page.evaluate(()=>advanceTime(1500));
  state=await snapshot();assert.ok(state.offers.every(hero=>hero.class==='mage'&&hero.level===2&&hero.selectionLevelBonus===1));
  assert.deepEqual(state.bench.map(hero=>hero.level),existingLevels); // Not a recurring survivor level-up.
  assert.equal(await page.locator('.contract-variety').count(),6);
  await page.locator('[data-offer]').first().click();assert.match(await page.locator('.hero-balance-note').textContent(),/\+1 underused-class level/);

  // Tavern level-four rolls can now become level-five underused-class offers.
  await page.evaluate(()=>{
    const t=window.balanceTest;t.state.gold=100;t.state.buildings.tavern.level=5;
    let draw=0;Math.random=()=>[.99,.99,0,0,0,.05][draw++%6];t.render();
  });
  await page.locator('[data-roster-action="roll"]').click();await page.evaluate(()=>advanceTime(1500));
  assert.ok((await snapshot()).offers.every(hero=>hero.level===5&&hero.selectionLevelBonus===1));
  const hireId=(await snapshot()).offers[0].id;await page.locator(`[data-hire="${hireId}"]`).click();
  assert.equal((await snapshot()).bench.find(hero=>hero.id===hireId).level,5);
  assert.match(await page.locator('[data-roster-action="upgrade"]').textContent(),/Maximum level reached/);

  // Day-two departure updates tomorrow only. Day four drops day one's counts.
  const days=await page.evaluate(()=>{
    const t=window.balanceTest;Math.random=()=>.99;
    t.state.bench=['bard','cleric','barbarian','ranger'].map((type,index)=>({id:200+index,type,name:type,level:1,active:true}));
    t.startExpedition(true);const during=t.selectionBonus();t.finishDay('Test return');t.advanceDay();const day3=t.selectionBonus();
    t.state.view='tavern';t.state.bench=['mage','thief','knight','knight'].map((type,index)=>({id:300+index,type,name:type,level:1,active:true}));
    t.startExpedition(true);t.finishDay('Test return');t.advanceDay();t.render();
    return {during,day3,day4:t.selectionBonus()};
  });
  assert.deepEqual(days.during.classes,['bard','cleric','barbarian','ranger','mage']);
  assert.deepEqual(days.day3.classes,['mage']);assert.deepEqual(days.day4.days,[2,3]);
  assert.deepEqual(days.day4.classes,['thief','bard','cleric','barbarian','ranger','mage']);

  await page.reload();await page.waitForFunction(()=>window.balanceTest);
  assert.deepEqual((await snapshot()).classBalance.offerBonus,days.day4); // Saved rolling history survives reload.
  // Legacy saves initialize the missing history without destroying their campaign.
  await page.evaluate(()=>{const key='vaultbound:campaign:v1';const saved=JSON.parse(localStorage.getItem(key));delete saved.state.selectionHistory;delete window.balanceTest.state.selectionHistory;localStorage.setItem(key,JSON.stringify(saved));});
  await page.reload();await page.waitForFunction(()=>window.balanceTest);
  assert.equal((await snapshot()).day,4);assert.deepEqual((await snapshot()).classBalance.selectionHistory,[]);

  for(const [label,width,height] of [['desktop',1440,1000],['phone',390,844],['small-phone',320,740],['landscape',844,390]]) {
    await page.setViewportSize({width,height});
    await page.evaluate(()=>{const t=window.balanceTest;t.stage();t.state.day=3;t.state.selectionHistory=[{day:1,counts:{knight:4}},{day:2,counts:{knight:3,thief:1}}];t.state.offers=[{id:999,type:'mage',name:'Vael',level:5,selectionLevelBonus:1,active:false}];t.state.rolledToday=true;t.state.selectedHeroId=100;t.render();});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,label);
    assert.equal(await page.locator('.company-hero.is-crowded').count(),3);
    await page.locator('.reel-variety').scrollIntoViewIfNeeded();
    await page.screenshot({path:`output/class-balance/roster-${label}.png`,fullPage:true});
  }
  await page.locator('[data-roster-action="town"]').first().click();await page.locator('[data-town-action="reset"]').click();
  assert.equal((await snapshot()).day,1);assert.deepEqual((await snapshot()).classBalance.selectionHistory,[]);
  assert.deepEqual(errors,[]);
  console.log('Class balance: two-day/tie bonuses, real rolls and L5 hiring, departure-only counts, reserves, roster preview, 20% combat penalty, Cemetery stacking, saved/legacy/reset history, Thief 10% dodge and four responsive layouts passed.');
} finally {await browser.close();}
