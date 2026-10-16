import { countSolutions, EMPTY, logicalSolve, SIZE } from "./logic.js";
import { createRng, shuffle } from "./random.js";

export const GENERATOR_VERSION = "v1";

export const DIFFICULTIES = [
  {
    id: "easy",
    name: "Street Job",
    label: "Easy",
    relationCount: 9,
    targetGivens: 11,
    allowContradiction: false,
    flavor: "Plenty of marks. Clean escape.",
  },
  {
    id: "medium",
    name: "Manor Vault",
    label: "Medium",
    relationCount: 7,
    targetGivens: 8,
    allowContradiction: false,
    flavor: "Fewer clues. Longer chains.",
  },
  {
    id: "hard",
    name: "Crown Treasury",
    label: "Hard",
    relationCount: 5,
    targetGivens: 6,
    allowContradiction: true,
    flavor: "Every move leaves a shadow.",
  },
];

const VALID_ROWS = (() => {
  const rows = [];
  for (let mask = 0; mask < 2 ** SIZE; mask += 1) {
    const row = Array.from({ length: SIZE }, (_, index) => (mask >> (SIZE - index - 1)) & 1);
    const ones = row.reduce((sum, value) => sum + value, 0);
    const hasTriple = row.some(
      (value, index) => index <= SIZE - 3 && value === row[index + 1] && value === row[index + 2],
    );
    if (ones === SIZE / 2 && !hasTriple) rows.push(row);
  }
  return rows;
})();

function generateSolution(rng) {
  const gridRows = [];

  const build = () => {
    if (gridRows.length === SIZE) return true;
    for (const row of shuffle(VALID_ROWS, rng)) {
      let valid = true;
      for (let column = 0; column < SIZE; column += 1) {
        const values = [...gridRows.map((existing) => existing[column]), row[column]];
        const ones = values.filter((value) => value === 1).length;
        const zeros = values.length - ones;
        if (ones > SIZE / 2 || zeros > SIZE / 2) {
          valid = false;
          break;
        }
        const length = values.length;
        if (
          length >= 3 &&
          values[length - 1] === values[length - 2] &&
          values[length - 2] === values[length - 3]
        ) {
          valid = false;
          break;
        }
      }
      if (!valid) continue;
      gridRows.push(row);
      if (build()) return true;
      gridRows.pop();
    }
    return false;
  };

  if (!build()) throw new Error("Unable to generate a complete board.");
  return gridRows.flat();
}

function relationPool(solution) {
  const relations = [];
  for (let row = 0; row < SIZE; row += 1) {
    for (let column = 0; column < SIZE; column += 1) {
      const cell = row * SIZE + column;
      if (column < SIZE - 1) {
        const neighbor = cell + 1;
        relations.push({ a: cell, b: neighbor, same: solution[cell] === solution[neighbor] });
      }
      if (row < SIZE - 1) {
        const neighbor = cell + SIZE;
        relations.push({ a: cell, b: neighbor, same: solution[cell] === solution[neighbor] });
      }
    }
  }
  return relations;
}

function pickRelations(solution, count, rng) {
  const selected = [];
  const usage = Array(SIZE * SIZE).fill(0);
  for (const relation of shuffle(relationPool(solution), rng)) {
    if (selected.length >= count) break;
    if (usage[relation.a] >= 2 || usage[relation.b] >= 2) continue;
    selected.push(relation);
    usage[relation.a] += 1;
    usage[relation.b] += 1;
  }
  return selected;
}

function candidateFor(dateKey, profile, attempt, variant) {
  const seed = `${dateKey}|${profile.id}|${GENERATOR_VERSION}|variant:${variant}|attempt:${attempt}`;
  const rng = createRng(seed);
  const solution = generateSolution(rng);
  const relations = pickRelations(solution, profile.relationCount, rng);
  let grid = [...solution];
  let givens = SIZE * SIZE;

  for (const cell of shuffle(Array.from({ length: SIZE * SIZE }, (_, index) => index), rng)) {
    if (givens <= profile.targetGivens) break;
    const testGrid = [...grid];
    testGrid[cell] = EMPTY;
    const testPuzzle = { grid: testGrid, relations };
    const uniqueness = countSolutions(testPuzzle, 2);
    if (uniqueness.count !== 1) continue;
    const logic = logicalSolve(testPuzzle, { allowContradiction: profile.allowContradiction });
    if (!logic.complete || logic.contradiction) continue;
    grid = testGrid;
    givens -= 1;
  }

  const puzzle = { grid, relations };
  const uniqueness = countSolutions(puzzle, 2);
  const logic = logicalSolve(puzzle, { allowContradiction: profile.allowContradiction });
  const contradictionSteps = logic.trace.filter((step) => step.technique === "contradiction").length;
  const score = logic.trace.length + contradictionSteps * 8 + Math.max(0, profile.relationCount - relations.length) * 3;

  return {
    id: `${dateKey}-${profile.id}-${GENERATOR_VERSION}`,
    dateKey,
    difficulty: profile.id,
    profile,
    initial: grid,
    solution,
    relations,
    proof: {
      solutionCount: uniqueness.count,
      logicComplete: logic.complete,
      steps: logic.trace.length,
      contradictionSteps,
      score,
      givenCount: givens,
      attempt,
    },
  };
}

export function generatePuzzle(dateKey, profile, variant = 0) {
  let best = null;
  for (let attempt = 0; attempt < 24; attempt += 1) {
    const candidate = candidateFor(dateKey, profile, attempt, variant);
    if (candidate.proof.solutionCount !== 1 || !candidate.proof.logicComplete) continue;
    if (
      !best ||
      Math.abs(candidate.proof.givenCount - profile.targetGivens) <
        Math.abs(best.proof.givenCount - profile.targetGivens)
    ) {
      best = candidate;
    }
    if (candidate.proof.givenCount === profile.targetGivens) return candidate;
  }
  if (!best) throw new Error(`Unable to generate a verified ${profile.id} puzzle.`);
  return best;
}

export function generateDailyPuzzles(dateKey) {
  const puzzles = [];
  const seen = new Set();
  for (const profile of DIFFICULTIES) {
    let puzzle = null;
    for (let variant = 0; variant < 16; variant += 1) {
      const candidate = generatePuzzle(dateKey, profile, variant);
      if (!seen.has(candidate.solution.join(""))) {
        puzzle = candidate;
        break;
      }
    }
    if (!puzzle) throw new Error("Unable to produce three distinct daily boards.");
    puzzles.push(puzzle);
    seen.add(puzzle.solution.join(""));
  }
  return puzzles;
}

export function localDateKey(now = new Date()) {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
