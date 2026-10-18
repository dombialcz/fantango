import { localDateKey } from "./generator.js";
import { CHALLENGES, HERO_CLASSES, evaluateGuess, generateChallenge } from "./mastermind-core.js";
import { PARTY_NAMES } from "./mastermind-names.js";

const HERO_BY_ID = Object.fromEntries(HERO_CLASSES.map((hero) => [hero.id, hero]));
const COPY = {
  en: {
    brandKicker: "DAILY CHALLENGE",
    gameKicker: "THE DAILY HERO CODE",
    gameTitle: "Mastermind",
    gameSubtitle: "Read the party name. Rebuild the formation.",
    backVaultbound: "Back to Vaultbound",
    languageLabel: "Language",
    difficultyLabel: "Daily challenge difficulty",
    guessRowsLabel: "Ten guess rows",
    heroClassesLabel: "Hero classes",
    feedbackLegendLabel: "Feedback legend",
    easy: "Easy",
    medium: "Medium",
    hard: "Hard",
    heroes: "heroes",
    todaysParty: "TODAY’S HIDDEN PARTY",
    nameClues: "Name clues",
    nameCluesHint: "Each word reveals an exact class count.",
    guessBoard: "Guess board",
    boardSubtitle: "Build the party one row at a time.",
    formation: "FORMATION",
    feedback: "FEEDBACK",
    submitGuess: "Check guess",
    challengeComplete: "Challenge complete",
    clearRow: "Clear current row",
    exactLegend: "Right class, right place",
    misplacedLegend: "Right class, different place",
    chooseHeroes: "Choose heroes",
    pickerSubtitle: "Select a class to fill the next open place.",
    keyboardPick: "quick pick",
    keyboardSubmit: "submit",
    dailyNote: "Three new formations arrive each day.",
    playFantango: "Play Fantango",
    dailyFooter: "A new code every day · Three challenges",
    ruleNote: "No prefix means no pair. No class appears four times; each named duplicate is exact, and every other hero is a singleton.",
    pair: "PAIR",
    trio: "TRIO",
    single: "SINGLE",
    exactCount: (count) => `Exactly ${count}`,
    rowLabel: (number) => `Guess ${number}`,
    emptyPlace: (place) => `Place ${place}, empty`,
    filledPlace: (place, hero) => `Place ${place}, ${hero}. Activate to clear it.`,
    heroChoice: (hero, key) => `Add ${hero}. Keyboard shortcut ${key}.`,
    feedbackCount: (exact, misplaced) => `${exact} in place, ${misplaced} elsewhere`,
    attempts: (used) => `${used} / 10`,
    dateLocale: "en-GB",
    unsolvedMessage: "Choose a hero to fill the highlighted row. Select a filled place to change it.",
    solvedMessage: (attempts, party) => `Solved in ${attempts} ${attempts === 1 ? "guess" : "guesses"}. The hidden party was ${party}.`,
    failedMessage: (party) => `No guesses remain. The hidden party was ${party}.`,
    heroNames: {
      knight: "Knight", thief: "Thief", bard: "Bard", cleric: "Cleric",
      barbarian: "Barbarian", ranger: "Ranger", mage: "Mage",
    },
    heroPlural: {
      knight: "Knights", thief: "Thieves", bard: "Bards", cleric: "Clerics",
      barbarian: "Barbarians", ranger: "Rangers", mage: "Mages",
    },
  },
  pl: {
    brandKicker: "CODZIENNE WYZWANIE",
    gameKicker: "CODZIENNY KOD BOHATERÓW",
    gameTitle: "Mastermind",
    gameSubtitle: "Odczytaj nazwę drużyny. Odtwórz jej skład.",
    backVaultbound: "Wróć do Vaultbound",
    languageLabel: "Język",
    difficultyLabel: "Poziom dzisiejszego wyzwania",
    guessRowsLabel: "Dziesięć prób",
    heroClassesLabel: "Klasy bohaterów",
    feedbackLegendLabel: "Legenda wyników",
    easy: "Łatwy",
    medium: "Średni",
    hard: "Trudny",
    heroes: "bohaterów",
    todaysParty: "TAJEMNICZA DRUŻYNA DNIA",
    nameClues: "Wskazówki w nazwie",
    nameCluesHint: "Każde słowo wskazuje dokładną liczbę klas.",
    guessBoard: "Twoje próby",
    boardSubtitle: "Odtwarzaj skład, po jednym wierszu.",
    formation: "SKŁAD",
    feedback: "WYNIK",
    submitGuess: "Sprawdź skład",
    challengeComplete: "Wyzwanie ukończone",
    clearRow: "Wyczyść bieżący wiersz",
    exactLegend: "Dobra klasa, dobre miejsce",
    misplacedLegend: "Dobra klasa, inne miejsce",
    chooseHeroes: "Wybierz bohaterów",
    pickerSubtitle: "Wybierz klasę, aby uzupełnić kolejne wolne miejsce.",
    keyboardPick: "wybór klas",
    keyboardSubmit: "zatwierdź",
    dailyNote: "Każdego dnia czekają trzy nowe składy.",
    playFantango: "Zagraj w Fantango",
    dailyFooter: "Nowy kod każdego dnia · Trzy wyzwania",
    ruleNote: "Brak przedrostka oznacza brak pary. Żadna klasa nie występuje cztery razy; wskazane duplikaty są dokładne, a pozostałe klasy pojawiają się pojedynczo.",
    pair: "PARA",
    trio: "TRÓJKA",
    single: "JEDEN",
    exactCount: (count) => `Dokładnie ${count}×`,
    rowLabel: (number) => `Próba ${number}`,
    emptyPlace: (place) => `Miejsce ${place}, puste`,
    filledPlace: (place, hero) => `Miejsce ${place}, ${hero}. Naciśnij, aby usunąć.`,
    heroChoice: (hero, key) => `Dodaj: ${hero}. Skrót klawiszowy ${key}.`,
    feedbackCount: (exact, misplaced) => `${exact} na miejscu, ${misplaced} w innym miejscu`,
    attempts: (used) => `${used} / 10`,
    dateLocale: "pl-PL",
    unsolvedMessage: "Wybierz klasę, aby wypełnić podświetlony wiersz. Naciśnij zajęte miejsce, aby je zmienić.",
    solvedMessage: (attempts, party) => `Rozszyfrowano w ${attempts} ${attempts === 1 ? "próbie" : "próbach"}. Ukryta drużyna: ${party}.`,
    failedMessage: (party) => `Brak prób. Ukryta drużyna: ${party}.`,
    heroNames: {
      knight: "Rycerz", thief: "Złodziej", bard: "Bard", cleric: "Kleryk",
      barbarian: "Barbarzyńca", ranger: "Łowca", mage: "Mag",
    },
    heroPlural: {
      knight: "rycerzy", thief: "złodziei", bard: "bardów", cleric: "kleryków",
      barbarian: "barbarzyńców", ranger: "łowców", mage: "magów",
    },
  },
};

