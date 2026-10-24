import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const output = "output/mastermind-tutorial";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  for (const [name, width, height, firstThief, random] of [
    ["desktop", 1440, 1000, 0, .1], ["phone", 390, 844, 1, .1],
    ["small-phone", 320, 740, 1, .9], ["landscape", 844, 390, 2, .1],
  ]) {
    const context = await browser.newContext({ viewport: { width, height }, hasTouch: width < 500, isMobile: width < 500, reducedMotion: "reduce" });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("requestfailed", request => { if (request.url().startsWith("http://127.0.0.1:4173/")) errors.push(`${request.url()}: ${request.failure()?.errorText}`); });
    page.on("response", response => { if (response.url().startsWith("http://127.0.0.1:4173/") && response.status() >= 400) errors.push(`${response.status()}: ${response.url()}`); });
    await page.addInitScript(random => { Math.random = () => random; }, random);
    await page.goto("http://127.0.0.1:4173/mastermind.html");
    try { await page.waitForFunction(() => window.render_game_to_text); }
    catch (error) { throw new Error(`${name}: page initialization failed: ${JSON.stringify(errors)}`, { cause: error }); }
    const state = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));
    const dailyStorage = () => page.evaluate(() => Object.fromEntries(Object.entries(localStorage).filter(([key]) => key.startsWith("vaultbound:mastermind:v1:"))));
    const dailyBefore = await dailyStorage();
    const click = async selector => {
      if (selector === "#home-play-tutorial" && !await page.locator(selector).isVisible()) await page.locator("#mastermind-home-button").click();
      return width < 500 ? page.locator(selector).tap() : page.locator(selector).click();
    };
    const pick = piece => click(`#tutorial-pick-${piece}`);
    const slot = index => click(`#tutorial-slot-${index}`);
    const next = () => click("#tutorial-next");
    const check = () => click("#tutorial-check");
    const screenshot = async phase => {
      await page.waitForFunction(() => [...document.querySelectorAll("#mastermind-tutorial img")].every(img => img.complete && img.naturalWidth > 0));
      await page.evaluate(() => document.getAnimations().forEach(a => a.finish()));
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${name}/${phase}: no horizontal overflow`);
      await page.screenshot({ path: `${output}/${name}-${phase}.png`, fullPage: true });
    };
    const activeFocus = () => page.evaluate(() => document.activeElement.id);
    await click("#home-play-tutorial");
    assert.equal(await activeFocus(), "tutorial-slot-0");
    await slot(firstThief); await pick("thief"); await pick("thief");
    assert.match((await state()).notice, /only one thief/);
    await pick("coin"); await pick("coin");
    const original = (await state()).draft;
    assert.equal((await state()).phase, "setup"); assert.equal((await state()).window, null);
    assert.equal(await page.locator("#tutorial-check").isEnabled(), true);
    await check();
    let snapshot = await state();
    assert.equal(snapshot.phase, "green"); assert.deepEqual(snapshot.draft, [null, null, null]);
    assert.deepEqual([snapshot.guesses[0].exact, snapshot.guesses[0].misplaced], [1, 2]);
    const target = firstThief === 1 ? random < .5 ? 0 : 2 : 2 - firstThief;
    assert.equal(snapshot.window.besidePlace, target + 1);
    assert.equal(await page.locator(".story-room").count(), 0, "empty next row does not displace the worked example");
    assert.match(await page.locator(".story-latest .story-window").getAttribute("aria-label"), new RegExp(`place ${target + 1}.*${target === 0 ? "left" : "right"}`));
    if (height > 700) {
      const visible = await page.locator(".score-teaching").evaluate(el => { const r = el.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; });
      assert.ok(visible, `${name}: highlighted result is visible with its explanation`);
    }
    await screenshot("green");
    await next(); assert.equal((await state()).phase, "yellow"); await screenshot("yellow");
    await next(); assert.equal((await state()).phase, "quiz");
    assert.equal(await page.locator("#tutorial-next").isDisabled(), true);
    await click("#tutorial-answer-absent"); assert.equal((await state()).quizPassed, false);
    assert.match((await state()).notice, /Try again/);
    await click("#tutorial-answer-elsewhere"); assert.equal((await state()).quizPassed, true);
    assert.equal(await activeFocus(), "tutorial-next");
    await next(); assert.equal((await state()).phase, "window");
    await next(); assert.equal((await state()).phase, "deduce");
    assert.equal(await activeFocus(), "tutorial-slot-0");
    await page.keyboard.press("Tab"); assert.equal(await activeFocus(), "tutorial-slot-1");
    await page.keyboard.press("1"); assert.equal((await state()).draft[1], "thief", "numeric pick works from a tab-focused place");
    assert.match(await page.locator("#tutorial-announcement").textContent(), /Thief placed in place 2/);
    await click("#tutorial-clear");
    assert.deepEqual((await state()).draft, [null, null, null]);
    await click("#tutorial-undo"); assert.equal((await state()).draft[1], "thief");
    await slot(1); assert.equal((await state()).draft[1], null, "tap clears, matching daily controls");
    await click("#tutorial-undo"); assert.equal((await state()).draft[1], "thief");
    await click("#tutorial-clear");
    await slot(firstThief); await pick("thief"); await pick("coin"); await pick("coin");
    assert.deepEqual((await state()).draft, original);
    if (name === "desktop" || name === "phone") {
      // Use real pointer/touch holds through the shared daily drag implementation.
      const destination = (firstThief + 1) % 3;
      async function drag(from, to) {
        const source = page.locator(`#tutorial-slot-${from}`), targetTile = page.locator(`#tutorial-slot-${to}`);
        await source.scrollIntoViewIfNeeded();
        const a = await source.boundingBox(), b = await targetTile.boundingBox();
        if (width < 500) {
          const cdp = await context.newCDPSession(page);
          await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: a.x + a.width / 2, y: a.y + a.height / 2, id: 0 }] });
          await page.waitForTimeout(300); assert.ok((await state()).drag);
          await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: b.x + b.width / 2, y: b.y + b.height / 2, id: 0 }] });
          await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
          await cdp.detach();
        } else {
          await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2); await page.mouse.down();
          await page.waitForTimeout(300); assert.ok((await state()).drag);
          await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 5 }); await page.mouse.up();
        }
      }
      await drag(firstThief, destination); assert.equal((await state()).draft[destination], "thief");
      await drag(destination, firstThief); assert.deepEqual((await state()).draft, original);
    }
    await check();
    assert.equal((await state()).guesses.length, 2); assert.deepEqual((await state()).draft, [null, null, null]);
    assert.equal(await activeFocus(), "tutorial-result-heading");
    assert.match(await page.locator("#tutorial-announcement").textContent(), /Attempt 2: 1 in the correct place, 2 elsewhere/);
    await page.keyboard.press("Tab"); assert.equal(await activeFocus(), "tutorial-slot-0");
    assert.equal(await page.locator(".story-attempt").count(), 1);
    await screenshot("failed-fresh-row");
    await slot(target); await pick("thief"); await pick("coin"); await pick("coin"); await check();
    assert.equal((await state()).phase, "treasury-solved"); assert.equal((await state()).guesses.length, 0);
    assert.equal((await state()).facts.length, 1); assert.equal(await page.locator(".story-latest, .story-attempt").count(), 0);
    await next(); await next(); assert.equal((await state()).phase, "guard");
    assert.ok(!/opposite end|coins between/i.test((await state()).instruction), "guard prompt leaves inference to the player");
    const guardDraft = (await state()).draft;
    assert.equal(await page.locator(`#tutorial-slot-${target}`).getAttribute("role"), "img");
    assert.match(await page.locator(`#tutorial-slot-${target}`).getAttribute("aria-label"), /fixed/);
    assert.deepEqual((await state()).draft, guardDraft);
    await click("#tutorial-hint"); assert.equal((await state()).hintsShown, 1);
    assert.ok(!/opposite end/.test(await page.locator(".story-hint").textContent()));
    await click("#tutorial-hint"); assert.equal((await state()).hintsShown, 2);
    assert.match(await page.locator(".story-hint").textContent(), /opposite end/);
    await slot(1); await pick("thief"); await pick("coin"); await check();
    assert.deepEqual((await state()).draft, guardDraft); assert.equal((await state()).facts.length, 1);
    await screenshot("guard-failed");
    await slot(1); await pick("coin"); await pick("thief"); await check();
    assert.equal((await state()).phase, "guard-solved"); assert.equal((await state()).guesses.length, 0); assert.equal((await state()).facts.length, 2);
    await next(); assert.equal((await state()).phase, "practice-intro");
    await next(); assert.equal((await state()).phase, "practice"); assert.equal((await state()).draft.length, 4);
    assert.equal((await state()).window, null); assert.equal(await page.locator("[data-tutorial-piece]").count(), 3);
    for (const piece of ["knight", "knight", "knight", "bard"]) await pick(piece);
    await check(); assert.equal((await state()).guesses.at(-1).absent, 1);
    assert.match(await page.locator(".story-latest .story-scores").textContent(), /Not included/);
    await screenshot("independent-feedback");
    for (let thief = 0; thief < 4; thief++) {
      await slot(thief); await pick("thief"); await pick("knight"); await pick("knight"); await pick("knight"); await check();
      if ((await state()).phase === "complete") break;
    }
    assert.equal((await state()).phase, "complete"); assert.equal((await state()).facts.length, 3); assert.deepEqual((await state()).guesses, []);
    assert.equal("health" in (await state()), false);
    await screenshot("complete");
    await click("#tutorial-finish"); assert.equal((await state()).difficulty, "easy"); assert.equal((await state()).partySize, 5);
    assert.deepEqual(await dailyStorage(), dailyBefore, "practice never touches daily saves");
    await click("#home-play-tutorial"); assert.equal((await state()).phase, "setup"); assert.deepEqual((await state()).facts, []);
    await pick("thief"); const beforeRestart = (await state()).draft;
    await click("#tutorial-restart"); assert.deepEqual((await state()).draft, [null, null, null]);
    await click("#tutorial-undo"); assert.deepEqual((await state()).draft, beforeRestart);
    await page.reload(); assert.equal((await state()).mode, "home", "ordinary URL returns home after reload");
    await click("#home-play-tutorial"); assert.deepEqual((await state()).draft, [null, null, null]);
    await pick("thief"); await click("#tutorial-exit"); await click("#home-play-tutorial");
    assert.deepEqual((await state()).draft, [null, null, null], "leaving drops the current run");
    await pick("thief");
    await page.evaluate(() => { dispatchEvent(new Event("pagehide")); dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true })); });
    assert.deepEqual((await state()).draft, [null, null, null], "back-forward cache cannot resume an abandoned run");
    assert.equal(await page.evaluate(() => localStorage.getItem("vaultbound:mastermind:tutorial:v1")), null);
    assert.deepEqual(errors, []);
    await context.close();
    console.log(`${name}: explicit Check, visible lessons, quiz, keyboard/focus, announcements, editing/drag/Undo, optional hints, independent lesson, scene cleanup and temporary lifecycle pass`);
  }

  for (const [locale, width] of [["en", 390], ["pl", 390], ["en", 320], ["pl", 320]]) {
    const page = await browser.newPage({ viewport: { width, height: 844 }, reducedMotion: "reduce" });
    await page.goto("http://127.0.0.1:4173/mastermind.html?tutorial=1");
    if (locale === "pl") await page.locator('[data-locale="pl"]').click();
    await page.addStyleTag({ content: "html { font-size: 200% !important; }" });
    await page.locator("#tutorial-pick-thief").click(); await page.locator("#tutorial-pick-coin").click(); await page.locator("#tutorial-pick-coin").click(); await page.locator("#tutorial-check").click();
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${locale}/${width}: enlarged feedback has no overflow`);
    await page.locator("#tutorial-next").click(); await page.locator("#tutorial-next").click();
    await page.locator("#tutorial-answer-elsewhere").click(); await page.locator("#tutorial-next").click(); await page.locator("#tutorial-next").click();
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${locale}/${width}: enlarged board has no overflow`);
    const clipped = await page.locator(".story-picker button, .story-window-description, .story-scores > span, .story-topline > *").evaluateAll(elements => elements.filter(el => el.scrollWidth > el.clientWidth + 1).map(el => el.textContent));
    assert.deepEqual(clipped, [], `${locale}/${width}: essential labels do not clip`);
    const brokenWords = await page.locator(".story-picker button > span").evaluateAll(labels => labels.filter(label => { const range = document.createRange(); range.selectNodeContents(label); return range.getClientRects().length > 1; }).map(label => label.textContent));
    assert.deepEqual(brokenWords, [], `${locale}/${width}: enlarged piece names remain whole words`);
    await page.screenshot({ path: `${output}/${locale}-${width}-large-text.png`, fullPage: true });
    await page.close(); console.log(`${locale}/${width}: 200% text reflows without clipping`);
  }

  const page = await browser.newPage();
  await page.addInitScript(() => {
    localStorage.setItem("vaultbound:mastermind:tutorial:v1", JSON.stringify({ actions: Array(3000).fill({ type: "next" }) }));
  });
  await page.goto("http://127.0.0.1:4173/mastermind.html?tutorial=1");
  await page.waitForFunction(() => window.render_game_to_text);
  assert.equal(await page.evaluate(() => localStorage.getItem("vaultbound:mastermind:tutorial:v1")), null, "obsolete tutorial saves are purged");
  await page.locator("#tutorial-pick-thief").click(); await page.reload();
  assert.deepEqual(await page.evaluate(() => JSON.parse(window.render_game_to_text()).draft), [null, null, null]);
  await page.close();
  const noStorage = await browser.newPage();
  await noStorage.addInitScript(() => { Storage.prototype.getItem = Storage.prototype.setItem = Storage.prototype.removeItem = () => { throw new Error("Storage disabled"); }; });
  await noStorage.goto("http://127.0.0.1:4173/mastermind.html?tutorial=1");
  for (const piece of ["thief", "coin", "coin"]) await noStorage.locator(`#tutorial-pick-${piece}`).click();
  await noStorage.locator("#tutorial-check").click();
  assert.equal(await noStorage.evaluate(() => JSON.parse(window.render_game_to_text()).phase), "green");
  await noStorage.close(); console.log("Legacy save cleanup, direct tutorial reload and storage-free play pass");
} finally { await browser.close(); }
