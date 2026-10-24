import { localDateKey } from "./generator.js";
import { CHALLENGES, HERO_CLASSES, evaluateGuess, generateChallenge } from "./mastermind-core.js";
import { installPortraitDrag } from "./mastermind-drag.js";
import { installMastermindTutorial } from "./mastermind-tutorial.js";
import { installMastermindAdventures } from "./mastermind-adventure.js";
import { PARTY_NAMES } from "./mastermind-names.js";

const HERO_BY_ID = Object.fromEntries(HERO_CLASSES.map((hero) => [hero.id, hero]));
const COPY = {
  en: {
    home: "Home", homeKicker: "THE PARTY IS A PUZZLE", homeSubtitle: "Read the clues. Find your party.",
    playTutorial: "Play Tutorial", playStories: "Play Stories", playDaily: "Daily Puzzles",
    tutorialKicker: "START HERE", tutorialTitle: "A thief in the treasury", tutorialDescription: "Learn one step at a time, with guided clues and unlimited tries.",
    storiesKicker: "A LITTLE ADVENTURE", storiesTitle: "From tavern to royal court", storiesDescription: "Follow two short stories. Solve each scene with five health and free hints.",
    dailyKicker: "A FRESH CODE EVERY DAY", dailyTitle: "Three hidden formations", dailyDescription: "Decode a party name. Choose Easy, Medium or Hard, with unlimited guesses.",
    brandKicker: "DAILY CHALLENGE",
    gameKicker: "THE DAILY HERO CODE",
    gameTitle: "Mastermind",
    gameSubtitle: "Read the party name. Rebuild the formation.",
    backVaultbound: "Back to Vaultbound",
    languageLabel: "Language",
    difficultyLabel: "Daily challenge difficulty",
    guessRowsLabel: "Guess history and current formation",
    currentFormation: "Current formation",
    historyLabel: "Previous guesses, newest first",
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
    absentLegend: "Not included: wrong class or extra copy",
    chooseHeroes: "Choose heroes",
    pickerSubtitle: "Select a class to fill the next open place.",
    keyboardPick: "quick pick",
    keyboardSubmit: "submit",
    dailyNote: "Three new formations arrive each day.",
    playFantango: "Play Fantango",
    dailyFooter: "A new code every day · Three challenges",
    ruleNote: "No prefix means no pair. No class appears four times; each named duplicate is exact, and every other hero is a singleton.",
    exactCount: (count) => `Exactly ${count}`,
    rowLabel: (number) => `Guess ${number}`,
    emptyPlace: (place) => `Place ${place}, empty`,
    filledPlace: (place, hero) => `Place ${place}, ${hero}. Activate to clear it.`,
    heroChoice: (hero, key) => `Add ${hero}. Keyboard shortcut ${key}.`,
    feedbackCount: (exact, misplaced, absent) => `${exact} in place, ${misplaced} elsewhere, ${absent} not included (wrong class or extra copy)`,
    attempts: (used) => `${used} ${used === 1 ? "guess" : "guesses"}`,
    dateLocale: "en-GB",
    unsolvedMessage: "Choose a hero to fill the highlighted row. Select a filled place to change it.",
    solvedMessage: (attempts, party) => `Solved in ${attempts} ${attempts === 1 ? "guess" : "guesses"}. The hidden party was ${party}.`,
    dragHint: "Hold a portrait, then drag to move or swap it. Drag from an earlier guess to copy. Unlimited guesses.",
    copyHero: (hero) => `Copy ${hero} to the next open place, or hold and drag to a place.`,
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
    home: "Ekran główny", homeKicker: "DRUŻYNA PEŁNA ZAGADEK", homeSubtitle: "Odczytaj wskazówki. Odtwórz drużynę.",
    playTutorial: "Samouczek", playStories: "Historie", playDaily: "Codzienne zagadki",
    tutorialKicker: "ZACZNIJ TUTAJ", tutorialTitle: "Złodziej w skarbcu", tutorialDescription: "Poznaj zasady krok po kroku, ze wskazówkami i bez limitu prób.",
    storiesKicker: "MAŁA PRZYGODA", storiesTitle: "Z karczmy na królewski dwór", storiesDescription: "Dwie krótkie opowieści. Rozwiązuj sceny z pięcioma punktami zdrowia i darmowymi podpowiedziami.",
    dailyKicker: "NOWY KOD KAŻDEGO DNIA", dailyTitle: "Trzy ukryte drużyny", dailyDescription: "Odczytaj nazwę drużyny. Wybierz poziom Łatwy, Średni lub Trudny, bez limitu prób.",
    brandKicker: "CODZIENNE WYZWANIE",
    gameKicker: "CODZIENNY KOD BOHATERÓW",
    gameTitle: "Mastermind",
    gameSubtitle: "Odczytaj nazwę drużyny. Odtwórz jej skład.",
    backVaultbound: "Wróć do Vaultbound",
    languageLabel: "Język",
    difficultyLabel: "Poziom dzisiejszego wyzwania",
    guessRowsLabel: "Historia prób i bieżąca drużyna",
    currentFormation: "Bieżący skład",
    historyLabel: "Wcześniejsze próby, od najnowszej",
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
    absentLegend: "Brak w składzie: inna klasa lub nadmiarowa kopia",
    chooseHeroes: "Wybierz bohaterów",
    pickerSubtitle: "Wybierz klasę, aby uzupełnić kolejne wolne miejsce.",
    keyboardPick: "wybór klas",
    keyboardSubmit: "zatwierdź",
    dailyNote: "Każdego dnia czekają trzy nowe składy.",
    playFantango: "Zagraj w Fantango",
    dailyFooter: "Nowy kod każdego dnia · Trzy wyzwania",
    ruleNote: "Brak przedrostka oznacza brak pary. Żadna klasa nie występuje cztery razy; wskazane duplikaty są dokładne, a pozostałe klasy pojawiają się pojedynczo.",
    exactCount: (count) => `Dokładnie ${count}×`,
    rowLabel: (number) => `Próba ${number}`,
    emptyPlace: (place) => `Miejsce ${place}, puste`,
    filledPlace: (place, hero) => `Miejsce ${place}, ${hero}. Naciśnij, aby usunąć.`,
    heroChoice: (hero, key) => `Dodaj: ${hero}. Skrót klawiszowy ${key}.`,
    feedbackCount: (exact, misplaced, absent) => `${exact} na miejscu, ${misplaced} w innym miejscu, ${absent} poza składem (inna klasa lub nadmiarowa kopia)`,
    attempts: (used) => `Próby: ${used}`,
    dateLocale: "pl-PL",
    unsolvedMessage: "Wybierz klasę, aby wypełnić podświetlony wiersz. Naciśnij zajęte miejsce, aby je zmienić.",
    solvedMessage: (attempts, party) => `Rozszyfrowano w ${attempts} ${attempts === 1 ? "próbie" : "próbach"}. Ukryta drużyna: ${party}.`,
    dragHint: "Przytrzymaj portret i przeciągnij, aby przenieść lub zamienić bohaterów. Z wcześniejszej próby kopiujesz. Bez limitu prób.",
    copyHero: (hero) => `Skopiuj: ${hero}, na kolejne wolne miejsce lub przytrzymaj i przeciągnij.`,
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
const state = { screen: "home", difficulty: "easy", locale: readLocale(), selectedSlot: 0 };

const todayDate = document.querySelector("#today-date");
const languageButtons = [...document.querySelectorAll("[data-locale]")];
const challengeTabs = [...document.querySelectorAll("[data-challenge]")];
const partyName = document.querySelector("#party-name");
const missionLevel = document.querySelector("#mission-level");
const clueParts = document.querySelector("#clue-parts");
const guessCounter = document.querySelector("#guess-counter");
const guessBoard = document.querySelector("#guess-board");
const currentGuess = document.querySelector("#current-guess");
const guessHistory = document.querySelector("#guess-history");
const heroPicker = document.querySelector("#hero-picker");
const clearButton = document.querySelector("#clear-button");
const submitButton = document.querySelector("#submit-button");
const gameMessage = document.querySelector("#game-message");
let portraitDrag;
const tutorial = installMastermindTutorial({
  root: document.querySelector("#mastermind-tutorial"),
  entry: document.querySelector("#mastermind-tutorial-entry"),
  getLocale: () => state.locale,
  onAdventureStart: () => adventures.start(0),
  onModeChange: (active, completed) => {
    portraitDrag?.cancel();
    state.screen = active ? "tutorial" : completed ? "daily" : "home";
    if (completed) chooseChallenge("easy");
    else render();
    if (!active) {
      if (state.screen === "home") clearModeParams();
      focusScreen();
    }
  },
});

const adventures = installMastermindAdventures({
  root: document.querySelector("#mastermind-adventure"),
  entry: document.querySelector("#mastermind-adventure-entry"),
  getLocale: () => state.locale,
  onModeChange: active => {
    portraitDrag?.cancel();
    state.screen = active ? "adventure" : "stories";
    render();
    if (!active) focusScreen();
  },
});

function focusScreen() {
  const target = { home: "mastermind-home-title", stories: "stories-title", daily: "daily-title" }[state.screen];
  if (target) document.getElementById(target).focus();
}
function clearModeParams() {
  const url = new URL(location.href);
  for (const key of ["tutorial", "adventure", "daily"]) url.searchParams.delete(key);
  history.replaceState(null, "", url);
}
function showScreen(screen) {
  // Leaving a short run deliberately discards it; daily progress stays in its own store.
  if (tutorial.active) tutorial.leave();
  if (adventures.active) adventures.leave();
  portraitDrag?.cancel();
  state.screen = screen;
  if (screen === "home") clearModeParams();
  render(); focusScreen();
}

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
    for (const guess of saved.guesses) {
      if (!Array.isArray(guess) || guess.length !== challenge.size || guess.some((type) => !HERO_BY_ID[type])) break;
      guesses.push([...guess]);
      if (evaluateGuess(levels[challenge.id].code, guess)?.exact === challenge.size) break;
    }
    const draft = Array.isArray(saved.draft) && saved.draft.length === challenge.size
      ? saved.draft.map((type) => (type === null || HERO_BY_ID[type] ? type : null))
      : fallback.draft;
    return { guesses, draft: isFinished(challenge.id, guesses) ? fallback.draft : draft };
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
  const result = evaluateGuess(challenge.code, guess);
  return result ? { ...result, absent: challenge.size - result.exact - result.misplaced } : null;
}

function isFinished(id = state.difficulty, guesses = progress[id].guesses) {
  const challenge = levels[id];
  return guesses.some((guess) => evaluateGuess(challenge.code, guess)?.exact === challenge.size);
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
  guessBoard.setAttribute("aria-describedby", "drag-hint");
  currentGuess.setAttribute("aria-label", strings.currentFormation);
  guessHistory.setAttribute("aria-label", strings.historyLabel);
  heroPicker.setAttribute("aria-label", strings.heroClassesLabel);
  document.querySelector(".board-legend").setAttribute("aria-label", strings.feedbackLegendLabel);
  document.querySelector("#rule-note").textContent = strings.ruleNote;
  languageButtons.forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.locale === state.locale)));
  todayDate.dateTime = dateKey;
  todayDate.textContent = new Intl.DateTimeFormat(strings.dateLocale, {
    weekday: "short", month: "short", day: "numeric",
  }).format(new Date(`${dateKey}T00:00:00`));
}

