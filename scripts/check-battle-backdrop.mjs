import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
import {BATTLE_BACKDROPS} from '../src/battle-backdrop.js';
const base=process.argv[2]??'http://127.0.0.1:4188';
await mkdir('output/battle-backdrop',{recursive:true});
const browser=await chromium.launch();
try{
  const context=await browser.newContext({viewport:{width:1440,height:1000}});
  await context.addInitScript(()=>{requestAnimationFrame=()=>0;Math.random=()=>.75;});
  await context.route('**/src/dungeon.js',async route=>{
    const response=await route.fetch();
    await route.fulfill({response,body:`${await response.text()}
      window.sceneryTest={get state(){return state;},render,startExpedition,finishDay,
        stage(flavor,floor=1){
          state.events.clears=0;state.events.next=0;state.events.pending=null;state.events.plan.forEach(event=>event.at=9999);
          state.conclusion=null;state.victoryAchieved=false;state.victoryDay=null;state.campaignId=crypto.randomUUID();state.flavorKey=flavor;state.bossType=null;state.backdrop=createBackdropDepth();state.floor=floor;
          state.party=buildParty(['knight','thief','ranger','mage'].map((type,index)=>({id:100+index,type,name:HERO_TYPES[type].label,level:5,active:true})));
          prepareFloor();state.expeditionStartCount=4;
          for(const unit of [...state.party,...state.enemies])unit.timer=Infinity;
          render();
        },
        floor(floor){state.floor=floor;prepareFloor();for(const unit of [...state.party,...state.enemies])unit.timer=Infinity;render();}
      };`});
  });
  const page=await context.newPage();const errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',e=>{if(e.type()==='error')errors.push(e.text());});
  await page.goto(`${base}/dungeon.html`);await page.waitForFunction(()=>window.sceneryTest);
  const snapshot=()=>page.evaluate(()=>JSON.parse(render_game_to_text()));
  const stage=async(flavor,floor=1)=>{
    await page.evaluate(([f,n])=>window.sceneryTest.stage(f,n),[flavor,floor]);
    await page.locator('.battle-backdrop img').evaluate(image=>image.decode());
    await page.waitForFunction(()=>document.querySelector('.battle-backdrop').classList.contains('is-loaded'),null,{polling:50});
    await page.locator('.battle-backdrop img').evaluate(image=>image.getAnimations().forEach(animation=>animation.finish()));
  };
  const geometry=()=>page.evaluate(()=>{
    const root=document.querySelector('.battle-backdrop').getBoundingClientRect();
    const image=document.querySelector('.battle-backdrop img').getBoundingClientRect();
    return {top:root.top,bottom:root.bottom,height:root.height,imageTop:image.top,imageBottom:image.bottom,imageHeight:image.height,width:image.width,rootWidth:root.width,transform:getComputedStyle(document.querySelector('.battle-backdrop img')).transform};
  });
  const assertPosition=async progress=>{
    const g=await geometry();assert.notEqual(g.transform,'none');
    assert.ok(Math.abs((g.imageTop-g.top)+(g.imageHeight-g.height)*progress)<1.5,JSON.stringify(g));
    assert.ok(g.imageTop<=g.top+1&&g.imageBottom>=g.bottom-1&&g.width>=g.rootWidth);
  };
  for(const [flavor,art] of Object.entries(BATTLE_BACKDROPS)){
    await stage(flavor);
    assert.equal(await page.locator('.battle-backdrop img').getAttribute('src'),art.image);
    assert.equal(await page.locator('.battle-backdrop').getAttribute('aria-hidden'),'true');
    await assertPosition(0);await page.screenshot({path:`output/battle-backdrop/${flavor}-entrance.png`});
    await page.evaluate(()=>advanceTime(9000));assert.equal((await snapshot()).battleBackdrop.displayedDepthPercent,5);await assertPosition(.05);
    await page.evaluate(()=>advanceTime(9000));assert.equal((await snapshot()).battleBackdrop.displayedDepthPercent,10);await assertPosition(.1);
    const stopped=await geometry();await page.evaluate(()=>advanceTime(1000));assert.deepEqual(await geometry(),stopped);
    await page.evaluate(()=>window.sceneryTest.floor(5));assert.equal((await snapshot()).battleBackdrop.displayedDepthPercent,10);
    await page.evaluate(()=>advanceTime(18000));await assertPosition(.5);
    await page.screenshot({path:`output/battle-backdrop/${flavor}-middle.png`});
    await page.evaluate(()=>window.sceneryTest.floor(10));await page.evaluate(()=>advanceTime(18000));await assertPosition(1);
    await page.screenshot({path:`output/battle-backdrop/${flavor}-boss.png`});
    await page.evaluate(()=>window.sceneryTest.floor(11));await page.evaluate(()=>advanceTime(1000));await assertPosition(1);
  }
  await stage('undead');await page.evaluate(()=>advanceTime(9000));
  await page.locator('[data-battle-action="pause"]').click();
  const paused=await geometry();await page.evaluate(()=>advanceTime(20000));assert.deepEqual(await geometry(),paused);
  await page.locator('[data-battle-action="pause"]').click();await page.evaluate(()=>advanceTime(9000));await assertPosition(.1);
  await stage('undead');await page.locator('[data-battle-action="speed"]').click();await page.evaluate(()=>advanceTime(9000));await assertPosition(.05);
  await page.evaluate(()=>window.sceneryTest.floor(2));await assertPosition(.05);
  await page.evaluate(()=>advanceTime(9000));await assertPosition(.125);

  // Short wins must finish at their floor's exact depth, not keep easing on results.
  for(const flavor of Object.keys(BATTLE_BACKDROPS)){
    await stage(flavor);
    for(let floor=1;floor<=10;floor++){
      if(floor>1) await page.locator('[data-battle-action="continue"]').click();
      await assertPosition(Math.min((floor-1)/10,1));
      await page.evaluate(()=>{
        const {state}=window.sceneryTest;
        for(const unit of [...state.party,...state.enemies])unit.timer=Infinity;
        advanceTime(500);state.enemies.forEach(enemy=>enemy.hp=0);advanceTime(1);
      });
      if(floor===10){assert.equal((await snapshot()).view,'campaign_victory');assert.equal(await page.evaluate(()=>window.sceneryTest.state.backdrop.progress),1);break;}
      assert.equal((await snapshot()).view,'floor_result');await assertPosition(Math.min(floor/10,1));
      const stopped=await geometry();await page.evaluate(()=>advanceTime(1000));assert.deepEqual(await geometry(),stopped);
      if(floor===1&&flavor==='undead') await page.screenshot({path:'output/battle-backdrop/snapped-short-win.png'});
    }
  }
  for(const outcome of ['flee','defeat','loss','stalemate']){
    await stage('undead',4);await page.evaluate(()=>advanceTime(1000));
    if(outcome==='flee') { await page.locator('[data-battle-action="flee"]').click(); await page.locator('[data-battle-action="flee-confirm"]').click(); }
    else await page.evaluate(outcome=>{
      const {state}=window.sceneryTest;
      if(outcome==='stalemate')state.battleTime=90000;
      else state.party.forEach((hero,index)=>{if(outcome==='loss'||index>=2)hero.hp=0;});
      advanceTime(1);
    },outcome);
    assert.equal((await snapshot()).view,'day_result');await assertPosition(.4);
  }

  // Each new daily expedition starts at town again, even with the same cached art.
  await page.evaluate(()=>{
    const {state,startExpedition,render}=window.sceneryTest;
    state.view='tavern';state.bench=[{id:500,type:'knight',name:'Knight',level:1,active:true}];startExpedition(true);state.battlePaused=true;render();
  });
  await assertPosition(0);assert.equal((await snapshot()).battleBackdrop.targetDepthPercent,10);

  for(const [name,width,height] of [['desktop',1440,1000],['phone',390,844],['small-phone',320,740],['landscape',844,390]]){
    await page.setViewportSize({width,height});await stage('demons',10);await page.evaluate(()=>advanceTime(18000));await assertPosition(1);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    assert.ok(await page.locator('[data-command]').evaluateAll((buttons,height)=>buttons.every(button=>button.getBoundingClientRect().bottom<=height),height));
    assert.equal(await page.locator('.battle-backdrop').evaluate(node=>getComputedStyle(node).pointerEvents),'none');
    await page.screenshot({path:`output/battle-backdrop/boss-${name}.png`});
  }
  await page.emulateMedia({reducedMotion:'reduce'});await stage('orcs',6);await assertPosition(.6);
  assert.equal((await snapshot()).battleBackdrop.reducedMotion,true);
  const motionless=await geometry();await page.evaluate(()=>advanceTime(5000));assert.deepEqual(await geometry(),motionless);
  await page.emulateMedia({reducedMotion:'no-preference'});await page.evaluate(()=>advanceTime(0));await assertPosition(.6);
  await page.screenshot({path:'output/battle-backdrop/reduced-motion.png'});
  // A failed decorative image leaves the fallback scene and all controls intact.
  await page.locator('.battle-backdrop img').evaluate(image=>image.dispatchEvent(new Event('error')));
  assert.equal((await snapshot()).battleBackdrop.loaded,false);
  assert.equal(await page.locator('[data-command]').count(),7);
  assert.deepEqual(errors,[]);
  console.log('Four campaign descents: exact post-fight snaps, quick-win linear steps, retreat/defeat/loss/stalemate, pause/speed, reset, deep floors, responsive bounds, reduced motion and fallback passed.');
  await context.close();
}finally{await browser.close();}
