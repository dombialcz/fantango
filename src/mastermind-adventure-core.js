import { scoreGuess } from "./mastermind-core.js";

export const ADVENTURE_HEALTH = 5;
// These authored scenes have one answer each; clues are visible before any paid check.
export const ADVENTURES = [
  { id: "last-round", scenes: [
    { id: "shared-drink", solution: ["thief", "ale", "knight"], pieces: ["thief", "ale", "knight"], landmark: "tavern" },
    { id: "third-chair", solution: ["thief", "ale", "knight", "ale", "bard"], pieces: ["thief", "ale", "knight", "bard"], landmark: "tavern" },
    { id: "back-door", solution: ["zombie", "zombie", "knight", "bard", "thief"], pieces: ["zombie", "knight", "bard", "thief"], landmark: "escape" },
  ] },
  { id: "sleepless-court", scenes: [
    { id: "hedge-mage", solution: ["thief", "coin", "mage", "coin"], pieces: ["thief", "coin", "mage"], landmark: "hut" },
    { id: "broken-bell", solution: ["knight", "thief", "mage", "bard", "knight"], pieces: ["knight", "thief", "mage", "bard"], landmark: "court" },
  ] },
];
export const adventureScene = state => ADVENTURES[state.adventure].scenes[state.scene];
export const adventureCounts = state => adventureScene(state).solution.reduce((counts, piece) => ({ ...counts, [piece]: (counts[piece] || 0) + 1 }), {});
export function createAdventure(adventure = 0) {
  const index = adventure === 1 ? 1 : 0;
  return { adventure: index, scene: 0, phase: "intro", health: ADVENTURE_HEALTH, draft: Array(ADVENTURES[index].scenes[0].solution.length).fill(null), selected: 0, guesses: [], facts: [], hint: 0, notice: null };
}
function clear(state) { state.draft.fill(null); state.selected = 0; }
export function actAdventure(state, action) {
  state.notice = null;
  if (action.type === "next") {
    if (state.phase === "intro") state.phase = "play";
    else if (state.phase === "solved") {
      if (state.scene + 1 === ADVENTURES[state.adventure].scenes.length) state.phase = "complete";
      else {
        state.scene++; state.phase = "intro"; state.hint = 0;
        state.draft = Array(adventureScene(state).solution.length).fill(null); state.selected = 0;
      }
    }
    return state;
  }
  if (state.phase !== "play") return state;
  const scene = adventureScene(state);
  if (action.type === "hint") state.hint = Math.min(2, state.hint + 1);
  else if (action.type === "cancel") state.selected = null;
  else if (action.type === "slot" && Number.isInteger(action.slot) && action.slot >= 0 && action.slot < state.draft.length) {
    state.draft[action.slot] = null; state.selected = action.slot;
  } else if (action.type === "pick" && scene.pieces.includes(action.piece)) {
    if (state.draft.filter(p => p === action.piece).length >= adventureCounts(state)[action.piece]) {
      state.notice = "limit"; return state;
    }
    const slot = Number.isInteger(state.selected) && state.draft[state.selected] === null ? state.selected : state.draft.indexOf(null);
    if (slot < 0) { state.notice = "full"; return state; }
    state.draft[slot] = action.piece;
    state.selected = state.draft.indexOf(null);
    if (state.selected < 0) state.selected = null;
  } else if (action.type === "move") {
    const { from, to } = action;
    if (![from, to].every(i => Number.isInteger(i) && i >= 0 && i < state.draft.length) || !state.draft[from]) return state;
    [state.draft[from], state.draft[to]] = [state.draft[to], state.draft[from]];
    state.selected = state.draft.indexOf(null);
    if (state.selected < 0) state.selected = null;
  } else if (action.type === "clear") clear(state);
  else if (action.type === "check") {
    if (state.draft.some(p => p === null)) { state.notice = "incomplete"; return state; }
    const result = scoreGuess(scene.solution, state.draft);
    result.absent = state.draft.length - result.exact - result.misplaced;
    if (result.exact === state.draft.length) {
      state.facts.push({ scene: state.scene, pieces: [...state.draft] });
      state.guesses = []; state.phase = "solved";
    } else {
      state.guesses.push({ pieces: [...state.draft], ...result });
      state.health--; clear(state);
      if (state.health === 0) state.phase = "failed";
    }
  }
  return state;
}
