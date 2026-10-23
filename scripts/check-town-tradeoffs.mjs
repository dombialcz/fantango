import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const base=process.argv[2]??'http://127.0.0.1:4198';
await mkdir('output/town-tradeoffs',{recursive:true});
const browser=await chromium.launch();
try {
 const context=await browser.newContext({viewport:{width:1440,height:1000}});
 await context.addInitScript(()=>{requestAnimationFrame=()=>0;Math.random=()=>.99});
 await context.route('**/src/dungeon.js',async route=>{
  const response=await route.fetch();
  await route.fulfill({response,body:`${await response.text()}\nwindow.tradeoffTest={get state(){return state},render,buildParty,heroEffects,actHero,heroCommandDamageMultiplier,heroInterval,battleUnitDetails,createCampaign,persist,advanceDay,
    async stage(type='cleric',stat='power'){
      const {PREFIXES,SETTLEMENTS,GEOGRAPHIES,createTownIdentity,townPenaltyText}=await import('./town-identity.js');
      const rolls=[1.5/PREFIXES.length,7.5/SETTLEMENTS.length,(GEOGRAPHIES.findIndex(g=>g.classType===type)+.5)/GEOGRAPHIES.length,.1,.1];
      state.town={...createTownIdentity(()=>rolls.shift()),penalty:{classType:type,stat,multiplier:.8}};
      state.town.bonuses=[state.town.prefix.bonus,state.town.settlement.bonus,townPenaltyText(state.town.penalty)];
      state.journey=createJourney();state.graves=[];state.buildings=createTownBuildings();state.view='town';state.day=1;state.floor=1;state.gold=20;state.party=[];
      state.bench=[{id:501,type,name:'Affected hero',level:1,active:true}];
      state.offers=[{id:502,type,name:'New contract',level:1,active:false}];state.rolledToday=true;state.rollRemainingMs=0;render();
    }};`});
 });
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',e=>{if(e.type()==='error')errors.push(e.text())});
 await page.goto(`${base}/dungeon.html`);await page.waitForFunction(()=>window.tradeoffTest);
 await page.evaluate(()=>window.tradeoffTest.stage());
 const matrix=await page.evaluate(async()=>{
  const t=window.tradeoffTest,classes=['knight','thief','bard','cleric','ranger','mage','barbarian'];
  const results=[];
  for(const type of classes)for(const stat of ['power','health','damage']) {
   if(type==='bard'&&stat==='damage')continue;
   await t.stage(type,stat);
   const hero={id:1,type,name:'Test',level:1,active:true};
   const penalty=t.state.town.penalty;t.state.town.penalty=null;
   const before=t.buildParty([hero])[0];t.state.town.penalty=penalty;
   const after=t.buildParty([hero])[0];
   results.push({type,stat,before,after});
  }
  return results;
 });
 for(const {type,stat,before,after} of matrix) {
  assert.ok(Math.abs(after.power-before.power*(stat==='power'?.8:1))<1e-9,`${type} ${stat} power`);
  assert.equal(after.maxHp,Math.round(before.maxHp*(['power','health'].includes(stat)?.8:1)),`${type} ${stat} health`);
  assert.ok(Math.abs(after.damageMultiplier-before.damageMultiplier*(stat==='damage'?.8:1))<1e-9);
 }
 const actual=await page.evaluate(async()=>{
  const t=window.tradeoffTest;await t.stage('cleric','power');const s=t.state;
  s.view='battle';s.party=t.buildParty([{id:1,type:'cleric',name:'Healer',level:1},{id:2,type:'knight',name:'Ally',level:1}]);
  s.party[1].hp=1;s.enemies=[{id:'test-enemy',side:'enemy',type:'orc',row:'front',hp:1000,maxHp:1000,damageReduction:0,label:'Target'}];
  s.holdLineMs=0;s.rallyMs=0;s.markMs=0;s.events.dayPower=1;s.events.activeAttack=1;
  t.actHero(s.party[0]);return {damage:1000-s.enemies[0].hp,healed:s.party[1].hp-1,power:s.party[0].power};
 });
 assert.deepEqual(actual,{damage:4,healed:2,power:80});
 const bard=await page.evaluate(async()=>{const t=window.tradeoffTest;await t.stage('bard','power');const p=t.buildParty([{id:1,type:'bard',name:'Bard',level:1},{id:2,type:'knight',name:'Knight',level:1}]);return {buff:t.heroEffects('bard').bardBuff,p:p.map(u=>({power:u.power,maxHp:u.maxHp}))}});
 assert.ok(Math.abs(bard.buff-.16)<1e-9);assert.equal(bard.p[0].power,80);assert.ok(Math.abs(bard.p[1].power-116)<1e-9);
 await page.evaluate(()=>window.tradeoffTest.stage());
 assert.match(await page.locator('.town-traits .is-drawback').textContent(),/Clerics lose 20% power/);
 await page.screenshot({path:'output/town-tradeoffs/town-desktop.png',fullPage:true});
 await page.locator('.town-panorama [data-town-action="close"]').click();
 assert.match(await page.locator('.contract-town-penalty').textContent(),/20% power/);
 await page.locator('[data-offer="502"]').click();
 assert.match(await page.locator('.hero-town-penalty').textContent(),/Clerics lose 20% power/);
 assert.equal(await page.locator('.hero-stats b').first().textContent(),'80');
 await page.screenshot({path:'output/town-tradeoffs/recruitment-desktop.png',fullPage:true});
 await page.locator('[data-roster-action="start"]').click();
 await page.locator('[data-departure="confirm"]').click();
 await page.locator('[data-unit-type="cleric"]').click();
 assert.match(await page.locator('.battle-unit-dialog').textContent(),/Town drawback: Clerics lose 20% power/);
 await page.screenshot({path:'output/town-tradeoffs/inspection-desktop.png'});
 await page.locator('.battle-unit-dialog__close').click();
 const savedPenalty=await page.evaluate(()=>{window.tradeoffTest.persist();return window.tradeoffTest.state.town.penalty});
 await page.reload();await page.waitForFunction(()=>window.tradeoffTest);
 assert.deepEqual(await page.evaluate(()=>window.tradeoffTest.state.town.penalty),savedPenalty);
 // Turn the save into an older balance version with deployed, wounded units.
 const old=await page.evaluate(async()=>{
  const t=window.tradeoffTest;await t.stage('knight','health');const s=t.state;
  s.town={...s.town,prefix:{name:'Grand',gold:1,bonus:'Start with 1 extra gold'},favoredClass:'knight',penalty:null,balanceVersion:undefined};
  s.party=t.buildParty([{id:1,type:'knight',name:'Old knight',level:1}]);s.party[0].hp=7;s.view='battle';s.battlePaused=true;s.gold=30;t.persist();return s.town.name;
 });
 await page.reload();await page.waitForFunction(()=>window.tradeoffTest);
 const migrated=await page.evaluate(()=>{const s=window.tradeoffTest.state;return {name:s.town.name,gold:s.gold,penalty:s.town.penalty,hp:s.party[0].hp,maxHp:s.party[0].maxHp}});
 assert.deepEqual(migrated,{name:old,gold:35,penalty:{classType:'knight',stat:'health',multiplier:.8},hp:7,maxHp:80});
 await page.evaluate(()=>window.tradeoffTest.persist());await page.reload();await page.waitForFunction(()=>window.tradeoffTest);
 assert.equal(await page.evaluate(()=>window.tradeoffTest.state.gold),35);
 for(const [name,width,height] of [['phone',390,844],['small',320,740],['landscape',844,390]]) {
  await page.setViewportSize({width,height});await page.evaluate(()=>window.tradeoffTest.stage('bard','power'));
  await page.screenshot({path:`output/town-tradeoffs/town-${name}.png`,fullPage:true});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.locator('.town-panorama [data-town-action="close"]').click();
  await page.locator('[data-offer="502"]').click();
  await page.screenshot({path:`output/town-tradeoffs/recruitment-${name}.png`,fullPage:true});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 }
 assert.deepEqual(errors,[]);await context.close();
 console.log('All class/stat drawbacks, actual attacks/healing/Bard blessing, contract and battle UI, save stability, one-time wounded-save migration and four viewports: passed');
}finally{await browser.close()}
