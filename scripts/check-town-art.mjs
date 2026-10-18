import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const baseURL = process.argv[2] ?? "http://127.0.0.1:4174";
const browser = await chromium.launch({ headless: true });
await mkdir("output/town-art-check", { recursive: true });
const errors = [];

async function waitForArt(page) {
  await page.waitForFunction(() => [...document.querySelectorAll('.town-grid .town-art img, .town-inspector__art .town-art img')].every((image) => image.complete && image.naturalWidth));
  await page.evaluate(() => Promise.all([...document.querySelectorAll('.town-grid .town-art img, .town-inspector__art .town-art img')].map((image) => image.decode())));
}

async function checkReadability(page) {
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  const cards = await page.locator('[data-district]').evaluateAll((cards) => cards.map((card) => {
    const bounds = card.getBoundingClientRect();
    const art = card.querySelector('.town-art').getBoundingClientRect();
    const name = card.querySelector('.town-district__name').getBoundingClientRect();
    const price = card.querySelector('.town-district__bottom').getBoundingClientRect();
    const classLabel = card.querySelector('.town-district__top').getBoundingClientRect();
    return { type: card.dataset.district, separated: classLabel.bottom <= art.top && art.bottom <= name.top && name.bottom <= price.top, contained: name.left >= bounds.left && name.right <= bounds.right && price.bottom <= bounds.bottom + 1 };
  }));
  assert.ok(cards.every((card) => card.separated && card.contained), JSON.stringify(cards));
}

async function checkOpaqueBounds(page) {
  // Measure painted pixels, not just the padded image boxes, to detect clipped roofs/foundations.
  return page.locator('.town-grid .town-art').evaluateAll((arts) => arts.map((art) => {
    const image = art.querySelector('img');
    const canvas = document.createElement('canvas'); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d'); context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0;
    for (let y = 0; y < canvas.height; y += 1) for (let x = 0; x < canvas.width; x += 1) if (pixels[(y * canvas.width + x) * 4 + 3] >= 24) {
      minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x + 1); maxY = Math.max(maxY, y + 1);
    }
    const box = image.getBoundingClientRect(), frame = art.getBoundingClientRect();
    const scale = Math.min(box.width / canvas.width, box.height / canvas.height);
    const offsetX = box.left + (box.width - canvas.width * scale) / 2;
    const offsetY = box.top + (box.height - canvas.height * scale) / 2;
    return { source: image.getAttribute('src'), unclipped: offsetX + minX * scale >= frame.left - 1 && offsetY + minY * scale >= frame.top - 1 && offsetX + maxX * scale <= frame.right + 1 && offsetY + maxY * scale <= frame.bottom + 1, paintedWidth: (maxX - minX) * scale };
  }));
}

