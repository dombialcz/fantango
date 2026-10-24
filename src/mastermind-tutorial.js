import { actTutorial, canEditTutorial, createTutorial, guardSlot, tutorialScene, tutorialPieces, tutorialLimits } from "./mastermind-tutorial-core.js";
import { TUTORIAL_COPY } from "./mastermind-tutorial-copy.js";
import { installPortraitDrag } from "./mastermind-drag.js";

const IMAGE = { thief: "assets/mastermind/thief.webp", coin: "assets/mastermind/coin.svg", guard: "assets/mastermind/knight.webp", knight: "assets/mastermind/knight.webp", bard: "assets/mastermind/bard.webp" };
const COLOR = { thief: "#69a7ff", coin: "#d1ac58", guard: "#b6c5be", knight: "#f0bd53", bard: "#ec83bd" };
const FEEDBACK_PHASES = ["green", "yellow", "quiz"];
const NEXT_PHASES = ["green", "yellow", "quiz", "window", "treasury-solved", "guard-intro", "guard-solved", "practice-intro"];

export function installMastermindTutorial({ root, entry, getLocale, onModeChange, onAdventureStart }) {
  let active = false;
  let state = createTutorial();
  let undoState = null;
  let undoKind = "undo";
  let drag;
  const t = () => TUTORIAL_COPY[getLocale()];
  try { localStorage.removeItem("vaultbound:mastermind:tutorial:v1"); } catch { /* Practice needs no storage. */ }
  root.innerHTML = '<div class="tutorial-content"></div><p class="sr-only" id="tutorial-announcement" role="status" aria-live="polite" aria-atomic="true"></p>';
  const content = root.querySelector(".tutorial-content");
  const announce = message => { root.querySelector("#tutorial-announcement").textContent = message; };
  const focus = (selector, preventScroll = false) => root.querySelector(selector)?.focus({ preventScroll });
  const fresh = () => { state = createTutorial(); undoState = null; drag?.cancel(); };
  function start() { active = true; fresh(); onModeChange(true); render(); focus("#tutorial-slot-0"); }
  function leave() {
    const completed = state.phase === "complete";
    active = false; fresh(); render(); onModeChange(false, completed);

  }
  function undo() {
    if (!undoState) return;
    if (undoKind === "undoRestart") state = undoState;
    else { state.draft = [...undoState.draft]; state.selected = undoState.selected; state.notice = null; }
    undoState = null;
    render(); announce(t().undone);
    focus(canEditTutorial(state) ? `#tutorial-slot-${state.selected ?? 0}` : "#tutorial-guide-title");
  }
  function restart() {
    undoState = structuredClone(state); undoKind = "undoRestart";
    state = createTutorial(); render(); announce(t().restarted); focus("#tutorial-slot-0");
  }
  function dispatch(action) {
    const c = t();
    const before = structuredClone(state);
    const wasEditable = canEditTutorial(state);
    actTutorial(state, action);
    const changed = JSON.stringify(before.draft) !== JSON.stringify(state.draft);
    if (["slot", "pick", "move", "clear"].includes(action.type) && changed) {
      undoState = before; undoKind = action.type === "clear" ? "undoClear" : "undo";
    }
    if (["check", "next", "answer"].includes(action.type) && !state.notice) undoState = null;
    render({ animate: state.guesses.length > before.guesses.length });
    let message = state.notice ? c[state.notice] : "";
    if (!message && action.type === "pick" && changed) {
      const slot = state.draft.findIndex((piece, index) => piece !== before.draft[index]);
      message = c.added(c[action.piece], slot + 1, state.draft.filter(piece => !piece).length);
    } else if (!message && action.type === "slot") {
      message = before.draft[action.slot] ? c.removed(c[before.draft[action.slot]], action.slot + 1) : c.selectedPlace(action.slot + 1);
    } else if (!message && action.type === "move") message = c.moved;
    else if (!message && action.type === "clear") message = c.cleared;
    else if (!message && action.type === "hint") message = hints()[state.hint - 1];
    else if (!message && action.type === "check") message = state.guesses.length > before.guesses.length ? c.result(state.guesses.length, state.guesses.at(-1)) : c.solved;
    else if (!message && action.type === "next") message = c.steps[state.phase][1];
    if (message) announce(message);
    if (action.type === "check" && state.guesses.length > before.guesses.length && state.phase === before.phase) focus("#tutorial-result-heading");
    else if (state.phase !== before.phase) {
      if (canEditTutorial(state) && !wasEditable) focus(`#tutorial-slot-${state.draft.indexOf(null)}`);
      else focus("#tutorial-guide-title");
    } else if (action.type === "answer" && state.quizPassed) focus("#tutorial-next");
    else if (action.type === "hint" && state.hint === 2) focus(`#tutorial-slot-${state.draft.indexOf(null) >= 0 ? state.draft.indexOf(null) : state.draft.findIndex((_, index) => index !== guardSlot(state))}`);
    else if (action.type === "clear" && changed) focus(`#tutorial-slot-${state.draft.indexOf(null)}`);
  }
  function hints() {
    return state.phase === "guard" ? t().guardHints : state.phase === "practice" ? t().practiceHints : t().treasuryHints;
  }
  const image = piece => `<img src="${IMAGE[piece]}" alt="" draggable="false">`;
  function lineup(pieces, windowSide, editable = false) {
    const c = t();
    const tiles = pieces.map((piece, index) => {
      const near = windowSide === index;
      const fixed = editable && index === guardSlot(state);
      const label = `${c.position} ${index + 1}: ${piece ? c[piece] : c.empty}${near ? `, ${c.nearWindow}` : ""}${fixed ? `, ${c.fixed}` : editable && piece ? `. ${c.tapClear}` : ""}`;
      const appearance = piece ? `style="--hero-color:${COLOR[piece]};--hero-tint:${COLOR[piece]}24"` : "";
      if (!editable) return `<span class="story-piece ${piece || "empty"}" ${appearance}>${piece ? image(piece) : index + 1}</span>`;
      if (fixed) return `<span id="tutorial-slot-${index}" class="story-tile ${piece}" ${appearance} role="img" aria-label="${label}">${image(piece)}<span class="story-position" aria-hidden="true">${index + 1} ◆</span></span>`;
      return `<button type="button" id="tutorial-slot-${index}" class="guess-tile story-tile ${piece || "empty"}" data-slot="${index}" ${piece && !fixed ? `data-hero="${piece}"` : ""} ${appearance} aria-label="${label}" aria-current="${state.selected === index}" ${fixed ? 'aria-disabled="true"' : ""} aria-describedby="tutorial-step-copy${windowSide !== null ? " tutorial-window-desc" : ""}">${piece ? image(piece) : `<span>${index + 1}</span>`}<span class="story-position" aria-hidden="true">${index + 1}${fixed ? " ◆" : ""}</span></button>`;
    }).join("");
    const label = pieces.map((piece, index) => `${c.position} ${index + 1}: ${piece ? c[piece] : c.empty}`).join("; ");
    return `<div class="story-formation ${windowSide === null ? "no-window" : windowSide === 0 ? "window-left" : "window-right"}">${windowSide === null ? "" : `<span class="story-window" role="img" aria-label="${c.byWindow(windowSide + 1)}"><img src="assets/mastermind/window.svg" alt="" draggable="false"></span>`}<div class="story-slots${editable ? " row-active" : ""}" style="--story-size:${pieces.length}" role="${editable ? "group" : "img"}" aria-label="${editable ? `${c.position} 1–${pieces.length}` : label}">${tiles}</div></div>`;
  }
  function scores(result, teaching = false) {
    const c = t();
    return `<div class="story-scores"><span class="${teaching && state.phase === "green" ? "score-teaching" : ""}"><i class="feedback-dot exact" aria-hidden="true"></i><b>${result.exact}</b> ${c.exact}</span><span class="${teaching && state.phase === "yellow" ? "score-teaching" : ""}"><i class="feedback-dot misplaced" aria-hidden="true"></i><b>${result.misplaced}</b> ${c.misplaced}</span>${result.absent ? `<span><i class="feedback-dot absent" aria-hidden="true"></i><b>${result.absent}</b> ${c.absent}</span>` : ""}</div>`;
  }
  function render({ animate = false } = {}) {
    drag?.cancel();
    const c = t();
    root.hidden = !active; entry.hidden = active;
    root.setAttribute("aria-label", c.brand);
    entry.setAttribute("aria-label", c.entryTitle);
    entry.innerHTML = `<div><strong>${c.entryTitle}</strong><p>${c.entryText}</p></div><button type="button" id="start-mastermind-tutorial" class="story-button">${c.start} <span aria-hidden="true">→</span></button>`;
    entry.querySelector("button").addEventListener("click", start);
    if (!active) { content.replaceChildren(); announce(""); return; }
    document.title = `${c.titles[tutorialScene(state)]} — Mastermind`;
    document.querySelector('[data-i18n="brandKicker"]').textContent = c.brand;
    root.dataset.phase = state.phase;
    const focused = root.contains(document.activeElement) ? document.activeElement.id : null;
    const editable = canEditTutorial(state);
    const [title, instruction] = c.steps[state.phase];
    const latest = state.guesses.at(-1);
    const complete = state.draft.every(Boolean);
    const inPractice = state.phase === "practice" || state.phase === "practice-intro";
    const next = NEXT_PHASES.includes(state.phase);
    content.innerHTML = `
      <div class="story-topline"><p class="eyebrow">${c.scene} ${tutorialScene(state)} ${c.stage}</p><button type="button" id="tutorial-exit" class="story-text-button">${c.back}</button></div>
      <h1 class="story-title">${c.titles[tutorialScene(state)]}</h1>
      <section class="story-instruction" aria-labelledby="tutorial-guide-title"><h2 id="tutorial-guide-title" tabindex="-1">${title}</h2><p id="tutorial-step-copy">${instruction}</p></section>
      ${state.windowSide !== null && !editable && state.phase === "window" ? `<p class="story-evidence">${c.byWindow(state.windowSide + 1)}</p>` : ""}
      ${latest ? `<section class="story-latest" aria-labelledby="tutorial-result-heading"><h3 id="tutorial-result-heading" tabindex="-1">${c.latest} · ${latest === state.guesses[0] ? "1" : state.guesses.length}</h3>${lineup(latest.pieces, state.windowSide)}${scores(latest, FEEDBACK_PHASES.includes(state.phase))}<p>${FEEDBACK_PHASES.includes(state.phase) ? c.totals : c.fresh}</p></section>` : ""}
      ${state.phase === "quiz" ? `<fieldset class="story-quiz"><legend>${c.question}</legend><button id="tutorial-answer-elsewhere" type="button" ${state.quizPassed ? "disabled" : ""}>${c.elsewhereAnswer}</button><button id="tutorial-answer-absent" type="button" ${state.quizPassed ? "disabled" : ""}>${c.absentAnswer}</button></fieldset>` : ""}
      ${inPractice ? `<aside class="story-name-clue"><h3>${c.practiceName}</h3><p>${c.practiceClues}</p></aside>` : ""}
      ${editable ? `<section class="story-room" aria-labelledby="story-current-heading"><h3 id="story-current-heading">${c.current}</h3><p class="story-current-hint">${c.currentHint}</p>${state.windowSide === null ? "" : `<p id="tutorial-window-desc" class="story-window-description">${c.byWindow(state.windowSide + 1)}</p>`}${lineup(state.draft, state.windowSide, true)}${tutorialLimits(state) ? `<p class="story-counts">${c.count(state.draft.filter(p => p === "thief").length, state.draft.filter(p => p === "coin").length, tutorialLimits(state).coin)}</p>` : ""}<div class="story-picker" role="group" aria-label="${c.choose}">${tutorialPieces(state).map((piece, index) => `<button type="button" id="tutorial-pick-${piece}" data-tutorial-piece="${piece}" aria-label="${c.add} ${c[piece]}, ${c.shortcut} ${index + 1}" aria-keyshortcuts="${index + 1}">${image(piece)}<span>${c[piece]}</span><kbd aria-hidden="true">${index + 1}</kbd></button>`).join("")}</div><p class="story-ready" id="tutorial-ready">${complete ? c.ready : c.incomplete}</p></section>` : ""}
      <p class="story-notice${state.notice ? " has-notice" : ""}">${state.notice ? c[state.notice] : ""}</p>
      <div class="story-primary-actions">${editable ? `<button type="button" id="tutorial-check" class="story-primary" aria-describedby="tutorial-ready" ${complete ? "" : "disabled"}>${c.check} <span aria-hidden="true">→</span></button>` : next ? `<button type="button" id="tutorial-next" class="story-primary" ${state.phase === "quiz" && !state.quizPassed ? "disabled" : ""}>${c.next} <span aria-hidden="true">→</span></button>` : state.phase === "complete" ? `<button type="button" id="tutorial-adventure" class="story-primary">${getLocale() === "pl" ? "Pierwsza przygoda: Ostatnia kolejka" : "First adventure: The Last Round"} →</button>` : ""}</div>
      ${state.phase === "complete" ? `<button type="button" id="tutorial-finish" class="story-text-button">${c.finish} →</button>` : ""}
      <div class="story-edit-actions">${editable ? `<button type="button" id="tutorial-clear" class="story-text-button" ${state.draft.some((p, index) => p && index !== guardSlot(state)) ? "" : "disabled"}>${c.clear}</button>` : ""}${undoState ? `<button type="button" id="tutorial-undo" class="story-text-button">${c[undoKind]}</button>` : ""}${["deduce", "guard", "practice"].includes(state.phase) ? `<button type="button" id="tutorial-hint" class="story-text-button" ${state.hint === 2 ? "disabled" : ""}>${state.hint === 0 ? c.hint : state.hint === 1 ? c.moreHint : c.hintsShown}</button>` : ""}</div>
      ${state.hint ? `<aside class="story-hint"><h3>${c.hintHeading}</h3>${hints().slice(0, state.hint).map(hint => `<p>${hint}</p>`).join("")}</aside>` : ""}
      ${editable ? `<p class="story-drag-hint">${c.dragHint}</p>` : ""}
      ${state.guesses.length > 1 ? `<section class="story-history" aria-labelledby="story-history-heading"><h3 id="story-history-heading">${c.earlier}</h3><ol class="story-attempts" reversed start="${state.guesses.length - 1}">${state.guesses.slice(0, -1).map((guess, index) => `<li class="story-attempt" value="${index + 1}" aria-label="${c.attempt} ${index + 1}"><span class="attempt-number">${String(index + 1).padStart(2, "0")}</span><div>${lineup(guess.pieces, state.windowSide)}${scores(guess)}<p>${c.hypotheses}</p></div></li>`).reverse().join("")}</ol></section>` : ""}
      ${state.facts.length ? `<section class="story-facts" aria-labelledby="story-facts-heading"><h3 id="story-facts-heading">${c.facts}</h3>${state.facts.map(fact => `<article class="story-fact"><h4>${c.verified} ${fact.scene} · ${c.titles[fact.scene]}</h4><p>${c.factText[fact.scene]}</p>${lineup(fact.pieces, fact.windowSide)}</article>`).join("")}</section>` : ""}
      <div class="story-bottom"><p>${c.noSave}</p><button type="button" id="tutorial-restart" class="story-text-button">${state.phase === "complete" ? c.replay : c.restart}</button></div>`;
    const bind = (id, callback) => root.querySelector(`#${id}`)?.addEventListener("click", callback);
    bind("tutorial-exit", leave); bind("tutorial-restart", restart); bind("tutorial-undo", undo);
    bind("tutorial-next", () => dispatch({ type: "next" })); bind("tutorial-check", () => dispatch({ type: "check" }));
    bind("tutorial-adventure", () => { leave(); onAdventureStart(); });
    bind("tutorial-finish", leave); bind("tutorial-clear", () => dispatch({ type: "clear" })); bind("tutorial-hint", () => dispatch({ type: "hint" }));
    for (const answer of ["elsewhere", "absent"]) bind(`tutorial-answer-${answer}`, () => dispatch({ type: "answer", answer }));
    root.querySelectorAll("[data-slot]").forEach(button => button.addEventListener("click", () => dispatch({ type: "slot", slot: Number(button.dataset.slot) })));
    root.querySelectorAll("[data-tutorial-piece]").forEach(button => button.addEventListener("click", () => dispatch({ type: "pick", piece: button.dataset.tutorialPiece })));
    if (animate && !matchMedia("(prefers-reduced-motion: reduce)").matches) root.querySelector(".story-latest")?.animate([{ opacity: 0, transform: "translateY(-8px)" }, { opacity: 1, transform: "translateY(0)" }], { duration: 180, easing: "ease-out" });
    if (focused && !root.querySelector(`#${focused}`)?.disabled) focus(`#${focused}`, true);
  }
  drag = installPortraitDrag({ board: root, canDrag: () => active && canEditTutorial(state), onDrop: ({ sourceSlot, targetSlot }) => dispatch({ type: "move", from: sourceSlot, to: targetSlot }) });
  addEventListener("pagehide", fresh);
  addEventListener("pageshow", event => { if (event.persisted) { fresh(); render(); } });
  return {
    get active() { return active; }, render, start, leave,
    keydown(event) {
      if (event.altKey || event.ctrlKey || event.metaKey || event.target.closest("input, textarea, select, [contenteditable]")) return;
      if (event.key === "Escape") { drag.cancel(); dispatch({ type: "cancel" }); return; }
      if (canEditTutorial(state) && /^[1-3]$/.test(event.key)) {
        const piece = tutorialPieces(state)[Number(event.key) - 1];
        if (piece) {
          event.preventDefault();
          const tile = event.target.closest("[data-slot]");
          if (tile && state.draft[Number(tile.dataset.slot)] === null && Number(tile.dataset.slot) !== guardSlot(state)) state.selected = Number(tile.dataset.slot);
          dispatch({ type: "pick", piece });
        }
        return;
      }
      if (event.target.closest("button, a")) return;
      if (event.key === "Enter") { event.preventDefault(); if (canEditTutorial(state)) dispatch({ type: "check" }); else if (NEXT_PHASES.includes(state.phase)) dispatch({ type: "next" }); else if (state.phase === "complete") { leave(); onAdventureStart(); } }
    },
    snapshot() {
      return { game: "Vaultbound Mastermind", mode: "story-tutorial", locale: getLocale(), phase: state.phase, scene: tutorialScene(state), coordinateSystem: "Places are numbered from 1, left to right; a window is outside the scored row", draft: state.draft, selectedSlot: state.selected, availablePieces: canEditTutorial(state) ? tutorialPieces(state) : [], window: state.windowSide === null ? null : { side: state.windowSide === 0 ? "left" : "right", besidePlace: state.windowSide + 1, scored: false }, fixedGuardSlot: guardSlot(state), guesses: state.guesses, facts: state.facts, quizPassed: state.quizPassed, hintsShown: state.hint, undoAvailable: !!undoState, persistence: "none", attemptLimit: null, instruction: t().steps[state.phase][1], notice: state.notice ? t()[state.notice] : null, drag: drag.snapshot(), result: state.phase === "complete" ? "solved" : "playing" };
    },
  };
}
