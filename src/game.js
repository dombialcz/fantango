import { DIFFICULTIES, GENERATOR_VERSION, generateDailyPuzzles, localDateKey } from "./generator.js";
import { EMPTY, findViolations, isCompleteAndValid, logicalSolve, SIZE } from "./logic.js";

const canvas = document.querySelector("#game");
const context = canvas.getContext("2d");

const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const BOARD = { x: 130, y: 232, size: 432, cell: 72 };
const PANEL = { x: 92, y: 194, width: 896, height: 530 };
const TABS = DIFFICULTIES.map((_, index) => ({ x: 92 + index * 299, y: 105, width: 280, height: 66 }));
const BUTTONS = {
  undo: { x: 617, y: 608, width: 106, height: 48 },
  hint: { x: 734, y: 608, width: 106, height: 48 },
  reset: { x: 851, y: 608, width: 106, height: 48 },
  next: { x: 413, y: 526, width: 254, height: 60 },
  closeResult: { x: 716, y: 265, width: 30, height: 30 },
};

const COLORS = {
  ink: "#07101c",
  panel: "rgba(7, 16, 28, 0.93)",
  panelSoft: "rgba(13, 27, 42, 0.86)",
  line: "rgba(185, 158, 104, 0.43)",
  gold: "#d7ae5d",
  goldBright: "#f7dda1",
  moon: "#9dc7e5",
  text: "#e9e0ce",
  muted: "#9eacb8",
  danger: "#da6d68",
};

const images = {
  background: loadImage("assets/vault-bg.jpg"),
  coin: loadImage("assets/coin-token.png"),
  thief: loadImage("assets/thief-token.png"),
};

function loadImage(source) {
  const image = new Image();
  image.addEventListener("load", render);
  image.src = source;
  return image;
}

const dateKey = localDateKey();
const puzzles = generateDailyPuzzles(dateKey);
const levels = puzzles.map((puzzle) => restoreLevel(puzzle));
const state = {
  mode: levels[0].won ? "reviewing" : "playing",
  levelIndex: 0,
  levels,
  selectedCell: firstEditable(puzzles[0]),
  hintCells: [],
  message: "Choose a mark. Leave no pattern unplanned.",
  elapsedAccumulator: 0,
  shimmer: 0,
};

function firstEditable(puzzle) {
  const found = puzzle.initial.findIndex((value) => value === EMPTY);
  return found === -1 ? 0 : found;
}

function storageKey(puzzle) {
  return `fantango:${GENERATOR_VERSION}:${puzzle.dateKey}:${puzzle.difficulty}`;
}

function restoreLevel(puzzle) {
  const fallback = {
    entries: [...puzzle.initial],
    history: [],
    elapsedMs: 0,
    hints: 0,
    mistakes: 0,
    won: false,
  };
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey(puzzle)));
    if (!saved || !Array.isArray(saved.entries) || saved.entries.length !== SIZE * SIZE) return fallback;
    const givensMatch = puzzle.initial.every(
      (value, cell) => value === EMPTY || saved.entries[cell] === value,
    );
    if (!givensMatch) return fallback;
    return {
      ...fallback,
      entries: saved.entries.map((value) => ([-1, 0, 1].includes(value) ? value : EMPTY)),
      elapsedMs: Number.isFinite(saved.elapsedMs) ? saved.elapsedMs : 0,
      hints: Number.isInteger(saved.hints) ? saved.hints : 0,
      mistakes: Number.isInteger(saved.mistakes) ? saved.mistakes : 0,
      won: Boolean(saved.won),
    };
  } catch {
    return fallback;
  }
}

function saveLevel() {
  const puzzle = currentPuzzle();
  const level = currentLevel();
  localStorage.setItem(
    storageKey(puzzle),
    JSON.stringify({
      entries: level.entries,
      elapsedMs: level.elapsedMs,
      hints: level.hints,
      mistakes: level.mistakes,
      won: level.won,
    }),
  );
}

function currentPuzzle() {
  return puzzles[state.levelIndex];
}

function currentLevel() {
  return state.levels[state.levelIndex];
}

function switchLevel(index) {
  if (index < 0 || index >= puzzles.length) return;
  saveLevel();
  state.levelIndex = index;
  state.mode = currentLevel().won ? "reviewing" : "playing";
  state.selectedCell = firstEditable(currentPuzzle());
  state.hintCells = [];
  state.message = currentLevel().won
    ? "This vault has already been breached."
    : currentPuzzle().profile.flavor;
  render();
}

