import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const baseURL = process.argv[2] ?? "http://127.0.0.1:4173";
const selectedViewports = process.argv.slice(3);
const output = "output/mastermind-art";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  for (const [name, width, height] of [["desktop", 1440, 1000], ["wide", 1920, 1080], ["tablet", 1024, 768], ["phone", 390, 844], ["small-phone", 320, 740], ["landscape", 844, 390]]) {
    if (selectedViewports.length && !selectedViewports.includes(name)) continue;
    const context = await browser.newContext({ viewport: { width, height } });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("response", response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
    await page.goto(`${baseURL}/mastermind.html`);
    const state = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));
    await page.waitForFunction(() => window.render_game_to_text);
    for (const difficulty of ["easy", "medium", "hard"]) {
      await page.locator(`[data-challenge="${difficulty}"]`).click();
      const size = (await state()).partySize;
      assert.equal(await page.locator(".guess-row").count(), 1);
      for (let i = 0; i < size; i++) await page.locator(".hero-choice").nth(i).click();
      assert.equal(await page.locator(".row-active .guess-tile[data-hero]").count(), size);
      await page.locator(".row-active .guess-tile").first().click();
      assert.equal(await page.locator(".row-active .tile-empty").count(), 1);
      await page.locator(".hero-choice").first().click();
      await page.locator("#submit-button").click();
      assert.equal((await state()).guesses.length, 1);
      assert.equal(await page.locator(".guess-row").count(), 2);
      assert.equal(await page.locator(".row-submitted .guess-tile[data-hero]").count(), size);
      for (let i = 0; i < size; i++) await page.locator(".hero-choice").nth(i).click();
      await page.evaluate(async () => { await Promise.all([...document.images].map(image => image.decode())); });
      const appearance = await page.evaluate(() => {
        const choices = [...document.querySelectorAll(".hero-choice")];
        const colors = new Map(choices.map(el => [el.dataset.hero, el.style.getPropertyValue("--hero-color")]));
        return {
          uniqueColors: new Set(colors.values()).size,
          consistent: [...document.querySelectorAll("[data-hero]")].every(el => el.style.getPropertyValue("--hero-color") === colors.get(el.dataset.hero)),
          isolated: [...document.images].every(image => image.getAttribute("src").startsWith("assets/mastermind/")),
          overflow: document.documentElement.scrollWidth > innerWidth,
          contained: [...document.querySelectorAll(".guess-tile")].every(el => {
            const tile = el.getBoundingClientRect(), row = el.closest(".guess-row").getBoundingClientRect();
            return tile.left >= row.left && tile.right <= row.right;
          }),
          portraitWidth: document.querySelector(".guess-tile").getBoundingClientRect().width,
        };
      });
      assert.equal(appearance.uniqueColors, 7);
      assert.ok(appearance.consistent && appearance.isolated);
      assert.equal(appearance.overflow, false);
      assert.ok(appearance.contained);
      assert.ok(appearance.portraitWidth >= (width > 1100 ? 80 : 30));
      await page.evaluate(() => document.getAnimations().forEach(animation => animation.finish()));
      await page.screenshot({ path: `${output}/${name}-${difficulty}.png`, fullPage: true });
      await page.locator("#clear-button").click();
      assert.ok((await state()).draft.every(hero => hero === null));
    }
    // The same colored portraits and class identities survive translation/reload.
    await page.locator('[data-locale="pl"]').click();
    assert.equal((await state()).locale, "pl");
    await page.reload();
    assert.equal((await state()).locale, "pl");
    assert.equal((await state()).guesses.length, 1);
    const solution = await page.evaluate(async () => {
      const { generateChallenge } = await import("./src/mastermind-core.js");
      const snapshot = JSON.parse(window.render_game_to_text());
      return generateChallenge(snapshot.date, snapshot.difficulty).code;
    });
    for (const hero of solution) await page.locator(`.hero-choice[data-hero="${hero}"]`).click();
    await page.locator("#submit-button").click();
    assert.equal((await state()).result, "solved");
    assert.equal(await page.locator(".guess-row").count(), 2);
    assert.equal(await page.locator(".hero-choice:disabled").count(), 7);
    await page.evaluate(() => document.getAnimations().forEach(animation => animation.finish()));
    await page.screenshot({ path: `${output}/${name}-solved.png`, fullPage: true });
    if (["desktop", "small-phone"].includes(name)) {
      await page.locator('[data-challenge="medium"]').click();
      await page.evaluate(() => document.activeElement.blur());
      while ((await state()).guesses.length < 12) {
        for (let i = 0; i < 6; i++) await page.keyboard.press("1");
        await page.keyboard.press("Enter");
      }
      assert.equal((await state()).result, "playing");
      assert.equal(await page.locator(".guess-row").count(), 13);
      assert.equal(await page.locator(".row-active").count(), 1);
      await page.reload();
      await page.locator('[data-challenge="medium"]').click();
      assert.equal((await state()).guesses.length, 12);
      assert.equal(await page.locator(".hero-choice:disabled").count(), 0);
      await page.evaluate(() => document.getAnimations().forEach(animation => animation.finish()));
      await page.screenshot({ path: `${output}/${name}-unlimited.png`, fullPage: true });
    }
    assert.deepEqual(errors, []);
    await context.close();
    console.log(`${name}: portraits, class colors, three difficulties, editing, guesses, clear, Polish, reload and solved state pass`);
  }
} finally {
  await browser.close();
}
