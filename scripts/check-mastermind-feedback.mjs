import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";
import { generateChallenge, HERO_CLASSES, scoreGuess } from "../src/mastermind-core.js";

await mkdir("output/mastermind-feedback", { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  for (const [name, width, height] of [["desktop", 1440, 1000], ["tablet", 1024, 768], ["phone", 390, 844], ["small-phone", 320, 740], ["landscape", 844, 390]]) {
    const page = await browser.newPage({ viewport: { width, height }, reducedMotion: "reduce" });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto("http://127.0.0.1:4173/mastermind.html?daily=1");
    await page.waitForFunction(() => window.render_game_to_text);
    const state = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));
    for (const difficulty of ["easy", "medium", "hard"]) {
      await page.locator(`[data-challenge="${difficulty}"]`).click();
      const challenge = generateChallenge((await state()).date, difficulty);
      const missing = HERO_CLASSES.find(hero => !challenge.counts[hero.id]).id;
      const trio = challenge.clues.find(clue => clue.kind === "trio").type;
      const rotated = challenge.code.slice(1).concat(challenge.code[0]); rotated[0] = missing;
      const guesses = [Array(challenge.size).fill(missing), Array(challenge.size).fill(trio), rotated];
      for (const [index, guess] of guesses.entries()) {
        for (const hero of guess) await page.locator(`.hero-choice[data-hero="${hero}"]`).click();
        await page.locator("#submit-button").click();
        const result = (await state()).guesses.at(-1);
        const expected = scoreGuess(challenge.code, guess);
        assert.equal(result.absent, challenge.size - expected.exact - expected.misplaced);
        assert.equal(result.exact + result.misplaced + result.absent, challenge.size);
        if (index === 0) assert.equal(result.absent, challenge.size, "an entirely wrong class is grey");
        if (index === 1) assert.equal(result.absent, challenge.size - 3, "extra copies are grey too");
        const feedback = page.locator("#guess-history .row-feedback").first();
        assert.equal(await feedback.locator(".feedback-score").count(), 3);
        assert.equal(await feedback.locator(".absent-score b").textContent(), String(result.absent));
        assert.match(await feedback.getAttribute("aria-label"), /not included/);
        assert.equal(await feedback.getAttribute("role"), "img");
        const fits = await feedback.evaluate(el => {
          const row = el.closest(".guess-row").getBoundingClientRect(), box = el.getBoundingClientRect();
          return box.left >= row.left && box.right <= row.right && [...el.children].every(child => { const r = child.getBoundingClientRect(); return r.left >= box.left - 1 && r.right <= box.right + 1; });
        });
        assert.ok(fits, `${name}/${difficulty}: all three counters fit their feedback column`);
      }
      assert.match(await page.locator('[data-i18n="absentLegend"]').textContent(), /extra copy/);
      assert.equal(await page.locator('.board-legend .feedback-dot.absent').count(), 1);
      await page.reload();
      await page.locator(`[data-challenge="${difficulty}"]`).click();
      assert.equal((await state()).guesses.length, 3, "existing saved rows recompute grey totals");
      assert.equal(await page.locator("#guess-history .absent-score").count(), 3);
      await page.locator('[data-locale="pl"]').click();
      assert.match(await page.locator('[data-i18n="absentLegend"]').textContent(), /nadmiarowa kopia/);
      assert.match(await page.locator("#guess-history .row-feedback").first().getAttribute("aria-label"), /poza składem/);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await page.locator("#guess-history").scrollIntoViewIfNeeded();
      await page.waitForFunction(() => [...document.querySelectorAll("#guess-history img")].every(img => img.complete && img.naturalWidth > 0));
      await page.screenshot({ path: `output/mastermind-feedback/${name}-${difficulty}.png`, fullPage: true });
      await page.locator('[data-locale="en"]').click();
      for (const hero of challenge.code) await page.locator(`.hero-choice[data-hero="${hero}"]`).click();
      await page.locator("#submit-button").click();
      assert.equal((await state()).result, "solved");
      assert.equal(await page.locator("#guess-history .absent-score b").first().textContent(), "0", "solved rows keep a visible zero grey count");
    }
    assert.deepEqual(errors, []);
    await page.close();
    console.log(`${name}: all difficulties, missing classes, excess duplicates, mixed feedback, zero/solved counts, saved rows, EN/PL, accessible descriptions and layout pass`);
  }
} finally { await browser.close(); }
