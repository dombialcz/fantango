import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
const base=process.argv[2]??'http://127.0.0.1:4201';
await mkdir('output/bard-songs',{recursive:true});
const browser=await chromium.launch();
try {
 const context=await browser.newContext({viewport:{width:1440,height:1000}});
 await context.addInitScript(()=>{requestAnimationFrame=()=>0;Math.random=()=>.99});
 await context.route('**/src/dungeon.js',async route=>{
  const source=await readFile('src/dungeon.js','utf8');
  await route.fulfill({contentType:'text/javascript',body:source+`
  window.songTest={get state(){return state},render,persist,useBattleCommand,heroInterval,damageReductionFor,dealDamage,actHero,resetFloorCommands,battleUnitDetails,activeBardSongPower,
   stage(bards=1){state=createCampaign();state.floor=1;state.town.prefix={};state.town.settlement={};state.events.dayPower=state.events.activeAttack=1;state.events.plan.forEach(e=>e.at=99999);
    state.party=buildParty([...Array(bards).fill('bard'),'knight','cleric','mage','barbarian'].map((type,i)=>({id:i+1,type,name:type,level:1,active:true})));
    state.enemies=[makeEnemy('zombie')];state.enemies[0].hp=state.enemies[0].maxHp=1e6;state.enemies[0].timer=1e9;
    state.party.forEach(h=>{h.timer=1e9;h.hp=20});state.view='battle';state.battlePaused=true;state.commandAutoPauseEnabled=false;resetFloorCommands();state.commandMeter=100;render();
   }};`});
 });
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',e=>{if(e.type()==='error')errors.push(e.text())});
 await page.goto(`${base}/dungeon.html`,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.songTest);
 const stage=n=>page.evaluate(n=>window.songTest.stage(n),n);
 const snap=()=>page.evaluate(()=>{const t=window.songTest,s=t.state;return {next:s.bardNextSong,active:s.bardActiveSong,power:t.activeBardSongPower(),cool:s.bardSongCooldownMs,meter:s.commandMeter,hp:s.party.map(h=>h.hp),max:s.party.map(h=>h.maxHp)}});
 const countdown=()=>page.locator('[data-command="rally"] .battle-command__active').textContent();
 const cast=()=>page.locator('[data-command="rally"]').click();
 const tick=ms=>page.evaluate(ms=>{const t=window.songTest;t.state.battlePaused=false;advanceTime(ms);t.state.battlePaused=true;t.render()},ms);
 await stage(1);
 assert.ok(await page.evaluate(()=>window.songTest.state.party.every(h=>h.power===100&&h.bardBuffPercent===0)));
 let s=await snap();assert.equal(s.active,'rally');assert.equal(s.next,'defense');assert.equal(s.cool,6000);assert.equal(s.power.speedBonus,.1);assert.equal(await countdown(),'6.0s');
 assert.equal(await page.locator('[data-command="rally"]').getAttribute('data-song'),'red');
 assert.equal(await page.locator('[data-command="rally"] > strong').textContent(),'Change song');
 assert.match(await page.locator('[data-command="rally"] .battle-command__power').textContent(),/Rally Song.*10%/);
 assert.match(await page.locator('[data-command="rally"]').getAttribute('aria-label'),/Change song.*playing Rally Song.*next Song of Defense/);
 assert.match(await page.locator('.battle-active-effects').textContent(),/Rally Song.*10%/);
 const rallyInterval=await page.evaluate(()=>window.songTest.heroInterval(window.songTest.state.party.find(h=>h.type==='knight')));
 assert.ok(Math.abs(rallyInterval-1800/1.1)<1e-9);
 await page.locator('[data-command="rally"]').click({force:true});await page.keyboard.press('3');await page.evaluate(()=>window.songTest.useBattleCommand('rally'));assert.deepEqual(await snap(),s);
 await page.evaluate(()=>advanceTime(10000));assert.deepEqual(await snap(),s,'pause freezes cooldown');
 await tick(1000);assert.equal(await countdown(),'5.0s');
 await tick(4999);assert.ok((await snap()).cool>0);await tick(1);assert.equal((await snap()).cool,0);assert.equal(await countdown(),'');
 await cast();s=await snap();assert.equal(s.active,'defense');assert.equal(s.next,'power');assert.equal(s.meter,80);assert.equal(await countdown(),'6.0s');
 assert.equal(await page.locator('[data-command="rally"]').getAttribute('data-song'),'blue');
 const defended=await page.evaluate(()=>{const t=window.songTest;const h=t.state.party.find(h=>h.type==='knight');h.hp=h.maxHp;const before=h.hp;t.dealDamage(h,100,'test');return {lost:before-h.hp,reduction:t.damageReductionFor(h)}});
 assert.equal(defended.lost,17);assert.ok(Math.abs(defended.reduction-.32)<1e-9);
 await tick(6000);await cast();s=await snap();assert.equal(s.active,'power');assert.equal(s.next,'rally');assert.equal(s.meter,60);
 const powered=await page.evaluate(()=>{const t=window.songTest,s=t.state;const knight=s.party.find(h=>h.type==='knight'),cleric=s.party.find(h=>h.type==='cleric');
   s.party.forEach(h=>h.hp=h.maxHp);knight.hp=1;cleric.power=200;const e=s.enemies[0],before=e.hp,max=s.party.map(h=>h.maxHp);t.actHero(cleric);return {lost:before-e.hp,healed:knight.hp-1,max,after:s.party.map(h=>h.maxHp),detail:t.battleUnitDetails(cleric.id)};});
 assert.equal(powered.lost,12);assert.equal(powered.healed,9);assert.deepEqual(powered.after,powered.max);
 assert.match(Object.fromEntries(powered.detail.stats)['Healing / action'],/^9 HP/);
 await tick(20000);assert.equal((await snap()).active,'power');assert.equal((await snap()).power.damageBonus,.2,'song does not expire');
 await page.evaluate(()=>window.songTest.persist());const saved=await snap();await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.songTest);assert.deepEqual(await snap(),saved);
 // Song strength updates immediately as Bards die; no orphaned aura remains.
 await stage(2);assert.ok(Math.abs((await snap()).power.speedBonus-.15)<1e-9);
 const deathTiming=await page.evaluate(()=>{const t=window.songTest,bard=t.state.party.find(h=>h.type==='bard'),knight=t.state.party.find(h=>h.type==='knight');knight.timer=1000;bard.hp=1;t.dealDamage(bard,100,'test');return knight.timer});
 assert.ok(Math.abs(deathTiming-1000*1.15/1.1)<1e-9);
 await stage(2);
 await page.evaluate(()=>window.songTest.state.party.find(h=>h.type==='bard').hp=0);assert.equal((await snap()).power.speedBonus,.1);
 await page.evaluate(()=>window.songTest.state.party.filter(h=>h.type==='bard').forEach(h=>h.hp=0));assert.equal((await snap()).power.speedBonus,0);
 await page.evaluate(()=>{window.songTest.resetFloorCommands();window.songTest.render()});s=await snap();assert.equal(s.next,'defense');assert.equal(s.cool,0);
 for(const count of [2,3]) {
  await stage(count);
  for(const active of ['defense','power','rally']) {await tick(6000);await cast();s=await snap();assert.equal(s.active,active);assert.equal(s.cool,6000);}
 }
 for(const speed of [.5,1,2]) {await stage(1);await page.evaluate(speed=>window.songTest.state.battleSpeed=speed,speed);await tick(1000);assert.equal((await snap()).cool,6000-1000*speed);}
 await stage(0);const noBard=await snap();await page.evaluate(()=>window.songTest.useBattleCommand('rally'));assert.deepEqual(await snap(),noBard);
 await stage(1);await tick(6000);await page.evaluate(()=>{window.songTest.state.commandMeter=19;window.songTest.render()});await page.evaluate(()=>window.songTest.useBattleCommand('rally'));assert.equal((await snap()).next,'defense');assert.equal((await snap()).meter,19);
 // College upgrades retain their investment via stronger songs and cheaper casts.
 await stage(1);await page.evaluate(()=>{const t=window.songTest;t.state.buildings.bard={level:5,pathA:0,pathB:4};t.render()});await tick(6000);await cast();assert.equal((await snap()).meter,84);assert.equal((await snap()).power.reduction,.18);
 // Real save migration removes old blessings without healing and is idempotent.
 await stage(1);await page.evaluate(()=>{const t=window.songTest,s=t.state;delete s.bardSongsVersion;const k=s.party.find(h=>h.type==='knight');Object.assign(k,{power:120,bardBuffAmount:.2,bardBuffPercent:20,maxHp:120,baseMaxHp:120,hp:7});t.persist()});
 await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.songTest);
 assert.deepEqual(await page.evaluate(()=>{const k=window.songTest.state.party.find(h=>h.type==='knight');return [k.power,k.hp,k.maxHp,k.bardBuffPercent]}),[100,7,100,0]);
 await page.evaluate(()=>window.songTest.persist());const migrated=await snap();await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.songTest);assert.deepEqual(await snap(),migrated);
 // Distinct current-song states on desktop, small phone and landscape.
 for(const [name,width,height] of [['desktop',1440,1000],['phone',320,740],['landscape',844,390]]) {
  await page.setViewportSize({width,height});await stage(2);
  for(const [index,color] of ['red','blue','gold'].entries()) {
   if(index){await tick(6000);await cast();}
   await page.locator('#battle-screen img').evaluateAll(images=>Promise.all(images.map(i=>i.decode())));
   assert.equal(await page.locator('[data-command="rally"]').getAttribute('data-song'),color);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   await page.screenshot({path:`output/bard-songs/${name}-${color}.png`});
  }
 }
 await page.setViewportSize({width:1440,height:1000});await stage(2);await tick(6000);await cast();await tick(6000);await cast();
 const savedClient=await page.evaluate(()=>{window.songTest.persist();return localStorage.getItem('vaultbound:campaign:v1')});
 const html=await readFile('dungeon.html','utf8');await writeFile('output/bard-songs/client.html',html.replace('<head>',`<head><base href="/"><link rel="icon" href="data:,"><script>localStorage.setItem('vaultbound:campaign:v1',${JSON.stringify(savedClient)});</script>`));
 assert.deepEqual(errors,[]);console.log('Continuous Bard songs, switches, sustain effects, costs, timing, death/strength, guards, migration/save/reset, upgrades and tinted responsive UI: passed');
} finally {await browser.close()}
