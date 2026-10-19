import test from "node:test";
import assert from "node:assert/strict";

import { offerLevelChances, rollOfferLevel } from "../src/hero-offers.js";

test("offer level chances follow Tavern level and halving", () => {
  assert.deepEqual(offerLevelChances(1), []);
  assert.deepEqual(offerLevelChances(2), [{ level: 2, chance: 10 }]);
  assert.deepEqual(offerLevelChances(3), [
    { level: 2, chance: 20 },
    { level: 3, chance: 10 },
  ]);
  assert.deepEqual(offerLevelChances(4), [
    { level: 2, chance: 30 },
    { level: 3, chance: 15 },
  ]);
  assert.deepEqual(offerLevelChances(5), [
    { level: 2, chance: 40 },
    { level: 3, chance: 20 },
    { level: 4, chance: 10 },
    { level: 5, chance: 5 },
  ]);
});

test("base Tavern rolls use sequential rolls and stop at level 5 before class bonuses", () => {
  assert.equal(rollOfferLevel(1, () => 0), 1);
  assert.equal(rollOfferLevel(4, () => 0), 3);
  assert.equal(rollOfferLevel(5, () => 0), 5);
  assert.equal(rollOfferLevel(5, () => 0.999), 1);

  const rolls = [0.3, 0.3];
  assert.equal(rollOfferLevel(5, () => rolls.shift()), 2);
});
