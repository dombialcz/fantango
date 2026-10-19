import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";
import { ENEMY_PORTRAITS } from "../src/enemy-art.js";

const baseURL = process.argv[2] ?? "http://127.0.0.1:4176";
const browser = await chromium.launch({ headless: true });
await mkdir("output/enemy-art-check", { recursive: true });
const errors = [];
try {
  for (const [name, width, height] of [["desktop", 1440, 1000], ["phone", 390, 844], ["small-phone", 320, 740], ["landscape", 844, 390]]) {
    const context = await browser.newContext({ viewport: { width, height } });
    await context.addInitScript(() => { Math.random = () => .05; });
    await context.route('**/src/dungeon.js', async (route) => {
      const response = await route.fetch();
      await route.fulfill({ response, body: `${await response.text()}
        window.enemyArtTest = {
          stage(flavor, floor = 3) {
            state.flavorKey = flavor; state.floor = floor;
            if (floor === 10) { state.flavorKey = 'demons'; state.bossType = 'vaultTyrant'; }
            state.party = buildParty(['knight','ranger','mage','cleric'].map((type, index) => ({id: 1000 + index, type, name: HERO_TYPES[type].label, level: 2, active: true})));
            prepareFloor();
            if (floor !== 10) state.enemies = Object.values(FLAVOR_ROSTERS[flavor]).map(type => makeEnemy(type, floor));
            state.battlePaused = true; state.commandMeter = 100; render();
          },
          act(type) { actEnemy(state.enemies.find(unit => unit.type === type)); render(); },
          returnFromStrike() { state.battleTime += 1200; state.battlePaused = false; updateBattle(1); state.battlePaused = true; render(); },
          refill() { state.commandMeter = 100; render(); }
        };` });
    });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.goto(`${baseURL}/dungeon.html`);
    await page.waitForFunction(() => window.enemyArtTest);
    const state = async () => JSON.parse(await page.evaluate(() => window.render_game_to_text()));
    for (const faction of ['undead', 'demons', 'assassins', 'orcs', 'boss']) {
      await page.evaluate((faction) => window.enemyArtTest.stage(faction === 'boss' ? 'undead' : faction, faction === 'boss' ? 10 : 3), faction);
      await page.locator('#battle-screen').waitFor({ state: 'visible' });
      await page.evaluate(() => Promise.all([...document.querySelectorAll('.battle-unit img, [data-command] img')].map(image => image.decode())));
      const enemies = page.locator('[data-side="enemy"]');
      assert.equal(await enemies.count(), faction === 'boss' ? 1 : 4);
      assert.equal(await enemies.locator('.battle-enemy-glyph').count(), 0);
      const rendered = await enemies.evaluateAll(cards => cards.map(card => ({type:card.dataset.enemyType,faction:card.dataset.faction,source:card.querySelector('img').getAttribute('src'),alt:card.querySelector('img').alt,hp:card.querySelector('.battle-unit__hp').textContent})));
      for (const card of rendered) {
        assert.equal(card.source, ENEMY_PORTRAITS[card.type].image);
        assert.equal(card.faction, faction);
        assert.equal(card.alt, '');
        assert.match(card.hp, /\d+ \/ \d+ HP/);
      }
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      const buttons = await page.locator('[data-command]').evaluateAll(buttons => buttons.map(button => button.getBoundingClientRect().toJSON()));
      assert.ok(buttons.every(button => button.top >= 0 && button.bottom <= height));
      const before = await state();
      await page.evaluate(() => window.advanceTime(1000));
      assert.deepEqual((await state()).enemies, before.enemies);
      await page.screenshot({ path: `output/enemy-art-check/${faction}-${name}.png` });
      await page.locator('[data-command="mark"]').click();
      const target = page.locator('[data-side="enemy"]').last();
      const originalSource = await target.locator('img').getAttribute('src');
      await target.locator('img').click();
      assert.ok((await target.getAttribute('class')).includes('is-marked'));
      assert.equal(await target.locator('img').getAttribute('src'), originalSource);
      await page.evaluate(() => window.enemyArtTest.refill());
      await page.locator('[data-command="freeze"]').click();
      assert.equal(await page.locator('[data-side="enemy"].is-frozen img').count(), faction === 'boss' ? 1 : 4);
    }
    await page.evaluate(() => window.enemyArtTest.stage('undead'));
    await page.evaluate(() => window.enemyArtTest.act('necromancer'));
    const skeletons = page.locator('[data-enemy-type="skeleton"]');
    assert.ok(await skeletons.count() > 1);
    assert.equal(await skeletons.locator('img').count(), await skeletons.count());
    await page.evaluate(() => window.enemyArtTest.stage('assassins'));
    await page.evaluate(() => window.enemyArtTest.act('assassin'));
    assert.equal(await page.locator('[data-rank="enemy-front"] [data-enemy-type="assassin"] img').count(), 1);
    await page.evaluate(() => window.enemyArtTest.returnFromStrike());
    assert.equal(await page.locator('[data-rank="enemy-back"] [data-enemy-type="assassin"] img').count(), 1);
    await page.evaluate(() => window.enemyArtTest.stage('undead'));
    const skeleton = page.locator('[data-enemy-type="skeleton"]');
    await skeleton.locator('img').evaluate(image => image.dispatchEvent(new Event('error')));
    assert.equal(await skeleton.locator('.battle-enemy-glyph').textContent(), 'S');
    await page.locator('[data-command="mark"]').click();
    await skeleton.locator('.battle-enemy-glyph').click();
    assert.ok((await skeleton.getAttribute('class')).includes('is-marked'));
    await context.close();
    console.log(`${name}: all four regular rosters, boss gold, health, pause, targeting, freeze, summons, blinking and fallback passed`);
  }
  const page = await browser.newPage();
  await page.goto(`${baseURL}/dungeon.html`);
  const quality = await page.evaluate(async (portraits) => {
    const report = [];
    for (const portrait of Object.values(portraits)) {
      const image = new Image(); image.src = portrait.image; await image.decode();
      const canvas = document.createElement('canvas'); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
      const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0);
      const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let transparent = 0; for (let index = 3; index < pixels.length; index += 4) if (pixels[index] < 8) transparent++;
      report.push({path: portrait.image, width: image.naturalWidth, height: image.naturalHeight, transparent: transparent / (canvas.width * canvas.height)});
    }
    return report;
  }, ENEMY_PORTRAITS);
  assert.ok(quality.every(image => image.width === 256 && image.height === 256 && image.transparent > .05 && image.transparent < .8));
  assert.deepEqual(errors, []);
} finally { await browser.close(); }
