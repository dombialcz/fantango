export const SIZE = 6;
export const HALF = SIZE / 2;
export const EMPTY = -1;

export function rowCells(row) {
  return Array.from({ length: SIZE }, (_, column) => row * SIZE + column);
}

export function columnCells(column) {
  return Array.from({ length: SIZE }, (_, row) => row * SIZE + column);
}

function allLines() {
  const lines = [];
  for (let i = 0; i < SIZE; i += 1) {
    lines.push({ type: "row", number: i, cells: rowCells(i) });
    lines.push({ type: "column", number: i, cells: columnCells(i) });
  }
  return lines;
}

const LINES = allLines();

export function propagate(startGrid, relations = []) {
  const grid = [...startGrid];
  const trace = [];
  let contradiction = null;
  let changed = true;

  const fail = (message, cells = []) => {
    contradiction = { message, cells: [...new Set(cells)] };
  };

  const assign = (cell, value, step) => {
    if (grid[cell] === value) return false;
    if (grid[cell] !== EMPTY) {
      fail("A cell is forced to be both symbols.", [cell, ...(step.source ?? [])]);
      return false;
    }
    grid[cell] = value;
    trace.push({ cell, value, ...step });
    return true;
  };

  while (changed && !contradiction) {
    changed = false;

    for (const relation of relations) {
      const a = grid[relation.a];
      const b = grid[relation.b];
      if (a !== EMPTY && b !== EMPTY) {
        const valid = relation.same ? a === b : a !== b;
        if (!valid) {
          fail(`The ${relation.same ? "=" : "×"} relationship is broken.`, [relation.a, relation.b]);
          break;
        }
      } else if (a !== EMPTY) {
        const value = relation.same ? a : 1 - a;
        changed = assign(relation.b, value, {
          technique: "relation",
          relation: relation.same ? "same" : "different",
          source: [relation.a, relation.b],
        }) || changed;
      } else if (b !== EMPTY) {
        const value = relation.same ? b : 1 - b;
        changed = assign(relation.a, value, {
          technique: "relation",
          relation: relation.same ? "same" : "different",
          source: [relation.a, relation.b],
        }) || changed;
      }
      if (contradiction) break;
    }

    for (const line of LINES) {
      if (contradiction) break;
      const values = line.cells.map((cell) => grid[cell]);
      const zeroCount = values.filter((value) => value === 0).length;
      const oneCount = values.filter((value) => value === 1).length;
      const blanks = line.cells.filter((cell) => grid[cell] === EMPTY);

      if (
        zeroCount > HALF ||
        oneCount > HALF ||
        zeroCount + blanks.length < HALF ||
        oneCount + blanks.length < HALF
      ) {
        fail(`The ${line.type} cannot contain three of each symbol.`, line.cells);
        break;
      }

      if (zeroCount === HALF) {
        for (const cell of blanks) {
          changed = assign(cell, 1, {
            technique: "balance",
            lineType: line.type,
            lineNumber: line.number,
            source: line.cells,
          }) || changed;
          if (contradiction) break;
        }
      } else if (oneCount === HALF) {
        for (const cell of blanks) {
          changed = assign(cell, 0, {
            technique: "balance",
            lineType: line.type,
            lineNumber: line.number,
            source: line.cells,
          }) || changed;
          if (contradiction) break;
        }
      }

      for (let start = 0; start <= SIZE - 3 && !contradiction; start += 1) {
        const cells = line.cells.slice(start, start + 3);
        const [a, b, c] = cells.map((cell) => grid[cell]);
        if (a !== EMPTY && a === b && b === c) {
          fail("Three identical symbols cannot be consecutive.", cells);
          break;
        }
        if (a !== EMPTY && a === b && c === EMPTY) {
          changed = assign(cells[2], 1 - a, {
            technique: "triple",
            source: cells,
          }) || changed;
        } else if (b !== EMPTY && b === c && a === EMPTY) {
          changed = assign(cells[0], 1 - b, {
            technique: "triple",
            source: cells,
          }) || changed;
        } else if (a !== EMPTY && a === c && b === EMPTY) {
          changed = assign(cells[1], 1 - a, {
            technique: "sandwich",
            source: cells,
          }) || changed;
        }
      }
    }
  }

  return {
    grid,
    trace,
    contradiction,
    complete: !contradiction && grid.every((value) => value !== EMPTY),
  };
}