function cycleCell(cell) {
  const puzzle = currentPuzzle();
  const level = currentLevel();
  if (level.won || puzzle.initial[cell] !== EMPTY) return;
  const previous = level.entries[cell];
  const next = previous === EMPTY ? 0 : previous === 0 ? 1 : EMPTY;
  level.entries[cell] = next;
  level.history.push({ cell, previous, next });
  if (next !== EMPTY && next !== puzzle.solution[cell]) level.mistakes += 1;
  state.selectedCell = cell;
  state.hintCells = [];
  state.message = next === EMPTY ? "The mark fades back into shadow." : "The plan changes.";
  checkCompletion();
  saveLevel();
  render();
}

function undo() {
  const level = currentLevel();
  if (level.won) return;
  const action = level.history.pop();
  if (!action) {
    state.message = "No footprints remain to retrace.";
    render();
    return;
  }
  level.entries[action.cell] = action.previous;
  state.selectedCell = action.cell;
  state.hintCells = [];
  state.message = "One step quietly retraced.";
  saveLevel();
  render();
}

function reset() {
  const level = currentLevel();
  level.entries = [...currentPuzzle().initial];
  level.history = [];
  level.elapsedMs = 0;
  level.hints = 0;
  level.mistakes = 0;
  level.won = false;
  state.mode = "playing";
  state.selectedCell = firstEditable(currentPuzzle());
  state.hintCells = [];
  state.message = "The vault resets. Begin the heist anew.";
  saveLevel();
  render();
}

function useHint() {
  const puzzle = currentPuzzle();
  const level = currentLevel();
  if (level.won) return;

  level.hints += 1;
  const wrongCell = level.entries.findIndex(
    (value, cell) =>
      puzzle.initial[cell] === EMPTY && value !== EMPTY && value !== puzzle.solution[cell],
  );
  if (wrongCell !== -1) {
    state.selectedCell = wrongCell;
    state.hintCells = [wrongCell];
    state.message = "A false mark betrays the plan here.";
    saveLevel();
    render();
    return;
  }

  const result = logicalSolve(
    { grid: level.entries, relations: puzzle.relations },
    { allowContradiction: puzzle.profile.allowContradiction },
  );
  let step = result.trace.find((candidate) => level.entries[candidate.cell] === EMPTY);
  if (!step) {
    const cell = level.entries.findIndex((value) => value === EMPTY);
    if (cell === -1) return;
    step = { cell, value: puzzle.solution[cell], technique: "solution", source: [cell] };
  }

  const previous = level.entries[step.cell];
  level.entries[step.cell] = step.value;
  level.history.push({ cell: step.cell, previous, next: step.value, hint: true });
  state.selectedCell = step.cell;
  state.hintCells = step.source ?? [step.cell];
  state.message = describeStep(step);
  checkCompletion();
  saveLevel();
  render();
}

function symbolName(value) {
  return value === 0 ? "coin" : "thief";
}

function describeStep(step) {
  const name = symbolName(step.value);
  if (step.technique === "relation") {
    return `The ${step.relation === "same" ? "=" : "×"} seal forces a ${name} here.`;
  }
  if (step.technique === "triple") return `Two matching marks force a ${name} before the run reaches three.`;
  if (step.technique === "sandwich") return `Matching outer marks force a ${name} between them.`;
  if (step.technique === "balance") return `This ${step.lineType} needs equal spoils: place a ${name}.`;
  if (step.technique === "contradiction") return `The other mark breaks the plan, so this must be a ${name}.`;
  return `The hidden plan reveals a ${name}.`;
}

function checkCompletion() {
  const puzzle = currentPuzzle();
  const level = currentLevel();
  if (!isCompleteAndValid(level.entries, puzzle.relations)) return;
  if (!level.entries.every((value, cell) => value === puzzle.solution[cell])) return;
  level.won = true;
  state.mode = "won";
  state.message = "The vault yields without a sound.";
}

function moveSelection(dx, dy) {
  const row = Math.floor(state.selectedCell / SIZE);
  const column = state.selectedCell % SIZE;
  const nextRow = (row + dy + SIZE) % SIZE;
  const nextColumn = (column + dx + SIZE) % SIZE;
  state.selectedCell = nextRow * SIZE + nextColumn;
  state.hintCells = [];
  render();
}

