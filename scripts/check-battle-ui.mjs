import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const baseURL = process.argv[2] ?? "http://127.0.0.1:4173";
const rolls = { knight: .05, thief: .2, bard: .35, cleric: .45, barbarian: .6, ranger: .75, mage: .95 };
const browser = await chromium.launch({ headless: true });
await mkdir("output/battle-ui", { recursive: true });

async function battle(classes, viewport = { width: 1440, height: 1000 }) {
  const context = await browser.newContext({ viewport });
  const sequence = [.05, .05, .05, .05, .05];
  for (let index = 0; index < 5; index += 1) sequence.push(rolls[classes[index] ?? classes.at(-1)], .05);
  await context.addInitScript((values) => { window.requestAnimationFrame = () => 0; let index = 0; Math.random = () => values[index++] ?? .05; }, sequence);
  await context.route('**/src/dungeon.js', async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: `${await response.text()}\nwindow.battleUiTest = { get state() { return state; }, render };` });
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  await page.goto(`${baseURL}/dungeon.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof window.render_game_to_text === "function");
  const state = async () => JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  assert.equal((await state()).view, "town");
  await page.locator('.town-panorama [data-town-action="close"]').click();
  await page.locator('[data-roster-action="roll"]').click();
  await page.evaluate(() => window.advanceTime(1500));
  for (let index = 0; index < 4; index += 1) {
    await page.locator('[data-hire]').first().click();
  }
  await page.locator('[data-roster-action="start"]').click();
  if (await page.locator('.roster-departure-dialog').evaluate(dialog => dialog.open)) await page.locator('[data-departure="confirm"]').click();
  await page.locator("#battle-screen").waitFor({ state: "visible" });
  await page.waitForFunction(() => [...document.querySelectorAll("[data-command] img")].every((image) => image.complete && image.naturalWidth > 0));
  assert.equal(await page.locator("[data-command]").count(), 7);
  return { context, page, state, errors };
}

async function pauseAtMeter(game, cost, fundCommand = false) {
  // Command behavior is tested independently of how long a weak first-floor foe survives.
  // Damage-based earning and full-meter pausing have dedicated integration checks.
  if (fundCommand) await game.page.evaluate(cost => {
    const t = window.battleUiTest; t.state.commandMeter = Math.max(t.state.commandMeter, cost); t.render();
  }, cost);
  let snapshot = await game.state();
  for (let step = 0; step < 300 && snapshot.view === "battle" && snapshot.commands.meter < cost; step += 1) {
    await game.page.evaluate(() => window.advanceTime(200));
    snapshot = await game.state();
  }
  assert.equal(snapshot.view, "battle");
  assert.ok(snapshot.commands.meter >= cost);
  if (!snapshot.battlePaused) await game.page.locator('[data-battle-action="pause"]').click();
  return game.state();
}

async function cast(game, id) {
  await game.page.locator(`[data-command="${id}"]`).click();
  return game.state();
}

try {
  for (const [name, width, height] of [["desktop", 1440, 1000], ["phone", 390, 844], ["small-phone", 320, 740], ["landscape", 844, 390]]) {
    const game = await battle(["knight", "ranger", "mage", "cleric"], { width, height });
    await pauseAtMeter(game, 0);
    const bounds = await game.page.locator("[data-command]").evaluateAll((buttons) => buttons.map((button) => {
      const bounds = button.getBoundingClientRect(); return { top: bounds.top, bottom: bounds.bottom };
    }));
    assert.ok(bounds.every((bounds) => bounds.top >= 0 && bounds.bottom <= height));
    assert.equal(await game.page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await game.page.screenshot({ path: `output/battle-ui/${name}.png` });
    assert.deepEqual(game.errors, []);
    await game.context.close();
  }

  for (const id of ["hold", "rally", "mark", "freeze", "aegis", "bloodlust", "pilfer"]) {
    const classes = {
      hold: ["knight", "knight", "cleric", "barbarian"],
      rally: ["bard", "bard", "knight", "knight"],
      mark: ["ranger", "ranger", "knight", "knight"],
      freeze: ["mage", "mage", "mage", "mage"],
      aegis: ["cleric", "cleric", "cleric", "cleric"],
      bloodlust: ["barbarian", "barbarian", "knight", "cleric"],
      pilfer: ["thief", "thief", "thief", "thief"],
    }[id];
    const game = await battle(classes);
    if (id === "rally") await game.page.evaluate(() => {
      const t = window.battleUiTest;
      for (const unit of [...t.state.party, ...t.state.enemies]) unit.timer = 1e9;
      t.state.commandAutoPauseEnabled = false; t.state.battlePaused = false;
      advanceTime(6000); t.state.battlePaused = true; t.render();
    });
    // Mark's reach check needs both rows, independent of the random campaign mix.
    if (id === "mark") await game.page.evaluate(() => {
      const t = window.battleUiTest;
      if (!t.state.enemies.some(e => e.row === "back")) t.state.enemies.at(-1).row = "back";
      t.render();
    });
    const cost = (await game.state()).commands.available[id].cost;
    const before = await pauseAtMeter(game, cost, true);
    let after = await cast(game, id);
    if (id === "hold") assert.equal(after.commands.effects.holdArmorBonus, .2);
    if (id === "rally") {
      assert.equal(before.commands.effects.bardActiveSong, "rally");
      assert.equal(after.commands.effects.bardActiveSong, "defense");
      assert.equal(after.commands.effects.bardNextSong, "power");
      assert.ok(after.party.find(hero => hero.class === "knight").attackIntervalMs > before.party.find(hero => hero.class === "knight").attackIntervalMs);
      assert.ok(after.party.find(hero => hero.class === "knight").effectiveDamageReduction > before.party.find(hero => hero.class === "knight").effectiveDamageReduction);
    }
    if (id === "mark") {
      assert.equal(after.commands.targeting, "mark");
      await game.page.keyboard.press("Escape");
      assert.equal((await game.state()).commands.meter, before.commands.meter);
      await cast(game, id);
      await game.page.locator('[data-rank="enemy-back"] [data-unit]').first().click();
      after = await game.state();
      assert.ok(after.commands.effects.markedEnemyId);
      assert.equal(after.party.find((hero) => hero.class === "knight").attackIntervalMs, before.party.find((hero) => hero.class === "knight").attackIntervalMs);
      assert.ok(after.party.find((hero) => hero.class === "ranger").attackIntervalMs < before.party.find((hero) => hero.class === "ranger").attackIntervalMs);
    }
    if (id === "aegis") {
      assert.equal(after.commands.targeting, "aegis");
      await game.page.locator('[data-side="hero"].is-targetable').first().click();
      after = await game.state();
      assert.equal(await game.page.locator('[data-side="hero"].is-shielded').count(), 1);
    }
    if (id === "freeze" || id === "aegis") {
      const hp = after.party.map((hero) => hero.hp);
      const effect = id === "freeze" ? "enemyFreezeMs" : "divineAegisMs";
      assert.ok(after.commands.effects[effect] > 0);
      await game.page.evaluate(() => window.advanceTime(1000));
      assert.equal((await game.state()).commands.effects[effect], after.commands.effects[effect]);
      await game.page.locator('[data-battle-action="pause"]').click();
      await game.page.evaluate(() => window.advanceTime(1000));
      await game.page.locator('[data-battle-action="pause"]').click();
      const advanced = await game.state();
      assert.ok(advanced.commands.effects[effect] < after.commands.effects[effect]);
      if (id === "freeze") assert.ok(advanced.party.every((hero, index) => hero.hp >= hp[index]));
      else assert.ok(advanced.party[0].hp >= hp[0]);
    }
    if (id === "bloodlust") {
      before.party.forEach((hero, index) => {
        assert.equal(after.party[index].hp, hero.hp);
      });
      assert.ok(after.enemies.filter((enemy) => enemy.row === "front").length < before.enemies.filter((enemy) => enemy.row === "front").length);
    }
    if (id === "pilfer") {
      assert.equal(after.gold, before.gold);
      assert.equal(after.commands.pilferPending, 4);
      assert.equal(after.commands.pilferUsed, true);
      await game.page.locator('[data-battle-action="pause"]').click();
      for (let step = 0; step < 450 && after.view === "battle"; step += 1) {
        if (after.battlePaused) await game.page.locator('[data-battle-action="pause"]').click();
        await game.page.evaluate(() => window.advanceTime(200)); after = await game.state();
      }
      assert.equal(after.view, "floor_result");
      assert.equal(after.gold, before.gold + 5);
      await game.page.screenshot({ path: "output/battle-ui/victory-health.png" });
      await game.page.locator('[data-battle-action="continue"]').click();
      assert.equal((await game.state()).floor, 2);
      assert.equal((await game.state()).commands.pilferUsed, false);
    }
    await game.page.screenshot({ path: `output/battle-ui/${id}.png` });
    assert.deepEqual(game.errors, []);
    await game.context.close();
    console.log(`${id}: passed`);
  }
} finally { await browser.close(); }