function applyHeroAppearance(element, hero) {
  element.dataset.hero = hero.id;
  element.style.setProperty("--hero-color", hero.color);
  element.style.setProperty("--hero-tint", `${hero.color}24`);
}

function makeCluePart(clue) {
  const strings = copy();
  const hero = HERO_BY_ID[clue.type];
  const count = clue.kind === "pair" ? 2 : clue.kind === "trio" ? 3 : 1;
  const chip = document.createElement("article");
  chip.className = `clue-card clue-${clue.kind}`;
  applyHeroAppearance(chip, hero);
  const image = document.createElement("img");
  image.src = hero.image;
  image.alt = "";
  const text = document.createElement("span");
  text.className = "clue-text";
  const kind = document.createElement("span");
  kind.className = "clue-kind";
  kind.textContent = PARTY_NAMES[state.locale][clue.kind][clue.type];
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
  feedback.setAttribute("role", "img");
  const label = copy().feedbackCount(result.exact, result.misplaced, result.absent);
  feedback.setAttribute("aria-label", label);
  feedback.title = label;
  for (const [kind, count, legend] of [
    ["exact", result.exact, copy().exactLegend],
    ["misplaced", result.misplaced, copy().misplacedLegend],
    ["absent", result.absent, copy().absentLegend],
  ]) {
    const score = document.createElement("span");
    score.className = `feedback-score ${kind}-score`;
    score.title = `${count} · ${legend}`;
    const dot = document.createElement("i");
    dot.className = `feedback-dot ${kind}`;
    dot.setAttribute("aria-hidden", "true");
    const number = document.createElement("b");
    number.textContent = String(count);
    score.append(dot, number);
    feedback.append(score);
  }
  return feedback;
}

