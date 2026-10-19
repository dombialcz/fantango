import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { chromium } from 'playwright';
const base = process.argv[2] ?? 'http://127.0.0.1:4192';
const browser = await chromium.launch();
await mkdir('output/flee-confirmation', { recursive: true });
const errors = [];
for (const [name, viewport] of Object.entries({ desktop: { width: 1440, height: 1000 }, phone: { width: 390, height: 844 }, small: { width: 320, height: 740 }, landscape: { width: 844, height: 390 } })) {
 const context = await browser.newContext({ viewport }); const page = await context.newPage();
 page.on('pageerror', e => errors.push(e.message));
 await page.route('**/src/dungeon.js', async route => {
  const source = await readFile('src/dungeon.js', 'utf8');
  await route.fulfill({ contentType: 'text/javascript', body: source + '\nwindow.fleeTest = { get state() { return state; }, render, buildParty, prepareFloor, fleeMidBattle, finishFloor };' });
 });
 await page.goto(`${base}/dungeon.html`); await page.waitForFunction(() => window.fleeTest);
 await page.evaluate(() => {
  const t = window.fleeTest, s = t.state;
  s.party = t.buildParty(['knight','cleric','ranger','mage'].map((type, i) => ({ id: 100+i, type, name: `Hero ${i}`, level: 1, active: true })));
  s.bench = s.party.map(u => u.hero); s.expeditionStartIds = s.bench.map(h => h.id); s.expeditionStartCount = 4; s.floor = 1; s.gold = 13;
  t.prepareFloor(); t.render();
 });
 const state = () => page.evaluate(() => JSON.parse(render_game_to_text()));
 const flee = page.locator('[data-battle-action="flee"]');
 const dialog = page.locator('.battle-flee-dialog');
 // A direct attempt without opening the confirmation cannot apply the penalty.
 await page.evaluate(() => window.fleeTest.fleeMidBattle());
 assert.equal((await state()).gold, 13);
 await flee.click();
 let s = await state();
 assert.equal(s.view, 'battle'); assert.equal(s.gold, 13); assert.equal(s.battlePaused, true); assert.equal(s.fleeConfirmation, true);
 assert.equal(await dialog.isVisible(), true);
 assert.match(await dialog.innerText(), /7\s*gold/);
 assert.equal(await page.locator('[data-battle-action="flee-cancel"]').evaluate(el => el === document.activeElement), true);
 const frozen = { time: s.battleTimeMs, party: s.party, enemies: s.enemies, gold: s.gold };
 await page.evaluate(() => advanceTime(5000)); s = await state();
 assert.deepEqual({ time: s.battleTimeMs, party: s.party, enemies: s.enemies, gold: s.gold }, frozen);
 if (name === 'desktop') {
  await page.reload(); await page.waitForFunction(() => window.fleeTest);
  assert.equal(await dialog.isVisible(), true); assert.equal((await state()).gold, 13); assert.equal((await state()).battlePaused, true);
 }
 // Battle shortcuts cannot dismiss the pause while the dialog is open.
 await page.keyboard.press('p'); assert.equal((await state()).battlePaused, true);
 await page.screenshot({ path: `output/flee-confirmation/${name}.png` });
 assert.equal(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth), true);
 if (name === 'landscape') assert.equal(await dialog.evaluate(el => el.scrollHeight <= el.clientHeight), true);
 assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
 await page.locator('[data-battle-action="flee-cancel"]').click();
 assert.equal(await dialog.isVisible(), false); assert.equal((await state()).gold, 13); assert.equal((await state()).battlePaused, true);
 assert.equal(await flee.evaluate(el => el === document.activeElement), true);
 // Already-paused fights stay paused on Escape too.
 await flee.click(); await page.keyboard.press('Escape');
 assert.equal(await dialog.isVisible(), false); assert.equal((await state()).battlePaused, true); assert.equal((await state()).gold, 13);
 await flee.click();
 await page.locator('[data-battle-action="flee-confirm"]').click();
 s = await state(); assert.equal(s.view, 'day_result'); assert.equal(s.gold, 6); assert.equal(s.fleeConfirmation, false); assert.equal(await dialog.isVisible(), false);
 assert.equal(s.retreatLeveling.type, 'manual');
 await page.evaluate(() => window.fleeTest.fleeMidBattle()); assert.equal((await state()).gold, 6);
 // Safe retreat between cleared floors remains free and does not ask for this dialog.
 await page.evaluate(() => { const t = window.fleeTest; t.state.view = 'battle'; t.state.floor = 1; t.finishFloor(); t.render(); });
 const safeGold = (await state()).gold;
 await page.locator('[data-battle-action="flee-safe"]').click();
 assert.equal((await state()).gold, safeGold); assert.equal(await dialog.isVisible(), false);
 await page.evaluate(() => { const t = window.fleeTest; t.state.gold = 0; t.state.floor = 1; t.prepareFloor(); t.render(); });
 await flee.click(); assert.match(await dialog.innerText(), /0\s*gold/);
 await page.locator('[data-battle-action="flee-confirm"]').click(); assert.equal((await state()).gold, 0);
 await context.close(); console.log(`${name}: pause, frozen state, Cancel/Escape/focus, confirm once and free safe retreat passed`);
}
// Normal recruitment → battle → confirmation → retreat also works without staged state.
const page = await browser.newPage();
await page.addInitScript(() => { Math.random = () => .05; });
await page.goto(`${base}/dungeon.html`); await page.locator('.town-panorama button').click();
await page.locator('[data-roster-action="roll"]').click(); await page.evaluate(() => advanceTime(1500));
await page.locator('[data-hire]').first().click(); await page.locator('[data-roster-action="start"]').click();
if (await page.locator('.roster-departure-dialog').isVisible()) await page.locator('[data-departure="confirm"]').click();
await page.locator('[data-battle-action="flee"]').click();
await page.keyboard.press('Escape');
await page.locator('[data-battle-action="flee"]').click();
await page.locator('[data-battle-action="flee-confirm"]').click();
assert.equal(JSON.parse(await page.evaluate(() => render_game_to_text())).view, 'day_result');
assert.deepEqual(errors, []); await browser.close();
