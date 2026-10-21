import assert from "node:assert/strict";
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const browser = await chromium.launch({ headless: true });
await mkdir("output/mastermind-mobile-scroll", { recursive: true });
try {
  for (const width of [320, 390]) {
    for (const guesses of [0, 1, 2, 3, 8]) {
      const context = await browser.newContext({ viewport: { width, height: 740 }, isMobile: true, hasTouch: true });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", e => errors.push(e.message));
      await page.goto("http://127.0.0.1:4173/mastermind.html");
      await page.evaluate(count => {
        const { date } = JSON.parse(window.render_game_to_text());
        localStorage.setItem(`vaultbound:mastermind:v1:${date}:easy`, JSON.stringify({
          guesses: Array.from({ length: count }, () => Array(5).fill("knight")), draft: Array(5).fill(null),
        }));
      }, guesses);
      await page.reload();
      const originalHeight = await page.evaluate(() => document.documentElement.scrollHeight);
      const cdp = await context.newCDPSession(page);
      let previous = 0;
      // Swipe the page gutter so native touch scrolling crosses the pin point.
      for (let swipe = 0; swipe < 5; swipe++) {
        await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 5, y: 620, id: 0 }] });
        for (let y = 580; y >= 300; y -= 40) {
          await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: 5, y, id: 0 }] });
          await page.waitForTimeout(30);
        }
        await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
        await page.waitForTimeout(200);
        const current = await page.evaluate(() => ({ y: scrollY, height: document.documentElement.scrollHeight }));
        assert.ok(current.y >= previous - 2, `A downward swipe must not jump upward (${width}px, ${guesses} guesses: ${previous} → ${current.y})`);
        assert.ok(Math.abs(current.height - originalHeight) <= 2, "Pinning preserves page height");
        previous = current.y;
      }
      assert.ok(previous > 0, "Touch swipes actually scroll the page");
      if (guesses >= 2) {
        assert.equal(await page.locator(".picker-floating").count(), 1);
        await page.screenshot({ path: `output/mastermind-mobile-scroll/${width}-${guesses}.png` });
      }
      await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
      await page.waitForFunction(() => !document.querySelector(".picker-panel").classList.contains("picker-floating"));
      assert.equal(await page.evaluate(() => scrollY), 0);
      assert.deepEqual(errors, []);
      await context.close();
      console.log(`${width}px / ${guesses} guesses: native swipes preserve scroll direction and page height; unpinning works`);
    }
  }
} finally { await browser.close(); }