try {
  for (const [name, width, height] of [["desktop", 1440, 1000], ["laptop", 1280, 800], ["tablet", 900, 1000], ["phone", 390, 844], ["small-phone", 320, 740], ["landscape", 844, 390]]) {
    const context = await browser.newContext({ viewport: { width, height } });
    const page = await context.newPage();
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
    await context.route('**/src/dungeon.js', async (route) => {
      const response = await route.fetch();
      await route.fulfill({ response, body: `${await response.text()}\nwindow.artTest = { state: () => state, render };` });
    });
    await page.goto(`${baseURL}/dungeon.html`);
    await page.waitForFunction(() => window.artTest);
    await page.evaluate(() => { window.artTest.state().gold = 500; window.artTest.render(); });
    await waitForArt(page);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.locator('link[href="town-art.css"]').evaluate((link) => { link.disabled = true; });
    const oldSize = await page.locator('[data-district="tavern"] .town-art').evaluate((art) => art.clientWidth);
    await page.locator('link[href="town-art.css"]').evaluate((link) => { link.disabled = false; });
    const newSize = await page.locator('[data-district="tavern"] .town-art').evaluate((art) => art.clientWidth);
    assert.ok(newSize > oldSize * 1.35, `${name}: ${oldSize} → ${newSize}`);
    await checkReadability(page);
    await page.locator('.town-grid').scrollIntoViewIfNeeded();
    await waitForArt(page);
    await page.screenshot({ path: `output/town-art-check/grid-${name}.png` });
    const detail = width <= 760 ? '.town-sheet' : '.town-inspector';
    await page.locator('[data-district="tavern"]').click();
    const upgrade = page.locator(`${detail} [data-upgrade="tavern"]`);
    await upgrade.click();
    await waitForArt(page);
    await page.waitForFunction(() => document.querySelector('[data-district="tavern"] .town-art.is-restoring'));
    assert.equal(JSON.parse(await page.evaluate(() => window.render_game_to_text())).gold, 497);
    assert.equal(await page.locator(`${detail} .town-art img`).getAttribute('src'), 'assets/town/levels/tavern-2.webp');
    assert.equal(await upgrade.locator('.gold-value').textContent(), '6');
    const selectedArtSize = await page.locator(`${detail} .town-art`).evaluate((art) => art.clientWidth);
    assert.ok(selectedArtSize >= (width <= 760 ? 240 : 260));
    await page.screenshot({ path: `output/town-art-check/upgraded-${name}.png` });
    await upgrade.click();
    await waitForArt(page);
    await page.waitForFunction(() => document.querySelector('[data-district="tavern"] .town-art').dataset.restoration === 'RESTORED · LEVEL 3');
    assert.equal(JSON.parse(await page.evaluate(() => window.render_game_to_text())).gold, 491);
    if (width <= 760) await page.locator('[data-town-action="dismiss"]').click();
    await page.evaluate(() => {
      for (const building of Object.values(window.artTest.state().buildings)) building.level = 1;
      window.artTest.render();
    });
    await waitForArt(page);
    assert.equal(await page.locator('.town-art.is-restoring').count(), 0, 'Reset must cancel the old upgrade notice');
    await page.waitForTimeout(50);
    await page.locator('[data-district="tavern"]').click();
    assert.equal(await page.locator(`${detail} .town-art.is-restoring`).count(), 0, 'Inspection must not replay an upgrade');
    if (width <= 760) await page.locator('[data-town-action="dismiss"]').click();
    for (let level = 1; level <= 5; level += 1) {
      await page.evaluate((level) => {
        for (const building of Object.values(window.artTest.state().buildings)) building.level = level;
        window.artTest.render();
      }, level);
      await waitForArt(page);
      // Motion is disabled above, so bounds describe the stable framing even during notices.
      const bounds = await checkOpaqueBounds(page);
      assert.ok(bounds.every((entry) => entry.unclipped), `${name}, level ${level}: ${JSON.stringify(bounds.filter((entry) => !entry.unclipped))}`);
      await checkReadability(page);
    }
    await page.locator('.town-grid').scrollIntoViewIfNeeded();
    await page.screenshot({ path: `output/town-art-check/max-level-${name}.png` });
    if (name === 'desktop') {
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await page.evaluate(() => { window.artTest.state().buildings.tavern.level = 1; window.artTest.render(); });
      await page.locator('[data-district="tavern"]').click();
      await upgrade.click();
      await waitForArt(page);
      await page.waitForFunction(() => document.querySelector('[data-district="tavern"] .town-art.is-restoring'));
      await page.screenshot({ path: 'output/town-art-check/animated-upgrade.png' });
      await page.waitForFunction(() => !document.querySelector('.town-art.is-restoring'), null, { timeout: 5000 });
    }
    await context.close();
    console.log(`${name}: artwork ${oldSize}px → ${newSize}px; all 45 sprites unclipped, labels/prices separate, upgrades/reset/reduced motion passed`);
  }
  assert.deepEqual(errors, []);
} finally { await browser.close(); }
