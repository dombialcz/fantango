import { createRng, shuffle } from "./random.js";

export const HERO_CLASSES = Object.freeze([
  { id: "knight", label: "Knight", image: "assets/heroes/knight.png" },
  { id: "thief", label: "Thief", image: "assets/heroes/thief.png" },
  { id: "bard", label: "Bard", image: "assets/heroes/bard.png" },
  { id: "cleric", label: "Cleric", image: "assets/heroes/cleric.png" },
  { id: "barbarian", label: "Barbarian", image: "assets/heroes/barbarian.png" },
  { id: "ranger", label: "Ranger", image: "assets/heroes/ranger.png" },
  { id: "mage", label: "Mage", image: "assets/heroes/mage.png" },
]);

export const CHALLENGES = Object.freeze([
  { id: "easy", label: "Easy", size: 5, pattern: "trio-two-singles" },
  { id: "medium", label: "Medium", size: 6, pattern: "trio-three-singles" },
  { id: "hard", label: "Hard", size: 7, pattern: "trio-pair-two-singles" },
]);

const HERO_BY_ID = Object.fromEntries(HERO_CLASSES.map((hero) => [hero.id, hero]));
const PAIR_NAMES = Object.freeze({
  barbarian: "Wild",
  thief: "Secret",
  cleric: "Holy",
  knight: "Iron",
  bard: "Merry",
  ranger: "Keen",
  mage: "Arcane",
});
const TRIO_NAMES = Object.freeze({
  cleric: "Clergy",
  knight: "Order",
  mage: "Covenant",
  thief: "Guild",
  ranger: "Hunt",
  bard: "Chorus",
  barbarian: "Warband",
});
const SINGLE_NAMES = Object.freeze({
  ranger: "of Mirkwood",
  cleric: "of Benevolence",
  barbarian: "of Vengeance",
  mage: "of Secrets",
  thief: "of Coin",
  knight: "of Oaths",
  bard: "of Song",
});

function choose(items, random) {
  return items[Math.floor(random() * items.length)];
}

function shuffled(items, random) {
  return shuffle(items, random);
}

function countTypes(code) {
  return code.reduce((counts, type) => {
    counts[type] = (counts[type] ?? 0) + 1;
    return counts;
  }, {});
}

export function generateChallenge(dateKey, difficulty) {
  const challenge = CHALLENGES.find((item) => item.id === difficulty);
  if (!challenge) throw new Error(`Unknown Mastermind challenge: ${difficulty}`);

  const random = createRng(`vaultbound-mastermind-v1:${dateKey}:${challenge.id}`);
  const allTypes = HERO_CLASSES.map((hero) => hero.id);
  const trio = choose(allTypes, random);
  const remainingTypes = allTypes.filter((type) => type !== trio);
  const pair = challenge.id === "hard" ? choose(remainingTypes, random) : null;
  const singlePool = remainingTypes.filter((type) => type !== pair);
  const singleCount = challenge.size - 3 - (pair ? 2 : 0);
  const singles = shuffled(singlePool, random).slice(0, singleCount);
  const revealedSingle = choose(singles, random);
  const code = shuffled([
    trio,
    trio,
    trio,
    ...(pair ? [pair, pair] : []),
    ...singles,
  ], random);

  const titleParts = [
    ...(pair ? [PAIR_NAMES[pair]] : []),
    TRIO_NAMES[trio],
    SINGLE_NAMES[revealedSingle],
  ];

  return {
    ...challenge,
    dateKey,
    code,
    title: titleParts.join(" "),
    clues: [
      ...(pair
        ? [{ kind: "pair", type: pair, text: `${PAIR_NAMES[pair]} means exactly two ${pluralLabel(pair)}.` }]
        : []),
      { kind: "trio", type: trio, text: `${TRIO_NAMES[trio]} means exactly three ${pluralLabel(trio)}.` },
      { kind: "single", type: revealedSingle, text: `${SINGLE_NAMES[revealedSingle]} means exactly one ${HERO_BY_ID[revealedSingle].label}.` },
    ],
    counts: countTypes(code),
    revealedSingle,
  };
}

export function pluralLabel(type) {
  const label = HERO_BY_ID[type]?.label;
  if (!label) return "heroes";
  if (label === "Thief") return "Thieves";
  if (label.endsWith("s")) return `${label}es`;
  return `${label}s`;
}

export function scoreGuess(code, guess) {
  let exact = 0;
  const unmatchedCode = {};
  const unmatchedGuess = {};

  for (let index = 0; index < code.length; index += 1) {
    if (code[index] === guess[index]) {
      exact += 1;
    } else {
      unmatchedCode[code[index]] = (unmatchedCode[code[index]] ?? 0) + 1;
      unmatchedGuess[guess[index]] = (unmatchedGuess[guess[index]] ?? 0) + 1;
    }
  }

  const misplaced = Object.keys(unmatchedGuess).reduce(
    (total, type) => total + Math.min(unmatchedGuess[type], unmatchedCode[type] ?? 0),
    0,
  );
  return { exact, misplaced };
}

export function evaluateGuess(code, guess) {
  if (!Array.isArray(code) || !Array.isArray(guess) || code.length !== guess.length) return null;
  if (guess.some((type) => !HERO_BY_ID[type])) return null;
  return scoreGuess(code, guess);
}
