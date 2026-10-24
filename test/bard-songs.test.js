import test from 'node:test';
import assert from 'node:assert/strict';
import { SONG_ORDER, SONG_COOLDOWN_MS, songPower, songCooldownMs, nextSong, migrateBardSongs } from '../src/bard-songs.js';
import { buildingEffects } from '../src/town.js';

test('continuous songs cycle with lower bonuses and a two-Bard strength cap', () => {
 assert.deepEqual(SONG_ORDER.map(nextSong), ['defense','power','rally']);
 assert.equal(SONG_COOLDOWN_MS,6000);
 for(const song of SONG_ORDER) {
  const solo=songPower(song,1),duet=songPower(song,2);
  for(const key of ['speedBonus','reduction','damageBonus']) {
   assert.equal(songPower(song,0)[key],0);
   assert.equal(duet[key],solo[key]*1.5);
   assert.equal(songPower(song,8)[key],duet[key]);
  }
  assert.equal(solo.durationMs,undefined);
 }
 assert.equal(songPower('rally',1).speedBonus,.1);
 assert.equal(songPower('defense',1).reduction,.15);
 assert.equal(songPower('power',1).damageBonus,.2);
 assert.equal(songPower('defense',1,100).reduction,.9);
});
test('College shortens cooldown while song strength stays fixed and Chorus discounts switches', () => {
 const effects=buildingEffects('bard',{level:5,pathB:4});
 assert.equal(effects.bardSongStrength,1);
 assert.equal(effects.bardCommandDiscount,4);
 assert.deepEqual([1,2,3,4,5].map(songCooldownMs),[6000,5000,4000,3000,2000]);
 assert.equal(songCooldownMs(100),2000);
 assert.equal(songCooldownMs(0),6000);
 assert.equal(songPower('rally',1,effects.bardSongStrength).speedBonus,.1);
});
test('old blessings are removed once without healing, rerolling or changing hero identity', () => {
 const s={party:[{id:'one',power:120,bardBuffAmount:.2,bardBuffPercent:20,baseMaxHp:120,maxHp:132,hp:7},{id:'two',power:130,bardBuffPercent:30,maxHp:65,hp:65}],rallyMs:5000};
 migrateBardSongs(s);
 assert.equal(s.party[0].power,100);assert.equal(s.party[0].baseMaxHp,100);assert.equal(s.party[0].hp,7);
 assert.equal(s.party[1].power,100);assert.equal(s.party[1].maxHp,50);assert.equal(s.party[1].hp,50);
 assert.equal(s.bardNextSong,'defense');assert.equal(s.rallyMs,0);
 const after=structuredClone(s);migrateBardSongs(s);assert.deepEqual(s,after);
});
