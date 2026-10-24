import { scoreGuess } from "./mastermind-core.js";

export const TUTORIAL_PHASES = ["setup", "green", "yellow", "quiz", "window", "deduce", "treasury-solved", "guard-intro", "guard", "guard-solved", "practice-intro", "practice", "complete"];
export const canEditTutorial = state => ["setup", "deduce", "guard", "practice"].includes(state.phase);
export const tutorialScene = state => ["practice-intro", "practice", "complete"].includes(state.phase) ? 3 : ["guard-intro", "guard", "guard-solved"].includes(state.phase) ? 2 : 1;
export const guardSlot = state => ["guard", "guard-solved"].includes(state.phase) ? state.windowSide : null;
export const tutorialPieces = state => state.phase === "practice" ? ["knight", "thief", "bard"] : ["thief", "coin"];
export const tutorialLimits = state => state.phase === "practice" ? null : { thief: 1, coin: state.phase === "guard" ? 1 : 2 };

export function createTutorial(middleSide = Math.random() < .5 ? 0 : 2, practiceThief = Math.floor(Math.random() * 4)) {
  return { phase: "setup", middleSide: middleSide === 0 ? 0 : 2, practiceThief: Number.isInteger(practiceThief) && practiceThief >= 0 && practiceThief < 4 ? practiceThief : 1, draft: [null, null, null], selected: 0, windowSide: null, solution: null, guesses: [], facts: [], notice: null, hint: 0, quizPassed: false };
}

function resetDraft(state) {
  state.draft = state.draft.map((piece, index) => index === guardSlot(state) ? piece : null);
  state.selected = state.draft.indexOf(null);
}

function finishScene(state, result) {
  state.facts.push({ scene: tutorialScene(state), pieces: [...state.draft], windowSide: state.windowSide, ...result });
  state.guesses = [];
  state.hint = 0;
  state.phase = state.phase === "practice" ? "complete" : state.phase === "guard" ? "guard-solved" : "treasury-solved";
}

// Practice lives only in memory. No action log, save replay, or health penalties.
export function actTutorial(state, action) {
  state.notice = null;
  if (action.type === "hint" && ["deduce", "guard", "practice"].includes(state.phase)) {
    state.hint = Math.min(2, state.hint + 1);
  } else if (action.type === "answer" && state.phase === "quiz") {
    state.quizPassed = action.answer === "elsewhere";
    state.notice = state.quizPassed ? "quizCorrect" : "quizRetry";
  } else if (action.type === "cancel") {
    state.selected = null;
  } else if (action.type === "pick" && canEditTutorial(state) && tutorialPieces(state).includes(action.piece)) {
    const limit = tutorialLimits(state)?.[action.piece];
    if (limit && state.draft.filter(piece => piece === action.piece).length >= limit) {
      state.notice = action.piece === "thief" ? "oneThief" : "enoughCoins";
      return state;
    }
    const slot = state.selected !== null && state.draft[state.selected] === null ? state.selected : state.draft.indexOf(null);
    if (slot < 0) { state.notice = "editHint"; return state; }
    state.draft[slot] = action.piece;
    const following = state.draft.findIndex((piece, index) => piece === null && index > slot);
    state.selected = following >= 0 ? following : state.draft.indexOf(null);
    if (state.selected < 0) state.selected = null;
  } else if (action.type === "slot" && canEditTutorial(state) && Number.isInteger(action.slot) && action.slot >= 0 && action.slot < state.draft.length) {
    if (action.slot === guardSlot(state)) { state.notice = "fixedGuard"; return state; }
    state.draft[action.slot] = null;
    state.selected = action.slot;
  } else if (action.type === "move" && canEditTutorial(state)) {
    const { from, to } = action;
    if (![from, to].every(slot => Number.isInteger(slot) && slot >= 0 && slot < state.draft.length) || !state.draft[from]) return state;
    if ([from, to].includes(guardSlot(state))) { state.notice = "fixedGuard"; return state; }
    [state.draft[from], state.draft[to]] = [state.draft[to], state.draft[from]];
    state.selected = state.draft.indexOf(null);
    if (state.selected < 0) state.selected = null;
  } else if (action.type === "clear" && canEditTutorial(state)) {
    resetDraft(state);
  } else if (action.type === "check" && canEditTutorial(state)) {
    if (state.draft.some(piece => !piece)) { state.notice = "fillRow"; return state; }
    if (state.phase === "setup") {
      // Choose the worked example's answer only when the player checks it.
      const thief = state.draft.indexOf("thief");
      state.windowSide = thief === 1 ? state.middleSide : 2 - thief;
      state.solution = ["coin", "coin", "coin"];
      state.solution[state.windowSide] = "thief";
    }
    const result = scoreGuess(state.solution, state.draft);
    result.absent = state.draft.length - result.exact - result.misplaced;
    if (result.exact === state.draft.length) finishScene(state, result);
    else {
      state.guesses.push({ pieces: [...state.draft], ...result });
      if (state.phase === "setup") state.phase = "green";
      resetDraft(state);
    }
  } else if (action.type === "next") {
    if (state.phase === "quiz" && !state.quizPassed) return state;
    const next = { green: "yellow", yellow: "quiz", quiz: "window", window: "deduce", "treasury-solved": "guard-intro", "guard-intro": "guard", "guard-solved": "practice-intro", "practice-intro": "practice" }[state.phase];
    if (!next) return state;
    state.phase = next;
    state.hint = 0;
    if (next === "guard") {
      state.draft = [null, null, null];
      state.draft[state.windowSide] = "guard";
      state.solution = ["coin", "coin", "coin"];
      state.solution[state.windowSide] = "guard";
      state.solution[2 - state.windowSide] = "thief";
      state.guesses = [];
    } else if (next === "practice") {
      state.windowSide = null;
      state.draft = [null, null, null, null];
      state.solution = ["knight", "knight", "knight", "knight"];
      state.solution[state.practiceThief] = "thief";
      state.guesses = [];
    }
    state.selected = state.draft.indexOf(null);
    if (state.selected < 0) state.selected = null;
  }
  return state;
}