function makeLineup(challenge, guess, currentRow = false, rowIndex = 0, current = currentProgress()) {
  const lineup = document.createElement("span");
  lineup.className = "row-lineup";
  lineup.style.setProperty("--party-size", challenge.size);
  if (!currentRow && guess) {
    for (const [index, type] of guess.entries()) {
      const tile = document.createElement("button");
      tile.type = "button";
      tile.disabled = isFinished();
      tile.dataset.slot = String(index);
      tile.dataset.historyRow = String(rowIndex);
      tile.setAttribute("aria-label", copy().copyHero(localizedHero(type)));
      tile.addEventListener("click", () => placeHero(type));
      tile.className = "guess-tile";
      applyHeroAppearance(tile, HERO_BY_ID[type]);
      const image = document.createElement("img");
      image.src = HERO_BY_ID[type].image;
      image.draggable = false;
      image.alt = "";
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
      tile.dataset.slot = String(index);
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
      applyHeroAppearance(tile, HERO_BY_ID[type]);
      const image = document.createElement("img");
      image.src = HERO_BY_ID[type].image;
      image.draggable = false;
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
  const visibleRows = current.guesses.length + (locked ? 0 : 1);
  const rows = Array.from({ length: visibleRows }, (_, index) => {
    const row = document.createElement("li");
    row.className = "guess-row";
    row.value = index + 1;
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
      row.append(makeLineup(challenge, guess, false, index));
      row.append(renderFeedback(result));
    } else if (index === current.guesses.length && !locked) {
      row.classList.add("row-active");
      row.append(makeLineup(challenge, null, true, index, current));
      const pending = document.createElement("span");
      pending.className = "row-pending";
      pending.textContent = "—";
      pending.setAttribute("aria-hidden", "true");
      row.append(pending);
    }
    return row;
  });
  currentGuess.replaceChildren(...rows.filter(row => row.classList.contains("row-active")));
  guessHistory.replaceChildren(...rows.filter(row => row.classList.contains("row-submitted")).reverse());
  guessHistory.start = current.guesses.length;
}

function renderPicker() {
  const locked = isFinished();
  const choices = HERO_CLASSES.map((hero, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "hero-choice";
    applyHeroAppearance(button, hero);
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
  gameMessage.classList.add("success");
  gameMessage.textContent = copy().solvedMessage(solvedAt + 1, party);
}

function render() {
  portraitDrag?.cancel();
  const strings = copy();
  const challenge = currentChallenge();
  const current = currentProgress();
  const locked = isFinished();
  const completeDraft = current.draft.every((type) => type !== null);

  applyCopy();
  tutorial.render();
  adventures.render();
  document.querySelector("#mastermind-tutorial-entry").hidden = true;
  document.querySelector("#mastermind-adventure-entry").hidden = state.screen !== "stories";
  document.querySelector("#mastermind-home").hidden = state.screen !== "home";
  document.querySelector("#mastermind-stories").hidden = state.screen !== "stories";
  document.querySelector("#mastermind-daily").hidden = state.screen !== "daily";
  document.querySelector(".intro-row").hidden = state.screen !== "daily";
  document.querySelector(".page-footer").hidden = state.screen !== "daily";
  document.querySelector("#mastermind-home-button").hidden = state.screen === "home";
  todayDate.hidden = state.screen !== "daily";
  if (["home", "stories"].includes(state.screen)) document.querySelector('[data-i18n="brandKicker"]').textContent = "MASTERMIND";
  partyName.textContent = localizedPartyName(challenge);
  missionLevel.textContent = strings[state.difficulty];
  guessCounter.textContent = strings.attempts(current.guesses.length);
  challengeTabs.forEach((button) => {
    const id = button.dataset.challenge;
    button.setAttribute("aria-pressed", String(id === state.difficulty));
    const result = isFinished(id, progress[id].guesses);
    const mark = button.querySelector(".difficulty-result");
    mark.textContent = result ? "✓" : "";
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

document.querySelector("#home-play-tutorial").addEventListener("click", () => tutorial.start());
document.querySelector("#home-play-stories").addEventListener("click", () => showScreen("stories"));
document.querySelector("#home-play-daily").addEventListener("click", () => showScreen("daily"));
document.querySelector("#mastermind-home-button").addEventListener("click", () => showScreen("home"));

document.addEventListener("keydown", (event) => {
  if (tutorial.active) { tutorial.keydown(event); return; }
  if (adventures.active) { adventures.keydown(event); return; }
  if (state.screen !== "daily") return;
  if (event.key === "Escape") { portraitDrag.cancel(); return; }
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

window.advanceTime = () => { if (!tutorial.active && !adventures.active) render(); };
window.render_game_to_text = () => {
  if (tutorial.active) return JSON.stringify(tutorial.snapshot());
  if (adventures.active) return JSON.stringify(adventures.snapshot());
  if (["home", "stories"].includes(state.screen)) return JSON.stringify({ game: "Vaultbound Mastermind", mode: state.screen, locale: state.locale, date: dateKey, choices: state.screen === "home" ? [copy().playTutorial, copy().playStories, copy().playDaily] : [...document.querySelectorAll("#mastermind-adventure-entry button")].map(button => button.textContent.trim()) });
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
    guessLimit: null,
    guessesRemaining: null,
    drag: portraitDrag.snapshot(),
    result: solvedAt >= 0 ? "solved" : "playing",
    ...(isFinished() ? { solution: challenge.code } : {}),
  });
};

portraitDrag = installPortraitDrag({
  board: guessBoard,
  canDrag: () => state.screen === "daily" && !isFinished(),
  onDrop: ({ hero, sourceSlot, targetSlot, copy: clone }) => {
    const draft = currentProgress().draft;
    if (!clone && sourceSlot === targetSlot) return;
    if (!clone) draft[sourceSlot] = draft[targetSlot];
    draft[targetSlot] = hero;
    state.selectedSlot = draft.findIndex(type => type === null);
    if (state.selectedSlot < 0) state.selectedSlot = targetSlot;
    saveProgress();
    render();
  },
});
if (new URLSearchParams(location.search).get("daily") === "1") state.screen = "daily";
render();
if (new URLSearchParams(location.search).get("tutorial") === "1") tutorial.start();

const adventureParam = new URLSearchParams(location.search).get("adventure");
if (!tutorial.active && ["1", "2"].includes(adventureParam)) adventures.start(Number(adventureParam) - 1);
// Both temporary modes reset on a restored browser-history page; sync entry visibility last.
addEventListener("pageshow", event => { if (event.persisted) render(); });
