import test from "node:test";
import assert from "node:assert/strict";
import { actTutorial, canEditTutorial, createTutorial, guardSlot, tutorialLimits, tutorialScene } from "../src/mastermind-tutorial-core.js";
const act = (s, type, rest = {}) => actTutorial(s, { type, ...rest });
const fill = (s, pieces) => pieces.forEach(piece => act(s, "pick", { piece }));
function firstCheck(s, thief = 0) {
  act(s, "slot", { slot: thief }); fill(s, ["thief", "coin", "coin"]); act(s, "check");
}
function learn(s) {
  act(s, "next"); act(s, "next"); act(s, "answer", { answer: "elsewhere" }); act(s, "next"); act(s, "next");
}
function solveTreasury(s) {
  act(s, "slot", { slot: s.windowSide }); fill(s, ["thief", "coin", "coin"]); act(s, "check");
}
function enterPractice(s) {
  firstCheck(s); learn(s); solveTreasury(s); act(s, "next"); act(s, "next");
  act(s, "slot", { slot: 1 }); fill(s, ["coin", "thief"]); act(s, "check"); act(s, "next"); act(s, "next");
}

test("worked example waits for Check, then every initial placement fails 1 correct / 2 elsewhere", () => {
  for (const thief of [0, 1, 2]) for (const side of [0, 2]) {
    const s = createTutorial(side, 1);
    act(s, "slot", { slot: thief }); fill(s, ["thief", "coin", "coin"]);
    assert.equal(s.phase, "setup"); assert.equal(s.solution, null); assert.deepEqual(s.guesses, []);
    const draft = [...s.draft]; act(s, "check");
    assert.equal(s.phase, "green"); assert.deepEqual(s.draft, [null, null, null]);
    assert.deepEqual(s.guesses[0], { pieces: draft, exact: 1, misplaced: 2, absent: 0 });
    assert.equal(s.windowSide, thief === 1 ? side : 2 - thief);
    const solution = [...s.solution];
    fill(s, ["thief"]); act(s, "slot", { slot: 0 }); act(s, "check");
    assert.deepEqual(s.draft, [null, null, null]);
    learn(s); assert.equal(s.phase, "deduce");
    act(s, "check"); assert.equal(s.notice, "fillRow"); assert.equal(s.guesses.length, 1);
    fill(s, draft); act(s, "check");
    assert.deepEqual(s.draft, [null, null, null]); assert.equal(s.guesses.length, 2);
    assert.deepEqual(s.solution, solution);
    solveTreasury(s);
    assert.equal(s.phase, "treasury-solved"); assert.deepEqual(s.guesses, []);
    assert.equal(s.facts.length, 1); assert.deepEqual(s.facts[0].pieces, solution);
  }
});

test("feedback question requires understanding before continuation; hints do not change answers", () => {
  const s = createTutorial(0, 2); firstCheck(s); act(s, "next"); act(s, "next");
  assert.equal(s.phase, "quiz"); act(s, "next"); assert.equal(s.phase, "quiz");
  act(s, "answer", { answer: "absent" }); assert.equal(s.quizPassed, false); assert.equal(s.notice, "quizRetry");
  act(s, "next"); assert.equal(s.phase, "quiz");
  act(s, "answer", { answer: "elsewhere" }); assert.equal(s.quizPassed, true);
  act(s, "next"); act(s, "next");
  const code = [...s.solution]; for (let i = 0; i < 3; i++) act(s, "hint");
  assert.equal(s.hint, 2); assert.deepEqual(s.solution, code); assert.equal(s.guesses.length, 1);
});

test("tap clears, placement follows selected place, drag swaps, and original count limits remain", () => {
  const s = createTutorial(); act(s, "slot", { slot: 2 }); fill(s, ["thief", "thief"]);
  assert.equal(s.notice, "oneThief"); assert.deepEqual(s.draft, [null, null, "thief"]);
  act(s, "slot", { slot: 2 }); assert.deepEqual(s.draft, [null, null, null]);
  fill(s, ["thief", "coin", "coin", "coin"]); assert.equal(s.notice, "enoughCoins");
  act(s, "move", { from: 2, to: 1 }); assert.deepEqual(s.draft, ["coin", "thief", "coin"]);
  const before = [...s.draft];
  for (const slot of [-1, 3, 1.2]) { act(s, "slot", { slot }); act(s, "move", { from: 1, to: slot }); }
  assert.deepEqual(s.draft, before); act(s, "clear"); assert.deepEqual(s.draft, [null, null, null]);
});

test("guard is fixed, failed checks clear only movable pieces, solving retains facts and discards tries", () => {
  for (const thief of [0, 2]) {
    const s = createTutorial(); firstCheck(s, thief); learn(s); solveTreasury(s); act(s, "next"); act(s, "next");
    assert.equal(s.phase, "guard"); assert.equal(tutorialScene(s), 2);
    const fixed = guardSlot(s), draft = [...s.draft], fact = structuredClone(s.facts[0]);
    act(s, "slot", { slot: 1 }); fill(s, ["thief", "coin"]);
    act(s, "slot", { slot: fixed }); assert.equal(s.notice, "fixedGuard");
    act(s, "move", { from: 1, to: fixed }); assert.equal(s.notice, "fixedGuard");
    assert.equal(s.draft[fixed], "guard"); act(s, "check");
    assert.deepEqual(s.draft, draft); assert.equal(s.guesses.length, 1); assert.deepEqual(s.facts[0], fact);
    act(s, "slot", { slot: 1 }); fill(s, ["coin", "thief"]); act(s, "check");
    assert.equal(s.phase, "guard-solved"); assert.deepEqual(s.guesses, []); assert.equal(s.facts.length, 2);
    assert.deepEqual(s.facts[0], fact);
  }
});

test("independent hero lesson uses fixed count clues and genuine feedback, including absent pieces", () => {
  for (const place of [0, 1, 2, 3]) {
    const s = createTutorial(0, place); enterPractice(s);
    assert.equal(s.phase, "practice"); assert.equal(s.draft.length, 4); assert.equal(s.windowSide, null);
    assert.equal(tutorialLimits(s), null); assert.equal(tutorialScene(s), 3);
    const solution = [...s.solution]; fill(s, ["knight", "knight", "knight", "bard"]); act(s, "check");
    assert.equal(s.guesses[0].absent, 1); assert.deepEqual(s.draft, [null, null, null, null]);
    act(s, "hint"); assert.deepEqual(s.solution, solution);
    fill(s, solution); act(s, "check");
    assert.equal(s.phase, "complete"); assert.equal(canEditTutorial(s), false);
    assert.deepEqual(s.guesses, []); assert.equal(s.facts.length, 3); assert.equal(s.facts[2].exact, 4);
    assert.equal("health" in s, false); assert.deepEqual(createTutorial(0, place).facts, []);
  }
});
