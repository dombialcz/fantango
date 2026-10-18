import test from "node:test";
import assert from "node:assert/strict";

import { retreatLevelChance, rollRetreatLevelUps } from "../src/retreat-levels.js";

test("manual flee level chances fall by ten points per additional survivor", () => {
  assert.equal(retreatLevelChance(0, "manual"), 0);
  assert.equal(retreatLevelChance(1, "manual"), 80);
  assert.equal(retreatLevelChance(2, "manual"), 70);
  assert.equal(retreatLevelChance(4, "manual"), 50);
  assert.equal(retreatLevelChance(8, "manual"), 10);
  assert.equal(retreatLevelChance(9, "manual"), 0);
  assert.equal(retreatLevelChance(20, "manual"), 0);
});

test("automatic retreats guarantee eligible level-ups", () => {
  assert.equal(retreatLevelChance(2, "automatic"), 100);
  assert.deepEqual(rollRetreatLevelUps([1, 2], 100, () => 0.999), [1, 2]);
});

test("manual retreat level-up rolls are resolved independently", () => {
  const rolls = [0.1, 0.6, 0.49, 0.9];
  assert.deepEqual(rollRetreatLevelUps([1, 2, 3, 4], 50, () => rolls.shift()), [1, 3]);
});