const dateKey = localDateKey();
const levels = Object.fromEntries(
  CHALLENGES.map((challenge) => [challenge.id, generateChallenge(dateKey, challenge.id)]),
);
const progress = Object.fromEntries(CHALLENGES.map((challenge) => [challenge.id, restoreProgress(challenge)]));
const state = { difficulty: "easy", locale: readLocale(), selectedSlot: 0 };

const todayDate = document.querySelector("#today-date");
const languageButtons = [...document.querySelectorAll("[data-locale]")];
const challengeTabs = [...document.querySelectorAll("[data-challenge]")];
const partyName = document.querySelector("#party-name");
const missionLevel = document.querySelector("#mission-level");
const clueParts = document.querySelector("#clue-parts");
const guessCounter = document.querySelector("#guess-counter");
const guessBoard = document.querySelector("#guess-board");
const heroPicker = document.querySelector("#hero-picker");
const clearButton = document.querySelector("#clear-button");
const submitButton = document.querySelector("#submit-button");
const gameMessage = document.querySelector("#game-message");

function copy() {
  return COPY[state.locale];
}

function readLocale() {
  try {
    return localStorage.getItem("vaultbound:mastermind:language") === "pl" ? "pl" : "en";
  } catch {
    return "en";
  }
}

function setLocale(locale) {
  if (!COPY[locale]) return;
  state.locale = locale;
  try {
    localStorage.setItem("vaultbound:mastermind:language", locale);
  } catch {
    // Keep the selected language for this page even if storage is unavailable.
  }
  render();
}

