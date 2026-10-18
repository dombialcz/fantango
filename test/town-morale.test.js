import test from 'node:test';
import assert from 'node:assert/strict';
import { expeditionOutcome, townMorale } from '../src/town-morale.js';
const run = { clearedFloor: 3, recordBefore: 2, previousClearedFloor: 2, departed: 4, returned: 2, retreatType: 'automatic' };
test('daily hope follows campaign records while setbacks compare the previous expedition', () => {
  assert.equal(expeditionOutcome(run), 'progress');
  assert.equal(expeditionOutcome({ ...run, recordBefore: 3 }), 'no-progress');
  assert.equal(expeditionOutcome({ ...run, clearedFloor: 1 }), 'costly-setback');
  assert.equal(expeditionOutcome({ ...run, clearedFloor: 1, previousClearedFloor: 1 }), 'no-progress');
  assert.equal(expeditionOutcome({ ...run, clearedFloor: 1, returned: 3 }), 'no-progress');
  assert.equal(expeditionOutcome({ ...run, previousClearedFloor: null, clearedFloor: 0 }), 'no-progress');
});
test('clean retreat requires a new cleared depth, manual retreat and three or more survivors', () => {
  assert.equal(expeditionOutcome({ ...run, returned: 4, retreatType: 'manual' }), 'clean-retreat');
  assert.equal(expeditionOutcome({ ...run, returned: 4 }), 'progress');
  assert.equal(expeditionOutcome({ ...run, departed: 2, returned: 2, retreatType: 'manual' }), 'progress');
  assert.equal(expeditionOutcome({ ...run, recordBefore: 3, returned: 4, retreatType: 'manual' }), 'no-progress');
  assert.equal(expeditionOutcome({ ...run, clearedFloor: 1, departed: 2, returned: 0 }), 'no-progress');
});
test('days two to ten have unique daily hopeful and bleak text', () => {
  const all = [];
  for (const outcome of ['progress', 'no-progress']) for (let day = 2; day <= 10; day++) all.push(townMorale(day, { outcome }, false).text);
  assert.equal(new Set(all).size, 18);
  assert.equal(townMorale(1, null, false).text, 'A little hope, on the edge of the dark.');
});
test('exceptional outcomes override daily tracks and victory overrides subsequent setbacks', () => {
  for (const outcome of ['clean-retreat', 'costly-setback']) assert.equal(townMorale(9, { outcome }, false).tone, outcome);
  assert.equal(townMorale(10, { outcome: 'costly-setback' }, true).tone, 'victory');
});
