import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import { BATTLE_BACKDROPS, DESCENT_DURATION_MS, createBackdropDepth, floorBackdropProgress, targetBackdropFloor, advanceBackdropDepth } from '../src/battle-backdrop.js';
import { FLAVOR_ROSTERS } from '../src/enemy-rosters.js';

test('each campaign has a distinct descent and each floor adds 10% until floor ten',()=>{
  assert.deepEqual(Object.keys(BATTLE_BACKDROPS).sort(),Object.keys(FLAVOR_ROSTERS).sort());
  assert.equal(new Set(Object.values(BATTLE_BACKDROPS).map(x=>x.image)).size,4);
  for(let floor=0;floor<=10;floor++) assert.equal(floorBackdropProgress(floor),floor/10);
  for(const value of [11,50,Infinity]) assert.equal(floorBackdropProgress(value),1);
  for(const value of [-10,NaN,undefined]) assert.equal(floorBackdropProgress(value),0);
});

test('descent eases slowly, stops exactly at depth and retargets without jumps',()=>{
  const scene=createBackdropDepth();targetBackdropFloor(scene,1);
  advanceBackdropDepth(scene,DESCENT_DURATION_MS/2);assert.equal(scene.progress,.05);
  const before=scene.progress;targetBackdropFloor(scene,2);assert.equal(scene.progress,before);
  advanceBackdropDepth(scene,DESCENT_DURATION_MS/2);assert.ok(Math.abs(scene.progress-.125)<1e-10);
  advanceBackdropDepth(scene,DESCENT_DURATION_MS);assert.equal(scene.progress,.2);
  const stopped={...scene};advanceBackdropDepth(scene,999999);assert.deepEqual(scene,stopped);
  targetBackdropFloor(scene,10);advanceBackdropDepth(scene,DESCENT_DURATION_MS);assert.equal(scene.progress,1);
  const bottom={...scene};targetBackdropFloor(scene,11);assert.deepEqual(scene,bottom);
  assert.equal(createBackdropDepth().progress,0);
});

test('descent artwork is delivered locally as lightweight WebP files',async()=>{
  let total=0;
  for(const art of Object.values(BATTLE_BACKDROPS)){
    const url=new URL(`../${art.image}`,import.meta.url);const info=await stat(url);total+=info.size;
    assert.ok(info.size>10000&&info.size<600000,art.image);
    const bytes=await readFile(url);assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.toString('ascii',8,12),'WEBP');
  }
  assert.ok(total<2000000);
});
