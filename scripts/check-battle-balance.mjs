import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const base = process.argv[2] ?? 'http://127.0.0.1:4192';
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
await context.addInitScript(() => { window.requestAnimationFrame = () => 0; Math.random = () => .75; });
await context.route('**/src/dungeon.js', async route => {
  const source = await readFile('src/dungeon.js', 'utf8');
  await route.fulfill({ contentType: 'text/javascript', body: source + `
    window.balanceTest = { get state() { return state; }, render, persist, dealDamage, shieldHero, gainCommandMeter,
      finishFloor, finishDay, advanceDay, startExpedition, prepareFloor,
      stage() {
        state = createCampaign(); state.town.prefix = {}; state.town.settlement = {};
        state.bench = ['knight','cleric','ranger','mage'].map((type, i) => ({ id: 100+i, type, name: HERO_TYPES[type].label, level: 1, active: true }));
        state.party = buildParty(state.bench); state.expeditionStartIds = state.bench.map(h => h.id); state.expeditionStartCount = 4; state.floor = 1;
        state.events.plan.forEach(event => event.at = 9999); prepareFloor();
        state.battlePaused = true; state.potionsRemaining = 1;
        for (const unit of [...state.party, ...state.enemies]) unit.timer = 1e7;
        render();
      }
    };` });
});
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
await mkdir('output/battle-balance', { recursive: true });
const snapshot = () => page.evaluate(() => JSON.parse(render_game_to_text()));
const stage = () => page.evaluate(() => window.balanceTest.stage());
const setMeter = meter => page.evaluate(meter => { const t = window.balanceTest; t.state.commandMeter = meter; t.render(); }, meter);
const pause = page.locator('[data-battle-action="pause"]');
const toggle = page.locator('[data-battle-action="auto-pause"]');
const freeze = page.locator('[data-command="freeze"]');
const aegis = page.locator('[data-command="aegis"]');
try {
  await page.goto(`${base}/dungeon.html`); await page.waitForFunction(() => window.balanceTest);
  await stage();
  // Damage earns a fifth as much Command: 100 actual damage now earns 12 points.
  await page.evaluate(() => { const t = window.balanceTest; t.gainCommandMeter(100); t.render(); });
  assert.equal((await snapshot()).commands.meter, 62);
  assert.equal((await snapshot()).commands.gainPerDamage, .12);
  await stage(); await setMeter(0);
  const earned = await page.evaluate(() => {
    const t = window.balanceTest, s = t.state;
    s.enemies[0].hp = s.enemies[0].maxHp = 1000; Math.random = () => .99;
    const dealt = t.dealDamage(s.enemies[0], 100, s.party[2]);
    const afterDealt = s.commandMeter;
    const received = t.dealDamage(s.party[0], 100, s.enemies[0]);
    return { dealt, afterDealt, received, total: s.commandMeter };
  });
  assert.equal(earned.dealt, 25); assert.equal(earned.afterDealt, 3);
  assert.equal(earned.received, 20); assert.equal(earned.total, 5.4);
  await stage(); await setMeter(99); await freeze.click({ force: true });
  assert.equal((await snapshot()).commands.effects.enemyFreezeMs, 0);
  assert.equal((await snapshot()).commands.meter, 99);
  await setMeter(100); await freeze.click({ force: true });
  let s = await snapshot();
  assert.equal(s.commands.meter, 0);
  assert.equal(s.commands.effects.enemyFreezeMs, 2750);
  assert.equal(s.commands.effects.freezeCooldownMs, 12750);
  await page.evaluate(() => advanceTime(3000));
  assert.equal((await snapshot()).commands.effects.freezeCooldownMs, 12750);
  await setMeter(100); await pause.click(); await page.evaluate(() => advanceTime(2750)); await pause.click();
  s = await snapshot(); assert.equal(s.commands.effects.enemyFreezeMs, 0); assert.equal(s.commands.effects.freezeCooldownMs, 10000);
  assert.match(await freeze.locator('.battle-command__reason').textContent(), /cooldown 10.0s/);
  await freeze.click({ force: true }); assert.equal((await snapshot()).commands.meter, 100);
  await page.screenshot({ path: 'output/battle-balance/cooldown.png' });
  await pause.click(); await page.evaluate(() => advanceTime(9990)); await pause.click();
  assert.ok((await snapshot()).commands.effects.freezeCooldownMs > 0);
  await freeze.click({ force: true }); assert.equal((await snapshot()).commands.meter, 100);
  await pause.click(); await page.evaluate(() => advanceTime(10)); await pause.click();
  await freeze.click({ force: true }); assert.equal((await snapshot()).commands.meter, 0);

  // Aegis is targeted; cancellation and invalid/dead targets never spend Command.
  await stage(); await setMeter(100); await aegis.click();
  assert.equal((await snapshot()).commands.targeting, 'aegis');
  assert.equal(await page.locator('[data-side="hero"].is-targetable').count(), 4);
  await page.evaluate(() => window.balanceTest.shieldHero(window.balanceTest.state.enemies[0]));
  assert.equal((await snapshot()).commands.meter, 100);
  await page.keyboard.press('Escape'); assert.equal((await snapshot()).commands.targeting, null);
  assert.equal((await snapshot()).commands.meter, 100);
  await page.keyboard.press('4');
  await page.locator('[data-unit-type="ranger"]').click();
  s = await snapshot(); assert.equal(s.commands.meter, 30); assert.equal(s.commands.effects.divineAegisMs, 8000);
  assert.match(await aegis.locator('.battle-command__power').textContent(), /8.0s shield/);
  assert.equal(s.commands.effects.divineAegisTargetId, 'hero-102');
  assert.equal(await page.locator('[data-side="hero"].is-shielded').count(), 1);
  const damage = await page.evaluate(() => {
    const t = window.balanceTest, s = t.state;
    Math.random = () => { throw Error('Shield should block before interception or dodge'); };
    const protectedDamage = t.dealDamage(s.party[2], 100, s.enemies[0]);
    Math.random = () => .99;
    const otherDamage = t.dealDamage(s.party[1], 100, s.enemies[0]); t.render();
    return { protectedDamage, otherDamage };
  });
  assert.equal(damage.protectedDamage, 0); assert.ok(damage.otherDamage > 0);
  await page.evaluate(() => advanceTime(1000)); assert.equal((await snapshot()).commands.effects.divineAegisMs, 8000);
  await page.evaluate(() => window.balanceTest.persist()); await page.reload(); await page.waitForFunction(() => window.balanceTest);
  assert.equal(await page.locator('[data-side="hero"].is-shielded').count(), 1);
  assert.equal((await snapshot()).commands.effects.divineAegisTargetId, 'hero-102');
  await pause.click(); await page.evaluate(() => advanceTime(6000)); await pause.click();
  assert.equal((await snapshot()).commands.effects.divineAegisMs, 2000);
  assert.equal(await page.locator('[data-side="hero"].is-shielded').count(), 1);
  await pause.click(); await page.evaluate(() => advanceTime(1990)); await pause.click();
  assert.ok((await snapshot()).commands.effects.divineAegisMs > 0);
  assert.equal(await page.evaluate(() => {
    const t = window.balanceTest; return t.dealDamage(t.state.party[2], 100, t.state.enemies[0]);
  }), 0);
  await pause.click(); await page.evaluate(() => advanceTime(10)); await pause.click();
  assert.equal((await snapshot()).commands.effects.divineAegisMs, 0);
  assert.equal((await snapshot()).commands.effects.divineAegisTargetId, null);
  assert.equal(await page.locator('[data-side="hero"].is-shielded').count(), 0);
  assert.equal(await page.evaluate(() => {
    const t = window.balanceTest; Math.random = () => .99;
    return t.dealDamage(t.state.party[2], 100, t.state.enemies[0]);
  }), 25);

  await stage(); await setMeter(100); await aegis.click(); await page.locator('[data-unit-type="knight"]').click();
  const intercept = await page.evaluate(() => {
    const t = window.balanceTest, s = t.state; Math.random = () => 0;
    const interceptedDamage = t.dealDamage(s.party[2], 100, s.enemies[0]);
    Math.random = () => .99;
    const shieldedArea = t.dealDamage(s.party[0], 100, s.enemies[0], { area: true });
    const otherArea = t.dealDamage(s.party[2], 100, s.enemies[0], { area: true }); t.render();
    return { interceptedDamage, intercepted: s.party[0].interceptFlash > 0, shieldedArea, otherArea };
  });
  assert.deepEqual(intercept, { interceptedDamage: 0, intercepted: true, shieldedArea: 0, otherArea: 25 });
  await page.evaluate(() => { const t = window.balanceTest; t.state.divineAegisMs = 0; t.state.commandMeter = 100; t.render(); });
  await aegis.click();
  await page.evaluate(() => { const t = window.balanceTest, target = t.state.party[2]; target.hp = 0; t.shieldHero(target); });
  assert.equal((await snapshot()).commands.meter, 100);

  // Mark Prey lasts ten combat seconds; pausing/reload preserve it and target death ends it.
  await stage(); await setMeter(100);
  const rangerInterval = (await snapshot()).party.find(hero => hero.class === 'ranger').attackIntervalMs;
  const mark = page.locator('[data-command="mark"]');
  await mark.click(); await page.keyboard.press('Escape');
  assert.equal((await snapshot()).commands.meter, 100);
  await mark.click(); await page.locator('[data-side="enemy"].is-targetable').first().click();
  s = await snapshot();
  assert.equal(s.commands.meter, 60); assert.equal(s.commands.effects.markMs, 10000);
  assert.equal(s.commands.effects.markSpeedBonus, .2);
  assert.ok(s.party.find(hero => hero.class === 'ranger').attackIntervalMs < rangerInterval);
  assert.match(await page.locator('#command-description').textContent(), /ten seconds/);
  await page.screenshot({ path: 'output/battle-balance/mark-ten-seconds.png' });
  const markedSave = await page.evaluate(() => { window.balanceTest.persist(); return localStorage.getItem('vaultbound:campaign:v1'); });
  const markedHtml = (await readFile('dungeon.html', 'utf8')).replace('<head>', `<head><base href="/"><script>localStorage.setItem('vaultbound:campaign:v1', ${JSON.stringify(markedSave)});</script>`);
  await writeFile('output/battle-balance/mark-client.html', markedHtml);
  await page.reload(); await page.waitForFunction(() => window.balanceTest);
  await page.evaluate(() => advanceTime(1000));
  assert.equal((await snapshot()).commands.effects.markMs, 10000);
  await pause.click(); await page.evaluate(() => advanceTime(6000)); await pause.click();
  assert.equal((await snapshot()).commands.effects.markMs, 4000);
  await pause.click(); await page.evaluate(() => advanceTime(3990)); await pause.click();
  assert.equal((await snapshot()).commands.effects.markMs, 10);
  assert.ok((await snapshot()).party.find(hero => hero.class === 'ranger').attackIntervalMs < rangerInterval);
  await pause.click(); await page.evaluate(() => advanceTime(10)); await pause.click();
  s = await snapshot(); assert.equal(s.commands.effects.markMs, 0);
  assert.equal(s.commands.effects.markedEnemyId, null); assert.equal(s.commands.effects.markSpeedBonus, 0);
  assert.equal(s.party.find(hero => hero.class === 'ranger').attackIntervalMs, rangerInterval);
  await setMeter(100); await mark.click(); await page.locator('[data-side="enemy"].is-targetable').first().click();
  await page.evaluate(() => { const t = window.balanceTest; t.state.enemies.find(enemy => enemy.id === t.state.markedEnemyId).hp = 0; });
  await pause.click(); await page.evaluate(() => advanceTime(1)); await pause.click();
  s = await snapshot(); assert.equal(s.commands.effects.markMs, 0); assert.equal(s.commands.effects.markedEnemyId, null);
  assert.equal(s.party.find(hero => hero.class === 'ranger').attackIntervalMs, rangerInterval);

  // Toggle controls only future pauses. It persists through floors/reload, resets each expedition.
  await stage(); assert.equal(await toggle.getAttribute('aria-pressed'), 'true');
  await toggle.click(); assert.equal((await snapshot()).battlePaused, true);
  await pause.click(); await setMeter(99);
  await page.evaluate(() => { const t = window.balanceTest; t.gainCommandMeter(10); t.render(); });
  assert.equal((await snapshot()).commands.meter, 100); assert.equal((await snapshot()).battlePaused, false);
  await page.evaluate(() => advanceTime(1000)); assert.equal((await snapshot()).battleTimeMs, 1000);
  await toggle.click(); assert.equal((await snapshot()).battlePaused, true);
  assert.equal((await snapshot()).commandAutoPaused, true);
  await toggle.click(); assert.equal((await snapshot()).battlePaused, true);
  await page.evaluate(() => window.balanceTest.persist()); await page.reload(); await page.waitForFunction(() => window.balanceTest);
  assert.equal((await snapshot()).commandAutoPauseEnabled, false);
  await page.evaluate(() => { const t = window.balanceTest; t.finishFloor(); t.render(); });
  await page.locator('[data-battle-action="continue"]').click(); assert.equal((await snapshot()).commandAutoPauseEnabled, false);
  await page.evaluate(() => {
    const t = window.balanceTest; t.finishDay('Returned'); t.advanceDay(); t.state.view = 'tavern'; t.startExpedition(true); t.render();
  });
  assert.equal((await snapshot()).commandAutoPauseEnabled, true);
  await setMeter(99); await page.evaluate(() => { const t = window.balanceTest; t.gainCommandMeter(10); t.render(); });
  assert.equal((await snapshot()).battlePaused, true);

  // Independent base 10% boundary, no rerolls on repeated result calls/reload, usable supplies.
  for (const [roll, recovered] of [[0, true], [.09999, true], [.1, false], [.99999, false]]) {
    await stage();
    await page.evaluate(roll => { const t = window.balanceTest; t.state.potionsRemaining = 0; Math.random = () => roll; t.finishFloor(); t.render(); }, roll);
    s = await snapshot(); assert.equal(s.potions.remaining, recovered ? 1 : 0); assert.equal(s.potions.recoveredThisFloor, recovered);
    assert.equal(s.chronicle.filter(entry => entry.category === 'supplies').length, recovered ? 1 : 0);
    const gold = s.gold;
    await page.evaluate(() => { const t = window.balanceTest; t.finishFloor(); t.render(); });
    assert.equal((await snapshot()).potions.remaining, recovered ? 1 : 0); assert.equal((await snapshot()).gold, gold);
    if (recovered) {
      assert.match(await page.locator('.battle-report__copy').textContent(), /Recovered one healing potion/);
      await page.evaluate(() => window.balanceTest.persist()); await page.reload(); await page.waitForFunction(() => window.balanceTest);
      assert.equal((await snapshot()).potions.remaining, 1);
      await page.screenshot({ path: 'output/battle-balance/potion-recovered.png' });
      await page.locator('[data-battle-action="continue"]').click();
      await page.evaluate(() => { const t = window.balanceTest; t.state.battlePaused = true; t.state.party[0].hp = 1; t.render(); });
      await page.locator('[data-battle-action="potion"]').click(); await page.locator('[data-unit-type="knight"]').click();
      assert.equal((await snapshot()).potions.remaining, 0); assert.ok((await snapshot()).party[0].hp > 1);
    }
  }
  await stage();
  await page.evaluate(() => {
    const t = window.balanceTest; Math.random = () => .05;
    t.state.events.plan = [{ id: 'W02', at: 1, outcomeRoll: .1, rewardRoll: .1, targetRoll: .1 }];
    t.finishFloor(); t.render();
  });
  assert.equal((await snapshot()).view, 'event'); assert.equal((await snapshot()).potions.remaining, 2);
  await page.locator('[data-event-choice="0"]').click(); assert.equal((await snapshot()).potions.remaining, 4);
  await page.locator('[data-event-continue]').click(); assert.equal((await snapshot()).potions.remaining, 4);
  assert.match(await page.locator('.battle-report__copy').textContent(), /Recovered one healing potion/);

  // All controls and selected shield remain readable in desktop, phones and landscape.
  for (const [name, width, height] of [['desktop',1440,1000],['phone',390,844],['small',320,740],['landscape',844,390]]) {
    await page.setViewportSize({ width, height }); await stage(); await setMeter(100);
    await aegis.click(); await page.locator('[data-unit-type="knight"]').click();
    await page.evaluate(() => Promise.all([...document.querySelectorAll('#battle-screen img')].map(img => img.decode())));
    assert.equal(await toggle.isVisible(), true);
    assert.ok(await toggle.evaluate(el => { const r = el.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight && r.right <= innerWidth; }));
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.ok(await page.locator('[data-command]').evaluateAll(buttons => buttons.every(button => button.getBoundingClientRect().bottom <= innerHeight)));
    await page.screenshot({ path: `output/battle-balance/aegis-${name}.png` });
    if (name === 'desktop') {
      const saved = await page.evaluate(() => { window.balanceTest.persist(); return localStorage.getItem('vaultbound:campaign:v1'); });
      const html = (await readFile('dungeon.html', 'utf8')).replace('<head>', `<head><base href="/"><script>localStorage.setItem('vaultbound:campaign:v1', ${JSON.stringify(saved)});</script>`);
      await writeFile('output/battle-balance/client.html', html);
    }
    await toggle.focus(); await page.keyboard.press('Space'); assert.equal((await snapshot()).commandAutoPauseEnabled, false);
    assert.equal((await snapshot()).battleSpeed, 1);
  }
  // Older saves acquire the default toggle and discard obsolete party-wide shields.
  await page.evaluate(() => {
    const s = window.balanceTest.state;
    delete s.commandAutoPauseEnabled; delete s.freezeCooldownMs; delete s.divineAegisTargetId;
    s.divineAegisMs = 1000;
    window.balanceTest.persist();
  });
  await page.reload(); await page.waitForFunction(() => window.balanceTest);
  s = await snapshot(); assert.equal(s.commandAutoPauseEnabled, true); assert.equal(s.commands.effects.freezeCooldownMs, 0);
  assert.equal(s.commands.effects.divineAegisMs, 0); assert.equal(await page.locator('.is-shielded').count(), 0);
  assert.deepEqual(errors, []);
  console.log('Battle balance: Freeze cost/cooldown, eight-second Aegis/interception/AoE, ten-second Mark/expiry/target death, potion recovery, auto-pause/persistence and four layouts passed.');
} finally { await browser.close(); }
