import test from "node:test";
import assert from "node:assert/strict";

import {
  alchemistSupplies,
  buildingEffects,
  buildingUpgradeCost,
  createTownBuildings,
} from "../src/town.js";

test("town buildings begin at level one and use shared upgrade costs", () => {
  const buildings = createTownBuildings();
  assert.equal(Object.keys(buildings).length, 9);
  assert.ok(Object.values(buildings).every((building) => building.level === 1));
  assert.deepEqual([1, 2, 3, 4, 5].map(buildingUpgradeCost), [3, 6, 9, 12, null]);
});

test("alchemist levels define expedition potion supplies", () => {
  assert.deepEqual([1, 2, 3, 4, 5].map(alchemistSupplies), [
    { count: 1, healRatio: 0.2 },
    { count: 2, healRatio: 0.2 },
    { count: 3, healRatio: 0.2 },
    { count: 3, healRatio: 0.33 },
    { count: 3, healRatio: 0.5 },
  ]);
});

test("mage targets and ranger speed come from their buildings", () => {
  assert.equal(buildingEffects("mage", { level: 4, pathA: 0, pathB: 0 }).mageTargets, 4);
  assert.equal(buildingEffects("mage", { level: 2, pathA: 1, pathB: 0 }).healthMultiplier, 1.15);
  assert.equal(buildingEffects("mage", { level: 2, pathA: 0, pathB: 1 }).speedMultiplier, 1.1);
  assert.equal(buildingEffects("ranger", { level: 3, pathA: 0, pathB: 0 }).speedMultiplier, 1.2);
  assert.equal(buildingEffects("ranger", { level: 2, pathA: 1, pathB: 0 }).critChance, 0.05);
  assert.equal(buildingEffects("ranger", { level: 2, pathA: 0, pathB: 1 }).damageMultiplier, 1.12);
});

test("class specialization picks stack independently", () => {
  const knight = buildingEffects("knight", { level: 4, pathA: 2, pathB: 1 });
  assert.ok(Math.abs(knight.damageReduction - 0.35) < Number.EPSILON);
  assert.equal(knight.healthMultiplier, 1.3);
  assert.equal(knight.speedMultiplier, 1.1);

  const bard = buildingEffects("bard", { level: 3, pathA: 0, pathB: 2 });
  assert.equal(bard.bardSongStrength, 1.1);
  assert.equal(bard.bardCommandDiscount, 2);
});

test("rogues replace class crit bonuses with dodge, while Rangers keep crit", () => {
  const rogue = buildingEffects("thief", {level: 5, pathA: 4, pathB: 0});
  assert.ok(Math.abs(rogue.evasionChance - .3) < Number.EPSILON);
  assert.equal(rogue.critChance, 0);
  assert.equal(buildingEffects("thief").evasionChance, .1);
  assert.equal(buildingEffects("knight").damageReduction, .2);
  assert.equal(buildingEffects("ranger", {level:5,pathA:4}).critChance, .2);
});

test("all percentage-based building combat stats stop at 90%", () => {
  for (const type of ["knight", "thief", "ranger", "barbarian"]) {
    const result=buildingEffects(type,{level:100,pathA:100,pathB:100});
    for (const key of ["damageReduction","evasionChance","critChance"]) assert.ok(result[key]>=0&&result[key]<=.9);
  }
});
