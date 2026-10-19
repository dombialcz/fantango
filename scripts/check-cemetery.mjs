import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const base=process.argv[2]??'http://127.0.0.1:4188';
await mkdir('output/cemetery',{recursive:true});
const browser=await chromium.launch();
try{
  const context=await browser.newContext({viewport:{width:1440,height:1000}});
  await context.addInitScript(()=>{requestAnimationFrame=()=>0;Math.random=()=>.99;});
  await context.route('**/src/dungeon.js',async route=>{
    const response=await route.fetch();
    await route.fulfill({response,body:`${await response.text()}
      window.cemeteryTest={get state(){return state;},buildParty,dealDamage,makeEnemy,finishDay,advanceDay,render,upgradeTownBuilding,updateBattle,
        stage(){
          resetCampaign();state.day=3;state.floor=4;state.flavorKey='undead';state.town.prefix={};state.town.settlement={};
          const heroes=['knight','thief','cleric','mage'].map((type,index)=>({id:101+index,type,name:['Aldric','Nyx','Sabine','Vael'][index],level:[3,2,1,4][index],active:true}));
          state.bench=heroes;state.party=buildParty(heroes);state.expeditionStartIds=heroes.map(hero=>hero.id);state.expeditionStartCount=4;
          prepareFloor();state.enemies=[makeEnemy('skeleton')];state.party.forEach(unit=>unit.timer=Infinity);state.enemies[0].timer=Infinity;state.battlePaused=true;render();
        },
        town(){state.view='town';render();}
      };`});
  });
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',e=>{if(e.type()==='error')errors.push(e.text());});
  await page.goto(`${base}/dungeon.html`);await page.waitForFunction(()=>window.cemeteryTest);
  const snapshot=()=>page.evaluate(()=>JSON.parse(render_game_to_text()));
  assert.equal(await page.locator('[data-district]').count(),10);
  const card=page.locator('[data-district="cemetery"]');
  const originalGold=(await snapshot()).gold;await card.click();
  assert.equal(await page.locator('.town-inspector .cemetery-empty').count(),1);
  assert.equal(await page.locator('.town-inspector [data-upgrade]').count(),0);
  assert.equal(await card.locator('.gold-coin').count(),0);
  assert.equal((await snapshot()).gold,originalGold);assert.equal((await snapshot()).cemetery.fallenCount,0);
  assert.equal(await card.locator('.town-district__level').textContent(),'MEMORIAL');
  await card.locator('img').evaluate(image=>image.decode());
  await page.screenshot({path:'output/cemetery/empty-desktop.png',fullPage:true});

  await page.evaluate(()=>window.cemeteryTest.stage());
  const intercepted=await page.evaluate(()=>{
    const {state,dealDamage,render}=window.cemeteryTest;const [knight,rogue]=state.party;
    knight.hp=1;const hp=rogue.hp,max=rogue.maxHp;Math.random=()=>.1;
    dealDamage(rogue,100000,state.enemies[0]);render();
    return {grave:state.graves[0],count:state.graves.length,hp:rogue.hp,before:hp,max:rogue.maxHp,oldMax:max,knightDead:knight.hp===0};
  });
  assert.ok(intercepted.knightDead);assert.equal(intercepted.count,1);
  assert.equal(intercepted.grave.name,'Aldric');assert.equal(intercepted.grave.level,3);
  assert.equal(intercepted.grave.killer,'Skeleton');assert.equal(intercepted.grave.day,3);assert.equal(intercepted.grave.floor,4);
  assert.equal(intercepted.hp,intercepted.before);assert.equal(intercepted.max,Math.round(intercepted.oldMax*1.01));
  await page.locator('.battle-unit img').evaluateAll(images=>Promise.all(images.map(image=>image.decode())));
  await page.screenshot({path:'output/cemetery/fatal-intercept.png'});
  await page.evaluate(()=>{const {state,dealDamage}=window.cemeteryTest;dealDamage(state.party[0],10000,state.enemies[0]);});
  assert.equal((await snapshot()).cemetery.fallenCount,1);

  // Returning next morning must not lose the archived hero or the passive.
  await page.evaluate(()=>{const t=window.cemeteryTest;t.finishDay('Returned.');t.advanceDay();t.render();});
  assert.equal((await snapshot()).day,4);assert.equal((await snapshot()).cemetery.healthBonusPercent,1);
  await card.click();const detail=page.locator('.town-inspector');
  assert.match(await detail.locator('.cemetery-register').textContent(),/Aldric/);
  assert.match(await detail.locator('.cemetery-register').textContent(),/LV 3/);
  assert.match(await detail.locator('.cemetery-register').textContent(),/Day 3 · Floor 4/);
  assert.match(await detail.locator('.cemetery-register').textContent(),/Slain by Skeleton/);
  assert.match(await detail.locator('.cemetery-register').textContent(),/Undead Uprising/);
  await page.screenshot({path:'output/cemetery/remembered-desktop.png',fullPage:true});
  await page.evaluate(()=>{const {state,upgradeTownBuilding,render}=window.cemeteryTest;const gold=state.gold;upgradeTownBuilding('cemetery');if(state.gold!==gold)throw Error('Cemetery must not cost gold');render();});
  await page.locator('.town-panorama [data-town-action="close"]').click();
  await page.evaluate(()=>{Math.random=()=>.05;});await page.locator('[data-roster-action="roll"]').click();await page.evaluate(()=>advanceTime(1500));
  await page.locator('[data-offer]').first().click();
  assert.equal(await page.locator('.hero-stats span').nth(1).locator('b').textContent(),'101');
  assert.match(await page.locator('.hero-town-bonus').textContent(),/\+1% maximum health from the Cemetery/);
  await page.screenshot({path:'output/cemetery/recruit-bonus.png',fullPage:true});

  // Names need not be unique; hero IDs must be. Each real death counts once.
  await page.evaluate(()=>{
    const t=window.cemeteryTest;t.stage();const {state,dealDamage,buildParty}=t;
    const heroes=[1,2,3,4].map(id=>({id,type:'knight',name:'Aldric',level:id,active:true}));
    state.party=buildParty(heroes);Math.random=()=>.99;
    dealDamage(state.party[0],100000,state.enemies[0],{area:true});
    dealDamage(state.party[1],100000,state.enemies[0],{area:true});
  });
  assert.equal((await snapshot()).cemetery.fallenCount,2);
  assert.deepEqual((await snapshot()).cemetery.graves.map(grave=>grave.level),[1,2]);
  assert.equal((await snapshot()).party[0].cemeteryBonusPercent,2);

  // The real maximum-health calculation stacks buildings, town and Bard power once.
  const stacking=await page.evaluate(()=>{
    const {state,buildParty}=window.cemeteryTest;
    state.town.prefix={health:1.01};state.buildings.knight={level:4,pathA:2,pathB:1};
    const party=buildParty([{id:20,type:'knight',name:'A',level:1},{id:21,type:'bard',name:'B',level:1}]);
    return {hp:party[0].maxHp,expected:Math.round(100*1.2*1.3*1.01*1.02)};
  });assert.equal(stacking.hp,stacking.expected);

  // Full losses survive the party being emptied; bosses retain their own killer name.
  await page.evaluate(()=>{
    const t=window.cemeteryTest;t.stage();const {state,dealDamage,makeEnemy,updateBattle}=t;
    state.flavorKey='demons';state.floor=10;Math.random=()=>.99;
    const boss=makeEnemy('infernalDragon');state.enemies=[boss];boss.timer=Infinity;
    for(const hero of state.party)dealDamage(hero,100000,boss,{area:true});
    state.battlePaused=false;updateBattle(1);t.render();
  });
  assert.equal((await snapshot()).view,'day_result');assert.equal((await snapshot()).party.length,0);
  assert.equal((await snapshot()).cemetery.fallenCount,4);
  assert.ok((await snapshot()).cemetery.graves.every(grave=>grave.killer==='Infernal Dragon'&&grave.floor===10&&grave.campaignName==='Demonic Invasion'));
  await page.evaluate(()=>{const t=window.cemeteryTest;t.advanceDay();t.render();});
  await card.click();await page.screenshot({path:'output/cemetery/boss-loss.png',fullPage:true});
  assert.equal(await detail.locator('[data-grave]').count(),4);

  // Dismissal and unclaimed offers do not create graves.
  await page.locator('[data-town-action="reset"]').click();
  assert.equal((await snapshot()).cemetery.fallenCount,0);
  assert.equal(await detail.locator('.cemetery-empty').count(),1);
  await page.evaluate(()=>{
    const {state,render}=window.cemeteryTest;state.view='tavern';state.rolledToday=true;
    state.bench=[{id:500,type:'knight',name:'Dismissed',level:1,active:true}];state.selectedHeroId=500;render();
  });
  await page.locator('[data-roster-action="dismiss"]').click();
  assert.equal((await snapshot()).bench.length,0);assert.equal((await snapshot()).cemetery.fallenCount,0);

  for(const [name,width,height] of [['desktop',1440,1000],['phone',390,844],['small-phone',320,740],['landscape',844,390]]){
    await page.setViewportSize({width,height});
    await page.evaluate(()=>{
      const t=window.cemeteryTest;t.stage();const {state,dealDamage}=t;Math.random=()=>.99;
      dealDamage(state.party[0],100000,state.enemies[0],{area:true});t.town();
    });
    await card.click();
    const active=page.locator(width<=760?'.town-sheet':'.town-inspector');
    await active.locator('.town-art img').evaluate(image=>image.decode());
    assert.equal(await active.locator('[data-upgrade]').count(),0);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    assert.equal(await active.locator('.cemetery-grave').count(),1);
    await active.locator('.cemetery-register-heading').scrollIntoViewIfNeeded();
    await page.screenshot({path:`output/cemetery/memorial-${name}.png`,fullPage:width>760});
    if(width<=760){await page.locator('[data-town-action="dismiss"]').click();await card.focus();assert.equal(await card.evaluate(node=>node===document.activeElement),true);}
  }
  // A busy ten-day memorial stays scrollable rather than growing beyond its panel.
  await page.setViewportSize({width:320,height:740});
  await page.evaluate(()=>{
    const {state,render}=window.cemeteryTest;
    const grave=state.graves[0];state.graves=Array.from({length:60},(_,index)=>({...grave,heroId:1000+index,name:`Fallen hero ${index+1}`}));render();
  });
  await card.click();
  const ledger=page.locator('.town-sheet .cemetery-register');
  assert.equal(await ledger.locator('[data-grave]').count(),60);
  assert.ok(await ledger.evaluate(node=>node.scrollHeight>node.clientHeight));
  await ledger.locator('[data-grave]').last().scrollIntoViewIfNeeded();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.screenshot({path:'output/cemetery/full-ledger-phone.png'});
  await page.keyboard.press('Escape');assert.equal(await page.locator('.town-sheet').isVisible(),false);
  assert.deepEqual(errors,[]);
  console.log('Cemetery: exact fatal-hit records/intercepts/bosses, deduplication, additive live/no-heal health, recruits/stacking, daily persistence, campaign reset, no dismissal/upgrade cost and four viewports passed.');
  await context.close();
}finally{await browser.close();}
