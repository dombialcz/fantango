import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const output = "output/mastermind-drag";
await mkdir(output, { recursive: true });
try {
  for (const touch of [false, true]) {
    const name = touch ? "touch" : "mouse";
    const context = await browser.newContext({ viewport: touch ? { width: 390, height: 844 } : { width: 1440, height: 1000 }, hasTouch: touch, isMobile: touch });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto("http://127.0.0.1:4173/mastermind.html");
    const state = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));
    const draft = async () => (await state()).draft;
    const active = slot => page.locator(`.row-active [data-slot="${slot}"]`);
    const history = slot => page.locator(`[data-history-row="0"][data-slot="${slot}"]`);
    const pick = hero => page.locator(`.hero-choice[data-hero="${hero}"]`).click();
    const cdp = await context.newCDPSession(page);
    const start = async (x, y) => touch
      ? cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y, id: 0 }] })
      : (await page.mouse.move(x, y), page.mouse.down());
    const move = async (x, y) => touch
      ? cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y, id: 0 }] })
      : page.mouse.move(x, y, { steps: 8 });
    const end = async () => touch
      ? cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] })
      : page.mouse.up();
    async function drag(source, target, options = {}) {
      await page.evaluate(() => document.getAnimations().forEach(a => a.finish()));
      await source.scrollIntoViewIfNeeded();
      const a = await source.boundingBox();
      await start(a.x + a.width / 2, a.y + a.height / 2);
      await page.waitForTimeout(320);
      assert.ok((await state()).drag, "Holding starts a drag");
      const b = target ? await target.boundingBox() : { x: 2, y: 2, width: 0, height: 0 };
      await move(b.x + b.width / 2, b.y + b.height / 2);
      if (options.screenshot) await page.screenshot({ path: `${output}/${name}-${options.screenshot}.png` });
      if (options.cancel) {
        if (touch) await cdp.send("Input.dispatchTouchEvent", { type: "touchCancel", touchPoints: [] });
        else { await page.keyboard.press("Escape"); await end(); }
      } else await end();
      assert.equal((await state()).drag, null);
      assert.equal(await page.locator(".portrait-drag-ghost").count(), 0);
    }

    // Earlier rows are checked guesses, and remain immutable copy sources.
    for (const hero of ["knight", "thief", "bard", "cleric", "ranger"]) await pick(hero);
    await page.locator("#submit-button").click();
    const original = (await state()).guesses;
    await pick("knight"); await pick("thief");
    if (touch) { await active(0).scrollIntoViewIfNeeded(); const b = await active(0).boundingBox(); await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2); }
    else await active(0).click();
    assert.deepEqual(await draft(), [null, "thief", null, null, null], "Quick tap still clears");
    await pick("knight");
    await drag(active(0), active(1), { screenshot: "swap" });
    assert.deepEqual(await draft(), ["thief", "knight", null, null, null]);
    await drag(active(0), active(3));
    assert.deepEqual(await draft(), [null, "knight", null, "thief", null]);
    await drag(history(0), active(0), { screenshot: "copy" });
    assert.deepEqual(await draft(), ["knight", "knight", null, "thief", null]);
    await drag(history(1), active(1));
    assert.deepEqual(await draft(), ["knight", "thief", null, "thief", null]);
    assert.deepEqual((await state()).guesses, original);
    const before = await draft();
    if (!touch) {
      const point = await active(3).boundingBox();
      await start(point.x + point.width / 2, point.y + point.height / 2);
      await move(point.x + point.width / 2 + 16, point.y + point.height / 2);
      await end();
      assert.deepEqual(await draft(), before, "Moving before the hold threshold does not clear a portrait");
    }
    await drag(active(3), active(3));
    await drag(active(3), null);
    await drag(active(3), active(2), { cancel: true });
    assert.deepEqual(await draft(), before, "Same-slot, outside and cancellation preserve the draft");
    await page.reload();
    assert.deepEqual(await draft(), before, "Moves and copies persist");
    await history(2).focus();
    await page.keyboard.press("Enter");
    assert.equal((await draft())[0], "knight");
    assert.equal((await draft())[2], "bard", "History portraits also support keyboard copying");
    await page.locator('[data-locale="pl"]').click();
    assert.match(await page.locator("#drag-hint").innerText(), /Przytrzymaj/);

    // Old ten-attempt saves must reopen, and history beyond ten must survive.
    await page.evaluate(() => {
      const snapshot = JSON.parse(window.render_game_to_text());
      localStorage.setItem(`vaultbound:mastermind:v1:${snapshot.date}:easy`, JSON.stringify({
        guesses: Array.from({ length: 10 }, () => Array(5).fill("knight")),
        draft: ["thief", null, null, null, null],
      }));
    });
    await page.reload();
    assert.equal((await state()).result, "playing");
    assert.deepEqual(await draft(), ["thief", null, null, null, null]);
    await page.locator("#clear-button").click();
    for (let row = 0; row < 3; row++) {
      for (let slot = 0; slot < 5; slot++) await pick("knight");
      assert.equal((await state()).guesses.length, 10 + row, "Full rows stay editable until checked");
      await page.locator("#submit-button").click();
    }
    assert.equal((await state()).guesses.length, 13);
    assert.equal((await state()).guessLimit, null);
    assert.equal(await page.locator(".guess-row").count(), 14);
    await page.reload();
    assert.equal((await state()).guesses.length, 13);
    assert.equal((await state()).result, "playing");

    if (touch) {
      await history(0).scrollIntoViewIfNeeded();
      const point = await history(0).boundingBox();
      const scroll = await page.evaluate(() => scrollY);
      await start(point.x + point.width / 2, point.y + point.height / 2);
      await move(point.x + point.width / 2, point.y + point.height / 2 - 70);
      await end();
      assert.equal((await state()).drag, null);
      assert.ok(await page.evaluate(() => scrollY) > scroll, "A quick swipe on a portrait scrolls without picking it up");
      assert.ok((await draft()).every(hero => hero === null));
    }

    // A drag can autoscroll from old history down to the current row on a phone.
    await history(0).scrollIntoViewIfNeeded();
    const box = await history(0).boundingBox();
    await start(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(320);
    await move(150, (touch ? 844 : 1000) - 12);
    const scrollBefore = await page.evaluate(() => scrollY);
    await page.waitForTimeout(400);
    assert.ok(await page.evaluate(() => scrollY) > scrollBefore, "Held portraits autoscroll at the viewport edge");
    const element = await active(2).elementHandle();
    await element.evaluate(el => el.scrollIntoView({ block: "center", behavior: "instant" }));
    const destination = await active(2).boundingBox();
    await move(destination.x + destination.width / 2, destination.y + destination.height / 2);
    await end();
    assert.equal((await draft())[2], "knight");
    assert.equal((await state()).guesses.length, 13);
    await page.locator("#clear-button").click();
    const solution = await page.evaluate(async () => {
      const { generateChallenge } = await import("./src/mastermind-core.js");
      const snapshot = JSON.parse(window.render_game_to_text());
      return generateChallenge(snapshot.date, "easy").code;
    });
    for (const hero of solution) await pick(hero);
    await page.locator("#submit-button").click();
    assert.equal((await state()).result, "solved");
    assert.equal((await state()).guesses.length, 14);
    assert.equal(await page.locator(".row-active").count(), 0);
    assert.equal(await page.locator(".hero-choice:disabled").count(), 7);
    assert.deepEqual(errors, []);
    console.log(`${name}: hold, move, swap, history clone, cancellation, taps, autoscroll, saves, unlimited guesses and solving pass`);
    await context.close();
  }
} finally { await browser.close(); }