function localizedHero(type) {
  return copy().heroNames[type] ?? HERO_BY_ID[type].label;
}

function localizedPlural(type) {
  return copy().heroPlural[type] ?? copy().heroNames[type];
}

function localizedPartyName(challenge) {
  if (state.locale === "en") return challenge.title;
  const names = PARTY_NAMES[state.locale];
  const pair = challenge.clues.find((clue) => clue.kind === "pair");
  const trio = challenge.clues.find((clue) => clue.kind === "trio");
  const single = challenge.clues.find((clue) => clue.kind === "single");
  return [
    ...(pair ? [names.pair[pair.type]] : []),
    names.trio[trio.type],
    names.single[single.type],
  ].join(" ");
}

function storageKey(challenge) {
  return `vaultbound:mastermind:v1:${dateKey}:${challenge.id}`;
}

function blankProgress(challenge) {
  return { guesses: [], draft: Array(challenge.size).fill(null) };
}

function restoreProgress(challenge) {
  const fallback = blankProgress(challenge);
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey(challenge)));
    if (!saved || !Array.isArray(saved.guesses)) return fallback;
    const guesses = [];
    for (const guess of saved.guesses.slice(0, 10)) {
      if (!Array.isArray(guess) || guess.length !== challenge.size || guess.some((type) => !HERO_BY_ID[type])) break;
      guesses.push([...guess]);
      if (evaluateGuess(levels[challenge.id].code, guess)?.exact === challenge.size) break;
    }
    const draft = Array.isArray(saved.draft) && saved.draft.length === challenge.size
      ? saved.draft.map((type) => (type === null || HERO_BY_ID[type] ? type : null))
      : fallback.draft;
    return { guesses, draft: guesses.length === 10 || isFinished(challenge.id, guesses) ? fallback.draft : draft };
  } catch {
    return fallback;
  }
}

function saveProgress() {
  const challenge = currentChallenge();
  const current = currentProgress();
  try {
    localStorage.setItem(storageKey(challenge), JSON.stringify({ guesses: current.guesses, draft: current.draft }));
  } catch {
    // Continue in memory when browser storage is unavailable.
  }
}

function currentChallenge() {
  return levels[state.difficulty];
}

function currentProgress() {
  return progress[state.difficulty];
}

function currentResult(guess, challenge = currentChallenge()) {
  return evaluateGuess(challenge.code, guess);
}

function isFinished(id = state.difficulty, guesses = progress[id].guesses) {
  const challenge = levels[id];
  return guesses.length >= 10 || guesses.some((guess) => evaluateGuess(challenge.code, guess)?.exact === challenge.size);
}

function chooseChallenge(id) {
  if (!levels[id]) return;
  state.difficulty = id;
  const draft = currentProgress().draft;
  const emptyIndex = draft.findIndex((type) => type === null);
  state.selectedSlot = emptyIndex >= 0 ? emptyIndex : Math.max(0, draft.length - 1);
  render();
}

function placeHero(type) {
  if (isFinished()) return;
  const draft = currentProgress().draft;
  let slot = draft.findIndex((value, index) => index >= state.selectedSlot && value === null);
  if (slot < 0) slot = draft.findIndex((value) => value === null);
  if (slot < 0) return;
  draft[slot] = type;
  const nextEmpty = draft.findIndex((value, index) => index > slot && value === null);
  state.selectedSlot = nextEmpty >= 0 ? nextEmpty : Math.max(0, draft.findIndex((value) => value === null));
  if (state.selectedSlot < 0) state.selectedSlot = slot;
  saveProgress();
  render();
}

