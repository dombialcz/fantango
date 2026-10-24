import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const base = process.argv[2] ?? 'http://127.0.0.1:4192';
await mkdir('output/bloodlust', { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
await context.addInitScript(() => { window.requestAnimationFrame = () => 0; Math.random = () => .99; });
await context.route('**/src/dungeon.js', async route => {
  const source = await readFile('src/dungeon.js', 'utf8');
  await route.fulfill({ contentType: 'text/javascript', body: source + `
    window.bloodlustTest = { get state() { return state; }, render, persist, useBattleCommand, resetFloorCommands,
      stage() {
        state = createCampaign(); state.town.prefix = {}; state.town.settlement = {};
        state.day = 5; state.floor = 3; state.flavorKey = 'undead';
        state.buildings.barbarian = { level: 3, pathA: 0, pathB: 2 };
        state.bench = ['barbarian', 'knight', 'thief', 'cleric', 'ranger', 'mage'].map((type, index) => ({ id: 100 + index, type, name: HERO_TYPES[type].label, level: 2, active: true }));
        state.party = buildParty(state.bench); state.expeditionStartIds = state.bench.map(hero => hero.id); state.expeditionStartCount = 6;
        state.events.plan.forEach(event => event.at = 9999); prepareFloor();
        state.enemies = ['skeleton', 'zombie', 'boneMage', 'necromancer'].map(type => makeEnemy(type));
        state.enemies.forEach(enemy => { enemy.hp = enemy.maxHp = 10000; enemy.evasionChance = 0; enemy.damageReduction = 0; });
        state.enemies[1].damageReduction = .2;
        state.party.forEach(hero => { hero.hp = Math.ceil(hero.maxHp * .6); }); state.party[1].hp = 1;
        state.battlePaused = true; state.commandMeter = 100;
        for (const unit of [...state.party, ...state.enemies]) unit.timer = 1e7;
        render();
      }
    };` });
});
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
const stage = () => page.evaluate(() => window.bloodlustTest.stage());
const snapshot = () => page.evaluate(() => {
  const state = window.bloodlustTest.state;
  return { heroHp: state.party.map(hero => hero.hp), enemyHp: state.enemies.map(enemy => enemy.hp), meter: state.commandMeter, cooldown: state.bloodlustCooldownMs, log: state.battleLog, graves: state.graves.length };
});
const cast = () => page.locator('[data-command="bloodlust"]').click();
try {
  await page.goto(`${base}/dungeon.html`, { waitUntil: 'domcontentloaded' }); await page.waitForFunction(() => window.bloodlustTest);
  await stage();
  const before = await snapshot(); await cast();
  let after = await snapshot();
  // L2 front: Barbarian 170*1.5*1.2 + Knight 170*.8 + Thief 170*.6 + Cleric 170*.2.
  // Multiply their combined attack by 1.25 and apply shared .25 combat scaling, then enemy defenses.
  assert.deepEqual(after.enemyHp, [9819, 9855, 10000, 10000]);
  assert.deepEqual(after.heroHp, before.heroHp); assert.equal(after.graves, 0); assert.equal(after.meter, 40);
  assert.match(after.log[0], /Bloodlust.*2 foes.*front row/);
  assert.match(await page.locator('#command-description').textContent(), /combined attack damage.*No health cost/);
  await page.evaluate(() => advanceTime(1000)); assert.deepEqual((await snapshot()).heroHp, before.heroHp);

  // Insufficient points and missing living Barbarians cannot spend or cause damage.
  const unchanged = await snapshot();
  await page.evaluate(() => window.bloodlustTest.useBattleCommand('bloodlust'));
  assert.deepEqual(await snapshot(), unchanged);
  await stage();
  await page.evaluate(() => { const t = window.bloodlustTest; t.state.party[0].hp = 0; t.render(); });
  const noBarbarian = await snapshot();
  assert.equal(await page.locator('[data-command="bloodlust"]').getAttribute('aria-disabled'), 'true');
  await page.evaluate(() => window.bloodlustTest.useBattleCommand('bloodlust'));
  assert.deepEqual(await snapshot(), noBarbarian);

  // Active Hold the Line and both event damage modifiers contribute to the combined strike.
  await stage();
  await page.evaluate(() => { const t = window.bloodlustTest; t.state.holdLineMs = 6000; t.state.holdDamageBonus = .2; t.state.events.dayPower = 1.05; t.state.events.activeAttack = 1.1; t.render(); });
  await cast(); assert.deepEqual((await snapshot()).enemyHp, [9750, 9800, 10000, 10000]);

  // Dead frontliners and powerful rear heroes contribute no damage.
  await stage();
  await page.evaluate(() => { const t = window.bloodlustTest; t.state.party[1].hp = 0; t.state.party[4].power = t.state.party[5].power = 100000; t.render(); });
  await cast(); assert.deepEqual((await snapshot()).enemyHp, [9862, 9889, 10000, 10000]);

  // Empty and dead enemy fronts both fall back to every living rear enemy.
  for (const removeFront of [false, true]) {
    await stage();
    await page.evaluate(removeFront => { const t = window.bloodlustTest; if (removeFront) t.state.enemies = t.state.enemies.slice(2); else t.state.enemies.slice(0, 2).forEach(enemy => enemy.hp = 0); t.render(); }, removeFront);
    assert.equal(await page.locator('[data-command="bloodlust"]').getAttribute('aria-disabled'), 'false');
    const hp = (await snapshot()).heroHp;
    await page.keyboard.press('5');
    after = await snapshot();
    assert.deepEqual(after.enemyHp, removeFront ? [9819, 9819] : [0, 0, 9819, 9819]);
    assert.deepEqual(after.heroHp, hp); assert.equal(after.meter, 40); assert.match(after.log[0], /back row/);
  }

  // Cooldown blocks mouse, keyboard and direct casts without spending Command.
  await stage(); await cast();
  await page.evaluate(() => { const t = window.bloodlustTest; t.state.commandMeter = 100; t.render(); });
  const cooling = await snapshot();
  assert.equal(cooling.cooldown, 10000);
  assert.equal(await page.locator('[data-command="bloodlust"]').getAttribute('aria-disabled'), 'true');
  assert.match(await page.locator('[data-command="bloodlust"] .battle-command__reason').textContent(), /cooldown 10.0s/);
  await page.locator('[data-command="bloodlust"]').click({ force: true }); await page.keyboard.press('5');
  await page.evaluate(() => window.bloodlustTest.useBattleCommand('bloodlust'));
  assert.deepEqual(await snapshot(), cooling);
  await page.evaluate(() => advanceTime(20000));
  assert.equal((await snapshot()).cooldown, 10000, 'pause freezes cooldown');
  await page.evaluate(() => window.bloodlustTest.persist());
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.bloodlustTest);
  assert.equal((await snapshot()).cooldown, 10000, 'reload preserves cooldown');
  for (const [speed, elapsed, expected] of [[.5, 2000, 9000], [1, 1000, 8000], [2, 1000, 6000]]) {
    await page.evaluate(({speed, elapsed}) => { const t = window.bloodlustTest; t.state.commandAutoPauseEnabled = false; t.state.battlePaused = false; t.state.battleSpeed = speed; advanceTime(elapsed); }, {speed, elapsed});
    assert.equal((await snapshot()).cooldown, expected);
  }
  await page.evaluate(() => { const t = window.bloodlustTest; t.state.battleSpeed = 1; advanceTime(5999); });
  assert.ok((await snapshot()).cooldown > 0 && (await snapshot()).cooldown <= 1.1);
  await page.evaluate(() => window.bloodlustTest.useBattleCommand('bloodlust'));
  assert.equal((await snapshot()).meter, 100);
  await page.evaluate(() => advanceTime(1));
  assert.equal((await snapshot()).cooldown, 0);
  await cast(); assert.equal((await snapshot()).cooldown, 10000);
  await page.evaluate(() => { const t = window.bloodlustTest; t.resetFloorCommands(); t.render(); });
  assert.equal((await snapshot()).cooldown, 0, 'next floor resets cooldown');

  // Clearing the front in one sweep leaves the rear for the next command.
  await stage();
  await page.evaluate(() => { const t = window.bloodlustTest; t.state.enemies.slice(0, 2).forEach(enemy => enemy.hp = 1); t.render(); });
  await cast(); assert.deepEqual((await snapshot()).enemyHp, [0, 0, 10000, 10000]);
  await page.evaluate(() => { const t = window.bloodlustTest; t.state.commandMeter = 100; t.state.battlePaused = false; t.state.commandAutoPauseEnabled = false; advanceTime(10000); t.state.battlePaused = true; t.render(); });
  await cast(); assert.deepEqual((await snapshot()).enemyHp, [0, 0, 9819, 9819]);

  // Enemy armor and dodge retain the normal combat rules.
  await stage();
  await page.evaluate(() => { const t = window.bloodlustTest; t.state.enemies[0].evasionChance = 1; t.state.enemies[1].damageReduction = 1; Math.random = () => .1; t.render(); });
  await cast(); assert.deepEqual((await snapshot()).enemyHp, [10000, 9982, 10000, 10000]);
  await page.evaluate(() => { Math.random = () => .99; });

  // No valid targets or allied front means no charge, even through the direct handler.
  for (const empty of ['enemies', 'front']) {
    await stage();
    await page.evaluate(empty => { const t = window.bloodlustTest; if (empty === 'enemies') t.state.enemies.forEach(enemy => enemy.hp = 0); else t.state.party.forEach(hero => hero.row = 'back'); t.render(); }, empty);
    const initial = await snapshot();
    await page.evaluate(() => window.bloodlustTest.useBattleCommand('bloodlust'));
    assert.deepEqual(await snapshot(), initial);
  }

  for (const [name, width, height] of [['desktop',1440,1000], ['small-phone',320,740], ['landscape',844,390]]) {
    await page.setViewportSize({ width, height }); await stage(); await cast();
    await page.evaluate(() => Promise.all([...document.querySelectorAll('#battle-screen img')].map(image => image.decode())));
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.match(await page.locator('[data-command="bloodlust"] .battle-command__power').textContent(), /×1.25 combined frontline damage/);
    await page.screenshot({ path: `output/bloodlust/${name}.png` });
  }

  // Save a representative paused encounter for the bundled web-game action client.
  await page.setViewportSize({ width: 1440, height: 1000 }); await stage();
  const saved = await page.evaluate(() => { window.bloodlustTest.persist(); return localStorage.getItem('vaultbound:campaign:v1'); });
  const html = await readFile('dungeon.html', 'utf8');
  await writeFile('output/bloodlust/client.html', html.replace('<head>', `<head><base href="/"><link rel="icon" href="data:,"><script>localStorage.setItem('vaultbound:campaign:v1', ${JSON.stringify(saved)});</script>`));
  assert.deepEqual(errors, []);
  console.log('Bloodlust: exact combined damage, buffs, living/front-only contributors, no HP loss, front/back targeting, armor/dodge, resource guards, ten-second combat cooldown/pause/speeds/reload/reset and responsive UI passed.');
} finally { await browser.close(); }
