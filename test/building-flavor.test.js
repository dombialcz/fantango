import test from 'node:test';
import assert from 'node:assert/strict';
import { BUILDING_FLAVOR, createBuildingFlavor } from '../src/building-flavor.js';
import { BUILDING_DEFINITIONS } from '../src/town.js';

test('every district has flavor that cycles without repeats, including across shuffle boundaries', () => {
  for (const random of [() => 0, () => .5, () => .999]) {
    const flavor = createBuildingFlavor(random);
    for (const type of [...Object.keys(BUILDING_DEFINITIONS), 'cemetery']) {
      const pool = BUILDING_FLAVOR[type];
      assert.ok(pool.length >= 4);
      let previous;
      for (let cycle = 0; cycle < 3; cycle++) {
        const seen = new Set();
        for (let i = 0; i < pool.length; i++) {
          const passage = flavor.next(type);
          assert.ok(pool.includes(passage));
          assert.notEqual(passage, previous);
          assert.equal(flavor.current(type), passage);
          seen.add(passage);
          previous = passage;
        }
        assert.equal(seen.size, pool.length);
      }
    }
  }
});