function selectSlot(index) {
  if (isFinished()) return;
  const draft = currentProgress().draft;
  if (draft[index] !== null) draft[index] = null;
  state.selectedSlot = index;
  saveProgress();
  render();
}

function submitGuess() {
  const challenge = currentChallenge();
  const current = currentProgress();
  if (isFinished() || current.draft.some((type) => type === null)) return;
  current.guesses.push([...current.draft]);
  current.draft = Array(challenge.size).fill(null);
  state.selectedSlot = 0;
  saveProgress();
  render();
}

function clearDraft() {
  if (isFinished()) return;
  currentProgress().draft.fill(null);
  state.selectedSlot = 0;
  saveProgress();
  render();
}

function applyCopy() {
  const strings = copy();
  document.documentElement.lang = state.locale;
  document.title = `${strings.gameTitle} — Vaultbound`;
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const value = strings[element.dataset.i18n];
    if (typeof value === "string") element.textContent = value;
  });
  document.querySelectorAll("[data-challenge]").forEach((button) => {
    button.setAttribute("aria-label", `${strings[button.dataset.challenge]}, ${levels[button.dataset.challenge].size} ${strings.heroes}`);
  });
  clearButton.setAttribute("aria-label", strings.clearRow);
  clearButton.title = strings.clearRow;
  document.querySelector(".language-switch").setAttribute("aria-label", strings.languageLabel);
  document.querySelector(".difficulty-tabs").setAttribute("aria-label", strings.difficultyLabel);
  guessBoard.setAttribute("aria-label", strings.guessRowsLabel);
  heroPicker.setAttribute("aria-label", strings.heroClassesLabel);
  document.querySelector(".board-legend").setAttribute("aria-label", strings.feedbackLegendLabel);
  document.querySelector("#rule-note").textContent = strings.ruleNote;
  languageButtons.forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.locale === state.locale)));
  todayDate.dateTime = dateKey;
  todayDate.textContent = new Intl.DateTimeFormat(strings.dateLocale, {
    weekday: "short", month: "short", day: "numeric",
  }).format(new Date(`${dateKey}T00:00:00`));
}

function makeCluePart(clue) {
  const strings = copy();
  const hero = HERO_BY_ID[clue.type];
  const count = clue.kind === "pair" ? 2 : clue.kind === "trio" ? 3 : 1;
  const chip = document.createElement("article");
  chip.className = `clue-card clue-${clue.kind}`;
  const image = document.createElement("img");
  image.src = hero.image;
  image.alt = "";
  const text = document.createElement("span");
  text.className = "clue-text";
  const kind = document.createElement("span");
  kind.className = "clue-kind";
  kind.textContent = strings[clue.kind];
  const title = document.createElement("strong");
  title.textContent = localizedHero(clue.type);
  const exact = document.createElement("small");
  exact.textContent = state.locale === "pl"
    ? `${strings.exactCount(count)} ${count === 1 ? localizedHero(clue.type).toLowerCase() : localizedPlural(clue.type)}.`
    : `${strings.exactCount(count)} ${count === 1 ? localizedHero(clue.type) : strings.heroPlural[clue.type]}.`;
  text.append(kind, title, exact);
  chip.append(image, text);
  return chip;
}

function renderClues(challenge) {
  clueParts.replaceChildren(...challenge.clues.map(makeCluePart));
}

function renderFeedback(result) {
  const feedback = document.createElement("span");
  feedback.className = "row-feedback";
  feedback.setAttribute("aria-label", copy().feedbackCount(result.exact, result.misplaced));
  feedback.title = copy().feedbackCount(result.exact, result.misplaced);
  const exact = document.createElement("span");
  exact.className = "feedback-score exact-score";
  const exactDot = document.createElement("i");
  exactDot.className = "feedback-dot exact";
  const exactNumber = document.createElement("b");
  exactNumber.textContent = String(result.exact);
  exact.append(exactDot, exactNumber);
  const misplaced = document.createElement("span");
  misplaced.className = "feedback-score misplaced-score";
  const misplacedDot = document.createElement("i");
  misplacedDot.className = "feedback-dot misplaced";
  const misplacedNumber = document.createElement("b");
  misplacedNumber.textContent = String(result.misplaced);
  misplaced.append(misplacedDot, misplacedNumber);
  feedback.append(exact, misplaced);
  return feedback;
}