export function logicalSolve(puzzle, options = {}) {
  const allowContradiction = options.allowContradiction ?? false;
  let result = propagate(puzzle.grid, puzzle.relations);
  const trace = [...result.trace];

  if (!allowContradiction || result.complete || result.contradiction) {
    return { ...result, trace };
  }

  while (!result.complete && !result.contradiction) {
    let forced = null;
    for (let cell = 0; cell < result.grid.length; cell += 1) {
      if (result.grid[cell] !== EMPTY) continue;
      const outcomes = [0, 1].map((value) => {
        const testGrid = [...result.grid];
        testGrid[cell] = value;
        return propagate(testGrid, puzzle.relations);
      });
      if (outcomes[0].contradiction && outcomes[1].contradiction) {
        return {
          grid: result.grid,
          trace,
          complete: false,
          contradiction: { message: "Both values cause a contradiction.", cells: [cell] },
        };
      }
      if (outcomes[0].contradiction !== outcomes[1].contradiction) {
        forced = {
          cell,
          value: outcomes[0].contradiction ? 1 : 0,
          rejected: outcomes[0].contradiction ? 0 : 1,
        };
        break;
      }
    }

    if (!forced) break;
    const nextGrid = [...result.grid];
    nextGrid[forced.cell] = forced.value;
    trace.push({
      cell: forced.cell,
      value: forced.value,
      technique: "contradiction",
      rejected: forced.rejected,
      source: [forced.cell],
    });
    result = propagate(nextGrid, puzzle.relations);
    trace.push(...result.trace);
  }

  return { ...result, trace };
}

export function countSolutions(puzzle, maximum = 2) {
  const solutions = [];

  const search = (grid) => {
    if (solutions.length >= maximum) return;
    const result = propagate(grid, puzzle.relations);
    if (result.contradiction) return;
    if (result.complete) {
      solutions.push(result.grid);
      return;
    }

    const cell = result.grid.indexOf(EMPTY);
    for (const value of [0, 1]) {
      const branch = [...result.grid];
      branch[cell] = value;
      search(branch);
      if (solutions.length >= maximum) return;
    }
  };

  search(puzzle.grid);
  return { count: solutions.length, solutions };
}

export function findViolations(grid, relations = []) {
  const violations = new Set();
  for (const relation of relations) {
    const a = grid[relation.a];
    const b = grid[relation.b];
    if (a === EMPTY || b === EMPTY) continue;
    if ((relation.same && a !== b) || (!relation.same && a === b)) {
      violations.add(relation.a);
      violations.add(relation.b);
    }
  }

  for (const line of LINES) {
    const zeroCells = line.cells.filter((cell) => grid[cell] === 0);
    const oneCells = line.cells.filter((cell) => grid[cell] === 1);
    if (zeroCells.length > HALF) zeroCells.forEach((cell) => violations.add(cell));
    if (oneCells.length > HALF) oneCells.forEach((cell) => violations.add(cell));

    for (let start = 0; start <= SIZE - 3; start += 1) {
      const cells = line.cells.slice(start, start + 3);
      const values = cells.map((cell) => grid[cell]);
      if (values[0] !== EMPTY && values[0] === values[1] && values[1] === values[2]) {
        cells.forEach((cell) => violations.add(cell));
      }
    }
  }

  return violations;
}

export function isCompleteAndValid(grid, relations = []) {
  if (grid.some((value) => value === EMPTY)) return false;
  return findViolations(grid, relations).size === 0;
}

