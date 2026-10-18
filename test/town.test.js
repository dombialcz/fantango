import test from "node:test";
import assert from "node:assert/strict";

import { buildingEffects, buildingUpgradeCost, createTownBuildings } from "../src/town.js";

test("town buildings begin at level one and use shared upgrade costs", () => {
  const buildings = createTownBuildings();
  assert.equal(Object.keys(buildings).length, 7);
  assert.ok(Object.values(buildings).every((building) => building.level === 1));
  assert.deepEqual([1, 2, 3, 4, 5].map(buildingUpgradeCost), [3, 6, 9, 12, null]);
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
  assert.ok(Math.abs(knight.damageReduction - 0.15) < Number.EPSILON);
  assert.equal(knight.healthMultiplier, 1.3);
  assert.equal(knight.speedMultiplier, 1.1);

  const bard = buildingEffects("bard", { level: 3, pathA: 0, pathB: 2 });
  assert.ok(Math.abs(bard.bardBuff - 0.3) < Number.EPSILON);
  assert.equal(bard.bardTargets, 3);
});
