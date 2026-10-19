import test from "node:test";
import assert from "node:assert/strict";

import { BOSS_FLOOR, enemyHealthMultiplier, floorGoldReward, isBossFloor } from "../src/dungeon-progression.js";

test("floor rewards grow with the current campaign day", () => {
  assert.deepEqual(
    Array.from({ length: 10 }, (_, index) => floorGoldReward(index + 1)),
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  );
});

test("floor ten is the single victory boss floor", () => {
  assert.equal(BOSS_FLOOR, 10);
  assert.equal(isBossFloor(9), false);
  assert.equal(isBossFloor(10), true);
  assert.equal(isBossFloor(11), false);
});

test("enemy health gains a linear ten percent per floor, including bosses and deeper floors", () => {
  assert.deepEqual([1, 2, 5, 10, 11, 20].map(enemyHealthMultiplier), [1.1, 1.2, 1.5, 2, 2.1, 3]);
});
