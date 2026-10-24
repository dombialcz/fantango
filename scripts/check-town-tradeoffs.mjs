import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
const base=process.argv[2]??'http://127.0.0.1:4199';
await mkdir('output/campaign-flavors',{recursive:true});
const browser=await chromium.launch();
try {
 const context=await browser.newContext({viewport:{width:1440,height:1000}});
 await context.addInitScript(()=>{requestAnimationFrame=()=>0;Math.random=()=>.99});
 await context.route('**/src/dungeon.js',async route=>{
  const response=await route.fetch();
  await route.fulfill({response,body:`${await response.text()}\nwindow.flavorTest={get state(){return state},render,persist,createCampaign,buildParty,makeEnemy,generateEnemies,actEnemy,battleUnitDetails,heroEffects,
   async stage(faction='undead',reverse=false,floor=2){
    const {createCampaignFlavor}=await import('./campaign-flavors.js');
    const {PREFIXES,SETTLEMENTS,createTownIdentity}=await import('./town-identity.js');
    state=createCampaign();state.town=createTownIdentity(()=>.1);state.town.prefix=PREFIXES[1];state.town.settlement=SETTLEMENTS[7];
    state.flavorKey=faction;state.enemyCampaignFlavor=createCampaignFlavor(faction,()=>reverse?.99:0);state.floor=floor;
    state.party=buildParty(['knight','mage','cleric','ranger'].map((type,i)=>({id:500+i,type,name:HERO_TYPES[type].label,level:3,active:true})));
    state.enemies=generateEnemies(floor);state.view='battle';state.battlePaused=true;state.commandTargeting=null;state.potionTargeting=false;render();
   },
   party(types=['knight','mage','cleric']){state.town.prefix={};state.town.settlement={};state.town.penalty=null;state.town.recruitment=null;
     state.party=buildParty(types.map((type,i)=>({id:500+i,type,name:HERO_TYPES[type].label,level:1,active:true})));state.divineAegisMs=0;state.enemyFreezeMs=0;return state.party;}
  };`});
 });
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',e=>{if(e.type()==='error')errors.push(e.text())});
 await page.goto(`${base}/dungeon.html`);await page.waitForFunction(()=>window.flavorTest);
 // Equal stats regardless of availability, correct visible chances, no old nerfs.
 await page.evaluate(async()=>{const t=window.flavorTest;await t.stage();const {createTownIdentity}=await import('./src/town-identity.js');t.state.town=createTownIdentity(()=>.1);t.state.view='town';t.render()});
 assert.equal(await page.locator('.town-traits li').count(),4);
 assert.match(await page.locator('.town-traits').textContent(),/40% more likely.*40% less likely/);
 assert.doesNotMatch(await page.locator('.town-traits').textContent(),/damage penalty|weaker|lose 20%/);
 for(const [name,width,height] of [['desktop',1440,1000],['phone',390,844],['small',320,740],['landscape',844,390]]) {
  await page.setViewportSize({width,height});
  await page.screenshot({path:`output/campaign-flavors/town-${name}.png`,fullPage:true});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 }
 await page.setViewportSize({width:1440,height:1000});
 // Every faction/order switches at floor six and persists across saves/reloads.
 for(const faction of ['orcs','undead','assassins','demons'])for(const reverse of [false,true]) {
  await page.evaluate(args=>window.flavorTest.stage(...args),[faction,reverse,5]);
  const before=await page.evaluate(()=>{const t=window.flavorTest;t.persist();return JSON.stringify({plan:t.state.enemyCampaignFlavor,enemies:t.state.enemies})});
  const body=await page.locator('#battle-screen').innerText();
  for(const hidden of ['goblinHost','orcVanguard','restlessLegion','boneConclave','ambushParty','guildBulwark','cultistHost','infernalBattery'])assert.ok(!body.includes(hidden));
  await page.reload();await page.waitForFunction(()=>window.flavorTest);
  assert.equal(await page.evaluate(()=>JSON.stringify({plan:window.flavorTest.state.enemyCampaignFlavor,enemies:window.flavorTest.state.enemies})),before);
  const phase=await page.evaluate(async()=>{const t=window.flavorTest;const {campaignProfile}=await import('./src/campaign-flavors.js');return [campaignProfile(t.state.enemyCampaignFlavor,5),campaignProfile(t.state.enemyCampaignFlavor,6)]});
  assert.notEqual(...phase);
  if(!reverse){await page.locator('.battle-unit img').evaluateAll(images=>Promise.all(images.map(img=>img.decode())));await page.screenshot({path:`output/campaign-flavors/${faction}.png`});}
 }
 // Bone Mage volley hits both rows, bypasses interception, and respects shields.
 const volley=await page.evaluate(async()=>{
  const t=window.flavorTest;await t.stage();const party=t.party();
  t.state.enemies=[t.makeEnemy('boneMage')];const mage=t.state.enemies[0];mage.damage=40;mage.attacks=2;
  const before=party.map(u=>u.hp);const saved=Math.random;Math.random=()=>{throw Error('AoE should not roll interception')};
  t.actEnemy(mage);Math.random=saved;
  const loss=party.map((u,i)=>before[i]-u.hp);
  t.state.divineAegisTargetId=party[1].id;t.state.divineAegisMs=1000;mage.attacks=2;
  const shieldHP=party[1].hp;t.actEnemy(mage);
  return {loss,shieldBlocked:party[1].hp===shieldHP,details:t.battleUnitDetails(mage.id)};
 });
 assert.deepEqual(volley.loss,[5,6,6]);assert.equal(volley.shieldBlocked,true);assert.match(volley.details.behavior,/both rows/);
 await page.evaluate(()=>window.flavorTest.render());await page.locator('[data-unit-type="boneMage"]').click();
 await page.locator('.battle-unit-dialog img').evaluate(img=>img.decode());await page.screenshot({path:'output/campaign-flavors/bone-mage-details.png'});
 await page.locator('.battle-unit-dialog__close').click();
 // Weakest-HP targeting can be intercepted; the rear guard is not protected by row alone.
 for(const type of ['marksman','goblinArcher']) {
  const result=await page.evaluate(async type=>{
   const t=window.flavorTest;await t.stage();const p=t.party();p[1].hp=20;
   const enemy=t.makeEnemy(type);enemy.damage=40;t.state.enemies=[enemy];
   Math.random=()=>0;const front=p[0].hp;t.actEnemy(enemy);const intercepted=p[1].hp===20&&p[0].hp<front;
   Math.random=()=>.99;t.actEnemy(enemy);return {intercepted,rearHP:p[1].hp};
  },type);
  assert.deepEqual(result,{intercepted:true,rearHP:10});
 }
 // Actual combat cadence: blink, retreat, then wait until the slower next strike.
 const cadence=await page.evaluate(async()=>{
  const t=window.flavorTest;await t.stage('assassins');const party=t.party(['cleric','mage','ranger']);
  party.forEach(h=>{h.hp=h.maxHp=100000;h.timer=1e7});
  const enemy=t.makeEnemy('assassin');enemy.timer=100;enemy.damage=4;t.state.enemies=[enemy];
  t.state.battleTime=0;t.state.battlePaused=false;t.state.commandAutoPauseEnabled=false;t.state.battleSpeed=1;Math.random=()=>.99;
  advanceTime(99);const before=enemy.attacks;
  advanceTime(1);const first={attacks:enemy.attacks,row:enemy.row};
  advanceTime(400);const retreated=enemy.row;
  advanceTime(1249);const waiting=enemy.attacks;
  advanceTime(1);return {before,first,retreated,waiting,second:enemy.attacks};
 });
 assert.deepEqual(cadence,{before:0,first:{attacks:1,row:'front'},retreated:'back',waiting:1,second:2});
 await mkdir('output/assassin-nerf',{recursive:true});
 const savedAssassin=await page.evaluate(()=>{const t=window.flavorTest;t.state.battlePaused=true;t.render();t.persist();return localStorage.getItem('vaultbound:campaign:v1')});
 const html=await readFile('dungeon.html','utf8');
 await writeFile('output/assassin-nerf/client.html',html.replace('<head>',`<head><base href="/"><link rel="icon" href="data:,"><script>localStorage.setItem('vaultbound:campaign:v1',${JSON.stringify(savedAssassin)});</script>`));

 const crit=await page.evaluate(async()=>{const t=window.flavorTest;await t.stage('assassins');const p=t.party(['cleric']);const e=t.makeEnemy('assassin');e.damage=40;t.state.enemies=[e];const hp=p[0].hp;Math.random=()=>0;t.actEnemy(e);return {lost:hp-p[0].hp,chance:e.critChance,details:t.battleUnitDetails(e.id)}});
 assert.equal(crit.lost,20);assert.equal(crit.chance,.2);assert.equal(Object.fromEntries(crit.details.stats)['Critical chance'],'20%');
 const summons=await page.evaluate(async()=>{const t=window.flavorTest;await t.stage();t.party();const n=t.makeEnemy('necromancer');t.state.enemies=[n];t.actEnemy(n);const first=t.state.enemies.map(e=>e.type);while(t.state.enemies.length<14)t.state.enemies.push(t.makeEnemy('skeleton'));t.actEnemy(n);return {first,count:t.state.enemies.length}});
 assert.deepEqual(summons,{first:['necromancer','skeleton'],count:14});
 // Existing boss compositions and base stats bypass ordinary encounter scaling.
 const boss=await page.evaluate(async()=>{const t=window.flavorTest;await t.stage('orcs');t.state.bossType='elderShaman';const es=t.generateEnemies(10);return es.map(e=>({type:e.type,scaled:e.encounterHealthScale}))});
 assert.deepEqual(boss.map(e=>e.type),['elderShaman','goblin','orc','orc']);assert.ok(boss.every(e=>e.scaled===undefined));
 // Version-three Bard debuff removed while its assigned blessing is restored.
 await page.evaluate(async()=>{const t=window.flavorTest;await t.stage();const s=t.state;s.town.balanceVersion=3;s.town.penalty={classType:'bard',stat:'blessing',multiplier:.9};delete s.town.recruitment;
  s.party=t.buildParty([{id:1,type:'knight',name:'Assigned knight',level:1}]);Object.assign(s.party[0],{power:118,basePower:100,bardBuffAmount:.18,bardBuffPercent:18,maxHp:118,hp:7});t.persist()});
 await page.reload();await page.waitForFunction(()=>window.flavorTest);
 assert.deepEqual(await page.evaluate(()=>{const s=window.flavorTest.state;return {version:s.town.balanceVersion,scarce:s.town.recruitment.scarceClass,power:s.party[0].power,hp:s.party[0].hp,penalty:s.town.penalty}}),{version:4,scarce:'bard',power:120,hp:7,penalty:undefined});
 await page.evaluate(()=>window.flavorTest.persist());await page.reload();await page.waitForFunction(()=>window.flavorTest);
 assert.equal(await page.evaluate(()=>window.flavorTest.state.party[0].power),120);
 for(const [name,width,height] of [['phone',390,844],['small',320,740],['landscape',844,390]]) {
  await page.setViewportSize({width,height});await page.evaluate(()=>window.flavorTest.stage('orcs',true,9));
  await page.locator('.battle-unit img').evaluateAll(images=>Promise.all(images.map(img=>img.decode())));
  await page.screenshot({path:`output/campaign-flavors/swarm-${name}.png`});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  assert.ok(await page.locator('.battle-command-station').evaluate((e,h)=>e.getBoundingClientRect().bottom<=h,height));
  const last=page.locator('[data-side="enemy"]').last();await last.scrollIntoViewIfNeeded();await last.click();
  assert.equal(await page.locator('.battle-unit-dialog').evaluate(e=>e.open),true);
  await page.locator('.battle-unit-dialog__close').click();
 }
 assert.deepEqual(errors,[]);await context.close();
 console.log('Recruitment UI, all eight hidden campaign orders, persistence, floor-six switch, real volleys/crit/weakest targeting/interception/shields/summons, boss bypass and legacy restoration: passed');
}finally{await browser.close()}
