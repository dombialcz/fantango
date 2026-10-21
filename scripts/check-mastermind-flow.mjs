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
    await page.waitForFunction(() => innerWidth > 1100 || document.querySelector(".picker-panel").classList.contains("picker-floating"));
    for (let guess = 0; guess < 3; guess++) {
      for (let i = 0; i < 5; i++) await page.locator('.hero-choice[data-hero="knight"]').click();
      const arrangement = await page.evaluate(() => {
        const row = document.querySelector(".row-active").getBoundingClientRect();
        const button = document.querySelector("#submit-button").getBoundingClientRect();
        return button.top >= row.bottom;
      });
      assert.ok(arrangement, "Check guess follows the current formation");
      await page.locator("#submit-button").click();
      assert.equal((await state()).guesses.length, 9 + guess);
      await page.waitForFunction(() => {
        const row = document.querySelector(".row-active").getBoundingClientRect();
        const button = document.querySelector("#submit-button").getBoundingClientRect();
        const picker = document.querySelector(".picker-panel").getBoundingClientRect();
        return row.top >= (innerWidth <= 1100 ? picker.bottom : 0) - 2 && button.bottom <= innerHeight + 2;
      });
      await page.evaluate(() => new Promise(resolve => {
        let y = scrollY, stable = 0;
        function tick() {
          stable = Math.abs(scrollY - y) < .5 ? stable + 1 : 0;
          y = scrollY;
          if (stable >= 8) resolve(); else requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
      }));
      const picker = await page.locator(".picker-panel").boundingBox();
      assert.ok(picker.y >= 0 && picker.y + picker.height <= height + 1, "Hero selection remains within the viewport");
      if (width <= 1100) assert.ok(picker.height < 100, "Floating selection stays compact");
      assert.equal(await page.locator(".hero-choice:visible").count(), 7);
    }
    await page.evaluate(() => document.getAnimations().forEach(animation => animation.finish()));
    await page.screenshot({ path: `output/mastermind-flow/${name}.png` });
    // The compact selector expands again near the top; resize does not strand it.
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await page.waitForFunction(() => !document.querySelector(".picker-panel").classList.contains("picker-floating"));
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator(".board-footer").scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelector(".picker-panel").classList.contains("picker-floating"));
    assert.deepEqual(errors, []);
    await page.close();
    console.log(`${name}: bottom controls, repeated automatic scrolling, accessible floating picker, top/resize and reduced-motion flow pass`);
  }
} finally { await browser.close(); }
