import test from "node:test";
import assert from "node:assert/strict";

import { generateDailyPuzzles } from "../src/generator.js";
import { countSolutions, isCompleteAndValid, logicalSolve } from "../src/logic.js";

test("daily puzzles are deterministic, distinct, unique, and logically solvable", () => {
  const first = generateDailyPuzzles("2026-10-16");
  const second = generateDailyPuzzles("2026-10-16");

  assert.deepEqual(first, second);
  assert.equal(new Set(first.map((puzzle) => puzzle.solution.join(""))).size, 3);

  for (const puzzle of first) {
    assert.equal(isCompleteAndValid(puzzle.solution, puzzle.relations), true);
    assert.equal(countSolutions({ grid: puzzle.initial, relations: puzzle.relations }, 2).count, 1);
    const logic = logicalSolve(
      { grid: puzzle.initial, relations: puzzle.relations },
      { allowContradiction: puzzle.profile.allowContradiction },
    );
    assert.equal(logic.complete, true);
    assert.equal(logic.contradiction, null);
    assert.deepEqual(logic.grid, puzzle.solution);
  }
});

test("730 dates produce more than two thousand verified daily puzzles", () => {
  const start = new Date(Date.UTC(2026, 0, 1));
  for (let offset = 0; offset < 730; offset += 1) {
    const current = new Date(start);
    current.setUTCDate(start.getUTCDate() + offset);
    const date = current.toISOString().slice(0, 10);
    const puzzles = generateDailyPuzzles(date);
    assert.equal(new Set(puzzles.map((puzzle) => puzzle.solution.join(""))).size, 3);
    for (const puzzle of puzzles) {
      assert.equal(puzzle.proof.solutionCount, 1, `${date} ${puzzle.difficulty} is ambiguous`);
      assert.equal(puzzle.proof.logicComplete, true, `${date} ${puzzle.difficulty} stalls`);
      assert.equal(
        isCompleteAndValid(puzzle.solution, puzzle.relations),
        true,
        `${date} ${puzzle.difficulty} has an invalid answer`,
      );
    }
  }
});
