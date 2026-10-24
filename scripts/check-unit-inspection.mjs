import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const base=process.argv[2]??'http://127.0.0.1:4193';
await mkdir('output/unit-inspection',{recursive:true});
const browser=await chromium.launch();
try {
 for(const [name,width,height] of [['desktop',1440,1000],['phone',390,844],['small',320,740],['landscape',844,390]]) {
  const context=await browser.newContext({viewport:{width,height}});
  await context.addInitScript(()=>{requestAnimationFrame=()=>0;Math.random=()=>.99});
  await context.route('**/src/dungeon.js',async route=>{
   const response=await route.fetch();
   await route.fulfill({response,body:`${await response.text()}\nwindow.inspectionTest={get state(){return state},render,battleUnitDetails,dealDamage,heroInterval,damageReductionFor,useBattleCommand,
    stage(){state.view='battle';state.floor=1;state.battlePaused=false;state.commandTargeting=null;state.potionTargeting=false;
      state.buildings=createTownBuildings();state.buildings.thief={level:3,pathA:1,pathB:1};
      state.party=buildParty(HERO_KEYS.map((type,i)=>({id:500+i,name:HERO_TYPES[type].label,type,level:3,active:true})));
      prepareFloor();state.enemies=[makeEnemy('shadowAssassin'),makeEnemy('guildMaster'),makeEnemy('marksman')];
      state.party.forEach(u=>{u.hp=Math.floor(u.maxHp/2);u.timer=Infinity});state.enemies.forEach(u=>u.timer=Infinity);
      state.commandMeter=100;state.potionsRemaining=3;state.potionCooldownMs=0;render();}}
   `});
  });
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',e=>{if(e.type()==='error')errors.push(e.text())});
  await page.goto(`${base}/dungeon.html`);await page.waitForFunction(()=>window.inspectionTest);
  await page.evaluate(()=>window.inspectionTest.stage());
  const dialog=page.locator('.battle-unit-dialog');
  const hero=page.locator('[data-unit-type="thief"]');
  await hero.click();
  assert.equal(await dialog.evaluate(e=>e.open),true);
  assert.equal(await page.evaluate(()=>window.inspectionTest.state.battlePaused),true);
  assert.match(await dialog.textContent(),/Thief.*Level 3.*Critical chance.*Dodge chance.*EVASION/s);
  assert.equal(await dialog.locator('img').getAttribute('src'),'assets/heroes/thief.png');
  await dialog.locator('img').evaluate(img=>img.decode());
  assert.equal(await dialog.locator('img').evaluate(e=>getComputedStyle(e).objectFit),'contain');
  const before=await page.evaluate(()=>window.inspectionTest.state.battleTime);
  await page.evaluate(()=>advanceTime(1500));assert.equal(await page.evaluate(()=>window.inspectionTest.state.battleTime),before);
  await page.screenshot({path:`output/unit-inspection/hero-${name}.png`});
  assert.equal(await dialog.evaluate(e=>e.scrollWidth<=e.clientWidth),true);
  await page.keyboard.press('Escape');
  assert.equal(await hero.evaluate(e=>e===document.activeElement),true);
  assert.equal(await page.evaluate(()=>window.inspectionTest.state.battlePaused),true);
  await hero.press('Enter');assert.equal(await dialog.evaluate(e=>e.open),true);
  await dialog.locator('button').click();
  await page.locator('[data-unit-type="shadowAssassin"]').click();
  assert.match(await dialog.textContent(),/Dodge chance20%/);
  assert.match(await dialog.textContent(),/Blinks forward/);
  await page.screenshot({path:`output/unit-inspection/enemy-${name}.png`});
  await dialog.locator('button').click();
  const values=await page.evaluate(()=>{
    const t=window.inspectionTest,s=t.state,hero=s.party.find(u=>u.type==='thief');
    s.holdLineMs=6000;s.holdArmorBonus=.1;s.holdDamageBonus=.2;s.bardActiveSong="rally";s.events.dayPower=1.05;s.events.activeAttack=.8;
    hero.crowdingPenaltyPercent=20;hero.bardBuffPercent=20;hero.cemeteryBonusPercent=5;
    const details=t.battleUnitDetails(hero.id),stats=Object.fromEntries(details.stats);
    const target={side:'enemy',hp:100000,maxHp:100000,damageReduction:0,label:'Dummy'};
    const actual=t.dealDamage(target,hero.power*.6*hero.damageMultiplier*1.2*1.05*.8,hero);
    return {stats,actual,interval:t.heroInterval(hero),armor:t.damageReductionFor(hero),details,
      empowered:t.battleUnitDetails(s.enemies.find(u=>u.type==='marksman').id),bard:t.battleUnitDetails(s.party.find(u=>u.type==='bard').id)};
  });
  assert.equal(values.stats['Damage / hit'],values.actual);
  assert.equal(values.stats['Attack interval'],`${Number((values.interval/1000).toFixed(2))}s`);
  assert.equal(values.stats['Damage reduction'],`${Number((values.armor*100).toFixed(2))}%`);
  assert.match(values.details.effects.join(' '),/Hold the Line.*Rally.*Shared cache.*Event/s);
  assert.match(values.details.bonuses.join(' '),/Bard blessing.*Cemetery.*Crowding/s);
  assert.match(values.empowered.effects.join(' '),/Guild Master: \+25% damage and \+15% attack speed/);
  assert.equal(Object.fromEntries(values.bard.stats)['Damage / hit'],0);
  assert.equal(Object.fromEntries(values.bard.stats)['Attack interval'],'Does not attack');
  // Target selection still performs the chosen action, never inspection.
  await page.evaluate(()=>{const t=window.inspectionTest;t.state.potionTargeting=false;t.render()});
  await page.locator('[data-battle-action="potion"]').click();
  await page.locator('[data-side="hero"].is-targetable').first().click();
  assert.equal(await dialog.evaluate(e=>e.open),false);
  assert.equal(await page.evaluate(()=>window.inspectionTest.state.potionsRemaining),2);
  await page.evaluate(()=>{const t=window.inspectionTest;t.state.commandMeter=100;t.useBattleCommand('aegis');t.render()});
  await page.locator('[data-side="hero"].is-targetable').first().click();
  assert.equal(await dialog.evaluate(e=>e.open),false);
  assert.ok(await page.evaluate(()=>window.inspectionTest.state.divineAegisTargetId));
  await page.evaluate(()=>{const t=window.inspectionTest;t.state.commandMeter=100;t.useBattleCommand('mark');t.render()});
  await page.locator('[data-side="enemy"].is-targetable').first().click();
  assert.equal(await dialog.evaluate(e=>e.open),false);
  assert.ok(await page.evaluate(()=>window.inspectionTest.state.markedEnemyId));
  await page.locator('[data-unit-type="mage"]').click();
  await page.evaluate(()=>{const t=window.inspectionTest;t.state.party.find(u=>u.type==='mage').hp=0;t.render()});
  assert.equal(await dialog.evaluate(e=>e.open),false);
  assert.deepEqual(errors,[]);await context.close();
 }
 console.log('Full portraits/stats, combat math, modifiers/effects, enemy boss/empowerment, pause/Escape/focus/keyboard, potion/shield/mark targeting and four layouts: passed');
}finally{await browser.close()}
