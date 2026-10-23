import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const base = process.argv[2] ?? 'http://127.0.0.1:4192';
const output = 'output/low-party-retreat';
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
const errors = [];
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.addInitScript(() => { requestAnimationFrame = () => 0; Math.random = () => .75; });
  await context.route('**/src/dungeon.js', async route => {
    const source = await readFile('src/dungeon.js', 'utf8');
    await route.fulfill({ contentType: 'text/javascript', body: source + `
      window.retreatTest = { get state() { return state; }, render, persist, updateBattle, makeEnemy,
        dealDamage, fleeMidBattle, finishFloor, finishDay, advanceDay, startExpedition,
        stage(count = 4, gold = 13) {
          state = createCampaign(); state.flavorKey = 'undead';
          state.town.prefix = {}; state.town.settlement = {}; state.town.penalty = null;
          state.bench = ['barbarian','ranger','mage','cleric'].slice(0,count).map((type,index) => ({id:100+index,type,name:HERO_TYPES[type].label,level:3,active:true}));
          state.view = 'tavern'; startExpedition(true); state.gold = gold;
          state.commandAutoPauseEnabled = false; state.events.plan.forEach(event => event.at = 9999);
          state.enemies = [makeEnemy('skeleton'),makeEnemy('zombie')];
          for (const unit of [...state.party, ...state.enemies]) unit.timer = 1e7;
          render();
        },
        lose(count) {
          for (const unit of livingParty().slice(-count)) dealDamage(unit, 1e6, state.enemies[0]);
          updateBattle(1); render();
        }
      };` });
  });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  const snapshot = () => page.evaluate(() => JSON.parse(render_game_to_text()));
  const stage = (count = 4, gold = 13) => page.evaluate(([count,gold]) => window.retreatTest.stage(count,gold), [count,gold]);
  const lose = count => page.evaluate(count => window.retreatTest.lose(count), count);
  const dialog = page.locator('.battle-flee-dialog');
  const keepFighting = page.locator('[data-battle-action="flee-continue"]');
  const confirm = page.locator('[data-battle-action="flee-confirm"]');
  const reload = async () => { await page.reload(); await page.waitForFunction(() => window.retreatTest); };
  await page.goto(`${base}/dungeon.html`); await page.waitForFunction(() => window.retreatTest);

  // Prompt after a complete enemy action; no later attacker gets a turn first.
  await stage(); await lose(1);
  assert.equal((await snapshot()).fleeConfirmation, false);
  await page.evaluate(() => {
    const t = window.retreatTest;
    for (const enemy of t.state.enemies) { enemy.damage = 1e6; enemy.timer = 0; }
    t.updateBattle(1); t.render();
  });
  let s = await snapshot();
  assert.equal(s.view, 'battle'); assert.equal(s.party.filter(hero => hero.hp > 0).length, 2);
  assert.equal(s.fleeReason, 'low-party'); assert.equal(s.gold, 13); assert.equal(s.battlePaused, true);
  assert.equal(await page.evaluate(() => window.retreatTest.state.enemies[1].attacks), 0);

  for (const [name,width,height] of [['desktop',1440,1000],['phone',390,844],['small',320,740],['landscape',844,390]]) {
    await page.setViewportSize({ width, height }); await stage(); await lose(2);
    s = await snapshot();
    assert.equal(s.fleeConfirmation, true); assert.equal(s.lowPartyWarningShown, true);
    assert.match(await dialog.innerText(), /Only two heroes remain/);
    assert.match(await dialog.innerText(), /half your gold, rounded up/);
    assert.match(await confirm.innerText(), /7\s*gold/);
    assert.equal(await keepFighting.evaluate(element => element === document.activeElement), true);
    assert.equal(await page.locator('[data-battle-action="flee-cancel"]').isVisible(), false);
    const frozen = { time:s.battleTimeMs, party:s.party, enemies:s.enemies, gold:s.gold };
    await page.keyboard.press('p'); await page.keyboard.press('8'); await page.evaluate(() => advanceTime(5000));
    s = await snapshot();
    assert.deepEqual({time:s.battleTimeMs,party:s.party,enemies:s.enemies,gold:s.gold}, frozen);
    if (name === 'desktop') {
      await reload(); assert.equal((await snapshot()).fleeReason, 'low-party'); assert.equal(await dialog.isVisible(), true);
      const saved = await page.evaluate(() => localStorage.getItem('vaultbound:campaign:v1'));
      await writeFile(`${output}/client.html`, (await readFile('dungeon.html','utf8')).replace('<head>', `<head><base href="/"><script>localStorage.setItem('vaultbound:campaign:v1',${JSON.stringify(saved)});</script>`));
    }
    assert.equal(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth), true);
    assert.equal(await keepFighting.isVisible(), true); assert.equal(await confirm.isVisible(), true);
    await page.screenshot({ path:`${output}/${name}.png` });
    await keepFighting.click();
    s = await snapshot(); assert.equal(s.view, 'battle'); assert.equal(s.battlePaused, false); assert.equal(s.gold, 13);
    await page.evaluate(() => advanceTime(1000)); assert.equal((await snapshot()).fleeConfirmation, false);
    await lose(1); assert.equal((await snapshot()).fleeConfirmation, false);
    assert.equal((await snapshot()).view, 'battle');
  }

  // The decision survives reloads, further losses and later floors of this expedition.
  await stage(); await lose(2); await keepFighting.click(); await reload();
  assert.equal((await snapshot()).lowPartyWarningShown, true); assert.equal(await dialog.isVisible(), false);
  await page.locator('[data-battle-action="pause"]').click(); await page.evaluate(() => advanceTime(1));
  assert.equal((await snapshot()).fleeConfirmation, false);
  await page.evaluate(() => { const t = window.retreatTest; t.state.enemies.forEach(enemy => enemy.hp = 0); t.updateBattle(1); t.render(); });
  assert.equal((await snapshot()).view, 'floor_result');
  await page.locator('[data-battle-action="continue"]').click(); await page.evaluate(() => advanceTime(1));
  assert.equal((await snapshot()).fleeConfirmation, false);
  // A fresh daily departure resets the warning, including for small companies.
  await page.evaluate(() => {
    const t = window.retreatTest; t.finishDay('Returned'); t.advanceDay();
    t.state.view = 'tavern'; t.startExpedition(true);
    t.state.commandAutoPauseEnabled = false;
    for (const unit of [...t.state.party,...t.state.enemies]) unit.timer = 1e7;
    t.render();
  });
  assert.equal((await snapshot()).lowPartyWarningShown, false);
  await lose(1); assert.equal((await snapshot()).fleeReason, 'low-party');
  assert.match(await dialog.innerText(), /Only one hero remains/);

  // Escape/backdrop dismiss without charging or restarting combat; manual Flee still works.
  await stage(); await lose(2); await page.keyboard.press('Escape');
  assert.equal((await snapshot()).battlePaused, true); assert.equal((await snapshot()).gold, 13);
  assert.equal(await dialog.isVisible(), false);
  await page.locator('[data-battle-action="pause"]').click(); await page.evaluate(() => advanceTime(1));
  assert.equal((await snapshot()).fleeConfirmation, false);
  await page.locator('[data-battle-action="flee"]').click();
  assert.match(await dialog.innerText(), /Abandon this battle/);
  assert.equal(await keepFighting.isVisible(), false);
  await confirm.click(); assert.equal((await snapshot()).gold, 6);
  for (const gold of [0,1,12,13]) {
    await stage(4,gold); await lose(2); await confirm.click(); s = await snapshot();
    assert.equal(s.view, 'day_result'); assert.equal(s.gold, Math.floor(gold / 2));
    assert.equal(s.retreatLeveling.type, 'manual'); assert.equal(s.retreatLeveling.chance, 70);
    assert.equal(s.retreatLeveling.levelUpCount, 0); // Fixed .75 roll exceeds the manual 70% chance.
    await page.evaluate(() => window.retreatTest.fleeMidBattle()); assert.equal((await snapshot()).gold, Math.floor(gold / 2));
  }

  // A row-wide blow resolves atomically: warn at one survivor, lose normally at zero.
  for (const survivors of [1,0]) {
    await stage();
    await page.evaluate(survivors => {
      const t = window.retreatTest;
      t.state.party.forEach((hero,index) => { hero.row = survivors && index === 3 ? 'back' : 'front'; hero.hp = 1; });
      t.state.enemies = [t.makeEnemy('infernalDragon')]; t.state.enemies[0].damage = 1e6; t.state.enemies[0].timer = 0;
      t.updateBattle(1); t.render();
    }, survivors);
    s = await snapshot(); assert.equal(s.view, survivors ? 'battle' : 'day_result');
    assert.equal(s.fleeConfirmation, Boolean(survivors)); assert.equal(s.gold, 13);
  }
  // Winning with two survivors takes precedence over the warning.
  await stage();
  await page.evaluate(() => { const t = window.retreatTest; t.state.party.slice(2).forEach(hero => hero.hp = 0); t.state.enemies.forEach(enemy => enemy.hp = 0); t.updateBattle(1); t.render(); });
  assert.equal((await snapshot()).view, 'floor_result'); assert.equal((await snapshot()).fleeConfirmation, false);
  const safeGold = (await snapshot()).gold;
  await page.locator('[data-battle-action="flee-safe"]').click(); assert.equal((await snapshot()).gold, safeGold);
  // Small departures do not immediately open a warning; a solo death remains a defeat.
  await stage(2); await page.evaluate(() => advanceTime(1)); assert.equal((await snapshot()).fleeConfirmation, false);
  await lose(1); assert.equal((await snapshot()).fleeReason, 'low-party');
  await stage(1); await lose(1); assert.equal((await snapshot()).view, 'day_result');
  // Saves written before the warning was introduced acquire the default on load.
  await stage(); await page.evaluate(() => { const t = window.retreatTest; delete t.state.lowPartyWarningShown; delete t.state.fleeReason; t.persist(); });
  await reload(); assert.equal((await snapshot()).lowPartyWarningShown, false);
  await page.locator('[data-battle-action="pause"]').click(); await lose(2);
  assert.equal((await snapshot()).fleeReason, 'low-party');
  assert.deepEqual(errors, []);
  console.log('Low-party retreat: atomic enemy actions, paused choice, four layouts, resume/no repeat, reload/new-day reset, standard gold/level penalties, manual/safe escape, small parties, victory/defeat and old saves passed.');
} finally { await browser.close(); }
