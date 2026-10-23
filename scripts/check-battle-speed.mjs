import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const base = process.argv[2] ?? 'http://127.0.0.1:4192';
await mkdir('output/battle-speed', { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, hasTouch: true });
await context.addInitScript(() => { requestAnimationFrame = () => 0; Math.random = () => .99; });
await context.route('**/src/dungeon.js', async route => {
  const source = await readFile('src/dungeon.js', 'utf8');
  await route.fulfill({ contentType: 'text/javascript', body: source + `
    window.speedTest = { get state() { return state; }, render, persist, setBattleSpeed, prepareFloor, startExpedition, gainCommandMeter,
      stage() {
        state = createCampaign(); state.town.prefix = {}; state.town.settlement = {}; state.town.penalty = null;
        state.bench = ['knight','cleric','ranger','mage'].map((type, index) => ({ id: 200 + index, type, name: HERO_TYPES[type].label, level: 1, active: true }));
        state.party = buildParty(state.bench); state.expeditionStartIds = state.bench.map(hero => hero.id); state.expeditionStartCount = 4;
        state.floor = 1; state.events.plan.forEach(event => event.at = 9999); prepareFloor();
        state.enemies = [makeEnemy('goblin')]; state.enemies[0].hp = state.enemies[0].maxHp = 10000;
        state.commandMeter = 0; state.battlePaused = true; state.potionsRemaining = 1;
        for (const unit of [...state.party, ...state.enemies]) unit.timer = 1e7;
        render();
      },
      armTimers() {
        state.potionCooldownMs = 2000; state.enemyFreezeMs = 3000; state.freezeCooldownMs = 13000;
        state.divineAegisMs = 8000; state.divineAegisTargetId = state.party[0].id;
        state.markMs = 10000; state.markedEnemyId = state.enemies[0].id; state.markSpeedBonus = .2;
        state.holdLineMs = 6000; state.rallyMs = 6000; render();
      },
      armRanger() {
        const ranger = state.party.find(hero => hero.type === 'ranger');
        ranger.timer = heroInterval(ranger); return ranger.timer;
      }
    };` });
});
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
const slider = page.locator('[data-battle-speed]');
const pause = page.locator('[data-battle-action="pause"]');
const stage = () => page.evaluate(() => speedTest.stage());
const snapshot = () => page.evaluate(() => JSON.parse(render_game_to_text()));
const choose = index => slider.fill(String(index));
const timers = () => page.evaluate(() => {
  const s = speedTest.state;
  return [s.battleTime, s.potionCooldownMs, s.enemyFreezeMs, s.freezeCooldownMs, s.divineAegisMs, s.markMs, s.holdLineMs, s.rallyMs];
});
try {
  await page.goto(`${base}/dungeon.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.speedTest); await stage();
  assert.equal(await page.locator('[data-battle-action="speed"]').count(), 0);
  assert.equal((await snapshot()).battleSpeed, 1);
  await choose(0);
  assert.equal((await snapshot()).battleSpeed, .5); assert.equal((await snapshot()).battlePaused, true);
  assert.match(await slider.getAttribute('aria-valuetext'), /0.5× half speed/);
  assert.equal(await page.locator('[data-battle-speed-value]').textContent(), '0.5×');
  await page.evaluate(() => speedTest.armTimers());
  const before = await timers(); await page.evaluate(() => advanceTime(1000));
  assert.deepEqual(await timers(), before);
  await pause.click(); await page.evaluate(() => advanceTime(1000));
  assert.deepEqual(await timers(), [500,1500,2500,12500,7500,9500,5500,5500]);
  await choose(2); assert.equal((await snapshot()).battlePaused, false);
  await page.evaluate(() => advanceTime(500));
  assert.deepEqual(await timers(), [1500,500,1500,11500,6500,8500,4500,4500]);
  await choose(1); await page.evaluate(() => advanceTime(500)); await pause.click();
  assert.deepEqual(await timers(), [2000,0,1000,11000,6000,8000,4000,4000]);
  assert.equal((await snapshot()).battleSpeed, 1);
  const pausedTimers = await timers(); await choose(0); await page.evaluate(() => advanceTime(5000));
  assert.deepEqual(await timers(), pausedTimers);

  // Native slider keyboard interaction does not trigger global playback shortcuts.
  await slider.focus(); await page.keyboard.press('End'); assert.equal((await snapshot()).battleSpeed, 2);
  await page.keyboard.press('ArrowLeft'); assert.equal((await snapshot()).battleSpeed, 1);
  await page.keyboard.press('ArrowLeft'); assert.equal((await snapshot()).battleSpeed, .5);
  await page.keyboard.press('Space'); assert.equal((await snapshot()).battleSpeed, .5);
  await page.locator('.battle-header h1').click();
  for (const speed of [1,2,.5]) { await page.keyboard.press('Space'); assert.equal((await snapshot()).battleSpeed, speed); }
  assert.equal((await snapshot()).battlePaused, true);

  // In equal real time a Ranger attacks once/twice/four times at 0.5×/1×/2×.
  for (const [index, count] of [[0,1],[1,2],[2,4]]) {
    await stage(); await choose(index);
    const interval = await page.evaluate(() => speedTest.armRanger());
    await pause.click(); await page.evaluate(duration => advanceTime(duration), interval * 2.1); await pause.click();
    assert.equal((await snapshot()).enemies[0].hp, 10000 - count * 20);
  }

  await stage(); await choose(0);
  await page.reload(); await page.waitForFunction(() => window.speedTest);
  assert.equal((await snapshot()).battleSpeed, .5); assert.equal(await slider.inputValue(), '0');
  await page.evaluate(() => { speedTest.state.floor++; speedTest.prepareFloor(); speedTest.state.battlePaused = true; speedTest.render(); });
  assert.equal((await snapshot()).battleSpeed, .5);
  await page.evaluate(() => { speedTest.state.view = 'tavern'; speedTest.startExpedition(true); speedTest.render(); });
  assert.equal((await snapshot()).battleSpeed, .5);
  for (const [savedSpeed, expected] of [[1,1],[2,2],[9,1]]) {
    await page.evaluate(speed => { speedTest.state.battleSpeed = speed; speedTest.persist(); }, savedSpeed);
    await page.reload(); await page.waitForFunction(() => window.speedTest);
    assert.equal((await snapshot()).battleSpeed, expected);
  }
  await stage(); await choose(0);
  await page.evaluate(() => { speedTest.state.battlePaused = false; speedTest.state.commandMeter = 99; speedTest.gainCommandMeter(100); speedTest.render(); });
  assert.equal((await snapshot()).battlePaused, true); assert.equal((await snapshot()).battleSpeed, .5);
  await pause.click(); assert.equal((await snapshot()).battleSpeed, .5);
  await page.evaluate(() => { speedTest.state.view = 'floor_result'; speedTest.render(); speedTest.setBattleSpeed(2); });
  assert.equal(await slider.isDisabled(), true); assert.equal((await snapshot()).battleSpeed, .5);

  for (const [name,width,height] of [['desktop',1440,1000], ['phone',390,844], ['small',320,740], ['landscape',844,390]]) {
    await page.setViewportSize({width,height}); await stage();
    const bounds = await slider.boundingBox();
    await page.mouse.click(bounds.x + bounds.width * .05, bounds.y + bounds.height / 2);
    assert.equal((await snapshot()).battleSpeed, .5);
    await page.touchscreen.tap(bounds.x + bounds.width * .95, bounds.y + bounds.height / 2);
    assert.equal((await snapshot()).battleSpeed, 2);
    await page.mouse.move(bounds.x + bounds.width * .95, bounds.y + bounds.height / 2); await page.mouse.down();
    await page.mouse.move(bounds.x + bounds.width * .05, bounds.y + bounds.height / 2, {steps:8}); await page.mouse.up();
    assert.equal((await snapshot()).battleSpeed, .5);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    const control = await page.locator('.battle-speed-control').boundingBox();
    assert.ok(control.x >= 0 && control.x + control.width <= width && control.y + control.height <= height);
    assert.ok(await pause.isVisible());
    await page.evaluate(() => Promise.all([...document.querySelectorAll('#battle-screen img')].map(image => image.decode())));
    await page.screenshot({path:`output/battle-speed/${name}.png`});
  }
  await page.setViewportSize({width:1440,height:1000}); await stage(); await choose(0);
  const saved = await page.evaluate(() => { speedTest.persist(); return localStorage.getItem('vaultbound:campaign:v1'); });
  const html = (await readFile('dungeon.html','utf8')).replace('<head>', `<head><base href="/"><link rel="icon" href="data:,"><script>localStorage.setItem('vaultbound:campaign:v1', ${JSON.stringify(saved)});</script>`);
  await writeFile('output/battle-speed/client.html', html);
  assert.deepEqual(errors, []);
  console.log('Battle speed: 0.5×/1×/2× slider, actual attacks/timers, separate pause, keyboard/mouse/touch/drag, persistence/migration, auto-pause and four responsive layouts passed.');
} finally { await browser.close(); }
