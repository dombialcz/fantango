import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const base = process.argv[2] ?? 'http://127.0.0.1:4173';
await mkdir('output/tutorial',{recursive:true});
const browser = await chromium.launch({headless:true});
const errors = [];
try {
  for (const [name,width,height] of [['desktop',1440,1000],['phone',390,844],['small',320,740],['landscape',844,390]]) {
    const context = await browser.newContext({viewport:{width,height}, reducedMotion:'reduce'});
    const page = await context.newPage();
    page.on('pageerror',e=>errors.push(e.message));
    page.on('console',m=>{if(m.type()==='error') errors.push(m.text());});
    await page.goto(`${base}/tutorial.html`);
    await page.waitForFunction(()=>typeof window.render_game_to_text === "function");
    await page.evaluate(()=>{localStorage.setItem('vaultbound:campaign:v1','untouched campaign sentinel');localStorage.setItem('vaultbound:chronicles:v1','untouched archives sentinel');});
    const read = async()=>JSON.parse(await page.evaluate(()=>window.render_game_to_text()));
    const click = async (action,target)=>page.locator(`[data-action="${action}"]${target ? `[data-target="${target}"]` : ''}`).click();
    const check = async(stage)=>{
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${name} ${stage} overflow`);
      await page.locator('.practice-scene img,.completion img').evaluateAll(async images=>Promise.all(images.map(i=>i.decode())));
      assert.ok(await page.locator('.practice-scene img,.completion img').evaluateAll(images=>images.every(i=>i.naturalWidth>0)));
      await page.screenshot({path:`output/tutorial/${name}-${stage}.png`,fullPage:true});
    };
    assert.equal((await read()).lesson,1);
    assert.equal(await page.locator('[data-action="next"]').isDisabled(),true);
    assert.equal(await page.locator('[data-action="visit"][data-target="4"]').isDisabled(),true);
    await check('start'); await click('roll'); await click('hire','knight');
    assert.equal(await page.locator('[data-action="next"]').isDisabled(),true);
    await click('hire','ranger'); await check('recruit'); await click('next');
    await click('train'); assert.equal((await read()).gold,9); await check('train');
    await click('next'); await click('fortify'); assert.equal((await read()).gold,6); await check('town');
    // Revisit completed lessons without spending twice or losing progress.
    await click('visit','1'); assert.equal(await page.locator('[data-action="train"]').isDisabled(),true);
    await click('next'); await click('next'); await click('fight'); await click('pause');
    const elapsedBefore = (await read()).party.map(h=>h.hp);
    await page.evaluate(()=>window.advanceTime(30000)); assert.deepEqual((await read()).party.map(h=>h.hp),elapsedBefore);
    await click('pause'); await page.evaluate(()=>window.advanceTime(10000));
    assert.equal((await read()).phase,'realtime');
    assert.equal((await read()).paused,true); assert.equal((await read()).party[0].hp,110);
    assert.match(await page.locator('.realtime-lesson').textContent(),/Combat happens in real time/);
    assert.match(await page.locator('.realtime-lesson').textContent(),/pause at any moment/);
    assert.equal(await page.locator('[data-action="pause"]').getAttribute('aria-label'),'Resume');
    assert.equal(await page.locator('[data-action="pause"]').getAttribute('aria-pressed'),'true');
    const stopped = await read(); await page.evaluate(()=>window.advanceTime(30000));
    assert.equal((await read()).elapsed,stopped.elapsed); assert.deepEqual((await read()).party,stopped.party);
    await check('realtime'); await click('pause'); assert.equal((await read()).phase,'try-pause');
    await click('pause'); assert.equal((await read()).phase,'order'); assert.equal((await read()).pausePracticed,true);
    await check('order');
    await click('hold'); assert.equal((await read()).phase,'potion');
    await click('potion'); await check('target'); await click('heal','knight');
    assert.equal((await read()).healed,34); assert.equal((await read()).potions,0);
    await click('pause');
    const pausedAfterPotion = await read();
    await page.evaluate(()=>window.advanceTime(30000));
    assert.deepEqual((await read()).party,pausedAfterPotion.party);
    assert.equal((await read()).holdRemaining,pausedAfterPotion.holdRemaining);
    await click('pause');
    await page.evaluate(()=>window.advanceTime(30000)); assert.equal((await read()).phase,'won');
    assert.equal((await read()).gold,7); await check('win'); await click('next');
    assert.match(await page.locator('.home-copy h2').textContent(),/Will you delve deeper or return safely/);
    assert.equal(await page.locator('[data-action="delve"]').isEnabled(),true);
    assert.equal(await page.locator('[data-action="return"]').isEnabled(),true);
    assert.match(await page.locator('.escape-explanation').textContent(),/half your gold, rounded up/);
    await check('choice');
    if (name === 'phone') {
      await click('return'); assert.equal((await read()).gold,7); assert.equal((await read()).exitType,'safe');
    } else {
      const healthBefore=(await read()).party.map(h=>h.hp);
      await click('delve'); await click('pause');
      assert.equal((await read()).floor,2); assert.deepEqual((await read()).party.map(h=>h.hp),healthBefore);
      assert.equal((await read()).potions,0); await check('deeper');
      if (name === 'small') {
        await click('pause'); await page.evaluate(()=>window.advanceTime(60000));
        assert.equal((await read()).phase,'won'); assert.equal((await read()).gold,8);
        await click('return'); assert.equal((await read()).exitType,'safe');
      } else {
        await click('flee'); assert.equal(await page.locator('.practice-flee-dialog').evaluate(el=>el.open),true);
        assert.match(await page.locator('.practice-flee-dialog').textContent(),/Flee · lose 4 gold/);
        const pending=await read(); await page.evaluate(()=>window.advanceTime(30000));
        assert.deepEqual((await read()).party,pending.party); assert.equal((await read()).gold,7);
        await page.screenshot({path:`output/tutorial/${name}-flee-confirm.png`,fullPage:true});
        await page.keyboard.press('Escape'); assert.equal((await read()).fleeConfirmation,false);
        assert.equal((await read()).paused,true); assert.equal((await read()).gold,7);
        await click('flee'); await click('flee-cancel'); assert.equal((await read()).gold,7);
        await click('flee'); await click('flee-confirm');
        assert.equal((await read()).gold,3); assert.equal((await read()).escapeGoldLost,4); assert.equal((await read()).exitType,'fled');
      }
    }
    assert.equal((await read()).returned,true); await check('return');
    await click('next'); assert.equal((await read()).complete,true); await check('complete');
    assert.equal(await page.locator('.completion a').getAttribute('href'),'dungeon.html');
    assert.equal(await page.evaluate(()=>localStorage.getItem('vaultbound:campaign:v1')),'untouched campaign sentinel');
    assert.equal(await page.evaluate(()=>localStorage.getItem('vaultbound:chronicles:v1')),'untouched archives sentinel');
    await page.locator('#restart').click(); assert.equal((await read()).gold,10); assert.equal((await read()).heroes.length,0);
    // Keyboard-only start and recruitment use native controls and move focus forwards.
    await page.locator('[data-action="roll"]').focus(); await page.keyboard.press('Enter');
    assert.equal(await page.locator('[data-action="hire"][data-target="knight"]').evaluate(el=>el===document.activeElement),true);
    await page.keyboard.press('Enter'); await page.keyboard.press('Enter');
    assert.equal((await read()).heroes.length,2);
    assert.equal(await page.locator('[data-action="next"]').evaluate(el=>el===document.activeElement),true);
    await context.close(); console.log(`${name}: full tutorial, responsive images, keyboard, restart and save isolation passed`);
  }
  const page=await browser.newPage({viewport:{width:390,height:844}});
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${base}/dungeon.html`);
  await page.locator('#town-screen .tutorial-link').waitFor({state:'visible'});
  await page.screenshot({path:'output/tutorial/game-town-link.png',fullPage:true});
  await page.waitForFunction(()=>localStorage.getItem('vaultbound:campaign:v1') !== null);
  const before=await page.evaluate(()=>localStorage.getItem('vaultbound:campaign:v1'));
  await page.locator('#town-screen .tutorial-link').click();
  await page.waitForFunction(()=>window.render_game_to_text?.().includes('tutorial'));
  assert.equal(await page.evaluate(()=>localStorage.getItem('vaultbound:campaign:v1')),before);
  await page.locator('.quiet-link').click();
  await page.locator('.town-panorama [data-town-action="close"]').click();
  await page.locator('#roster-screen .tutorial-link').waitFor({state:'visible'});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.screenshot({path:'output/tutorial/game-roster-link.png',fullPage:true});
  await page.close();
  const live=await browser.newPage({viewport:{width:1280,height:900}});
  live.on('pageerror',e=>errors.push(e.message));
  await live.goto(`${base}/tutorial.html`);
  await live.waitForFunction(()=>typeof window.render_game_to_text === 'function');
  for (const [action,target] of [['roll'],['hire','knight'],['hire','ranger'],['next'],['train'],['next'],['fortify'],['next'],['fight']]) {
    await live.locator(`[data-action="${action}"]${target ? `[data-target="${target}"]` : ''}`).click();
  }
  await live.waitForFunction(()=>JSON.parse(window.render_game_to_text()).phase==='realtime');
  const injury = JSON.parse(await live.evaluate(()=>window.render_game_to_text()));
  assert.equal(injury.party[0].hp,110);
  await live.locator('[data-action="pause"]').click();
  await live.locator('[data-action="pause"]').click();
  assert.equal(JSON.parse(await live.evaluate(()=>window.render_game_to_text())).pausePracticed,true);
  await live.locator('[data-action="hold"]').click();
  await live.locator('[data-action="potion"]').click();
  await live.locator('[data-action="heal"]').click();
  // Real animation frames, rather than the deterministic time hook, finish this encounter.
  await live.waitForFunction(()=>JSON.parse(window.render_game_to_text()).phase==='won');
  assert.ok(await live.locator('[data-action="next"]').isEnabled());
  await live.screenshot({path:'output/tutorial/live-battle-won.png',fullPage:true});
  await live.close(); assert.deepEqual(errors,[]);
  console.log('Real-time battle, decision pauses, healing and victory: passed');
  console.log('Game navigation, existing campaign preservation and application errors: passed');
} finally { await browser.close(); }
