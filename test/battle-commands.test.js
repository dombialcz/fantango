import assert from "node:assert/strict";
import test from "node:test";

import {
  BATTLE_COMMANDS,
  COMMAND_GAIN_PER_DAMAGE,
  COMMAND_MAX,
  COMMAND_START,
  TIME_FREEZE_COOLDOWN_MS,
  BLOODLUST_COOLDOWN_MS,
  commandPower,
} from "../src/battle-commands.js";

test("battle commands share a bounded meter and map to every hero class", () => {
  assert.equal(COMMAND_START, 50);
  assert.equal(BATTLE_COMMANDS.freeze.cost, 100);
  assert.equal(TIME_FREEZE_COOLDOWN_MS, 10000);
  assert.equal(BLOODLUST_COOLDOWN_MS, 10000);
  assert.equal(COMMAND_MAX, 100);
  assert.equal(COMMAND_GAIN_PER_DAMAGE, 0.12);
  assert.deepEqual(
    Object.values(BATTLE_COMMANDS).map(({ classType }) => classType).sort(),
    ["barbarian", "bard", "cleric", "knight", "mage", "ranger", "thief"],
  );
});

test("timed commands scale with living matching heroes and cap at four", () => {
  assert.deepEqual(commandPower("freeze", 1), { durationMs: 2750 });
  assert.deepEqual(commandPower("freeze", 4), { durationMs: 5000 });
  assert.deepEqual(commandPower("freeze", 8), { durationMs: 5000 });
  assert.deepEqual(commandPower("aegis", 3), { durationMs: 8000 });
  assert.deepEqual(commandPower("rally", 2), { song: "rally", speedBonus: 0.15000000000000002, reduction: 0, damageBonus: 0 });
  assert.deepEqual(commandPower("mark", 4), { durationMs: 10000, speedBonus: 0.8 });
  assert.deepEqual(commandPower("hold", 3), { durationMs: 6000, armorBonus: 0.3, damageBonus: 0.3 });
});

test("pilfer scales with living Thieves", () => {
  assert.deepEqual(commandPower("pilfer", 3), { gold: 3 });
});

test("Bloodlust deals 1.25× combined frontline damage with any living Barbarian and has no health cost", () => {
  assert.deepEqual(commandPower("bloodlust", 0), { damageMultiplier: 0 });
  for (const count of [1, 2, 4, 8]) assert.deepEqual(commandPower("bloodlust", count), { damageMultiplier: 1.25 });
});

test("Divine Aegis lasts eight seconds with any living Cleric", () => {
  assert.deepEqual(commandPower("aegis", 0), { durationMs: 0 });
  for (const count of [1, 2, 4, 8]) assert.deepEqual(commandPower("aegis", count), { durationMs: 8000 });
});
