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
        stage(floor = 1, flavor = 'undead', bossType = null, completedCampaigns = 0) {
          const journey = createJourney();
          journey.completed = ['orcs','demons','assassins'].slice(0, completedCampaigns).map(flavorKey => ({flavorKey, town:{name:'Saved town'}}));
          state = createCampaign(journey); state.flavorKey = flavor; state.bossType = bossType; state.floor = floor; state.day = 9;
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
    return [0,1,2,3].flatMap(completedCampaigns => {
      t.stage(1, 'undead', null, completedCampaigns);
      return [1,2,5,10,11,20].flatMap(floor => Object.entries(t.ENEMY_TYPES).map(([type, definition]) => ({
        completedCampaigns, floor, baseHp: definition.hp, baseDamage: definition.damage, unit: t.makeEnemy(type, floor),
      })));
    });
  });
  const factors = { 1: 1.1, 2: 1.2, 5: 1.5, 10: 2, 11: 2.1, 20: 3 };
  for (const { completedCampaigns, floor, baseHp, baseDamage, unit } of rows) {
    const existingScale = 1 + Math.log2(floor) * .45;
    const campaignScale = [1, 1.5, 2.25, 3.375][completedCampaigns];
    assert.equal(unit.maxHp, Math.round(baseHp * existingScale * factors[floor] * campaignScale), `${unit.type} floor ${floor}, campaign ${completedCampaigns + 1}`);
    assert.equal(unit.campaignHealthMultiplier, campaignScale);
    assert.equal(unit.hp, unit.maxHp);
    assert.equal(unit.damage, Math.round(baseDamage * existingScale));
  }
  const summons = await page.evaluate(() => {
    const t = window.healthTest;
    return [0,1,2,3].flatMap(completedCampaigns => {
      t.stage(5, 'undead', null, completedCampaigns); t.state.enemies = [t.makeEnemy('necromancer')]; t.actEnemy(t.state.enemies[0]);
      const skeleton = t.state.enemies.at(-1);
      t.stage(10, 'undead', 'lich', completedCampaigns); t.state.enemies[0].attacks = 1; t.actEnemy(t.state.enemies[0]);
      const lichSummon = t.state.enemies.at(-1);
      return [skeleton, lichSummon].map((unit, index) => ({ unit, completedCampaigns, floor: index === 0 ? 5 : 10, baseHp: t.ENEMY_TYPES[unit.type].hp }));
    });
  });
  for (const { unit, baseHp, floor, completedCampaigns } of summons) {
    assert.equal(unit.maxHp, Math.round(baseHp * (1 + Math.log2(floor) * .45) * factors[floor] * [1, 1.5, 2.25, 3.375][completedCampaigns]));
    assert.equal(unit.hp, unit.maxHp);
  }
  // A fixed encounter takes longer solely because of extra health.
  const durations = await page.evaluate(() => {
    const t = window.healthTest;
    return [0, 1].map(completedCampaigns => {
      t.stage(5, 'undead', null, completedCampaigns); Math.random = () => .75;
      t.state.enemies = [t.makeEnemy('orc')]; const enemy = t.state.enemies[0];
      enemy.timer = 1e7; t.state.commandAutoPauseEnabled = false; t.state.battlePaused = false;
      for (let step = 0; step < 1800 && t.state.view === 'battle'; step++) t.updateBattle(50);
      return { time: t.state.battleTime, cleared: t.state.view === 'floor_result' };
    });
  });
  assert.ok(durations.every(result => result.cleared)); assert.ok(durations[1].time > durations[0].time);
  console.log(`Controlled floor-five encounter, campaigns one → two: ${durations[0].time}ms → ${durations[1].time}ms.`);
  // Reload preserves wounded HP; the following floor creates enemies with the new multiplier.
  await page.evaluate(() => { const t = window.healthTest; t.stage(5, 'undead', null, 1); t.state.enemies[0].hp = Math.floor(t.state.enemies[0].maxHp / 2); t.render(); t.persist(); });
  const before = await page.evaluate(() => window.healthTest.state.enemies.map(e => [e.hp,e.maxHp]));
  await page.reload(); await page.waitForFunction(() => window.healthTest);
  assert.deepEqual(await page.evaluate(() => window.healthTest.state.enemies.map(e => [e.hp,e.maxHp])), before);
  await page.evaluate(() => { const t = window.healthTest; t.state.enemies.forEach(e => e.hp = 0); t.state.battlePaused = false; t.updateBattle(50); t.render(); });
  await page.locator('[data-battle-action="continue"]').click();
  const next = await page.evaluate(() => { const t = window.healthTest; return t.state.enemies.map(e => ({ hp: e.hp, base: t.ENEMY_TYPES[e.type].hp, encounterScale: e.encounterHealthScale ?? 1 })); });
  for (const enemy of next) assert.equal(enemy.hp, Math.round(Math.round(enemy.base * (1 + Math.log2(6) * .45) * 1.6 * 1.5) * enemy.encounterScale));
  for (const [name, width, height] of [['desktop',1440,1000],['phone',320,740]]) {
    await page.setViewportSize({ width, height });
    await page.evaluate(() => window.healthTest.stage(10,'orcs','elderShaman',3));
    await page.evaluate(() => Promise.all([...document.querySelectorAll('#battle-screen img')].map(img => img.decode())));
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: `output/enemy-health/boss-${name}.png` });
    await page.locator('[data-unit-type="elderShaman"]').click();
    const details = page.locator('.battle-unit-dialog');
    assert.match(await details.textContent(), /Invasion 4: ×3\.375 enemy health/);
    assert.equal(await details.evaluate(element => element.scrollWidth <= element.clientWidth), true);
    await page.screenshot({ path: `output/enemy-health/inspection-${name}.png` });
    await details.locator('button').click();
    if (name === 'desktop') {
      const saved = await page.evaluate(() => { window.healthTest.persist(); return localStorage.getItem('vaultbound:campaign:v1'); });
      const html = (await readFile('dungeon.html','utf8')).replace('<head>', `<head><base href="/"><script>localStorage.setItem('vaultbound:campaign:v1',${JSON.stringify(saved)});</script>`);
      await writeFile('output/enemy-health/client.html', html);
    }
  }
  assert.deepEqual(errors, []);
  console.log('All enemy types at six depths across four campaigns, unchanged damage, scaled Necromancer/Lich summons, longer fight, reload/next-floor HP and responsive health displays: passed.');
} finally { await browser.close(); }