function makeLineup(challenge, guess, currentRow = false, rowIndex = 0, current = currentProgress()) {
  const lineup = document.createElement("span");
  lineup.className = "row-lineup";
  lineup.style.setProperty("--party-size", challenge.size);
  if (!currentRow && guess) {
    for (const type of guess) {
      const tile = document.createElement("span");
      tile.className = "guess-tile";
      const image = document.createElement("img");
      image.src = HERO_BY_ID[type].image;
      image.alt = localizedHero(type);
      tile.append(image);
      lineup.append(tile);
    }
    return lineup;
  }
  for (let index = 0; index < challenge.size; index += 1) {
    const type = currentRow ? current.draft[index] : null;
    const tile = document.createElement(currentRow ? "button" : "span");
    tile.className = `guess-tile${type ? " tile-filled" : " tile-empty"}`;
    if (currentRow) {
      tile.type = "button";
      tile.setAttribute("aria-current", String(index === state.selectedSlot));
      tile.setAttribute("aria-label", type
        ? copy().filledPlace(index + 1, localizedHero(type))
        : copy().emptyPlace(index + 1));
      tile.disabled = isFinished();
      tile.addEventListener("click", () => selectSlot(index));
    } else {
      tile.setAttribute("aria-hidden", "true");
    }
    if (type) {
      const image = document.createElement("img");
      image.src = HERO_BY_ID[type].image;
      image.alt = "";
      tile.append(image);
      if (currentRow) {
        const remove = document.createElement("span");
        remove.className = "tile-remove";
        remove.textContent = "×";
        tile.append(remove);
      }
    } else if (currentRow) {
      const number = document.createElement("span");
      number.className = "tile-position";
      number.textContent = String(index + 1);
      tile.append(number);
    }
    lineup.append(tile);
  }
  return lineup;
}

function renderBoard(challenge, current) {
  const locked = isFinished();
  const rows = Array.from({ length: 10 }, (_, index) => {
    const row = document.createElement("li");
    row.className = "guess-row";
    row.setAttribute("aria-label", copy().rowLabel(index + 1));
    const number = document.createElement("span");
    number.className = "row-number";
    number.textContent = String(index + 1).padStart(2, "0");
    row.append(number);

    if (index < current.guesses.length) {
      const guess = current.guesses[index];
      const result = currentResult(guess, challenge);
      const solved = result.exact === challenge.size;
      row.classList.add("row-submitted");
      if (solved) row.classList.add("row-solved");
      row.append(makeLineup(challenge, guess));
      row.append(renderFeedback(result));
    } else if (index === current.guesses.length && !locked) {
      row.classList.add("row-active");
      row.append(makeLineup(challenge, null, true, index, current));
      const pending = document.createElement("span");
      pending.className = "row-pending";
      pending.textContent = "—";
      pending.setAttribute("aria-hidden", "true");
      row.append(pending);
    } else {
      row.classList.add("row-future");
      row.append(makeLineup(challenge));
      const pending = document.createElement("span");
      pending.className = "row-pending";
      pending.textContent = "· ·";
      pending.setAttribute("aria-hidden", "true");
      row.append(pending);
    }
    return row;
  });
  guessBoard.replaceChildren(...rows);
}

function renderPicker() {
  const locked = isFinished();
  const choices = HERO_CLASSES.map((hero, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "hero-choice";
    button.disabled = locked;
    button.setAttribute("aria-label", copy().heroChoice(localizedHero(hero.id), index + 1));
    const image = document.createElement("img");
    image.src = hero.image;
    image.alt = "";
    const name = document.createElement("span");
    name.textContent = localizedHero(hero.id);
    const key = document.createElement("kbd");
    key.textContent = String(index + 1);
    button.append(image, name, key);
    button.addEventListener("click", () => placeHero(hero.id));
    return button;
  });
  heroPicker.replaceChildren(...choices);
}

