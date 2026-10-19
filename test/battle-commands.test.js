import assert from "node:assert/strict";
import test from "node:test";

import {
  BATTLE_COMMANDS,
  COMMAND_GAIN_PER_DAMAGE,
  COMMAND_MAX,
  COMMAND_START,
  TIME_FREEZE_COOLDOWN_MS,
  commandPower,
} from "../src/battle-commands.js";

test("battle commands share a bounded meter and map to every hero class", () => {
  assert.equal(COMMAND_START, 50);
  assert.equal(BATTLE_COMMANDS.freeze.cost, 100);
  assert.equal(TIME_FREEZE_COOLDOWN_MS, 10000);
  assert.equal(COMMAND_MAX, 100);
  assert.equal(COMMAND_GAIN_PER_DAMAGE, 0.6);
  assert.deepEqual(
    Object.values(BATTLE_COMMANDS).map(({ classType }) => classType).sort(),
    ["barbarian", "bard", "cleric", "knight", "mage", "ranger", "thief"],
  );
});

test("timed commands scale with living matching heroes and cap at four", () => {
  assert.deepEqual(commandPower("freeze", 1), { durationMs: 2750 });
  assert.deepEqual(commandPower("freeze", 4), { durationMs: 5000 });
  assert.deepEqual(commandPower("freeze", 8), { durationMs: 5000 });
  assert.deepEqual(commandPower("aegis", 3), { durationMs: 6000 });
  assert.deepEqual(commandPower("rally", 2), { durationMs: 6000, speedBonus: 0.3 });
  assert.deepEqual(commandPower("mark", 4), { durationMs: 6000, speedBonus: 0.8 });
  assert.deepEqual(commandPower("hold", 3), { durationMs: 6000, armorBonus: 0.3, damageBonus: 0.3 });
});

test("pilfer and bloodlust scale without becoming repeatable farming primitives", () => {
  assert.deepEqual(commandPower("pilfer", 3), { gold: 3 });
  assert.deepEqual(commandPower("bloodlust", 1), { damageMultiplier: 1.25, healthCostRatio: 0.1 });
  assert.deepEqual(commandPower("bloodlust", 4), { damageMultiplier: 2.75, healthCostRatio: 0.1 });
  assert.deepEqual(commandPower("bloodlust", 8), { damageMultiplier: 2.75, healthCostRatio: 0.1 });
});

test("Divine Aegis lasts six seconds with any living Cleric", () => {
  assert.deepEqual(commandPower("aegis", 0), { durationMs: 0 });
  for (const count of [1, 2, 4, 8]) assert.deepEqual(commandPower("aegis", count), { durationMs: 6000 });
});
