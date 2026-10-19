import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const base = process.argv[2] ?? 'http://127.0.0.1:4192';
await mkdir('output/enemy-health', { recursive: true });
const browser = await chromium.launch();
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.addInitScript(() => { window.requestAnimationFrame = () => 0; Math.random = () => .75; });
  await context.route('**/src/dungeon.js', async route => {
    const source = await readFile('src/dungeon.js', 'utf8');
    await route.fulfill({ contentType: 'text/javascript', body: source + `
      window.healthTest = { get state() { return state; }, ENEMY_TYPES, makeEnemy, actEnemy, updateBattle, persist, render,
        stage(floor = 1, flavor = 'undead', bossType = null) {
          state = createCampaign(); state.flavorKey = flavor; state.bossType = bossType; state.floor = floor; state.day = 9;
          state.town.prefix = {}; state.town.settlement = {};
          state.bench = ['knight','knight','cleric','cleric','ranger','mage','barbarian','bard'].map((type,i) => ({ id: 500+i, name: HERO_TYPES[type].label, type, level: 5, active: true }));
          state.party = buildParty(state.bench); state.expeditionStartCount = 8; state.expeditionStartIds = state.bench.map(h => h.id);
          state.events.plan.forEach(event => event.at = 9999); prepareFloor(); state.battlePaused = true; render();
        }
      };` });
  });
  const page = await context.newPage(); const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', e => { if (e.type() === 'error') errors.push(e.text()); });
  await page.goto(`${base}/dungeon.html`); await page.waitForFunction(() => window.healthTest);
  const rows = await page.evaluate(() => {
    const t = window.healthTest;
    return [1,2,5,10,11,20].flatMap(floor => Object.entries(t.ENEMY_TYPES).map(([type, definition]) => ({
      floor, baseHp: definition.hp, baseDamage: definition.damage, unit: t.makeEnemy(type, floor),
    })));
  });
  const factors = { 1: 1.1, 2: 1.2, 5: 1.5, 10: 2, 11: 2.1, 20: 3 };
  for (const { floor, baseHp, baseDamage, unit } of rows) {
    const existingScale = 1 + Math.log2(floor) * .45;
    assert.equal(unit.maxHp, Math.round(baseHp * existingScale * factors[floor]), `${unit.type} floor ${floor}`);
    assert.equal(unit.hp, unit.maxHp);
    assert.equal(unit.damage, Math.round(baseDamage * existingScale));
  }
  const summons = await page.evaluate(() => {
    const t = window.healthTest;
    t.stage(5); t.state.enemies = [t.makeEnemy('necromancer')]; t.actEnemy(t.state.enemies[0]);
    const skeleton = t.state.enemies.at(-1);
    t.stage(10, 'undead', 'lich'); t.state.enemies[0].attacks = 1; t.actEnemy(t.state.enemies[0]);
    const lichSummon = t.state.enemies.at(-1);
    return [skeleton, lichSummon].map(unit => ({ unit, baseHp: t.ENEMY_TYPES[unit.type].hp }));
  });
  for (const [i, { unit, baseHp }] of summons.entries()) {
    const floor = i === 0 ? 5 : 10;
    assert.equal(unit.maxHp, Math.round(baseHp * (1 + Math.log2(floor) * .45) * factors[floor]));
    assert.equal(unit.hp, unit.maxHp);
  }
  // A fixed encounter takes longer solely because of extra health.
  const durations = await page.evaluate(() => {
    const t = window.healthTest;
    return [false, true].map(boosted => {
      t.stage(5); Math.random = () => .75;
      t.state.enemies = [t.makeEnemy('orc')]; const enemy = t.state.enemies[0];
      if (!boosted) enemy.hp = enemy.maxHp = Math.round(t.ENEMY_TYPES.orc.hp * (1 + Math.log2(5) * .45));
      enemy.timer = 1e7; t.state.commandAutoPauseEnabled = false; t.state.battlePaused = false;
      for (let step = 0; step < 1800 && t.state.view === 'battle'; step++) t.updateBattle(50);
      return { time: t.state.battleTime, cleared: t.state.view === 'floor_result' };
    });
  });
  assert.ok(durations.every(result => result.cleared)); assert.ok(durations[1].time > durations[0].time);
  console.log(`Controlled floor-five encounter: ${durations[0].time}ms → ${durations[1].time}ms.`);
  // Reload preserves wounded HP; the following floor creates enemies with the new multiplier.
  await page.evaluate(() => { const t = window.healthTest; t.stage(5); t.state.enemies[0].hp = Math.floor(t.state.enemies[0].maxHp / 2); t.render(); t.persist(); });
  const before = await page.evaluate(() => window.healthTest.state.enemies.map(e => [e.hp,e.maxHp]));
  await page.reload(); await page.waitForFunction(() => window.healthTest);
  assert.deepEqual(await page.evaluate(() => window.healthTest.state.enemies.map(e => [e.hp,e.maxHp])), before);
  await page.evaluate(() => { const t = window.healthTest; t.state.enemies.forEach(e => e.hp = 0); t.state.battlePaused = false; t.updateBattle(50); t.render(); });
  await page.locator('[data-battle-action="continue"]').click();
  const next = await page.evaluate(() => { const t = window.healthTest; return t.state.enemies.map(e => ({ hp: e.hp, base: t.ENEMY_TYPES[e.type].hp })); });
  for (const enemy of next) assert.equal(enemy.hp, Math.round(enemy.base * (1 + Math.log2(6) * .45) * 1.6));
  for (const [name, width, height] of [['desktop',1440,1000],['phone',320,740]]) {
    await page.setViewportSize({ width, height });
    await page.evaluate(() => window.healthTest.stage(10,'orcs','elderShaman'));
    await page.evaluate(() => Promise.all([...document.querySelectorAll('#battle-screen img')].map(img => img.decode())));
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: `output/enemy-health/boss-${name}.png` });
    if (name === 'desktop') {
      const saved = await page.evaluate(() => { window.healthTest.persist(); return localStorage.getItem('vaultbound:campaign:v1'); });
      const html = (await readFile('dungeon.html','utf8')).replace('<head>', `<head><base href="/"><script>localStorage.setItem('vaultbound:campaign:v1',${JSON.stringify(saved)});</script>`);
      await writeFile('output/enemy-health/client.html', html);
    }
  }
  assert.deepEqual(errors, []);
  console.log('All enemy types at six depths, unchanged damage, Necromancer/Lich summons, longer fight, reload/next-floor HP and responsive health displays: passed.');
} finally { await browser.close(); }
