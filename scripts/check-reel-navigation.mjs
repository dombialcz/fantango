import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { chromium } from 'playwright';
const base = process.argv[2] ?? 'http://127.0.0.1:4192';
const browser = await chromium.launch();
await mkdir('output/reel-navigation', { recursive: true });
const errors = [];
for (const [name, viewport] of Object.entries({ desktop: { width: 1440, height: 1000 }, phone: { width: 390, height: 844 }, small: { width: 320, height: 740 }, landscape: { width: 844, height: 390 } })) {
 const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
 const page = await context.newPage();
 page.on('pageerror', e => errors.push(e.message));
 await page.route('**/src/dungeon.js', async route => {
  const source = await readFile('src/dungeon.js', 'utf8');
  await route.fulfill({ contentType: 'text/javascript', body: source + '\nwindow.reelTest = { get state() { return state; }, render, rollHeroes };' });
 });
 await page.goto(`${base}/dungeon.html`);
 await page.locator('.town-panorama button').click();
 const previous = page.getByRole('button', { name: 'Previous hero', exact: true });
 const next = page.getByRole('button', { name: 'Next hero', exact: true });
 const reel = page.locator('.contract-reel');
 assert.equal(await previous.isDisabled(), true); assert.equal(await next.isDisabled(), true);
 await page.locator('[data-roster-action="roll"]').click();
 assert.equal(await previous.isDisabled(), true); assert.equal(await next.isDisabled(), true);
 await page.evaluate(() => advanceTime(1500));
 if (name === 'desktop') assert.equal(await next.isDisabled(), true, 'five offers fit without a next page');
 // Day-ten reel, mixed classes and portraits; make enough contracts to overflow every viewport.
 await page.evaluate(() => {
  const t = window.reelTest, keys = ['knight', 'thief', 'cleric', 'barbarian', 'ranger', 'mage', 'bard'];
  t.state.day = 10; t.state.offers = t.rollHeroes(14).map((hero, i) => ({ ...hero, type: keys[i % keys.length] })); t.render();
 });
 await page.waitForFunction(() => !document.querySelector('[data-reel-step="1"]').disabled);
 assert.equal(await previous.isDisabled(), true);
 const dimensions = await reel.evaluate(el => ({ stride: el.querySelector('.contract-card').getBoundingClientRect().width + parseFloat(getComputedStyle(el).columnGap), maximum: el.scrollWidth - el.clientWidth }));
 await next.click();
 await page.waitForFunction(stride => Math.abs(document.querySelector('.contract-reel').scrollLeft - stride) < 2, dimensions.stride);
 assert.equal(await previous.isDisabled(), false);
 await previous.focus(); await page.keyboard.press('Enter');
 await page.waitForFunction(() => document.querySelector('.contract-reel').scrollLeft < 1);
 assert.equal(await previous.isDisabled(), true);
 for (let i = 0; i < 20 && !await next.isDisabled(); i++) await next.click();
 assert.equal(await next.isDisabled(), true);
 assert.ok(Math.abs(await reel.evaluate(el => el.scrollLeft) - dimensions.maximum) < 2);
 const visible = await reel.locator('.contract-card').last().boundingBox();
 const frame = await reel.boundingBox();
 assert.ok(visible.x + visible.width <= frame.x + frame.width + 1);
 await page.screenshot({ path: `output/reel-navigation/${name}-end.png`, fullPage: true });
 // Touch/trackpad-style scrolling updates both arrows too.
 await reel.evaluate(el => { el.scrollLeft = 0; });
 await page.waitForFunction(() => document.querySelector('[data-reel-step="-1"]').disabled);
 const scale = await page.locator('.contract-portrait img').first().evaluate(el => getComputedStyle(el).transform);
 assert.match(scale, /matrix\(1\.2, 0, 0, 1\.2, 0, 5\)/);
 await page.screenshot({ path: `output/reel-navigation/${name}-start.png`, fullPage: true });
 // Hiring from the end shrinks the reel; its new endpoint disables the next arrow.
 for (let i = 0; i < 20 && !await next.isDisabled(); i++) await next.click();
 const hired = await page.locator('[data-hire]').last().getAttribute('data-hire');
 await page.locator('[data-hire]').last().click();
 assert.equal(await page.locator(`[data-contract="${hired}"]`).count(), 0);
 await page.waitForFunction(() => document.querySelector('[data-reel-step="1"]').disabled);
 await page.locator('[data-roster-action="roll"]').click();
 assert.equal(await previous.isDisabled(), true); assert.equal(await next.isDisabled(), true);
 await page.evaluate(() => advanceTime(1500));
 await page.waitForFunction(() => document.querySelector('[data-reel-step="-1"]').disabled);
 assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
 await context.close();
 console.log(`${name}: one-card steps, endpoints, keyboard, direct scrolling, hire, reroll and portraits passed`);
}
// Smooth scrolling and resizing a fitting reel into an overflowing one.
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.on('pageerror', e => errors.push(e.message));
await page.goto(`${base}/dungeon.html`); await page.locator('.town-panorama button').click();
await page.locator('[data-roster-action="roll"]').click(); await page.evaluate(() => advanceTime(1500));
assert.equal(await page.locator('[data-reel-step="1"]').isDisabled(), true);
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForFunction(() => !document.querySelector('[data-reel-step="1"]').disabled);
const stride = await page.locator('.contract-reel').evaluate(el => el.querySelector('.contract-card').getBoundingClientRect().width + parseFloat(getComputedStyle(el).columnGap));
await page.locator('[data-reel-step="1"]').click();
await page.waitForFunction(step => Math.abs(document.querySelector('.contract-reel').scrollLeft - step) < 2, stride);
await page.setViewportSize({ width: 1440, height: 1000 });
await page.waitForFunction(() => [...document.querySelectorAll('[data-reel-step]')].every(button => button.disabled));
assert.deepEqual(errors, []);
await browser.close();
console.log('Smooth scrolling and responsive arrow state: passed');
