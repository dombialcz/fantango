import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const base = process.argv[2] ?? 'http://127.0.0.1:4173';
await mkdir('output/roster-transfers', { recursive: true });
const browser = await chromium.launch();
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', hasTouch: true });
  await context.addInitScript(() => { requestAnimationFrame = () => 0; Math.random = () => .8; });
  await context.route('**/src/dungeon.js', async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: `${await response.text()}
      window.rosterTest = { get state() { return state; }, render, persist,
        stage(active = 4, reserves = 2, day = 1) {
          resetCampaign(); rosterSwapHeroId = null; state.view = 'tavern'; state.day = day;
          state.bench = Array.from({length: active + reserves}, (_, index) => ({
            id: 100 + index, type: HERO_KEYS[index % HERO_KEYS.length],
            name: ['Aldric', 'Nyx', 'Branna', 'Mira', 'Cedric', 'Vael', 'Elin'][index % 7],
            level: index % 3 + 1, active: index < active
          }));
          state.selectedHeroId = null; state.selectedOfferId = null;
          state.events.plan.forEach(event => event.at = 9999); render();
        }
      };` });
  });
  const page = await context.newPage(), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto(`${base}/dungeon.html`);
  await page.waitForFunction(() => window.rosterTest);
  const snapshot = () => page.evaluate(() => JSON.parse(render_game_to_text()));
  const stage = (active = 4, reserves = 2, day = 1) => page.evaluate(([a, r, d]) => rosterTest.stage(a, r, d), [active, reserves, day]);
  const hero = id => page.locator(`[data-hero="${id}"]`);
  const activeIds = async () => (await snapshot()).bench.filter(hero => hero.active).map(hero => hero.id);
  const selected = () => page.locator('.company-hero.is-swapping');

  await stage(3, 1);
  assert.match(await page.locator('.reserve-heading').textContent(), /Reserve.*staying at the tavern/);
  await hero(103).click();
  assert.deepEqual(await activeIds(), [100, 101, 102, 103]);
  assert.equal((await snapshot()).rosterSwapHeroId, null);
  assert.equal(await hero(103).getAttribute('aria-pressed'), 'true');
  assert.equal(await hero(103).evaluate(node => document.activeElement === node), true);
  await hero(101).focus(); await page.keyboard.press('Enter');
  assert.deepEqual(await activeIds(), [100, 102, 103]);
  assert.equal(await hero(101).evaluate(node => document.activeElement === node), true);
  await page.keyboard.press('Space');
  assert.deepEqual(await activeIds(), [100, 101, 102, 103]);

  // Full party: select a reserve, highlight all swap targets, then exchange exactly those two.
  await stage();
  await page.evaluate(() => rosterTest.persist());
  const saved = await page.evaluate(() => localStorage.getItem('vaultbound:campaign:v1'));
  await writeFile('output/roster-transfers/scenario.html', `<script>localStorage.setItem('vaultbound:campaign:v1', ${JSON.stringify(saved).replaceAll('<', '\\u003c')}); location.replace('/dungeon.html');</script>`);
  const before = await snapshot();
  await hero(104).click();
  assert.equal((await snapshot()).rosterSwapHeroId, 104);
  assert.equal(await selected().getAttribute('data-hero'), '104');
  assert.equal(await page.locator('.company-party .is-swap-target').count(), 4);
  assert.deepEqual((await snapshot()).bench, before.bench);
  await page.screenshot({ path: 'output/roster-transfers/swap-desktop.png', fullPage: true });
  await hero(101).focus(); await page.keyboard.press('Enter');
  assert.deepEqual(await activeIds(), [100, 102, 103, 104]);
  let after = await snapshot();
  assert.equal(after.rosterSwapHeroId, null);
  assert.equal(after.gold, before.gold);
  assert.deepEqual(after.bench.map(({active, ...identity}) => identity), before.bench.map(({active, ...identity}) => identity));
  assert.equal(after.selectedHeroId, 104);
  assert.equal(await page.locator('.is-swap-target').count(), 0);
  assert.equal(await hero(101).evaluate(node => document.activeElement === node), true);

  // Full tavern: reverse swap, choosing a different source on the same side first.
  await hero(100).click();
  assert.equal((await snapshot()).rosterSwapHeroId, 100);
  assert.equal(await page.locator('.company-reserves .is-swap-target').count(), 2);
  await hero(103).click();
  assert.equal((await snapshot()).rosterSwapHeroId, 103);
  await hero(105).click();
  assert.deepEqual(await activeIds(), [100, 102, 104, 105]);
  assert.equal((await snapshot()).bench.filter(hero => !hero.active).length, 2);

  // Cancel by clicking the source again, by button, and by Escape. No roster changes.
  const stable = (await snapshot()).bench;
  for (const method of ['source', 'button', 'escape']) {
    await hero(101).click();
    if (method === 'source') await hero(101).click();
    if (method === 'button') await page.locator('[data-roster-action="cancel-swap"]').click();
    if (method === 'escape') await page.keyboard.press('Escape');
    assert.equal((await snapshot()).rosterSwapHeroId, null);
    assert.deepEqual((await snapshot()).bench, stable);
    assert.equal(await page.locator('.company-swap').isVisible(), false);
  }
  // Town navigation clears pending swaps, including keyboard navigation.
  await hero(101).click(); await page.keyboard.press('t'); await page.keyboard.press('t');
  assert.equal((await snapshot()).rosterSwapHeroId, null);
  await page.reload(); await page.waitForFunction(() => window.rosterTest);
  assert.deepEqual((await snapshot()).bench, stable);
  assert.equal((await snapshot()).rosterSwapHeroId, null);

  // Empty-party and larger late-campaign capacities; older saves with extra reserves remain usable.
  await stage(0, 2);
  await hero(100).click(); assert.deepEqual(await activeIds(), [100]);
  await hero(101).click(); assert.deepEqual(await activeIds(), [100, 101]);
  await stage(5, 2, 3);
  await hero(106).click(); assert.equal(await page.locator('.is-swap-target').count(), 5);
  await hero(104).click(); assert.equal((await activeIds()).length, 5);
  await stage(2, 4);
  assert.equal(await page.locator('.company-reserves [data-hero]').count(), 4);
  await hero(102).click(); assert.equal((await activeIds()).length, 3);
  await hero(103).click(); assert.equal((await activeIds()).length, 4);
  assert.equal((await snapshot()).bench.filter(hero => !hero.active).length, 2);

  // Dismissal stays reversible until confirmation, defaults focus to Keep, and blocks shortcuts.
  await stage(); await hero(104).click();
  const beforeDismiss = await snapshot();
  await page.locator('[data-roster-action="dismiss"]').click();
  assert.equal(await page.locator('.roster-dismiss-dialog').evaluate(node => node.open), true);
  assert.match(await page.locator('#dismiss-title').textContent(), /Cedric/);
  assert.match(await page.locator('#dismiss-copy').textContent(), /permanently.*cannot be undone/);
  assert.equal(await page.locator('[data-dismiss="cancel"]').evaluate(node => node === document.activeElement), true);
  for (const key of ['r', 't', 'Enter']) await page.keyboard.press(key);
  assert.deepEqual((await snapshot()).bench, beforeDismiss.bench);
  assert.equal((await snapshot()).view, 'tavern');
  assert.equal(await page.locator('.roster-dismiss-dialog').evaluate(node => node.open), false);
  assert.equal(await page.locator('[data-roster-action="dismiss"]').evaluate(node => node === document.activeElement), true);
  await page.locator('[data-roster-action="dismiss"]').click(); await page.keyboard.press('Escape');
  assert.deepEqual((await snapshot()).bench, beforeDismiss.bench);
  await page.locator('[data-roster-action="dismiss"]').click();
  await page.locator('[data-dismiss="confirm"]').click();
  assert.equal((await snapshot()).bench.length, 5);
  assert.equal((await snapshot()).bench.some(hero => hero.id === 104), false);
  assert.equal((await snapshot()).cemetery.fallenCount, 0);
  assert.equal((await snapshot()).chronicle.filter(entry => entry.category === 'dismissal').length, 1);
  await page.reload(); await page.waitForFunction(() => window.rosterTest);
  assert.equal((await snapshot()).bench.some(hero => hero.id === 104), false);

  // Both transfer directions, swaps, confirmation, image loading and overflow on responsive layouts.
  for (const [label, width, height] of [['phone',390,844], ['small-phone',320,740], ['landscape',844,390], ['tablet',900,1000]]) {
    await page.setViewportSize({width,height});
    await stage(3, 1); await hero(103).tap();
    assert.equal((await activeIds()).length, 4);
    await hero(100).click(); assert.equal((await activeIds()).length, 3);
    await stage(); await hero(104).click();
    await page.locator('.company-board').scrollIntoViewIfNeeded();
    await page.locator('#roster-screen img').evaluateAll(images => Promise.all(images.map(image => image.decode())));
    await page.screenshot({ path: `output/roster-transfers/swap-${label}.png`, fullPage: true });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await hero(101).click(); assert.equal((await activeIds()).length, 4);
    await page.locator('[data-roster-action="dismiss"]').click();
    await page.screenshot({ path: `output/roster-transfers/dismiss-${label}.png` });
    const box = await page.locator('[data-dismiss="confirm"]').boundingBox();
    assert.ok(box.x >= 0 && box.y >= 0 && box.x + box.width <= width && box.y + box.height <= height);
    await page.locator('[data-dismiss="cancel"]').click();
  }
  assert.deepEqual(errors, []);
  console.log('Roster transfers: immediate moves, bidirectional swaps, capacities, cancellation, keyboard focus, saved state, confirmed dismissal, shortcuts and responsive layouts passed.');
} finally { await browser.close(); }
