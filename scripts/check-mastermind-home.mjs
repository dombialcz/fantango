import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";
const output = "output/mastermind-home";
const linksOnly = process.argv.includes("--links-only");
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
try {
  for (const [name, width, height, locale, large] of [
    ["desktop", 1440, 1000, "en", false], ["phone", 390, 844, "en", false],
    ["small-phone", 320, 740, "en", false], ["landscape", 844, 390, "pl", false],
    ["pl-large", 320, 740, "pl", true], ["en-large", 390, 844, "en", true],
  ].filter(() => !linksOnly)) {
    const context = await browser.newContext({ viewport: { width, height }, hasTouch: width < 500, isMobile: width < 500, reducedMotion: "reduce" });
    await context.addInitScript(locale => localStorage.setItem("vaultbound:mastermind:language", locale), locale);
    const page = await context.newPage(), errors = [];
    page.on("pageerror", e => errors.push(e.message));
    page.on("response", r => { if (r.url().startsWith("http://127.0.0.1:4173/") && r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
    await page.goto("http://127.0.0.1:4173/mastermind.html");
    await page.waitForFunction(() => window.render_game_to_text);
    if (large) await page.addStyleTag({ content: "html { font-size: 200%; }" });
    await page.evaluate(async () => { await document.fonts.ready; await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))); });
    const state = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));
    const click = selector => width < 500 ? page.locator(selector).tap() : page.locator(selector).click();
    const home = () => click("#mastermind-home-button");
    const stored = () => page.evaluate(() => JSON.stringify(Object.fromEntries(Object.entries(localStorage).filter(([k]) => k.startsWith("vaultbound:mastermind:v1:")))));
    const shot = async suffix => {
      await page.evaluate(() => document.fonts.ready);
      await page.waitForFunction(() => [...document.images].filter(i => i.closest("#mastermind-home")).every(i => i.complete && i.naturalWidth));
      assert.ok(await page.evaluate(width => document.documentElement.scrollWidth <= width && innerWidth <= width, width), `${name}/${suffix}: no horizontal overflow`);
      assert.ok(await page.locator("button:visible").evaluateAll(els => els.every(el => el.getBoundingClientRect().right <= innerWidth + 1)), `${name}: controls fit viewport`);
      await page.screenshot({ path: `${output}/${name}-${suffix}.png`, fullPage: true });
    };
    assert.equal((await state()).mode, "home");
    assert.equal(await page.locator(".home-choices button:visible").count(), 3);
    assert.equal(await page.locator("#mastermind-daily").isVisible(), false);
    assert.equal(await page.locator("#mastermind-home-button").isVisible(), false);
    const initial = await stored(); await page.keyboard.press("1"); await page.keyboard.press("Enter"); assert.equal(await stored(), initial);
    await shot("splash");
    await click("#home-play-daily"); assert.equal((await state()).difficulty, "easy");
    assert.equal(await page.evaluate(() => document.activeElement.id), "daily-title");
    await click('[data-challenge="medium"]');
    for (let i = 0; i < 6; i++) await click('.hero-choice[data-hero="knight"]');
    await click("#submit-button"); await click('.hero-choice[data-hero="thief"]');
    const daily = await state(), saved = await stored();
    await shot("daily"); await home();
    assert.equal((await state()).mode, "home"); assert.equal(await page.evaluate(() => document.activeElement.id), "mastermind-home-title");
    await page.keyboard.press("1"); assert.equal(await stored(), saved);
    await click("#home-play-daily");
    const resumed = await state(); assert.deepEqual(resumed.draft, daily.draft); assert.deepEqual(resumed.guesses, daily.guesses); assert.equal(resumed.difficulty, "medium");
    await home(); await click("#home-play-stories"); assert.equal((await state()).mode, "stories");
    assert.equal(await page.evaluate(() => document.activeElement.id), "stories-title"); await shot("stories");
    await click("#start-adventure-0"); await click("#adventure-next"); await click("#adventure-pick-thief");
    await home(); await click("#home-play-stories"); await click("#start-adventure-0");
    assert.equal((await state()).health, 5); assert.ok((await state()).draft.every(p => p === null));
    await click("#adventure-exit"); assert.equal((await state()).mode, "stories");
    await home(); await click("#home-play-tutorial"); assert.equal((await state()).phase, "setup");
    await click("#tutorial-pick-thief"); await click("#tutorial-exit"); assert.equal((await state()).mode, "home");
    await click("#home-play-tutorial"); assert.ok((await state()).draft.every(p => p === null));
    await home(); await page.reload(); assert.equal((await state()).mode, "home");
    assert.equal(await stored(), saved);
    await page.locator(`[data-locale="${locale === "en" ? "pl" : "en"}"]`).click();
    assert.equal((await state()).locale, locale === "en" ? "pl" : "en"); await shot("locale-switch");
    assert.deepEqual(errors, []); await context.close(); console.log(`${name}: home, daily resume, stories/tutorial cleanup, focus, keyboard isolation, language/reflow passed`);
  }
  const page = await browser.newPage();
  for (const [param, mode] of [["daily=1", undefined], ["tutorial=1", "story-tutorial"], ["adventure=2", "story-adventure"]]) {
    await page.goto(`http://127.0.0.1:4173/mastermind.html?${param}`); await page.waitForFunction(() => window.render_game_to_text);
    assert.equal(await page.evaluate(() => JSON.parse(window.render_game_to_text()).mode), mode);
    await page.locator("#mastermind-home-button").click(); assert.equal(new URL(page.url()).search, "");
    await page.reload(); assert.equal(await page.evaluate(() => JSON.parse(window.render_game_to_text()).mode), "home");
  }
  await page.goto("http://127.0.0.1:4173/mastermind.html?tutorial=1");
  await page.locator("#tutorial-exit").click(); assert.equal(new URL(page.url()).search, "");
  await page.reload(); assert.equal(await page.evaluate(() => JSON.parse(window.render_game_to_text()).mode), "home");
  await page.close(); console.log("Direct mode links and both Home controls clear mode queries");
} finally { await browser.close(); }
