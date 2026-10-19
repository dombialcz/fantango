import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
await mkdir('output/departure-warning', { recursive: true });
const browser = await chromium.launch();
try {
  for (const [name,width,height] of [['desktop',1440,1000],['phone',390,844],['small',320,740]]) {
    const context = await browser.newContext({ viewport: { width,height } });
    await context.route('**/src/dungeon.js', async route => {
      const response = await route.fetch();
      await route.fulfill({response,body:`${await response.text()}\nwindow.departureTest={state,render,stage(active,day=1,reserves=0){
        state.view='tavern';state.day=day;state.rollRemainingMs=0;
        state.bench=Array.from({length:active+reserves},(_,i)=>({id:900+i,name:'Test '+i,type:'knight',level:1,active:i<active}));render();
      }};`});
    });
    const page = await context.newPage(), errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(`${process.argv[2]??'http://127.0.0.1:4193'}/dungeon.html`);
    await page.waitForFunction(()=>window.departureTest);
    const stage = (active,day=1,reserves=0)=>page.evaluate(args=>window.departureTest.stage(...args),[active,day,reserves]);
    const dialog=page.locator('.roster-departure-dialog');
    const start=page.locator('[data-roster-action="start"]');
    const view=()=>page.evaluate(()=>window.departureTest.state.view);
    await stage(1,1,3);
    const gold=await page.evaluate(()=>window.departureTest.state.gold);
    await start.click();
    assert.equal(await view(),'tavern');
    assert.match(await dialog.textContent(),/1 of 4.*3 empty slots/s);
    assert.equal(await dialog.locator('[data-departure="cancel"]').evaluate(e=>e===document.activeElement),true);
    await page.screenshot({path:`output/departure-warning/${name}.png`});
    assert.equal(await dialog.evaluate(e=>e.scrollWidth<=e.clientWidth),true);
    await dialog.locator('[data-departure="cancel"]').click();
    assert.equal(await view(),'tavern');
    assert.equal(await start.evaluate(e=>e===document.activeElement),true);
    assert.equal(await page.evaluate(()=>window.departureTest.state.gold),gold);
    await start.click();await page.keyboard.press('Escape');
    assert.equal(await dialog.evaluate(e=>e.open),false);
    await page.locator('.roster-intro h1').click();await page.keyboard.press('Enter');
    assert.equal(await dialog.evaluate(e=>e.open),true);
    await dialog.locator('[data-departure="confirm"]').click();
    assert.equal(await view(),'battle');
    assert.equal(await page.evaluate(()=>window.departureTest.state.expeditionStartCount),1);
    await stage(4);await start.click();
    assert.equal(await view(),'battle');
    assert.equal(await dialog.evaluate(e=>e.open),false);
    await stage(4,3);await start.click();
    assert.match(await dialog.textContent(),/4 of 5.*1 empty slot\./s);
    await dialog.locator('[data-departure="cancel"]').click();
    await stage(0);assert.equal(await start.isDisabled(),true);
    await page.locator('.roster-intro h1').click();await page.keyboard.press('Enter');
    assert.equal(await view(),'tavern');
    assert.equal(await dialog.evaluate(e=>e.open),false);
    assert.deepEqual(errors,[]);
    await context.close();
  }
  console.log('Underfilled/full/empty parties, reserves, growing capacity, cancel/Escape, keyboard and confirm: passed at three viewports');
} finally { await browser.close(); }