function update(milliseconds) {
  state.shimmer = (state.shimmer + milliseconds * 0.00035) % (Math.PI * 2);
  const level = currentLevel();
  if (!level.won) {
    level.elapsedMs += milliseconds;
    state.elapsedAccumulator += milliseconds;
    if (state.elapsedAccumulator >= 5000) {
      state.elapsedAccumulator = 0;
      saveLevel();
    }
  }
}

function roundedRect(x, y, width, height, radius) {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
}

function drawBackground() {
  if (images.background.complete && images.background.naturalWidth) {
    const imageRatio = images.background.naturalWidth / images.background.naturalHeight;
    const canvasRatio = WIDTH / HEIGHT;
    let sourceWidth = images.background.naturalWidth;
    let sourceHeight = images.background.naturalHeight;
    let sourceX = 0;
    let sourceY = 0;
    if (imageRatio > canvasRatio) {
      sourceWidth = sourceHeight * canvasRatio;
      sourceX = (images.background.naturalWidth - sourceWidth) / 2;
    } else {
      sourceHeight = sourceWidth / canvasRatio;
      sourceY = (images.background.naturalHeight - sourceHeight) / 2;
    }
    context.drawImage(
      images.background,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      WIDTH,
      HEIGHT,
    );
  } else {
    context.fillStyle = COLORS.ink;
    context.fillRect(0, 0, WIDTH, HEIGHT);
  }
  const vignette = context.createRadialGradient(WIDTH / 2, 330, 100, WIDTH / 2, 360, 690);
  vignette.addColorStop(0, "rgba(2, 8, 16, 0.2)");
  vignette.addColorStop(1, "rgba(1, 4, 9, 0.86)");
  context.fillStyle = vignette;
  context.fillRect(0, 0, WIDTH, HEIGHT);
}

function drawHeader() {
  context.textAlign = "left";
  context.fillStyle = COLORS.goldBright;
  context.font = "small-caps 700 42px Georgia";
  context.fillText("FANTANGO", 92, 61);
  context.fillStyle = COLORS.muted;
  context.font = "italic 16px Georgia";
  context.fillText("A daily logic heist", 94, 83);

  context.textAlign = "right";
  context.fillStyle = COLORS.text;
  context.font = "600 17px Georgia";
  context.fillText(formatDate(dateKey), 988, 53);
  context.fillStyle = COLORS.muted;
  context.font = "14px Georgia";
  context.fillText("Local midnight changes the job", 988, 76);
}

function drawTabs() {
  DIFFICULTIES.forEach((profile, index) => {
    const tab = TABS[index];
    const active = index === state.levelIndex;
    roundedRect(tab.x, tab.y, tab.width, tab.height, 10);
    context.fillStyle = active ? "rgba(24, 42, 58, 0.96)" : "rgba(5, 13, 23, 0.82)";
    context.fill();
    context.lineWidth = active ? 2 : 1;
    context.strokeStyle = active ? COLORS.gold : "rgba(145, 160, 170, 0.25)";
    context.stroke();

    context.textAlign = "left";
    context.fillStyle = active ? COLORS.goldBright : COLORS.text;
    context.font = "700 18px Georgia";
    context.fillText(`${index + 1}. ${profile.name}`, tab.x + 18, tab.y + 27);
    context.fillStyle = COLORS.muted;
    context.font = "13px Georgia";
    const completed = state.levels[index].won ? " • COMPLETE" : "";
    context.fillText(`${profile.label.toUpperCase()}${completed}`, tab.x + 18, tab.y + 50);
  });
}

function drawPanel() {
  roundedRect(PANEL.x, PANEL.y, PANEL.width, PANEL.height, 17);
  context.fillStyle = COLORS.panel;
  context.fill();
  context.lineWidth = 1;
  context.strokeStyle = COLORS.line;
  context.stroke();
  const glow = 0.08 + (Math.sin(state.shimmer) + 1) * 0.025;
  context.fillStyle = `rgba(216, 176, 94, ${glow})`;
  roundedRect(PANEL.x + 5, PANEL.y + 5, PANEL.width - 10, 2, 1);
  context.fill();
}

