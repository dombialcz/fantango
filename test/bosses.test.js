import test from "node:test";
import assert from "node:assert/strict";
import { CAMPAIGN_BOSSES, BOSS_DEFINITIONS, BOSS_RULES, rollCampaignBoss } from "../src/bosses.js";
import { FLAVOR_ROSTERS } from "../src/enemy-rosters.js";

test("each campaign has exactly two distinct final bosses with a fair selection boundary", () => {
  assert.deepEqual(Object.keys(CAMPAIGN_BOSSES).sort(), Object.keys(FLAVOR_ROSTERS).sort());
  const all = Object.values(CAMPAIGN_BOSSES).flat();
  assert.equal(new Set(all).size, 8);
  for (const [flavor, bosses] of Object.entries(CAMPAIGN_BOSSES)) {
    assert.equal(bosses.length, 2);
    for (const value of [0, .499999]) assert.equal(rollCampaignBoss(flavor, () => value), bosses[0]);
    for (const value of [.5, .999999]) assert.equal(rollCampaignBoss(flavor, () => value), bosses[1]);
    for (const type of bosses) {
      const boss = BOSS_DEFINITIONS[type];
      assert.ok(boss.hp > 400 && boss.damage > 0 && boss.summary);
      for (const escort of boss.escorts ?? []) assert.ok(Object.values(FLAVOR_ROSTERS[flavor]).includes(escort));
    }
  }
  assert.throws(() => rollCampaignBoss("unknown"));
  assert.equal(BOSS_RULES.evasion, .2);
});
