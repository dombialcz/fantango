import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdir, readFile } from 'node:fs/promises';
const base = process.argv[2] ?? 'http://127.0.0.1:4175';
const browser = await chromium.launch();
await mkdir('output/town-identity', { recursive: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', e => { if (e.type() === 'error') errors.push(e.text()); });
// Test-only access to the live integration, without shipping debug controls.
await page.route('**/src/dungeon.js', async route => {
  const source = await readFile(new URL('../src/dungeon.js', import.meta.url), 'utf8');
  await route.fulfill({ contentType: 'text/javascript', body: source + `\nwindow.townTest = { get state() { return state; }, createCampaign, buildParty, heroEffects, dealDamage, advanceDay, render, resetCampaign };` });
});
await page.goto(`${base}/dungeon.html`);
await page.waitForFunction(() => window.townTest);
await page.evaluate(async () => {
  const { PREFIXES, SETTLEMENTS } = await import('./src/town-identity.js');
  const t = window.townTest;
  t.state.town.prefix = PREFIXES[1];
  t.state.town.settlement = SETTLEMENTS.find(s => s.name === 'Crossing');
  t.state.freeRerollsRemaining = 1;
  t.render();
});
const state = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));
await page.locator('.town-panorama [data-town-action="close"]').click();
const roll = async () => {
  await page.locator('[data-roster-action="roll"]').click();
  await page.evaluate(() => window.advanceTime(1500));
};
const gold = (await state()).gold;
await roll();
assert.equal((await state()).gold, gold);
assert.equal((await state()).nextRollCost, 0);
assert.match(await page.locator('[data-roster-action="roll"]').innerText(), /CROSSING/);
await roll();
assert.equal((await state()).gold, gold);
assert.equal((await state()).nextRollCost, 1);
await roll();
assert.equal((await state()).gold, gold - 1);
assert.equal((await state()).nextRollCost, 2);
await page.locator('[data-hire]').first().click();
await page.locator('[data-roster-action="start"]').click();
await page.screenshot({ path: 'output/town-identity/battle.png', fullPage: true });
await page.evaluate(async () => {
  const { PREFIXES, SETTLEMENTS } = await import('./src/town-identity.js');
  const t = window.townTest;
  const assert = (ok, message) => { if (!ok) throw Error(message); };
  const hero = type => ({ id: 1, type, name: 'Test', level: 1 });
  for (const s of SETTLEMENTS.filter(s => s.classType)) {
    t.state.town.prefix = PREFIXES[1];
    t.state.town.settlement = s;
    const effects = t.heroEffects(s.classType);
    const party = t.buildParty([hero(s.classType)]);
    assert(party[0].critChance === effects.critChance, 'crit integration');
    assert(party[0].evasionChance === effects.evasionChance, 'dodge integration');
    assert(party[0].healRatio === effects.healRatio, 'heal integration');
    assert(party[0].maxHp === Math.round(100 * ({ knight: 1, thief: .6, bard: .6, cleric: .8, barbarian: 1.2, ranger: .8, mage: .5 }[s.classType]) * effects.healthMultiplier), 'health integration');
  }
  t.state.town.settlement = SETTLEMENTS.find(s => s.name === 'Market');
  const buffed = t.buildParty([{ id: 1, type: 'bard', name: 'Bard', level: 1 }, { id: 2, type: 'knight', name: 'Knight', level: 1 }]);
  assert(Math.abs(buffed[1].power - 120.6) < 1e-9, 'Market strengthens actual bard buff');
  const target = { hp: 1000, side: 'hero', label: 'Test', row: 'back', damageReduction: 0 };
  t.state.party = []; // This synthetic target has no party guards; isolate the town trait.
  t.state.divineAegisMs = 0;
  t.state.town.prefix = PREFIXES[0];
  assert(t.dealDamage(target, 400, { side: 'enemy', label: 'Enemy' }) === 99, 'Walled enemy damage');
  t.state.town.prefix = PREFIXES[2];
  const random = Math.random; Math.random = () => 0;
  assert(t.dealDamage(target, 400, { side: 'enemy', label: 'Enemy' }) === 0, 'Silent evasion');
  Math.random = random;
  t.state.town.settlement = SETTLEMENTS.find(s => s.name === 'Estate');
  const name = t.state.town.name;
  for (let day = 2; day <= 10; day++) {
    t.state.view = 'day_result'; t.state.party = []; const gold = t.state.gold;
    t.advanceDay();
    assert(t.state.gold === gold + 1, 'Estate pays exactly once per day');
    assert(t.state.town.name === name, 'town survives day advance');
    t.advanceDay(); assert(t.state.gold === gold + 1, 'duplicate advance blocked');
  }
  t.state.view = 'day_result'; t.state.town.settlement = SETTLEMENTS.find(s => s.name === 'Crossing');
  t.advanceDay(); assert(t.state.freeRerollsRemaining === 1, 'Crossing resets daily');
  Math.random = () => .8;
  const estate = t.createCampaign();
  assert(estate.gold === 11, 'Estate pays on day one');
  Math.random = () => .2;
  const grand = t.createCampaign();
  assert(grand.gold === 11, 'Grand pays on day one');
  Math.random = random;
  t.resetCampaign();
  const { createTownIdentity } = await import('./src/town-identity.js');
  const nameRolls = [.55, .95, .65, .85];
  t.state.town = createTownIdentity(() => nameRolls.shift());
  t.render();
});
for (const [name, viewport] of Object.entries({ desktop: { width: 1440, height: 1000 }, phone: { width: 390, height: 844 }, small: { width: 320, height: 740 }, landscape: { width: 844, height: 390 } })) {
  await page.setViewportSize(viewport);
  await page.screenshot({ path: `output/town-identity/${name}.png`, fullPage: true });
  assert.equal(await page.locator('.town-traits li').count(), 3);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
}
for (const day of [1, 7, 10]) {
  await page.evaluate(day => { window.townTest.state.day = day; window.townTest.render(); }, day);
  assert.equal(await page.locator('.town-countdown strong').innerText(), String(day));
  assert.equal(await page.locator('.town-countdown .is-spent').count(), day - 1);
  if (day === 10) assert.match(await page.locator('.town-countdown').innerText(), /FINAL DAY/);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: `output/town-identity/countdown-${day}.png`, fullPage: true });
}
await page.setViewportSize({ width: 320, height: 740 });
assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
await page.screenshot({ path: 'output/town-identity/countdown-phone.png', fullPage: true });
assert.deepEqual(errors, []);
await browser.close();
console.log('Town generation, class effects, combat traits, free rerolls, daily income, reset and four layouts: passed');