function drawGivenStone(x, y, row, column) {
  const alternate = (row + column) % 2 === 0;
  context.fillStyle = alternate ? "#6b5133" : "#62482e";
  context.fillRect(x, y, BOARD.cell, BOARD.cell);

  const stoneLight = context.createLinearGradient(x, y, x, y + BOARD.cell);
  stoneLight.addColorStop(0, "rgba(224, 190, 125, 0.18)");
  stoneLight.addColorStop(0.48, "rgba(132, 96, 57, 0.04)");
  stoneLight.addColorStop(1, "rgba(36, 24, 15, 0.24)");
  context.fillStyle = stoneLight;
  context.fillRect(x + 2, y + 2, BOARD.cell - 4, BOARD.cell - 4);

  context.lineWidth = 2;
  context.strokeStyle = "rgba(226, 193, 132, 0.24)";
  context.beginPath();
  context.moveTo(x + 3, y + BOARD.cell - 3);
  context.lineTo(x + 3, y + 3);
  context.lineTo(x + BOARD.cell - 3, y + 3);
  context.stroke();

  context.strokeStyle = "rgba(38, 25, 15, 0.5)";
  context.beginPath();
  context.moveTo(x + 4, y + BOARD.cell - 3);
  context.lineTo(x + BOARD.cell - 3, y + BOARD.cell - 3);
  context.lineTo(x + BOARD.cell - 3, y + 4);
  context.stroke();

  const cell = row * SIZE + column;
  context.strokeStyle = "rgba(47, 30, 18, 0.32)";
  context.lineWidth = 1;
  context.beginPath();
  if (cell % 2 === 0) {
    context.moveTo(x + 8, y + BOARD.cell - 18);
    context.lineTo(x + 16, y + BOARD.cell - 24);
    context.lineTo(x + 21, y + BOARD.cell - 21);
  } else {
    context.moveTo(x + BOARD.cell - 10, y + 16);
    context.lineTo(x + BOARD.cell - 18, y + 21);
    context.lineTo(x + BOARD.cell - 15, y + 28);
  }
  context.stroke();
}

function drawBoard() {
  const puzzle = currentPuzzle();
  const level = currentLevel();
  const violations = findViolations(level.entries, puzzle.relations);

  context.fillStyle = "rgba(2, 8, 15, 0.96)";
  context.fillRect(BOARD.x - 4, BOARD.y - 4, BOARD.size + 8, BOARD.size + 8);

  for (let row = 0; row < SIZE; row += 1) {
    for (let column = 0; column < SIZE; column += 1) {
      const cell = row * SIZE + column;
      const x = BOARD.x + column * BOARD.cell;
      const y = BOARD.y + row * BOARD.cell;
      const given = puzzle.initial[cell] !== EMPTY;
      const selected = state.selectedCell === cell;
      const hinted = state.hintCells.includes(cell);
      const invalid = violations.has(cell);

      if (given) {
        drawGivenStone(x, y, row, column);
      } else {
        context.fillStyle =
          (row + column) % 2 === 0 ? "rgba(16, 31, 46, 0.96)" : "rgba(12, 25, 39, 0.96)";
        context.fillRect(x, y, BOARD.cell, BOARD.cell);
      }

      if (invalid) {
        context.fillStyle = "rgba(170, 43, 46, 0.3)";
        context.fillRect(x + 3, y + 3, BOARD.cell - 6, BOARD.cell - 6);
      }
      if (hinted) {
        context.fillStyle = "rgba(220, 179, 88, 0.17)";
        context.fillRect(x + 4, y + 4, BOARD.cell - 8, BOARD.cell - 8);
      }

      drawToken(level.entries[cell], x + 9, y + 9, BOARD.cell - 18);

      if (selected) {
        context.lineWidth = 3;
        context.strokeStyle = COLORS.goldBright;
        context.strokeRect(x + 3, y + 3, BOARD.cell - 6, BOARD.cell - 6);
      }
    }
  }

  context.lineWidth = 1;
  context.strokeStyle = COLORS.line;
  for (let line = 0; line <= SIZE; line += 1) {
    const offset = line * BOARD.cell;
    context.beginPath();
    context.moveTo(BOARD.x + offset, BOARD.y);
    context.lineTo(BOARD.x + offset, BOARD.y + BOARD.size);
    context.stroke();
    context.beginPath();
    context.moveTo(BOARD.x, BOARD.y + offset);
    context.lineTo(BOARD.x + BOARD.size, BOARD.y + offset);
    context.stroke();
  }

  drawRelations(puzzle.relations);
}

