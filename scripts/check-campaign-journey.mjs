import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const base = process.argv[2] ?? 'http://127.0.0.1:4192';
await mkdir('output/campaign-journey', {recursive:true});
const browser = await chromium.launch();
const context = await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});
await context.addInitScript(()=>{window.requestAnimationFrame=()=>0;Math.random=()=>.75;});
await context.route('**/src/dungeon.js',async route=>{
  const source = await readFile('src/dungeon.js','utf8');
  await route.fulfill({contentType:'text/javascript',body:source+`
    window.journeyTest={get state(){return state;},ENEMY_TYPES,render,persist,createCampaign,buildParty,prepareFloor,updateBattle,finishFloor,finishDay,advanceDay,
      startExpedition,dealDamage,concludeCampaign,continueExpedition,defendNextTown,chooseLegacy,chooseVeteran,makeHero,heroEffects,heroInterval,makeEnemy,
      stage(flavor='orcs',boss='burningWarlord',journey=null){
        state=createCampaign(journey??createJourney());state.flavorKey=flavor;state.bossType=boss;state.day=6;state.floor=10;
        state.bench=['knight','cleric','ranger','mage'].map((type,i)=>({id:100+i,name:['Aldric','Elara','Rowan','Mira'][i],type,level:5,active:true}));
        state.party=buildParty(state.bench);state.expeditionStartCount=4;state.expeditionStartIds=state.bench.map(h=>h.id);
        state.events.plan[0].at=1;prepareFloor();state.battlePaused=true;render();
      },win(){state.enemies.forEach(e=>e.hp=0);state.battlePaused=false;updateBattle(50);render();}
    };`});
});
const page = await context.newPage(); const errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',e=>{if(e.type()==='error')errors.push(e.text());});
const snapshot=()=>page.evaluate(()=>JSON.parse(render_game_to_text()));
const reload=async()=>{await page.reload();await page.waitForFunction(()=>window.journeyTest);};
try {
  await page.goto(`${base}/dungeon.html`);await page.waitForFunction(()=>window.journeyTest);
  await page.evaluate(()=>window.journeyTest.stage());
  // Killing only the boss does not conclude while guards remain.
  await page.evaluate(()=>{const t=window.journeyTest;t.state.bossType='elderShaman';t.prepareFloor();t.state.enemies[0].hp=0;t.state.battlePaused=false;t.updateBattle(1);t.state.battlePaused=true;t.render();});
  assert.equal((await snapshot()).view,'battle');
  await page.evaluate(()=>{const t=window.journeyTest;t.dealDamage(t.state.party[3],100000,t.state.enemies[1]);t.state.chronicle.push({day:6,floor:9,category:'event',text:'At the cage, we chose to free the prisoner. The company pressed on.'});t.win();});
  let s=await snapshot();assert.equal(s.view,'campaign_victory');assert.equal(s.events.pending,null);
  assert.equal(s.conclusion.clears,1);assert.equal(s.conclusion.survivors.length,3);assert.equal(s.journey.levelCap,5);
  assert.match(await page.locator('.victory-header').innerText(),/Elder Shaman/);
  assert.match(await page.locator('.victory-footer').innerText(),/50% more health than in the previous invasion/);
  assert.match(await page.locator('.victory-story').textContent(),/free the prisoner/);
  await page.locator('.victory-story summary').click();
  assert.match(await page.locator('.victory-story details').innerText(),/Mira.*Mage/);
  assert.equal(await page.locator('[data-battle-action="continue"]').isVisible(),false);
  await page.evaluate(()=>window.journeyTest.continueExpedition());await page.keyboard.press('Enter');assert.equal((await snapshot()).floor,10);
  await page.evaluate(()=>advanceTime(5000));assert.equal((await snapshot()).view,'campaign_victory');
  const next=page.locator('[data-victory-action="continue"]');assert.equal(await next.isDisabled(),true);
  await page.locator('[data-legacy="orc-health"]').click();await page.locator('[data-veteran="100"]').click();await page.locator('[data-veteran="101"]').click();
  assert.equal(await page.locator('[data-veteran="102"]').isDisabled(),true);
  await reload();s=await snapshot();assert.deepEqual(s.journey.selectedVeterans,[100,101]);assert.equal(s.journey.selectedReward,'orc-health');
  assert.equal(await next.isEnabled(),true);
  for(const [name,width,height] of [['desktop',1440,1000],['phone',390,844],['small',320,740],['landscape',844,390]]){
    await page.setViewportSize({width,height});await page.evaluate(()=>Promise.all([...document.querySelectorAll('#victory-screen img')].map(img=>img.decode())));
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await page.screenshot({path:`output/campaign-journey/victory-${name}.png`,fullPage:true});
  }
  await page.setViewportSize({width:1440,height:1000});
  const saved=await page.evaluate(()=>{window.journeyTest.persist();return localStorage.getItem('vaultbound:campaign:v1');});
  await writeFile('output/campaign-journey/client.html',(await readFile('dungeon.html','utf8')).replace('<head>',`<head><base href="/"><script>localStorage.setItem('vaultbound:campaign:v1',${JSON.stringify(saved)});</script>`));
  await page.locator('[data-victory-action="chronicle"]').click();assert.equal(await page.locator('.chronicle-dialog').isVisible(),true);
  assert.match(await page.locator('.chronicle-entries').innerText(),/Elder Shaman has fallen/);await page.locator('.chronicle-dialog [data-close]').click();
  await next.click();assert.equal(await page.evaluate(()=>scrollY),0);s=await snapshot();assert.equal(s.view,'town');assert.equal(s.day,1);assert.equal(s.floor,0);
  assert.notEqual(s.flavor.key,'orcs');assert.equal(s.journey.levelCap,6);assert.equal(s.bench.length,2);assert.deepEqual(s.bench.map(h=>h.name),['Aldric','Elara']);
  assert.ok(Object.values(s.buildings).every(b=>b.level===1));assert.equal(s.cemetery.fallenCount,0);assert.equal(s.events.clears,0);
  const hpBonus=await page.evaluate(()=>window.journeyTest.heroEffects('ranger').healthMultiplier);assert.ok(hpBonus>=1.2);
  await page.evaluate(()=>window.journeyTest.defendNextTown());assert.equal((await snapshot()).journey.completed.length,1);
  await reload();assert.equal((await snapshot()).journey.levelCap,6);
  // Training, survival levels, and recruitment share the unlocked cap.
  await page.locator('.town-panorama [data-town-action="close"]').click();
  await page.evaluate(()=>{const t=window.journeyTest;t.state.gold=100;t.state.selectedHeroId=100;t.render();});
  await page.locator('[data-roster-action="upgrade"]').click();s=await snapshot();assert.equal(s.bench[0].level,6);assert.equal(s.gold,75);
  assert.equal(await page.locator('[data-roster-action="upgrade"]').isDisabled(),true);
  const recruit=await page.evaluate(()=>{
    const t=window.journeyTest;t.state.day=2;t.state.selectionHistory=[{day:1,counts:{knight:1,cleric:1,ranger:1,mage:0,bard:1,thief:1,barbarian:1}}];Math.random=()=>0;
    const hero=t.makeHero('mage',5);Math.random=()=>.75;return hero;
  });assert.equal(recruit.level,6);assert.equal(recruit.selectionLevelBonus,1);
  await page.evaluate(()=>{const t=window.journeyTest;t.state.view='tavern';t.startExpedition(true);t.state.battlePaused=true;t.finishDay('Returned',null,'automatic');t.advanceDay();t.render();});
  assert.equal((await snapshot()).bench.find(h=>h.id===101).level,6);
  // Every legacy is observable in live stats/resources, including event overrides and dawn income.
  const perks=await page.evaluate(()=>{
    const t=window.journeyTest, journeys=(ids)=>({completed:[{flavorKey:'orcs'}],legacies:ids});
    t.stage('demons','infernalDragon',journeys([]));t.state.town.prefix={};t.state.town.settlement={};const base=t.heroEffects('ranger');
    t.state.journey.legacies=['orc-damage','demon-crit','guild-evasion'];const offense=t.heroEffects('ranger');
    t.state.journey.legacies=['orc-health','demon-armor','undead-command'];const defense=t.heroEffects('ranger');
    t.state.floor=1;t.state.events.nextCommand=null;t.prepareFloor();const command=t.state.commandMeter;
    t.state.events.nextCommand=0;t.prepareFloor();const overridden=t.state.commandMeter;
    const one={...t.state.bench[0],level:5},high={...one,level:8};const units=t.buildParty([one,high]);const speeds=units.map(t.heroInterval);
    t.stage('demons','infernalDragon',journeys(['guild-gold']));const starting=t.createCampaign(t.state.journey).gold;
    t.state.town.settlement={};t.finishDay('Returned');const gold=t.state.gold;t.advanceDay();
    return {base,offense,defense,command,overridden,speeds,starting,income:t.state.gold-gold};
  });
  assert.equal(perks.offense.damageMultiplier,perks.base.damageMultiplier*1.1);assert.equal(perks.offense.critChance,perks.base.critChance+.05);
  assert.equal(perks.offense.evasionChance,perks.base.evasionChance+.05);assert.equal(perks.defense.healthMultiplier,perks.base.healthMultiplier*1.2);
  assert.equal(perks.defense.damageReduction,perks.base.damageReduction+.05);assert.equal(perks.command,80);assert.equal(perks.overridden,0);
  assert.equal(perks.speeds[0],perks.speeds[1]);assert.ok(perks.starting>=13);assert.equal(perks.income,3);
  // Probability boundaries and guaranteed maximum recovery, one potion only.
  for(const [level,legacy,roll,expected] of [[1,false,.0999,true],[1,false,.1,false],[5,false,.4999,true],[5,false,.5,false],[1,true,.5999,true],[1,true,.6,false],[5,true,.9999,true]]){
    await page.evaluate(({level,legacy,roll})=>{const t=window.journeyTest;t.stage('demons','infernalDragon');t.state.floor=1;t.state.events.plan[0].at=999;t.state.journey.legacies=legacy?['undead-potions']:[];t.state.buildings.alchemist.level=level;t.state.potionsRemaining=0;Math.random=()=>roll;t.finishFloor();t.render();},{level,legacy,roll});
    assert.equal((await snapshot()).potions.remaining,expected?1:0);
  }
  // All four factions appear once; caps reach eight; the last win has a proper ending.
  await page.evaluate(()=>window.journeyTest.stage('orcs','burningWarlord'));const seen=[];
  for(let invasion=1;invasion<=4;invasion++){
    s=await snapshot();seen.push(s.flavor.key);
    assert.equal(s.journey.levelCap,Math.min(8,4+invasion));
    assert.equal(s.journey.enemyHealthMultiplier,[1,1.5,2.25,3.375][invasion-1]);
    if(invasion>1){
      await page.evaluate(()=>{const t=window.journeyTest;t.state.view='tavern';t.state.gold=100;t.state.selectedHeroId=t.state.bench[0].id;t.render();});
      await page.locator('[data-roster-action="upgrade"]').click();
      assert.equal((await snapshot()).bench[0].level,4+invasion);
      assert.equal(await page.locator('[data-roster-action="upgrade"]').isDisabled(),true);
      await page.evaluate(()=>{const t=window.journeyTest;t.startExpedition(true);t.state.battlePaused=true;t.render();});
      const veteran=(await snapshot()).party[0];assert.equal(veteran.hp,veteran.maxHp);
      const enemies = await page.evaluate(() => {
        const t = window.journeyTest;
        return t.state.enemies.map(enemy => ({hp:enemy.maxHp, baseHp:t.ENEMY_TYPES[enemy.type].hp}));
      });
      assert.ok(enemies.length > 0);
      for (const enemy of enemies) assert.equal(enemy.hp,Math.round(enemy.baseHp * 1.1 * [1,1.5,2.25,3.375][invasion-1]));
      if(invasion===4){assert.equal(veteran.level,8);assert.ok(veteran.maxHp>=590);await page.screenshot({path:'output/campaign-journey/level-eight.png'});}
    }
    await page.evaluate(invasion=>{const t=window.journeyTest;t.state.floor=10;t.state.bossType=({orcs:'burningWarlord',undead:'lich',demons:'infernalDragon',assassins:'guildMaster'})[t.state.flavorKey];t.prepareFloor();if(invasion===1)t.dealDamage(t.state.party[3],100000,t.state.enemies[0]);t.win();},invasion);
    assert.equal((await snapshot()).view,'campaign_victory');
    if(invasion===4)break;
    await page.locator('[data-legacy]').first().click();
    if((await snapshot()).journey.selectedVeterans.length<2){await page.locator('[data-veteran]').nth(0).click();await page.locator('[data-veteran]').nth(1).click();}
    await page.locator('[data-victory-action="continue"]').click();
    await page.evaluate(()=>{const t=window.journeyTest;t.state.party=t.buildParty(t.state.bench);t.state.expeditionStartCount=t.state.party.length;});
    assert.equal((await snapshot()).day,1);assert.equal((await snapshot()).floor,0);
  }
  assert.equal(new Set(seen).size,4);s=await snapshot();assert.equal(s.journey.complete,true);assert.match(await page.locator('.victory-story details').textContent(),/Mira.*Mage/);
  assert.equal(await page.locator('[data-victory-action="continue"]').count(),0);assert.match(await page.locator('.victory-header').innerText(),/JOURNEY COMPLETE/);
  await page.screenshot({path:'output/campaign-journey/final.png',fullPage:true});
  const download=page.waitForEvent('download');await page.locator('[data-victory-action="download"]').click();const file=await download;assert.equal(file.suggestedFilename(),'vaultbound-journey.md');const text=await readFile(await file.path(),'utf8');for(const name of ['Orc Warband','Undead Uprising','Demonic Invasion','Assassins’ Guild'])assert.ok(text.includes(name));
  await reload();assert.equal((await snapshot()).journey.complete,true);
  await page.locator('[data-victory-action="reset"]').click();s=await snapshot();assert.equal(s.day,1);assert.equal(s.journey.levelCap,5);assert.equal(s.journey.legacies.length,0);assert.equal(s.bench.length,0);
  assert.equal(s.journey.enemyHealthMultiplier,1);
  // A legacy victory save is upgraded to the conclusion rather than allowing floor eleven.
  await page.evaluate(()=>{const t=window.journeyTest;t.stage();t.state.victoryAchieved=true;t.state.victoryDay=4;t.state.view='floor_result';delete t.state.journey;delete t.state.conclusion;delete t.state.campaignId;t.persist();});
  await reload();s=await snapshot();assert.equal(s.view,'campaign_victory');assert.equal(s.conclusion.day,4);
  assert.equal(s.journey.enemyHealthMultiplier,1);
  assert.deepEqual(errors,[]);
  console.log('Journey: immediate boss-clear conclusion, event priority, saved choices, carryovers/resets, all legacies, caps/training/recruitment/survival/speed, recovery boundaries, four distinct invasions/final ending/download/reset, migration and four layouts passed.');
}finally{await browser.close();}
