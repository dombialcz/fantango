import assert from "node:assert/strict";
import test from "node:test";

import { enemyTypeForRoll, FLAVOR_ROSTERS } from "../src/enemy-rosters.js";

test("each campaign has its own complete enemy roster", () => {
  assert.deepEqual(FLAVOR_ROSTERS.undead, {
    common: "skeleton",
    heavy: "zombie",
    ranged: "boneMage",
    special: "necromancer",
  });
  assert.deepEqual(FLAVOR_ROSTERS.demons, {
    common: "cultist",
    heavy: "demon",
    ranged: "warlock",
    special: "archdemon",
  });
  assert.deepEqual(FLAVOR_ROSTERS.assassins, {
    common: "cutthroat",
    heavy: "enforcer",
    ranged: "marksman",
    special: "assassin",
  });

  const allTypes = Object.values(FLAVOR_ROSTERS).flatMap((roster) => Object.values(roster));
  assert.equal(new Set(allTypes).size, allTypes.length);
  assert.deepEqual(FLAVOR_ROSTERS.orcs, { common: "goblin", heavy: "orc", ranged: "goblinArcher", special: "orcShaman" });
});

test("enemy rolls select the active campaign's common, heavy, and ranged units", () => {
  for (const [flavorKey, roster] of Object.entries(FLAVOR_ROSTERS)) {
    assert.equal(enemyTypeForRoll(flavorKey, 3, 0.2), roster.common);
    assert.equal(enemyTypeForRoll(flavorKey, 3, 0.6), roster.heavy);
    assert.equal(enemyTypeForRoll(flavorKey, 3, 0.9), roster.ranged);
    assert.equal(enemyTypeForRoll(flavorKey, 1, 0.9), roster.heavy);
  }
});

test("unknown campaign flavors are rejected", () => {
  assert.throws(() => enemyTypeForRoll("missing", 1, 0.2), /Unknown campaign flavor/);
});
