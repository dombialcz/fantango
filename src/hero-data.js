// Shared hero definitions for the campaign and standalone tutorial.
export const HERO_TYPES = {
  knight: {
    label: "Knight",
    row: "front",
    hp: 1,
    damage: 0.8,
    interval: 1200,
    color: "#9bb4c8",
    image: "assets/heroes/knight.png",
    summary: "Front-line defender. 50% chance to intercept single-target attacks on allies while unfrozen. Area attacks cannot be intercepted.",
  },
  thief: {
    label: "Thief",
    row: "front",
    hp: 0.7,
    damage: 0.6,
    interval: 900,
    color: "#7594c8",
    image: "assets/heroes/thief.png",
    summary: "Dodges on the front line and finishes the weakest enemy in the enemy front row.",
  },
  bard: {
    label: "Bard",
    row: "back",
    hp: 0.6,
    damage: 0,
    interval: Infinity,
    color: "#d99a69",
    image: "assets/heroes/bard.png",
    summary: "Continuously plays Rally, Defense or Power for the party. Commands switch songs; two or more living Bards make songs 50% stronger.",
  },
  cleric: {
    label: "Cleric",
    row: "front",
    hp: 0.8,
    damage: 0.2,
    heal: 0.15,
    interval: 1400,
    color: "#e7d891",
    image: "assets/heroes/cleric.png",
    summary: "Attacks and heals the living ally missing the most HP, including itself.",
  },
  barbarian: {
    label: "Barbarian",
    row: "front",
    hp: 1.2,
    damage: 1.5,
    interval: 1600,
    color: "#c97058",
    image: "assets/heroes/barbarian.png",
    summary: "Crushes the enemy with the highest health.",
  },
  ranger: {
    label: "Ranger",
    row: "back",
    hp: 0.8,
    damage: 0.9,
    interval: 1100,
    color: "#79a66a",
    image: "assets/heroes/ranger.png",
    summary: "Targets the enemy back row before the front.",
  },
  mage: {
    label: "Mage",
    row: "back",
    hp: 0.5,
    damage: 0.6,
    interval: 1400,
    color: "#a684dc",
    image: "assets/heroes/mage.png",
    summary: "Strikes one enemy per Mage Guild level, back row first.",
  },
};

export const HERO_NAMES = {
  knight: ["Aveline", "Branna", "Helena", "Ysabel"],
  thief: ["Nikolai", "Silas", "Viktor", "Dorian"],
  bard: ["Lucan", "Milo", "Orfeo", "Tristan"],
  cleric: ["Ansel", "Elowen", "Marek", "Sabine"],
  barbarian: ["Brynjar", "Ragnar", "Korg", "Ulf"],
  ranger: ["Arwen", "Kaia", "Rosalind", "Sylvi"],
  mage: ["Celeste", "Isolde", "Morgana", "Vivienne"],
};

export function heroPower(level) {
  return 100 + (level - 1) * 70;
}