function drawToken(value, x, y, size) {
  if (value === EMPTY) return;
  const image = value === 0 ? images.coin : images.thief;
  if (image.complete && image.naturalWidth) {
    context.drawImage(image, x, y, size, size);
    return;
  }
  context.fillStyle = value === 0 ? COLORS.gold : COLORS.moon;
  context.beginPath();
  context.arc(x + size / 2, y + size / 2, size * 0.36, 0, Math.PI * 2);
  context.fill();
}

function drawRelations(relations) {
  for (const relation of relations) {
    const aRow = Math.floor(relation.a / SIZE);
    const aColumn = relation.a % SIZE;
    const bRow = Math.floor(relation.b / SIZE);
    const horizontal = aRow === bRow;
    const x = horizontal
      ? BOARD.x + (aColumn + 1) * BOARD.cell
      : BOARD.x + (aColumn + 0.5) * BOARD.cell;
    const y = horizontal
      ? BOARD.y + (aRow + 0.5) * BOARD.cell
      : BOARD.y + (aRow + 1) * BOARD.cell;
    context.fillStyle = "#e8dcc5";
    context.beginPath();
    context.arc(x, y, 12, 0, Math.PI * 2);
    context.fill();
    context.lineWidth = 2;
    context.strokeStyle = "#65522f";
    context.stroke();
    context.fillStyle = "#182433";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.font = "bold 17px Arial";
    context.fillText(relation.same ? "=" : "×", x, y + 0.5);
    context.textBaseline = "alphabetic";
  }
}

function drawSidebar() {
  const puzzle = currentPuzzle();
  const level = currentLevel();
  const x = 616;

  context.textAlign = "left";
  context.fillStyle = COLORS.goldBright;
  context.font = "700 25px Georgia";
  context.fillText(puzzle.profile.name, x, 239);
  context.fillStyle = COLORS.muted;
  context.font = "italic 14px Georgia";
  context.fillText(puzzle.profile.flavor, x, 263);

  context.fillStyle = COLORS.text;
  context.font = "700 15px Georgia";
  context.fillText("THE CODE", x, 302);
  const rules = [
    ["3 + 3", "Three coins and three thieves per line"],
    ["NO III", "Never three matching marks together"],
    ["= / ×", "Neighbors must match / differ"],
  ];
  rules.forEach(([mark, copy], index) => {
    const y = 335 + index * 49;
    context.fillStyle = COLORS.gold;
    context.font = "700 14px Georgia";
    context.fillText(mark, x, y);
    context.fillStyle = COLORS.text;
    context.font = "14px Georgia";
    context.fillText(copy, x + 62, y);
  });

  context.strokeStyle = "rgba(185, 158, 104, 0.25)";
  context.beginPath();
  context.moveTo(x, 478);
  context.lineTo(956, 478);
  context.stroke();

  context.fillStyle = COLORS.muted;
  context.font = "13px Georgia";
  context.fillText("TIME", x, 508);
  context.fillText("HINTS", x + 112, 508);
  context.fillText("MISSTEPS", x + 218, 508);
  context.fillStyle = COLORS.text;
  context.font = "700 20px Georgia";
  context.fillText(formatTime(level.elapsedMs), x, 535);
  context.fillText(String(level.hints), x + 112, 535);
  context.fillText(String(level.mistakes), x + 218, 535);

  roundedRect(x, 556, 340, 39, 8);
  context.fillStyle = "rgba(4, 10, 18, 0.72)";
  context.fill();
  context.fillStyle = COLORS.text;
  context.font = "italic 14px Georgia";
  fitText(state.message, x + 13, 581, 315);

  drawButton(BUTTONS.undo, "Undo", "Z");
  drawButton(BUTTONS.hint, "Hint", "H", true);
  drawButton(BUTTONS.reset, "Reset", "R");

  context.fillStyle = COLORS.muted;
  context.font = "12px Georgia";
  context.fillText("Arrows move  •  Space marks  •  F fullscreen", x, 684);
}

