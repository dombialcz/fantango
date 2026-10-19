import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const base=process.argv[2]??'http://127.0.0.1:4188';
await mkdir('output/contextual-help',{recursive:true});
const browser=await chromium.launch();
try {
  const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
  await context.addInitScript(()=>{requestAnimationFrame=()=>0;Math.random=()=>.99;});
  await context.route('**/src/dungeon.js',async route=>{
    const response=await route.fetch();
    await route.fulfill({response,body:`${await response.text()}
      window.helpTest={get state(){return state;},render,dealDamage,
        stage(){resetCampaign();state.view='tavern';state.day=3;state.town.prefix={};state.town.settlement={};
          state.selectionHistory=[{day:1,counts:{knight:2,thief:1,cleric:1}},{day:2,counts:{knight:1,ranger:1,barbarian:1,thief:1}}];
          state.bench=['knight','knight','thief','knight'].map((type,index)=>({id:100+index,type,name:['Aldric','Branna','Nyx','Cedric'][index],level:1,active:index<3}));
          state.rolledToday=true;state.offers=[{id:900,type:'knight',name:'Ysabel',level:1,active:false},{id:901,type:'mage',name:'Vael',level:5,selectionLevelBonus:1,active:false}];
          state.selectedOfferId=900;state.events.plan.forEach(event=>event.at=9999);render();
        }
      };`});
  });
  const page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  await page.goto(`${base}/dungeon.html`);await page.waitForFunction(()=>window.helpTest);
  await page.evaluate(()=>window.helpTest.stage());
  const snapshot=()=>page.evaluate(()=>JSON.parse(render_game_to_text()));
  const favour=page.locator('.favour-details'), summary=favour.locator('summary');
  assert.equal(await favour.getAttribute('open'),null);
  assert.equal(await page.locator('.context-class-chips > span').count(),2);
  assert.match(await page.locator('.context-class-chips').textContent(),/Bard.*Mage/);
  await summary.focus();await page.keyboard.press('Enter');
  assert.equal(await favour.evaluate(node=>node.open),true);assert.equal((await snapshot()).view,'tavern');
  assert.equal(await favour.locator('tbody tr').count(),7);assert.equal(await favour.locator('tr.is-favoured').count(),2);
  assert.equal(await favour.locator('tbody tr').first().locator('td').textContent(),'1.5');
  assert.match(await favour.locator('caption').textContent(),/Days 1 & 2/);
  await page.evaluate(()=>{helpTest.state.gold+=1;helpTest.render();});
  assert.equal(await summary.evaluate(node=>document.activeElement===node),true);
  assert.equal(await favour.evaluate(node=>node.open),true);
  await page.keyboard.press('Space');assert.equal(await favour.evaluate(node=>node.open),false);

  const risk=page.locator('[data-contract="900"] .contract-crowding-hint');
  assert.match(await risk.textContent(),/3\+ Knights.*−20%/);
  assert.equal(await page.locator('[data-hire="900"]').getAttribute('aria-describedby'),await risk.getAttribute('id'));
  assert.match(await page.locator('.company-balance').textContent(),/pair at full strength/);
  assert.match(await page.locator('.context-caution').textContent(),/All of them—not just this recruit/);
  assert.match(await page.locator('.context-stat-change').textContent(),/Health 100 80.*Damage 80 64/);
  await page.locator('[data-offer="901"]').click();
  assert.match(await page.locator('.context-benefit').textContent(),/Tavern roll L4.*Level 5/);
  await page.screenshot({path:'output/contextual-help/boosted-contract.png',fullPage:true});

  // The warning appears beside recruitment immediately, not in a screen-covering popup.
  await page.locator('[data-hire="900"]').click();
  assert.equal(await page.locator('.roster-context-notice').isVisible(),true);
  assert.match(await page.locator('.roster-context-notice p').textContent(),/All 3.*−20%/);
  assert.equal(await page.locator('dialog[open]').count(),0);
  assert.equal(await page.locator('.roster-departure-warning').isVisible(),true);
  await page.locator('[data-hero="103"]').click();await page.locator('[data-roster-action="toggle"]').click();
  assert.match(await page.locator('.roster-context-notice p').textContent(),/All 4/);
  assert.match(await page.locator('.context-action-hint').textContent(),/Reserve 2 Knights/);
  await page.locator('[data-roster-action="toggle"]').click();
  await page.locator('[data-context-review]').click();
  assert.equal(await page.locator('.roster-context-notice').isVisible(),false);
  assert.equal(await page.locator('.company-balance-help > summary').evaluate(node=>document.activeElement===node),true);
  await page.keyboard.press('Enter');assert.equal((await snapshot()).view,'tavern');
  assert.equal(await page.locator('.company-balance-help').evaluate(node=>node.open),true);
  await page.locator('[data-hero="900"]').click();await page.locator('[data-roster-action="toggle"]').click();
  assert.equal(await page.locator('.roster-departure-warning').isVisible(),false);
  assert.equal(await page.locator('.company-hero.is-crowded').count(),0);
  await page.locator('[data-hero="102"]').click();
  const dodge=page.locator('.hero-dodge-help');
  assert.match(await dodge.locator('summary').textContent(),/Dodge\s+10%/);
  await dodge.locator('summary').click();
  assert.match(await dodge.locator('p').textContent(),/10% dodge.*5 percentage points.*90%/);
  assert.equal((await snapshot()).view,'tavern');

  for(const [label,width,height] of [['desktop',1440,1000],['phone',390,844],['small-phone',320,740],['landscape',844,390]]){
    await page.setViewportSize({width,height});await page.evaluate(()=>window.helpTest.stage());
    await page.locator('.favour-details').evaluate(node=>node.open=false);
    await page.locator('.company-balance-help').evaluate(node=>node.open=false);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await page.locator('.reel-variety').scrollIntoViewIfNeeded();
    await page.screenshot({path:`output/contextual-help/roster-${label}.png`,fullPage:true});
    await summary.click();
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await page.screenshot({path:`output/contextual-help/explanation-${label}.png`,fullPage:true});
    await summary.click();
    await page.locator('[data-hire="900"]').click();await page.locator('[data-roster-action="start"]').click();
    await page.locator('[data-battle-action="pause"]').click();
    const battle=page.locator('.battle-party-context');
    assert.equal(await battle.isVisible(),true);assert.match(await battle.locator('summary').textContent(),/Crowded ranks.*−20%/);
    await page.screenshot({path:`output/contextual-help/battle-collapsed-${label}.png`});
    const speed=(await snapshot()).battleSpeed;
    await battle.locator('summary').focus();await page.keyboard.press('Space');
    assert.equal(await battle.evaluate(node=>node.open),true);assert.equal((await snapshot()).battleSpeed,speed);
    assert.match(await battle.locator('div').textContent(),/even after deaths.*Base 10%/);
    await page.evaluate(()=>{const {state,dealDamage,render}=helpTest;dealDamage(state.party.find(hero=>hero.type==='knight'),100000,state.enemies[0],{area:true});render();});
    assert.equal(await battle.evaluate(node=>node.open),true);
    assert.match(await battle.locator('summary').textContent(),/Crowded ranks/);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    if(width<=760) assert.ok(await page.evaluate(()=>{
      const enemies=document.querySelector('.battle-side--enemies').getBoundingClientRect(), report=document.querySelector('.battle-report').getBoundingClientRect(), heroes=document.querySelector('.battle-side--heroes').getBoundingClientRect();
      return enemies.bottom<=report.top+1&&report.bottom<=heroes.top+1;
    }), 'Expanded help must reflow the fight, not overlap either formation or battle report');
    assert.ok(await page.locator('[data-command]').evaluateAll(buttons=>buttons.every(button=>button.getBoundingClientRect().bottom<=innerHeight)));
    await page.locator('#battle-screen img').evaluateAll(images=>Promise.all(images.map(image=>image.decode())));
    await page.screenshot({path:`output/contextual-help/battle-${label}.png`});
    await battle.locator('summary').click(); // Reset disclosure for the next expedition.
  }
  assert.deepEqual(errors,[]);
  console.log('Contextual help: tap/keyboard disclosures, exact two-day averages/ties, level provenance, pre-hire risk, threshold notice/action, reserve remedy, live dodge, persistent battle context, no gameplay shortcut conflicts and four viewports passed.');
} finally {await browser.close();}
