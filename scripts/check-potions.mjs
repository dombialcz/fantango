import assert from 'node:assert/strict';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
const base=process.argv[2]??'http://127.0.0.1:4193';
await mkdir('output/potions',{recursive:true});
const browser=await chromium.launch();
try {
  for(const [name,width,height] of [['desktop',1440,1000],['phone',390,844],['small',320,740],['landscape',844,390]]) {
    const context=await browser.newContext({viewport:{width,height}});
    await context.addInitScript(()=>{requestAnimationFrame=()=>0;});
    await context.route('**/src/dungeon.js',async route=>{
      const response=await route.fetch();
      await route.fulfill({response,body:`${await response.text()}\nwindow.potionTest={get state(){return state},render,persist,togglePotionTargeting,usePotionOn,prepareFloor,startExpedition,
        stage(){state.view='battle';state.floor=1;state.battlePaused=true;state.potionCooldownMs=0;state.potionsRemaining=3;state.potionHealRatio=.2;
          state.party=buildParty(['knight','thief','mage','cleric'].map((type,i)=>({id:900+i,type,name:type,level:1,active:true})));
          prepareFloor();state.battlePaused=true;state.party.forEach(u=>{u.hp=1;u.timer=Infinity});state.enemies.forEach(u=>u.timer=Infinity);render();}}
      `});
    });
    const page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));page.on('console',e=>{if(e.type()==='error')errors.push(e.text())});
    await page.goto(`${base}/dungeon.html`);await page.waitForFunction(()=>window.potionTest);
    await page.evaluate(()=>window.potionTest.stage());
    const potion=page.locator('[data-battle-action="potion"]');
    const snapshot=()=>page.evaluate(()=>JSON.parse(render_game_to_text()));
    await potion.locator('img').evaluate(img=>img.decode());
    assert.equal(await potion.locator('img').getAttribute('src'),'assets/items/healing-potion.webp');
    assert.equal(await potion.evaluate(e=>e.parentElement.className),'battle-command-deck');
    assert.equal(await potion.evaluate(e=>e.classList.contains('battle-command')),true);
    assert.equal(await page.locator('.battle-command-deck > button').count(),8);
    assert.equal(await page.locator('.battle-controls [data-battle-action="potion"]').count(),0);
    await page.keyboard.press('8'); assert.equal((await snapshot()).potions.choosingTarget,true);
    await page.keyboard.press('Escape');
    assert.equal((await snapshot()).potions.cooldownMs,0);
    await potion.click();
    await page.evaluate(()=>{const t=window.potionTest;t.usePotionOn(t.state.enemies[0]);t.usePotionOn({...t.state.party[0],hp:0});t.usePotionOn({...t.state.party[0],hp:100,maxHp:100});t.render()});
    assert.equal((await snapshot()).potions.remaining,3);
    assert.equal((await snapshot()).potions.cooldownMs,0);
    await page.locator('[data-side="hero"].is-targetable').first().click();
    let s=await snapshot();assert.equal(s.potions.remaining,2);assert.equal(s.potions.cooldownMs,2000);assert.ok(s.party.some(unit=>unit.hp>1));
    assert.equal(await potion.isDisabled(),true);assert.equal(await potion.locator('.battle-potion__timer').textContent(),'2.0s');
    assert.match(await potion.locator('.battle-potion__reason').textContent(),/Cooldown/);
    const meter = s.commands.meter; await page.evaluate(()=>advanceTime(5000));
    assert.equal((await snapshot()).commands.meter,meter); assert.equal((await snapshot()).potions.cooldownMs,2000);
    await page.evaluate(()=>{const t=window.potionTest;t.state.potionTargeting=true;t.usePotionOn(t.state.party[1]);t.state.potionTargeting=false;t.persist();t.render()});
    assert.equal((await snapshot()).potions.remaining,2);
    await page.screenshot({path:`output/potions/cooldown-${name}.png`});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    assert.ok(await potion.evaluate((e,h)=>e.getBoundingClientRect().bottom<=h,height));
    await page.reload();await page.waitForFunction(()=>window.potionTest);
    assert.equal((await snapshot()).potions.cooldownMs,2000);
    if(name==='desktop') {
      const saved = await page.evaluate(()=>localStorage.getItem('vaultbound:campaign:v1'));
      const html = (await readFile('dungeon.html','utf8')).replace('<head>', `<head><base href="/"><script>localStorage.setItem('vaultbound:campaign:v1', ${JSON.stringify(saved)});</script>`);
      await writeFile('output/potions/client.html',html);
    }
    await page.evaluate(()=>{const t=window.potionTest;t.state.battleSpeed=1;t.state.battlePaused=false;[...t.state.party,...t.state.enemies].forEach(u=>u.timer=1e7);advanceTime(1999);t.state.battlePaused=true;t.render()});
    assert.equal((await snapshot()).potions.cooldownMs,1);assert.equal(await potion.isDisabled(),true);
    await page.evaluate(()=>advanceTime(1000));assert.equal((await snapshot()).potions.cooldownMs,1);
    await page.evaluate(()=>{const t=window.potionTest;t.state.battlePaused=false;advanceTime(1);t.state.battlePaused=true;t.render()});assert.equal(await potion.isDisabled(),false);
    await potion.click();await page.locator('[data-side="hero"].is-targetable').first().click();
    assert.equal((await snapshot()).potions.remaining,1);
    await page.evaluate(()=>{const t=window.potionTest;t.state.view='floor_result';advanceTime(10000);t.prepareFloor();t.state.battlePaused=true;t.render()});
    assert.equal((await snapshot()).potions.cooldownMs,2000);
    await page.evaluate(()=>{const t=window.potionTest;t.state.battleSpeed=2;t.state.battlePaused=false;[...t.state.party,...t.state.enemies].forEach(u=>u.timer=1e7);advanceTime(999);t.state.battlePaused=true;t.render()});
    assert.equal((await snapshot()).potions.cooldownMs,2);assert.equal(await potion.isDisabled(),true);
    await page.evaluate(()=>advanceTime(2000));assert.equal((await snapshot()).potions.cooldownMs,2);
    await page.evaluate(()=>{const t=window.potionTest;t.state.battlePaused=false;advanceTime(1);t.state.battlePaused=true;t.render()});
    assert.equal((await snapshot()).potions.cooldownMs,0);
    await potion.focus();await page.keyboard.press('Enter');await page.locator('[data-side="hero"].is-targetable').first().click();
    assert.equal((await snapshot()).potions.remaining,0);assert.equal(await potion.isDisabled(),true);
    assert.equal(await potion.getAttribute('aria-disabled'),'true');
    assert.match(await potion.textContent(),/No potions/);
    assert.equal(await potion.locator('img').evaluate(e=>getComputedStyle(e).filter),'grayscale(1)');
    await page.screenshot({path:`output/potions/empty-${name}.png`});
    await page.evaluate(()=>{const t=window.potionTest;t.state.potionsRemaining=1;t.state.potionCooldownMs=0;t.render()});
    assert.equal(await potion.isDisabled(),false);
    await page.evaluate(()=>{const t=window.potionTest;t.state.party.forEach(u=>u.hp=u.maxHp);t.render()});
    assert.equal(await potion.isDisabled(),true);assert.match(await potion.textContent(),/No wounded heroes/);
    await page.evaluate(()=>{const t=window.potionTest;t.state.view='tavern';t.state.bench=[{id:1000,name:'Fresh knight',type:'knight',level:1,active:true}];t.state.potionCooldownMs=2000;t.startExpedition(true);t.render()});
    assert.equal((await snapshot()).potions.cooldownMs,0);
    assert.deepEqual(errors,[]);await context.close();
  }
  console.log('Potion targeting/cancel/invalid targets, combat-clock cooldown at 1×/2×, frozen while paused/between fights, skill-bar placement, empty greying, direct-use guard, reload, floor transitions, depletion and four layouts: passed');
} finally {await browser.close()}
