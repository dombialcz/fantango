import { BOSS_DEFINITIONS } from "./bosses.js";

export const ENEMY_TYPES = {
  skeleton: { label: "Skeleton", row: "front", hp: 42, damage: 16, interval: 1050, color: "#bbb5a5", glyph: "S" },
  zombie: { label: "Zombie", row: "front", hp: 175, damage: 28, interval: 1950, color: "#71806a", glyph: "Z" },
  boneMage: { label: "Bone Mage", row: "back", hp: 58, damage: 38, interval: 1500, color: "#8a7aa0", glyph: "B" },
  necromancer: { label: "Necromancer", row: "back", hp: 95, damage: 16, interval: 2100, color: "#745887", glyph: "N" },
  cultist: { label: "Cultist", row: "front", hp: 55, damage: 22, interval: 850, color: "#9c725c", glyph: "C" },
  demon: { label: "Demon", row: "front", hp: 170, damage: 42, interval: 1700, color: "#a54f45", glyph: "D" },
  warlock: { label: "Warlock", row: "back", hp: 62, damage: 42, interval: 1400, color: "#965879", glyph: "W" },
  archdemon: { label: "Archdemon", row: "back", hp: 280, damage: 62, interval: 1850, color: "#c3493f", glyph: "A" },
  cutthroat: { label: "Cutthroat", row: "front", hp: 58, damage: 22, interval: 820, color: "#596b7f", glyph: "C" },
  enforcer: { label: "Enforcer", row: "front", hp: 165, damage: 38, interval: 1600, color: "#705d55", glyph: "E" },
  marksman: { label: "Marksman", row: "back", hp: 70, damage: 40, interval: 1350, color: "#687c94", glyph: "M" },
  assassin: { label: "Assassin", row: "back", hp: 72, damage: 55, interval: 780, color: "#53627d", glyph: "A" },
  goblin: { label: "Goblin", row: "front", hp: 42, damage: 16, interval: 1050, color: "#7f9a53", glyph: "G" },
  orc: { label: "Orc", row: "front", hp: 175, damage: 32, interval: 1950, color: "#66804a", glyph: "O" },
  goblinArcher: { label: "Goblin Archer", row: "back", hp: 58, damage: 38, interval: 1500, color: "#85954e", glyph: "G" },
  orcShaman: { label: "Orc Hexer", row: "back", hp: 95, damage: 42, interval: 1800, color: "#718c5d", glyph: "H" },
  ...BOSS_DEFINITIONS,
};

