import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const baseURL = process.argv[2] ?? "http://127.0.0.1:4173";
const browser = await chromium.launch({ headless: true });
await mkdir("output/gold-check", { recursive: true });
const errors = [];

async function verifyCost(button, amount, label = "PAY") {
  assert.equal(await button.getAttribute("data-gold-cost"), String(amount));
  assert.ok((await button.getAttribute("class")).includes("gold-purchase"));
  assert.equal(await button.locator('.gold-coin').getAttribute("src"), "assets/coin-token.png");
  assert.equal(await button.locator('.gold-value').textContent(), String(amount));
  assert.equal(await button.locator('.gold-price__label').textContent(), label);
  const bounds = await button.evaluate((button) => {
    const price = button.querySelector('.gold-price').getBoundingClientRect();
    const rect = button.getBoundingClientRect();
    return { contained: price.left >= rect.left && price.right <= rect.right && price.top >= rect.top && price.bottom <= rect.bottom };
  });
  assert.ok(bounds.contained, "Price must fit inside its action button");
}

try {
  for (const [name, width, height] of [["desktop", 1440, 1000], ["phone", 390, 844], ["small-phone", 320, 740], ["landscape", 844, 390]]) {
    const context = await browser.newContext({ viewport: { width, height } });
    await context.addInitScript(() => { Math.random = () => .05; });
    const page = await context.newPage();
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
    await page.goto(`${baseURL}/dungeon.html`);
    await page.waitForFunction(() => window.render_game_to_text);
    const state = async () => JSON.parse(await page.evaluate(() => window.render_game_to_text()));
    const noOverflow = async () => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await noOverflow();
    const balance = page.locator('.town-gold');
    assert.equal(await balance.locator('.gold-coin').getAttribute('src'), 'assets/coin-token.png');
    assert.equal(await balance.locator('.gold-value').textContent(), '10');
    await page.locator('[data-district="knight"]').click();
    assert.equal((await state()).gold, 10, "Inspecting a district is free");
    const detail = width <= 760 ? '.town-sheet' : '.town-inspector';
    const upgrade = page.locator(`${detail} [data-upgrade="knight"][data-path="pathA"]`);
    await verifyCost(upgrade, 3);
    await page.screenshot({ path: `output/gold-check/town-${name}.png`, fullPage: true });
    await upgrade.click();
    assert.equal((await state()).gold, 7);
    await verifyCost(upgrade, 6);
    if (width <= 760) await page.locator('[data-town-action="dismiss"]').click();
    await page.locator('.town-panorama button').click();
    const roll = page.locator('.roster-roll-button');
    assert.equal(await roll.getAttribute('data-gold-cost'), null);
    assert.equal(await roll.locator('.gold-coin').count(), 0);
    assert.match(await roll.textContent(), /FREE/);
    await noOverflow();
    await roll.click();
    await page.evaluate(() => window.advanceTime(1500));
    assert.equal((await state()).gold, 7);
    await verifyCost(roll, 1);
    const hire = page.locator('[data-hire]').first();
    assert.match(await hire.textContent(), /FREE/);
    assert.equal(await hire.locator('.gold-coin').count(), 0);
    for (let index = 0; index < 4; index += 1) await page.locator('[data-hire]').first().click();
    const train = page.locator('[data-roster-action="upgrade"]');
    await verifyCost(train, 1);
    await train.click();
    assert.equal((await state()).gold, 6);
    await verifyCost(train, 4);
    await train.click();
    assert.equal((await state()).gold, 2);
    await verifyCost(train, 9);
    assert.equal(await train.isDisabled(), true);
    assert.match(await train.textContent(), /Need 7 more gold/);
    await roll.click();
    await page.evaluate(() => window.advanceTime(1500));
    assert.equal((await state()).gold, 1);
    await verifyCost(roll, 2);
    assert.equal(await roll.isDisabled(), true);
    assert.match(await page.locator('.reel-cost-note').textContent(), /Need 1 more gold/);
    await noOverflow();
    await page.screenshot({ path: `output/gold-check/company-${name}.png`, fullPage: true });
    await page.locator('.roster-header > div [data-roster-action="town"]').click();
    await page.locator('[data-district="tavern"]').click();
    const unaffordable = page.locator(`${detail} [data-upgrade="tavern"]`);
    await verifyCost(unaffordable, 3);
    assert.equal(await unaffordable.isDisabled(), true);
    assert.match(await page.locator(`${detail} .gold-purchase-note`).textContent(), /Need 2 more gold/);
    if (width <= 760) await page.locator('[data-town-action="dismiss"]').click();
    await page.locator('.town-panorama button').click();
    await page.locator('[data-roster-action="start"]').click();
    await page.locator('[data-battle-action="pause"]').click();
    const flee = page.locator('[data-battle-action="flee"]');
    await verifyCost(flee, 1, 'LOSE');
    assert.match(await flee.getAttribute('aria-label'), /Lose 1 gold/);
    assert.equal(await page.locator('[data-command] .gold-coin').count(), 0, "Command is not gold");
    await noOverflow();
    await page.screenshot({ path: `output/gold-check/battle-${name}.png` });
    await flee.click();
    assert.equal((await state()).gold, 0);
    assert.equal(await page.locator('.battle-gold .gold-value').textContent(), '0');
    await context.close();
    console.log(`${name}: coin identity, price visibility, free/paid distinction, exact charges, affordability, and Flee passed`);
  }
  assert.deepEqual(errors, []);
} finally { await browser.close(); }
