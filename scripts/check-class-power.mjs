import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
const base=process.argv[2]??'http://127.0.0.1:4201';
await mkdir('output/class-power',{recursive:true});
const browser=await chromium.launch();
try {
 const context=await browser.newContext({viewport:{width:1440,height:1000}});
 await context.addInitScript(()=>{requestAnimationFrame=()=>0;Math.random=()=>.99});
 await context.route('**/src/dungeon.js',async route=>{
  const source=await readFile('src/dungeon.js','utf8');
  await route.fulfill({contentType:'text/javascript',body:source+`
   window.powerTest={get state(){return state},render,persist,actHero,battleUnitDetails,heroEffects,
    stage(){state=createCampaign();state.floor=1;state.town.prefix={};state.town.settlement={};
     state.events.dayPower=state.events.activeAttack=1;
     state.party=buildParty(['cleric','knight','thief','ranger'].map((type,i)=>({id:i+1,type,name:HERO_TYPES[type].label,level:1,active:true})));
     state.enemies=[makeEnemy('zombie')];state.enemies[0].hp=state.enemies[0].maxHp=1e6;state.enemies[0].timer=1e9;
     state.party.forEach(h=>h.timer=1e9);state.view='battle';state.battlePaused=true;render();
    }};`});
 });
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',e=>{if(e.type()==='error')errors.push(e.text())});
 await page.goto(`${base}/dungeon.html`,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.powerTest);
 const stage=()=>page.evaluate(()=>window.powerTest.stage());
 await stage();
 const stats=await page.evaluate(()=>{
  const t=window.powerTest,s=t.state,thief=s.party[2],ranger=s.party[3],enemy=s.enemies[0];
  let before=enemy.hp;t.actHero(thief);const thiefHit=before-enemy.hp;
  before=enemy.hp;t.actHero(ranger);return {thiefHp:thief.maxHp,thiefHit,rangerHit:before-enemy.hp,clericHeal:s.party[0].healRatio};
 });
 assert.deepEqual(stats,{thiefHp:70,thiefHit:15,rangerHit:23,clericHeal:.15});
 const heal=setup=>page.evaluate(setup=>{
  const t=window.powerTest,s=t.state;
  s.party.forEach((h,i)=>h.hp=setup[i]??h.maxHp);
  const before=s.party.map(h=>h.hp);t.actHero(s.party[0]);
  return s.party.map((h,i)=>h.hp-before[i]);
 },setup);
 assert.deepEqual(await heal([10,10,1,80]),[0,4,0,0],'most missing HP wins over lowest HP');
 assert.deepEqual(await heal([1,80,70,80]),[4,0,0,0],'Cleric can heal itself');
 assert.deepEqual(await heal([80,90,0,80]),[0,4,0,0],'dead heroes are never healed');
 assert.deepEqual(await heal([80,99,70,80]),[0,1,0,0],'healing clamps to missing HP');
 assert.deepEqual(await heal([80,100,70,80]),[0,0,0,0],'full party is not healed');
 const scaling=await page.evaluate(()=>{
  const t=window.powerTest;
  return [1,2,3,4,5].map(level=>{t.state.buildings.cleric.level=level;return t.heroEffects('cleric').healRatio});
 });
 scaling.forEach((value,i)=>assert.ok(Math.abs(value-(.15+i*.03))<1e-12));
 // Version-four town saves and older town saves both migrate health exactly once.
 for(const oldTown of [false,true]) {
  await stage();
  await page.evaluate(oldTown=>{
   const t=window.powerTest,s=t.state;delete s.classPowerVersion;
   Object.assign(s.party[2],{baseMaxHp:60,maxHp:60,hp:7});s.party[0].healRatio=.1;
   if(oldTown){s.town.balanceVersion=3;}
   t.persist();
  },oldTown);
  await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.powerTest);
  const migrated=await page.evaluate(()=>{const s=window.powerTest.state;return {hp:s.party[2].hp,max:s.party[2].maxHp,heal:s.party[0].healRatio,version:s.classPowerVersion}});
  assert.deepEqual(migrated,{hp:7,max:70,heal:.15,version:1});
  await page.evaluate(()=>window.powerTest.persist());await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.powerTest);
  assert.equal(await page.evaluate(()=>window.powerTest.state.party[2].maxHp),70);
 }
 await stage();await heal([1,80,70,80]);await page.evaluate(()=>window.powerTest.render());
 for(const [name,width,height] of [['desktop',1440,1000],['phone',320,740]]) {
  await page.setViewportSize({width,height});await page.locator('[data-unit-type="cleric"]').click();
  assert.match(await page.locator('.battle-unit-dialog').textContent(),/including itself/);
  assert.match(await page.locator('.battle-unit-dialog').textContent(),/4 HP/);
  await page.locator('.battle-unit-dialog img').evaluate(i=>i.decode());
  await page.screenshot({path:`output/class-power/${name}.png`});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.locator('.battle-unit-dialog__close').click();
 }
 await page.setViewportSize({width:1440,height:1000});
 const saved=await page.evaluate(()=>{window.powerTest.persist();return localStorage.getItem('vaultbound:campaign:v1')});
 const html=await readFile('dungeon.html','utf8');await writeFile('output/class-power/client.html',html.replace('<head>',`<head><base href="/"><link rel="icon" href="data:,"><script>localStorage.setItem('vaultbound:campaign:v1',${JSON.stringify(saved)});</script>`));
 assert.deepEqual(errors,[]);console.log('Class power: real damage, healing priority/self/dead/full/clamping, Temple scaling, old/current-town migration and inspection layouts: passed');
}finally{await browser.close()}