function drawButton(rect, label, key, accent = false) {
  roundedRect(rect.x, rect.y, rect.width, rect.height, 8);
  context.fillStyle = accent ? "rgba(119, 85, 34, 0.68)" : "rgba(22, 37, 51, 0.94)";
  context.fill();
  context.lineWidth = 1;
  context.strokeStyle = accent ? COLORS.gold : "rgba(156, 173, 184, 0.35)";
  context.stroke();
  context.textAlign = "center";
  context.fillStyle = COLORS.text;
  context.font = "700 15px Georgia";
  context.fillText(label, rect.x + rect.width / 2, rect.y + 21);
  context.fillStyle = COLORS.muted;
  context.font = "11px Georgia";
  context.fillText(key, rect.x + rect.width / 2, rect.y + 38);
}

function drawWinOverlay() {
  const level = currentLevel();
  context.fillStyle = "rgba(1, 5, 10, 0.78)";
  context.fillRect(0, 0, WIDTH, HEIGHT);
  roundedRect(320, 249, 440, 372, 18);
  context.fillStyle = "rgba(9, 20, 32, 0.98)";
  context.fill();
  context.lineWidth = 2;
  context.strokeStyle = COLORS.gold;
  context.stroke();

  roundedRect(
    BUTTONS.closeResult.x,
    BUTTONS.closeResult.y,
    BUTTONS.closeResult.width,
    BUTTONS.closeResult.height,
    7,
  );
  context.fillStyle = "rgba(24, 39, 52, 0.96)";
  context.fill();
  context.lineWidth = 1;
  context.strokeStyle = "rgba(215, 174, 93, 0.72)";
  context.stroke();
  context.fillStyle = COLORS.goldBright;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = "22px Georgia";
  context.fillText(
    "×",
    BUTTONS.closeResult.x + BUTTONS.closeResult.width / 2,
    BUTTONS.closeResult.y + BUTTONS.closeResult.height / 2 - 1,
  );
  context.textBaseline = "alphabetic";

  drawToken(0, 486, 280, 108);
  context.textAlign = "center";
  context.fillStyle = COLORS.goldBright;
  context.font = "small-caps 700 36px Georgia";
  context.fillText("Vault Breached", WIDTH / 2, 430);
  context.fillStyle = COLORS.text;
  context.font = "16px Georgia";
  context.fillText(`${formatTime(level.elapsedMs)}  •  ${level.hints} hints  •  ${level.mistakes} missteps`, WIDTH / 2, 468);
  context.fillStyle = COLORS.muted;
  context.font = "italic 14px Georgia";
  context.fillText("Tomorrow brings a new mark. Two more wait tonight.", WIDTH / 2, 496);

  roundedRect(BUTTONS.next.x, BUTTONS.next.y, BUTTONS.next.width, BUTTONS.next.height, 10);
  context.fillStyle = "rgba(119, 85, 34, 0.82)";
  context.fill();
  context.strokeStyle = COLORS.gold;
  context.stroke();
  context.fillStyle = COLORS.goldBright;
  context.font = "700 18px Georgia";
  context.fillText("Choose the next heist", WIDTH / 2, 563);
}

function dismissWinOverlay() {
  if (!currentLevel().won) return;
  state.mode = "reviewing";
  state.hintCells = [];
  state.message = "Completed heist — reviewing the solved vault.";
  render();
}

function render() {
  context.clearRect(0, 0, WIDTH, HEIGHT);
  drawBackground();
  drawHeader();
  drawTabs();
  drawPanel();
  drawBoard();
  drawSidebar();
  if (currentLevel().won && state.mode === "won") drawWinOverlay();
}

function fitText(text, x, y, maxWidth) {
  let output = text;
  while (context.measureText(output).width > maxWidth && output.length > 8) {
    output = `${output.slice(0, -2)}…`;
  }
  context.fillText(output, x, y);
}

