import test from "node:test";
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { ENEMY_PORTRAITS } from "../src/enemy-art.js";
import { FLAVOR_ROSTERS } from "../src/enemy-rosters.js";

test("every campaign enemy and the boss have one distinct lightweight portrait", async () => {
  const expected = [...Object.values(FLAVOR_ROSTERS).flatMap(Object.values), "vaultTyrant"];
  assert.deepEqual(Object.keys(ENEMY_PORTRAITS).sort(), expected.sort());
  assert.equal(new Set(Object.values(ENEMY_PORTRAITS).map((art) => art.image)).size, expected.length);
  for (const [faction, roster] of Object.entries(FLAVOR_ROSTERS)) {
    for (const type of Object.values(roster)) assert.equal(ENEMY_PORTRAITS[type].faction, faction);
  }
  assert.equal(ENEMY_PORTRAITS.vaultTyrant.faction, "boss");
  let total = 0;
  for (const portrait of Object.values(ENEMY_PORTRAITS)) {
    const path = new URL(`../${portrait.image}`, import.meta.url);
    const info = await stat(path);
    assert.ok(info.size > 1000 && info.size < 65000, portrait.image);
    total += info.size;
    const data = await readFile(path);
    assert.equal(data.toString("ascii", 0, 4), "RIFF");
    assert.equal(data.toString("ascii", 8, 12), "WEBP");
  }
  assert.ok(total < 650000);
});