function renderMessage(challenge, current) {
  gameMessage.className = "game-message";
  if (!isFinished()) {
    gameMessage.textContent = copy().unsolvedMessage;
    return;
  }
  const solvedAt = current.guesses.findIndex((guess) => currentResult(guess, challenge).exact === challenge.size);
  const party = localizedPartyName(challenge);
  if (solvedAt >= 0) {
    gameMessage.classList.add("success");
    gameMessage.textContent = copy().solvedMessage(solvedAt + 1, party);
  } else {
    gameMessage.classList.add("failure");
    gameMessage.textContent = copy().failedMessage(party);
  }
}

function render() {
  const strings = copy();
  const challenge = currentChallenge();
  const current = currentProgress();
  const locked = isFinished();
  const completeDraft = current.draft.every((type) => type !== null);

  applyCopy();
  partyName.textContent = localizedPartyName(challenge);
  missionLevel.textContent = strings[state.difficulty];
  guessCounter.textContent = strings.attempts(current.guesses.length);
  challengeTabs.forEach((button) => {
    const id = button.dataset.challenge;
    button.setAttribute("aria-pressed", String(id === state.difficulty));
    const result = isFinished(id, progress[id].guesses);
    const mark = button.querySelector(".difficulty-result");
    mark.textContent = result
      ? (progress[id].guesses.some((guess) => evaluateGuess(levels[id].code, guess)?.exact === levels[id].size) ? "✓" : "×")
      : "";
  });
  renderClues(challenge);
  renderBoard(challenge, current);
  renderPicker();
  renderMessage(challenge, current);
  clearButton.disabled = locked || current.draft.every((type) => type === null);
  submitButton.disabled = locked || !completeDraft;
  submitButton.querySelector("[data-i18n]").textContent = locked ? strings.challengeComplete : strings.submitGuess;
}

challengeTabs.forEach((button) => button.addEventListener("click", () => chooseChallenge(button.dataset.challenge)));
languageButtons.forEach((button) => button.addEventListener("click", () => setLocale(button.dataset.locale)));
clearButton.addEventListener("click", clearDraft);
submitButton.addEventListener("click", submitGuess);

document.addEventListener("keydown", (event) => {
  if (event.altKey || event.ctrlKey || event.metaKey) return;
  if (event.target instanceof HTMLElement && (
    ["INPUT", "TEXTAREA", "SELECT", "BUTTON", "A"].includes(event.target.tagName)
    || event.target.isContentEditable
  )) return;
  if (/^[1-7]$/.test(event.key)) {
    event.preventDefault();
    placeHero(HERO_CLASSES[Number(event.key) - 1].id);
  } else if (event.key === "Enter") {
    event.preventDefault();
    submitGuess();
  } else if (event.key === "Backspace" && !isFinished()) {
    event.preventDefault();
    currentProgress().draft[state.selectedSlot] = null;
    saveProgress();
    render();
  }
});

window.advanceTime = () => render();
window.render_game_to_text = () => {
  const challenge = currentChallenge();
  const current = currentProgress();
  const solvedAt = current.guesses.findIndex((guess) => currentResult(guess, challenge).exact === challenge.size);
  return JSON.stringify({
    game: "Vaultbound Mastermind",
    date: dateKey,
    locale: state.locale,
    difficulty: challenge.id,
    partyName: localizedPartyName(challenge),
    partySize: challenge.size,
    clues: challenge.clues.map((clue) => ({ kind: clue.kind, hero: localizedHero(clue.type) })),
    draft: current.draft,
    guesses: current.guesses.map((guess) => ({ heroes: guess, ...currentResult(guess, challenge) })),
    guessesRemaining: Math.max(0, 10 - current.guesses.length),
    result: solvedAt >= 0 ? "solved" : current.guesses.length >= 10 ? "failed" : "playing",
    ...(isFinished() ? { solution: challenge.code } : {}),
  });
};

render();
