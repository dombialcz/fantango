import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {cemeteryHealthMultiplier,cemeteryMaxHp,recordFallenHero} from '../src/cemetery.js';

const context={day:3,floor:7,campaignKey:'undead',campaignName:'Undead Uprising'};
const hero=(id=1)=>({side:'hero',type:'knight',hp:0,label:'Aldric',hero:{id,name:'Aldric',level:4}});
test('memorial records exact identity, final level, location and killer once',()=>{
  const graves=[],unit=hero(),killer={type:'lich',label:'Lich'};
  assert.equal(recordFallenHero(graves,unit,killer,context),true);
  assert.deepEqual(graves[0],{heroId:1,name:'Aldric',class:'knight',level:4,...context,killer:'Lich',killerType:'lich'});
  unit.hero.level=5;unit.hero.name='Changed';assert.equal(graves[0].level,4);assert.equal(graves[0].name,'Aldric');
  assert.equal(recordFallenHero(graves,unit,killer,context),false);assert.equal(graves.length,1);
  assert.equal(recordFallenHero(graves,{...hero(2),hp:1},killer,context),false);
  assert.equal(recordFallenHero(graves,{...hero(2),side:'enemy'},killer,context),false);
  assert.equal(recordFallenHero(graves,{side:'hero',hp:0},killer,context),false);
  assert.equal(recordFallenHero(graves,hero(2),'Dungeon',context),true);
  assert.equal(graves[1].killer,'Dungeon');assert.equal(graves[1].killerType,null);
});
test('each recorded hero adds one percentage point, stacking additively on base maximum health',()=>{
  assert.equal(cemeteryHealthMultiplier([]),1);
  for(const count of [1,2,10,60,100]){
    const graves=Array.from({length:count},()=>({}));
    assert.equal(cemeteryHealthMultiplier(graves),1+count/100);
    assert.equal(cemeteryMaxHp(100,graves),100+count);
  }
  assert.equal(cemeteryMaxHp(100*1.2*1.3,Array(10)),172); // Bard and building bonuses stack.
});
test('memorial artwork is a lightweight WebP asset',()=>{
  const bytes=readFileSync(new URL('../assets/town/cemetery.webp',import.meta.url));
  assert.equal(bytes.toString('ascii',0,4),'RIFF');
  assert.equal(bytes.toString('ascii',8,12),'WEBP');
  assert.ok(bytes.length<150000);
});