function formatTime(milliseconds) {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function formatDate(key) {
  const [year, month, day] = key.split("-").map(Number);
  return new Intl.DateTimeFormat(undefined, { month: "long", day: "numeric", year: "numeric" }).format(
    new Date(year, month - 1, day),
  );
}

function pointInRect(x, y, rect) {
  return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
}

canvas.addEventListener("pointerdown", (event) => {
  canvas.focus();
  const bounds = canvas.getBoundingClientRect();
  const x = ((event.clientX - bounds.left) / bounds.width) * WIDTH;
  const y = ((event.clientY - bounds.top) / bounds.height) * HEIGHT;

  const tabIndex = TABS.findIndex((tab) => pointInRect(x, y, tab));
  if (tabIndex !== -1) {
    switchLevel(tabIndex);
    return;
  }

  if (currentLevel().won && state.mode === "won") {
    if (pointInRect(x, y, BUTTONS.closeResult)) {
      dismissWinOverlay();
    } else if (pointInRect(x, y, BUTTONS.next)) {
      const next = state.levels.findIndex((level, index) => !level.won && index !== state.levelIndex);
      state.mode = "playing";
      switchLevel(next === -1 ? (state.levelIndex + 1) % puzzles.length : next);
    }
    return;
  }

  if (
    x >= BOARD.x &&
    x < BOARD.x + BOARD.size &&
    y >= BOARD.y &&
    y < BOARD.y + BOARD.size
  ) {
    const column = Math.floor((x - BOARD.x) / BOARD.cell);
    const row = Math.floor((y - BOARD.y) / BOARD.cell);
    cycleCell(row * SIZE + column);
    return;
  }

  if (pointInRect(x, y, BUTTONS.undo)) undo();
  else if (pointInRect(x, y, BUTTONS.hint)) useHint();
  else if (pointInRect(x, y, BUTTONS.reset)) reset();
});

window.addEventListener("keydown", (event) => {
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(event.key)) {
    event.preventDefault();
  }
  if (event.key === "Escape" && state.mode === "won") dismissWinOverlay();
  else if (event.key === "1" || event.key === "2" || event.key === "3") switchLevel(Number(event.key) - 1);
  else if (event.key === "ArrowUp") moveSelection(0, -1);
  else if (event.key === "ArrowDown") moveSelection(0, 1);
  else if (event.key === "ArrowLeft") moveSelection(-1, 0);
  else if (event.key === "ArrowRight") moveSelection(1, 0);
  else if (event.key === " ") cycleCell(state.selectedCell);
  else if (event.key.toLowerCase() === "h") useHint();
  else if (event.key.toLowerCase() === "z") undo();
  else if (event.key.toLowerCase() === "r") reset();
  else if (event.key.toLowerCase() === "f") {
    if (document.fullscreenElement) document.exitFullscreen();
    else canvas.requestFullscreen();
  }
});

let previousFrame = performance.now();
function frame(now) {
  const delta = Math.min(100, now - previousFrame);
  previousFrame = now;
  update(delta);
  render();
  requestAnimationFrame(frame);
}

window.advanceTime = (milliseconds) => {
  update(milliseconds);
  render();
};

window.render_game_to_text = () => {
  const puzzle = currentPuzzle();
  const level = currentLevel();
  const symbol = (value) => (value === EMPTY ? "." : value === 0 ? "C" : "T");
  return JSON.stringify({
    coordinateSystem: "6x6 grid; row and column are zero-based from the top-left",
    mode: state.mode,
    completed: level.won,
    resultOverlayOpen: level.won && state.mode === "won",
    date: dateKey,
    level: puzzle.difficulty,
    levelName: puzzle.profile.name,
    board: Array.from({ length: SIZE }, (_, row) =>
      level.entries.slice(row * SIZE, (row + 1) * SIZE).map(symbol).join(""),
    ),
    givens: puzzle.initial
      .map((value, cell) => (value === EMPTY ? null : { row: Math.floor(cell / SIZE), column: cell % SIZE, symbol: symbol(value) }))
      .filter(Boolean),
    relations: puzzle.relations.map((relation) => ({
      a: [Math.floor(relation.a / SIZE), relation.a % SIZE],
      b: [Math.floor(relation.b / SIZE), relation.b % SIZE],
      type: relation.same ? "same" : "different",
    })),
    selected: [Math.floor(state.selectedCell / SIZE), state.selectedCell % SIZE],
    violationCells: [...findViolations(level.entries, puzzle.relations)].map((cell) => [
      Math.floor(cell / SIZE),
      cell % SIZE,
    ]),
    elapsed: formatTime(level.elapsedMs),
    hints: level.hints,
    mistakes: level.mistakes,
    message: state.message,
    controls: "click a cell or use arrows + Space; H hint; Z undo; R reset; 1/2/3 level; F fullscreen; Esc closes results",
  });
};

render();
requestAnimationFrame(frame);
