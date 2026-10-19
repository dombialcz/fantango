import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const base = process.argv[2] ?? 'http://127.0.0.1:4193';
await mkdir('output/building-upgrades', { recursive: true });
const browser = await chromium.launch();
try {
  for (const [name, width, height] of [['desktop',1440,1000],['phone',390,844],['small',320,740],['landscape',844,390]]) {
    const context = await browser.newContext({ viewport: { width, height } });
    await context.route('**/src/dungeon.js', async route => {
      const response = await route.fetch();
      await route.fulfill({ response, body: `${await response.text()}\nwindow.upgradeTest = { get state() { return state; }, render };` });
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', e => { if (e.type() === 'error') errors.push(e.text()); });
    await page.goto(`${base}/dungeon.html`);
    await page.waitForFunction(() => window.upgradeTest);
    const detail = page.locator(width <= 760 ? '.town-sheet' : '.town-inspector');
    const dialog = page.locator('.town-upgrade-dialog');
    const benefits = detail.locator('.town-building-bonuses');
    const state = () => page.evaluate(() => {
      const s = window.upgradeTest.state;
      return { gold: s.gold, buildings: JSON.parse(JSON.stringify(s.buildings)), presentation: JSON.parse(render_game_to_text()).townPresentation };
    });
    await page.locator('[data-district="knight"]').click();
    const before = await state();
    const initialFlavor = await detail.locator('.town-building-flavor').textContent();
    assert.equal(await detail.locator('[data-upgrade]').count(), 0);
    await detail.locator('[data-open-upgrade]').click();
    assert.equal(await dialog.locator('[data-upgrade]').count(), 2);
    assert.equal(await dialog.locator('.town-upgrade-dialog__benefit').count(), 1);
    assert.equal(await dialog.locator('.town-building-flavor').textContent(), initialFlavor);
    assert.equal((await state()).gold, before.gold);
    await dialog.locator('[data-town-action="cancel-upgrade"]').click();
    assert.deepEqual((await state()).buildings, before.buildings);
    assert.equal(await detail.locator('[data-open-upgrade]').evaluate(e => e === document.activeElement), true);
    await detail.locator('[data-open-upgrade]').click();
    await page.keyboard.press('Escape');
    assert.equal(await dialog.evaluate(e => e.open), false);
    await detail.locator('[data-open-upgrade]').click();
    await page.screenshot({ path: `output/building-upgrades/choices-${name}.png`, fullPage: true });
    assert.equal(await dialog.evaluate(e => e.scrollWidth <= e.clientWidth), true);
    await dialog.locator('[data-path="pathA"]').click();
    const upgraded = await state();
    assert.equal(upgraded.gold, before.gold - 3);
    assert.equal(upgraded.buildings.knight.level, 2);
    assert.equal(upgraded.buildings.knight.pathA, 1);
    assert.equal(upgraded.buildings.knight.pathB, 0);
    assert.match(await benefits.innerText(), /25% damage reduction/);
    assert.match(await benefits.innerText(), /\+15% maximum health/);
    assert.doesNotMatch(await benefits.innerText(), /attack speed/);
    assert.equal(await dialog.evaluate(e => e.open), false);
    const changedFlavor = await detail.locator('.town-building-flavor').textContent();
    assert.notEqual(changedFlavor, initialFlavor);
    await page.evaluate(() => { window.upgradeTest.state.message = 'Render without visiting'; window.upgradeTest.render(); });
    assert.equal(await detail.locator('.town-building-flavor').textContent(), changedFlavor);
    await detail.locator('[data-open-upgrade]').click();
    await dialog.locator('[data-path="pathB"]').click();
    assert.equal((await state()).buildings.knight.pathB, 1);
    assert.match(await benefits.innerText(), /30% damage reduction/);
    assert.match(await benefits.innerText(), /\+15% maximum health/);
    assert.match(await benefits.innerText(), /\+10% attack speed/);
    await benefits.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `output/building-upgrades/current-bonuses-${name}.png` });
    if (width <= 760) await page.locator('[data-town-action="dismiss"]').click();
    await page.locator('[data-district="knight"]').click();
    assert.notEqual(await detail.locator('.town-building-flavor').textContent(), changedFlavor);
    if (width <= 760) await page.locator('[data-town-action="dismiss"]').click();
    await page.locator('[data-district="tavern"]').click();
    await detail.locator('[data-open-upgrade]').click();
    assert.equal(await dialog.locator('[data-upgrade]').count(), 1);
    assert.equal(await dialog.locator('.town-upgrade-dialog__benefit').count(), 0);
    assert.equal(await dialog.locator('[data-upgrade]').isDisabled(), true);
    await dialog.locator('[data-town-action="cancel-upgrade"]').click();
    await page.evaluate(() => { window.upgradeTest.state.gold = 100; window.upgradeTest.render(); });
    for (let level = 2; level <= 5; level++) {
      await detail.locator('[data-open-upgrade]').click();
      await dialog.locator('[data-upgrade]').click();
      assert.equal((await state()).buildings.tavern.level, level);
      assert.match(await benefits.innerText(), new RegExp(`${(level - 1) * 10}% chance to reach hero level 2`));
    }
    assert.equal(await detail.locator('[data-open-upgrade]').count(), 0);
    assert.equal(await detail.locator('h2').evaluate(e => e === document.activeElement), true);
    if (width <= 760) await page.locator('[data-town-action="dismiss"]').click();
    await page.locator('[data-district="alchemist"]').click();
    assert.match(await benefits.innerText(), /1 healing potion at each expedition's start/);
    assert.match(await benefits.innerText(), /restores 20% maximum health/);
    assert.match(await benefits.innerText(), /10% chance to recover/);
    await detail.locator('[data-open-upgrade]').click();
    assert.equal(await dialog.locator('.town-upgrade-dialog__benefit').count(), 0);
    assert.equal(await dialog.locator('[data-upgrade]').count(), 1);
    assert.match(await dialog.locator('[data-upgrade]').innerText(), /20% chance to recover/);
    await page.screenshot({ path: `output/building-upgrades/utility-${name}.png` });
    await dialog.locator('[data-upgrade]').click();
    assert.match(await benefits.innerText(), /2 healing potions/);
    assert.match(await benefits.innerText(), /20% chance to recover/);
    await page.evaluate(() => { window.upgradeTest.state.journey.legacies.push('undead-potions'); window.upgradeTest.render(); });
    assert.match(await benefits.innerText(), /70% chance to recover.*20% from Alchemist \+ Undead legacy/);
    await detail.locator('[data-open-upgrade]').click();
    assert.match(await dialog.locator('[data-upgrade]').innerText(), /80% chance to recover.*30% from Alchemist \+ Undead legacy/);
    await dialog.locator('[data-town-action="cancel-upgrade"]').click();
    if (width <= 760) await page.locator('[data-town-action="dismiss"]').click();
    const totals = {
      knight: ['40% damage reduction', '+30% maximum health', '+20% attack speed'],
      thief: ['20% dodge chance', '+60% damage against foes at half health or below', '+20% attack speed'],
      bard: ['+40% power to 3 non-Bard allies at expedition start', '+30% maximum health'],
      cleric: ['healing 22% of power', '+30% maximum health', '+20% attack speed'],
      barbarian: ['+40% damage', '+30% maximum health', '+10 percentage points of critical-hit chance'],
      ranger: ['+40% attack speed', '+24% damage', '+10 percentage points of critical-hit chance'],
      mage: ['5 spell targets', '+30% maximum health', '+20% attack speed'],
    };
    for (const [type, expected] of Object.entries(totals)) {
      await page.evaluate(type => { window.upgradeTest.state.buildings[type] = { level: 5, pathA: 2, pathB: 2 }; window.upgradeTest.render(); }, type);
      await page.locator(`[data-district="${type}"]`).click();
      const text = await benefits.innerText();
      for (const bonus of expected) assert.ok(text.includes(bonus), `${type}: missing ${bonus} in ${text}`);
      assert.equal(await detail.locator('[data-open-upgrade]').count(), 0);
      assert.equal(await benefits.evaluate(e => e.scrollWidth <= e.clientWidth), true);
      if (width <= 760) await page.locator('[data-town-action="dismiss"]').click();
    }
    await page.locator('[data-district="cemetery"]').click();
    assert.equal(await detail.locator('[data-open-upgrade]').count(), 0);
    assert.ok(await detail.locator('.town-building-flavor').textContent());
    assert.deepEqual(errors, []);
    await context.close();
  }
  console.log('Shared/utility upgrade panels, cumulative bonuses for all buildings, recovery/legacy preview, cancel/Escape/focus, affordability, level cap and rotating flavor: passed at four viewports');
} finally { await browser.close(); }
