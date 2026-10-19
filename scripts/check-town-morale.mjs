import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { readFile, mkdir } from 'node:fs/promises';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
await page.route('**/src/dungeon.js', async route => {
  const source = await readFile(new URL('../src/dungeon.js', import.meta.url), 'utf8');
  await route.fulfill({ contentType: 'text/javascript', body: source + '\nwindow.moraleTest = { get state() { return state; }, buildParty, finishFloor, finishDay, advanceDay, resetCampaign, render };' });
});
await page.goto(`${process.argv[2] ?? 'http://127.0.0.1:4175'}/dungeon.html`);
await page.waitForFunction(() => window.moraleTest);
await mkdir('output/town-morale', { recursive: true });
const cases = [
  { name: 'progress', day: 1, cleared: 2, record: 1, previous: 1, returned: 2, manual: false },
  { name: 'no-progress', day: 2, cleared: 2, record: 3, previous: 2, returned: 2, manual: false },
  { name: 'clean-retreat', day: 3, cleared: 4, record: 3, previous: 3, returned: 4, manual: true },
  { name: 'costly-setback', day: 8, cleared: 2, record: 5, previous: 4, returned: 2, manual: false },
  { name: 'victory', day: 7, cleared: 10, record: 9, previous: 9, returned: 2, manual: true },
];
for (const c of cases) {
  await page.evaluate(c => {
    const t = window.moraleTest; t.resetCampaign(); const s = t.state;
    s.day = c.day; s.deepestFloor = c.record; s.expeditionRecordBefore = c.record;
    s.lastExpedition = { clearedFloor: c.previous };
    const heroes = Array.from({ length: 4 }, (_, i) => ({ id: i + 1, type: 'knight', level: 1, name: `Hero ${i}` }));
    s.bench = heroes; s.party = t.buildParty(heroes); s.expeditionStartIds = heroes.map(h => h.id); s.expeditionStartCount = 4;
    s.party.forEach((h, i) => { if (i >= c.returned) h.hp = 0; });
    s.floor = c.cleared; s.view = 'battle';
    if (c.cleared === 10) { s.flavorKey = 'demons'; s.bossType = 'vaultTyrant'; }
    t.finishFloor();
    // Entering an uncleared next floor must not count as progress.
    s.floor = c.cleared + 1;
    t.finishDay('Returned.', null, c.manual ? 'manual' : 'automatic');
    t.advanceDay(); t.render();
  }, c);
  const state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  assert.equal(state.morale.tone, c.name);
  if(c.name==='victory') {
    assert.equal(state.view,'campaign_victory');assert.equal(state.day,c.day);
    assert.match(await page.locator('.victory-header').innerText(),/Vault Tyrant has fallen/);
  } else {
    assert.equal(state.lastExpedition.clearedFloor, c.cleared);
    assert.equal(state.day, c.day + 1);
    assert.equal(await page.locator('.town-panorama h2').innerText(), state.morale.text);
  }
  await page.screenshot({ path: `output/town-morale/${c.name}.png`, fullPage: true });
}
await page.setViewportSize({ width: 320, height: 740 });
await page.screenshot({ path: 'output/town-morale/phone.png', fullPage: true });
assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
await page.evaluate(() => { window.moraleTest.resetCampaign(); window.moraleTest.render(); });
assert.equal(await page.locator('.town-panorama h2').innerText(), 'A little hope, on the edge of the dark.');
assert.deepEqual(errors, []);
await browser.close();
console.log('Daily morale, cleared vs entered floors, rare outcomes, Tyrant victory, reset and mobile: passed');
