import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
await mkdir("output/mastermind-flow", { recursive: true });
try {
  for (const [name, width, height, reducedMotion] of [["desktop", 1440, 1000, "no-preference"], ["phone", 390, 844, "no-preference"], ["small-phone", 320, 740, "reduce"], ["landscape", 844, 390, "reduce"]]) {
    const page = await browser.newPage({ viewport: { width, height }, reducedMotion });
    const errors = [];
    page.on("pageerror", e => errors.push(e.message));
    await page.goto("http://127.0.0.1:4173/mastermind.html");
    await page.evaluate(() => {
      const { date } = JSON.parse(window.render_game_to_text());
      localStorage.setItem(`vaultbound:mastermind:v1:${date}:easy`, JSON.stringify({
        guesses: Array.from({ length: 8 }, () => Array(5).fill("knight")), draft: Array(5).fill(null),
      }));
    });
    await page.reload();
    const state = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));
    await page.locator(".board-footer").scrollIntoViewIfNeeded();
    assert.equal(await page.locator(".picker-panel").evaluate(el => getComputedStyle(el).position), "static");
    for (let guess = 0; guess < 3; guess++) {
      for (let i = 0; i < 5; i++) await page.locator('.hero-choice[data-hero="knight"]').click();
      const arrangement = await page.evaluate(() => {
        const row = document.querySelector(".row-active").getBoundingClientRect();
        const button = document.querySelector("#submit-button").getBoundingClientRect();
        return button.top >= row.bottom;
      });
      assert.ok(arrangement, "Check guess follows the current formation");
      await page.locator("#submit-button").scrollIntoViewIfNeeded();
      const position = () => page.evaluate(() => ({
        y: scrollY,
        row: document.querySelector(".row-active").getBoundingClientRect().top,
        button: document.querySelector("#submit-button").getBoundingClientRect().top,
      }));
      const before = await position();
      await page.locator("#submit-button").click();
      assert.equal((await state()).guesses.length, 9 + guess);
      await page.waitForTimeout(150);
      const after = await position();
      assert.ok(Math.abs(after.y - before.y) <= 1, "Submitting does not scroll the page");
      assert.ok(Math.abs(after.row - before.row) <= 1, "New active row stays in the same place");
      assert.ok(Math.abs(after.button - before.button) <= 1, "Check guess stays in the same place");
      const numbers = await page.locator("#guess-history .row-number").allTextContents();
      assert.equal(Number(numbers[0]), 9 + guess);
      assert.equal(Number(numbers.at(-1)), 1);
      const order = await page.locator("#guess-board .guess-row").evaluateAll(rows => rows.map(row => row.classList.contains("row-active")));
      assert.equal(order[0], true);
      assert.ok(order.slice(1).every(active => !active));
      assert.equal(await page.locator(".hero-choice").count(), 7);
    }
    await page.evaluate(() => document.getAnimations().forEach(animation => animation.finish()));
    await page.screenshot({ path: `output/mastermind-flow/${name}.png` });
    // The selector stays in the normal flow at the top and after resize.
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await page.waitForFunction(() => !document.querySelector(".picker-panel").classList.contains("picker-floating"));
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator(".board-footer").scrollIntoViewIfNeeded();
    assert.equal(await page.locator(".picker-panel").evaluate(el => getComputedStyle(el).position), "static");
    assert.deepEqual(errors, []);
    await page.close();
    console.log(`${name}: stationary active row/controls, newest-first history, no automatic scrolling, static picker, top/resize and reduced-motion flow pass`);
  }
} finally { await browser.close(); }
