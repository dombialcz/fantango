import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { readFile, mkdir } from 'node:fs/promises';
const base = process.argv[2] ?? 'http://127.0.0.1:4176';
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
const page = await context.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', e => { if (e.type() === 'error') errors.push(e.text()); });
await page.route('**/src/dungeon.js', async route => {
 const source = await readFile(new URL('../src/dungeon.js', import.meta.url), 'utf8');
 await route.fulfill({ contentType: 'text/javascript', body: source + '\nwindow.eventTest = { get state() { return state; }, finishFloor, finishDay, advanceDay, buildParty, render, persist, resetCampaign, prepareFloor, chooseCampaignEvent, heroCommandDamageMultiplier, actHero, rerollOffers, usePotionOn };' });
});
await mkdir('output/campaign-events', { recursive: true });
await page.goto(`${base}/dungeon.html`);
await page.waitForFunction(() => window.eventTest).catch(error => { console.error(errors); throw error; });
await page.evaluate(() => {
 const t = window.eventTest, s = t.state;
 const heroes = ['knight', 'cleric', 'ranger', 'mage'].map((type, i) => ({ id: i+1, name: `Hero ${i}`, type, level: 1, active: true }));
 s.bench = heroes; s.party = t.buildParty(heroes); s.expeditionStartCount = 4; s.expeditionStartIds = heroes.map(h => h.id);
 s.events.plan = [{ id: 'W01', at: 3, outcomeRoll: .9, rewardRoll: .5, targetRoll: .5 }, { id: 'W02', at: 5, outcomeRoll: .9, rewardRoll: .5, targetRoll: .5 }, { id: 'A01', at: 7, outcomeRoll: .9, rewardRoll: .5, targetRoll: .5 }];
 s.view = 'battle'; s.floor = 1; t.finishFloor(); t.finishDay('The company returns.', null, 'manual'); t.advanceDay();
 s.party = t.buildParty(s.bench); s.floor = 1; s.view = 'battle'; t.finishFloor(); t.finishDay('The company returns.', null, 'manual'); t.advanceDay();
 s.party = t.buildParty(s.bench); s.floor = 1; s.view = 'battle'; t.finishFloor(); t.render();
});
const state = () => page.evaluate(() => JSON.parse(render_game_to_text()));
let s = await state(); assert.equal(s.day, 3); assert.equal(s.view, 'event'); assert.equal(s.events.clears, 3);
assert.equal(await page.locator('[data-event-choice]').count(), 2);
assert.equal(await page.locator('[data-battle-action="continue"]').isVisible(), false);
await page.keyboard.press('Enter'); assert.equal((await state()).view, 'event');
await page.screenshot({ path: 'output/campaign-events/gold-choice.png', fullPage: true });
const gold = s.gold;
await page.locator('[data-event-choice="0"]').click();
s = await state(); assert.equal(s.gold, gold + 3); assert.equal(s.events.dayPower, 1.05);
assert.equal(s.chronicle.filter(e => e.category === 'event').length, 1);
await page.evaluate(() => window.eventTest.chooseCampaignEvent(0)); assert.equal((await state()).gold, gold + 3);
await page.reload(); await page.waitForFunction(() => window.eventTest).catch(error => { console.error(errors); throw error; });
s = await state(); assert.equal(s.view, 'event'); assert.equal(s.gold, gold + 3); assert.equal(await page.locator('[data-event-choice]').count(), 0);
await page.screenshot({ path: 'output/campaign-events/gold-outcome.png', fullPage: true });
await page.locator('[data-event-continue]').click(); assert.equal((await state()).view, 'floor_result');
await page.evaluate(() => {
 const t = window.eventTest, s = t.state; s.view = 'battle'; s.floor = 2; t.finishFloor();
 s.view = 'battle'; s.floor = 3; t.finishFloor(); t.render();
});
assert.match(await page.locator('#event-title').innerText(), /satchel/);
const potions = (await state()).potions.remaining;
await page.locator('[data-event-choice="0"]').click(); assert.equal((await state()).potions.remaining, potions + 2);
await page.locator('[data-event-continue]').click();
await page.evaluate(() => {
 const t = window.eventTest, s = t.state; s.view = 'battle'; s.floor = 4; t.finishFloor();
 s.view = 'battle'; s.floor = 5; t.finishFloor(); t.render();
});
await page.setViewportSize({ width: 390, height: 844 });
await page.screenshot({ path: 'output/campaign-events/prisoner-phone.png', fullPage: true });
assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
await page.locator('[data-event-choice="1"]').click();
assert.equal((await state()).events.nextCommand, 0);
await page.locator('[data-event-continue]').click();
await page.locator('[data-battle-action="flee-safe"]').click();
assert.equal((await state()).events.dayPower, 1);
await page.locator('[data-battle-action="next-day"]').click();
assert.equal((await state()).events.nextCommand, 0);
await page.evaluate(() => { const t = window.eventTest, s = t.state; s.party = t.buildParty(s.bench.filter(h=>h.active)); s.floor = 1; t.prepareFloor(); s.battlePaused = true; t.render(); });
assert.equal((await state()).commands.meter, 0);
assert.equal((await state()).events.nextCommand, null);
// Reloading a running battle preserves progress and gives the player a paused return.
await page.evaluate(() => { window.eventTest.state.battlePaused = false; window.eventTest.persist(); });
await page.reload(); await page.waitForFunction(() => window.eventTest);
assert.equal((await state()).battlePaused, true);
assert.equal((await state()).commands.meter, 0);
// Chronicle pauses combat and exposes both current and past campaigns, with a usable download.
await page.locator('.chronicle-trigger').click();
await page.screenshot({ path: 'output/campaign-events/chronicle-phone.png', fullPage: true });
assert.match(await page.locator('.chronicle-entries').innerText(), /Leave the cage locked/);
const downloadPromise = page.waitForEvent('download');
await page.locator('[data-download]').click();
assert.equal((await downloadPromise).suggestedFilename(), 'vaultbound-chronicle.md');
await page.locator('[data-close]').click();
await page.evaluate(() => { window.eventTest.resetCampaign(); window.eventTest.render(); });
await page.locator('.chronicle-trigger').click();
assert.equal(await page.locator('.chronicle-dialog option').count(), 2);
await page.locator('.chronicle-dialog select').selectOption('1');
assert.match(await page.locator('.chronicle-entries').innerText(), /Leave the cage locked/);
await page.locator('[data-close]').click();
// Every event and both result states remain reachable, illustrated, and readable on a tiny phone.
await page.setViewportSize({ width: 320, height: 740 });
await page.evaluate(() => {
 const s = window.eventTest.state; s.floor = 2; s.view = 'event'; s.events.pending = { id: 'W02', outcomeRoll: 0, rewardRoll: 0, targetRoll: 0 }; window.eventTest.render();
});
const saleGold = (await state()).gold;
await page.locator('[data-event-choice="1"]').click(); assert.equal((await state()).gold, saleGold + 6);
await page.screenshot({ path: 'output/campaign-events/potions-sold-small.png', fullPage: true });
await page.evaluate(async () => {
 const { EVENTS } = await import('./src/campaign-events.js');
 for (const e of EVENTS) {
  window.eventTest.state.events.pending = { id: e.id, outcomeRoll: .5, rewardRoll: .5, targetRoll: .5 };
  window.eventTest.render();
  if (document.documentElement.scrollWidth > innerWidth) throw Error(`Overflow ${e.id}`);
 }
});
// Earn and consume next-day favours without increasing paid prices, then let a spare expire.
await page.evaluate(() => {
 const t = window.eventTest; t.resetCampaign(); const s = t.state;
 s.events.pending = { id: 'A01', outcomeRoll: 0, rewardRoll: .5, targetRoll: .5 };
 s.view = 'event'; s.floor = 2; t.chooseCampaignEvent(1);
 if (s.events.nextDayRerolls !== 2) throw Error('Favour not earned');
 s.view = 'day_result'; s.party = []; t.advanceDay();
 if (s.freeRerollsRemaining < 2 || s.eventRerollsRemaining !== 2) throw Error('Favour not carried to tomorrow');
 s.view = 'tavern';
 for (let i = 0; i < 3; i++) { s.rollRemainingMs = 0; t.rerollOffers(); }
 if (s.rerollCost !== 1 || s.eventRerollsRemaining !== 0) throw Error('Free favours changed paid prices');
 s.events.nextDayRerolls = 1; s.view = 'day_result'; t.advanceDay();
 s.view = 'day_result'; t.advanceDay();
 if (!s.chronicle.some(e => e.text.includes('unused event contract'))) throw Error('Expiry missing');
 // Day-only power affects both attacks and healing, not maximum health or tomorrow's party.
 s.events.dayPower = 1.05; s.events.activeAttack = 1.1;
 const hero = { row: 'back' };
 if (Math.abs(t.heroCommandDamageMultiplier(hero) - 1.155) > 1e-9) throw Error('Power multiplier');
 s.party = t.buildParty([{ id: 1, name: 'Knight', type: 'knight', level: 1 }, { id: 2, name: 'Cleric', type: 'cleric', level: 1 }]);
 s.enemies = [{ id: 'test-enemy', side: 'enemy', type: 'skeleton', label: 'Enemy', hp: 10000, maxHp: 10000, row: 'front', damageReduction: 0 }];
 s.party[0].hp = 10; s.party[1].power = 1000; s.party[1].healRatio = .1;
 s.view = 'battle'; s.commandMeter = 0;
 t.actHero(s.party[1]);
 if (s.party[0].hp !== 36) throw Error('Day power did not affect healing');
 t.finishDay('Returned.'); if (s.events.dayPower !== 1) throw Error('Day power did not expire');
 t.render();
});
await page.setViewportSize({ width: 844, height: 390 });
await page.evaluate(() => {
 const s = window.eventTest.state; s.events.pending = { id: 'W02', outcomeRoll: .5, rewardRoll: .5, targetRoll: .5 }; s.floor = 2; s.view = 'event'; window.eventTest.render();
});
await page.screenshot({ path: 'output/campaign-events/potions-landscape.png', fullPage: true });
assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
await page.evaluate(() => {
 const t = window.eventTest; t.resetCampaign(); const s = t.state;
 s.party = t.buildParty([{ id: 1, name: 'Healthy', type: 'knight', level: 1 }]);
 const stage = (id, choice) => { s.view = 'event'; s.events.pending = { id, outcomeRoll: choice === 1 ? 0 : .99, rewardRoll: 0, targetRoll: 0 }; t.chooseCampaignEvent(choice); };
 s.view = 'event'; s.events.pending = { id: 'G07', outcomeRoll: 0, rewardRoll: 0, targetRoll: 0 };
 const gold = s.gold; t.chooseCampaignEvent(0);
 if (s.gold !== gold + 2 || !s.events.pending.result.text.includes('treasury')) throw Error('Healthy healing conversion');
 s.day = 10; const finalGold = s.gold; stage('A01', 1);
 if (s.gold !== finalGold + 12 || s.events.nextDayRerolls !== 0 || !s.events.pending.result.text.includes('immediate payment')) throw Error('Final-day favour conversion');
 s.gold = 0; stage('A05', 0);
 if (s.events.nextCommand !== 35 || !s.events.pending.result.text.includes('nothing left')) throw Error('Empty purse conversion');
});
assert.deepEqual(errors, []);
await context.close(); await browser.close();
console.log('Cumulative clears across days, event gating, windfalls, potions/sale, reload/idempotency, delayed penalties, chronicle/archive/download, and phone layouts: passed');
