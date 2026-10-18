import { offerLevelChances, rollOfferLevel } from "./hero-offers.js";
import { retreatLevelChance, rollRetreatLevelUps } from "./retreat-levels.js";
import { BOSS_FLOOR, floorGoldReward, isBossFloor } from "./dungeon-progression.js";
import { enemyTypeForRoll, FLAVOR_ROSTERS } from "./enemy-rosters.js";
import {
  BUILDING_DEFINITIONS,
  alchemistSupplies,
  buildingEffects,
  buildingUpgradeCost,
  createTownBuildings,
} from "./town.js";

const canvas = document.querySelector("#dungeon-game");
const context = canvas.getContext("2d");

let WIDTH = 1200;
let HEIGHT = 800;
let layoutMode = "desktop";
let hitRegions = [];
let previousFrame = performance.now();
let nextHeroId = 1;
let nextEnemyId = 1;
let combatRects = new Map();

const COMBAT_DAMAGE_SCALE = 0.25;
const COMBAT_INTERVAL_SCALE = 1.5;
const COMBAT_EFFECT_DURATION = 700;

const COLORS = {
  ink: "#06101b",
  panel: "rgba(6, 15, 25, 0.94)",
  panelSoft: "rgba(15, 29, 43, 0.92)",
  line: "rgba(188, 157, 96, 0.42)",
  gold: "#d7ae5d",
  goldBright: "#f5dda5",
  text: "#eee5d4",
  muted: "#9eacb8",
  danger: "#d76862",
  heal: "#77cba1",
  blue: "#6aa8d8",
};

const HERO_TYPES = {
  knight: {
    label: "Knight",
    row: "front",
    hp: 1,
    damage: 0.8,
    interval: 1200,
    color: "#9bb4c8",
    image: "assets/heroes/knight.png",
    summary: "Guards the front and strikes a random front enemy.",
  },
  thief: {
    label: "Thief",
    row: "back",
    hp: 0.6,
    damage: 0.4,
    interval: 900,
    color: "#7594c8",
    image: "assets/heroes/thief.png",
    summary: "Finishes the weakest enemy in the front row.",
  },
  bard: {
    label: "Bard",
    row: "back",
    hp: 0.6,
    damage: 0,
    interval: Infinity,
    color: "#d99a69",
    image: "assets/heroes/bard.png",
    summary: "Gives a random non-bard ally +20% power.",
  },
  cleric: {
    label: "Cleric",
    row: "front",
    hp: 0.8,
    damage: 0.2,
    heal: 0.1,
    interval: 1400,
    color: "#e7d891",
    image: "assets/heroes/cleric.png",
    summary: "Attacks and heals a random injured ally.",
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
    damage: 0.8,
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

const HERO_KEYS = Object.keys(HERO_TYPES);
const TOWN_TYPES = Object.keys(BUILDING_DEFINITIONS);
const HERO_NAMES = {
  knight: ["Aldric", "Branna", "Cedric", "Ysabel"],
  thief: ["Nyx", "Silas", "Vesper", "Rook"],
  bard: ["Lucan", "Mira", "Orfeo", "Tamsin"],
  cleric: ["Ansel", "Elowen", "Marek", "Sabine"],
  barbarian: ["Brynjar", "Freya", "Korga", "Ulf"],
  ranger: ["Arden", "Kaia", "Rowan", "Sylvi"],
  mage: ["Cael", "Isolde", "Meris", "Vael"],
};

const FLAVORS = {
  undead: {
    name: "Undead Uprising",
    description: "Skeleton ranks and swollen zombies screen bone mages and their necromancers.",
  },
  demons: {
    name: "Demonic Invasion",
    description: "Cultists open the way for demons, warlocks, and rear-line archdemons.",
  },
  assassins: {
    name: "Assassins’ Guild",
    description: "Cutthroats and enforcers screen marksmen while assassins blink through the lines.",
  },
};

const ENEMY_TYPES = {
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
  vaultTyrant: { label: "Vault Tyrant", row: "front", hp: 750, damage: 65, interval: 1800, color: "#b85c4d", glyph: "V" },
};

const background = loadImage("assets/vault-bg.jpg");
const heroImages = Object.fromEntries(
  Object.entries(HERO_TYPES).map(([key, definition]) => [key, loadImage(definition.image)]),
);

function loadImage(source) {
  const image = new Image();
  image.addEventListener("load", () => render());
  image.src = source;
  return image;
}

function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function randomLiving(items) {
  const living = items.filter((item) => item.hp > 0);
  return living.length ? randomItem(living) : null;
}

function teamCapacity(day) {
  return 4 + Math.floor((day - 1) / 2);
}

function offerCount(day) {
  return 5 + day - 1;
}

function heroPower(level) {
  return 100 + (level - 1) * 70;
}

function speedMultiplier(level) {
  return 1 + (level - 1) * 0.15;
}

function upgradeCost(level) {
  return level >= 5 ? null : level * level;
}

function offerLevelOddsText() {
  const tavernLevel = state.buildings.tavern.level;
  const chances = offerLevelChances(tavernLevel);
  if (!chances.length) return `Tavern L${tavernLevel}: level 1 contracts`;
  const copy = chances.map(({ level, chance }) => `L${level} ${chance}%`).join("  →  ");
  return `Tavern L${tavernLevel}: ${copy}`;
}

function makeHero(type = randomItem(HERO_KEYS), tavernLevel = 1) {
  const names = HERO_NAMES[type];
  return {
    id: nextHeroId++,
    type,
    name: randomItem(names),
    level: rollOfferLevel(tavernLevel),
    active: false,
  };
}

function rollHeroes(count, tavernLevel = 1) {
  return Array.from({ length: count }, () => makeHero(randomItem(HERO_KEYS), tavernLevel));
}

function createCampaign() {
  const buildings = createTownBuildings();
  return {
    view: "tavern",
    day: 1,
    gold: 10,
    flavorKey: randomItem(Object.keys(FLAVORS)),
    deepestFloor: 0,
    victoryAchieved: false,
    victoryDay: null,
    floor: 0,
    rerollCost: 1,
    offers: rollHeroes(5, buildings.tavern.level),
    bench: [],
    selectedHeroId: null,
    selectedOfferId: null,
    offerPage: 0,
    benchPage: 0,
    townPage: 0,
    buildings,
    party: [],
    enemies: [],
    battleTime: 0,
    battleSpeed: 1,
    battlePaused: false,
    potionsRemaining: 0,
    potionHealRatio: 0.2,
    potionTargeting: false,
    battleLog: [],
    combatEffects: [],
    expeditionStartCount: 0,
    expeditionStartIds: [],
    retreatType: null,
    retreatLevelChance: 0,
    retreatLevelUpIds: [],
    floorReward: 0,
    resultTitle: "",
    resultCopy: "",
    message: "Recruit a party. Floor clears pay the current day in gold; floor 10 holds the boss.",
  };
}

let state = createCampaign();

function currentFlavor() {
  return FLAVORS[state.flavorKey];
}

function activeBench() {
  return state.bench.filter((hero) => hero.active);
}

function selectedHero() {
  return state.bench.find((hero) => hero.id === state.selectedHeroId) ?? null;
}

function selectedOffer() {
  return state.offers.find((hero) => hero.id === state.selectedOfferId) ?? null;
}

function openTown() {
  if (state.view !== "tavern") return;
  state.view = "town";
  state.message = "Invest expedition gold in the districts that shape your heroes.";
}

function closeTown() {
  if (state.view !== "town") return;
  state.view = "tavern";
  state.message = "Choose contracts, tune the roster, and prepare the next expedition.";
}

function upgradeTownBuilding(type, path = null) {
  if (state.view !== "town") return;
  const building = state.buildings[type];
  const definition = BUILDING_DEFINITIONS[type];
  if (!building || !definition) return;
  if (definition.utility ? path !== null : !["pathA", "pathB"].includes(path)) return;
  const cost = buildingUpgradeCost(building.level);
  if (cost === null) return;
  if (state.gold < cost) {
    state.message = `${definition.name} needs ${cost} gold for its next level.`;
    return;
  }
  state.gold -= cost;
  building.level += 1;
  if (definition.utility) {
    state.message = `${definition.name} reaches level ${building.level}: ${definition.core(building.level)}.`;
  } else {
    building[path] += 1;
    state.message = `${definition.name} reaches level ${building.level}: ${definition[path].short}.`;
  }
}

function benchLimit() {
  return teamCapacity(state.day) + 2;
}

function recruitOffer(index) {
  if (state.view !== "tavern") return;
  const hero = state.offers[index];
  if (!hero) return;
  if (state.bench.length >= benchLimit()) {
    state.message = `The bench is full. Keep at most ${benchLimit()} locked heroes.`;
    return;
  }
  hero.active = activeBench().length < teamCapacity(state.day);
  state.bench.push(hero);
  state.offers.splice(index, 1);
  state.selectedHeroId = hero.id;
  state.selectedOfferId = null;
  state.message = `${hero.name} the ${HERO_TYPES[hero.type].label} is locked on the bench.`;
  normalizePages();
}

function selectOffer(index) {
  if (state.view !== "tavern") return;
  const hero = state.offers[index];
  if (!hero) return;
  state.selectedOfferId = hero.id;
  state.selectedHeroId = null;
  state.message = `${hero.name}: ${HERO_TYPES[hero.type].summary}`;
}

function hireSelectedOffer() {
  const index = state.offers.findIndex((hero) => hero.id === state.selectedOfferId);
  if (index >= 0) recruitOffer(index);
}

function rerollOffers() {
  if (state.view !== "tavern") return;
  if (state.gold < state.rerollCost) {
    state.message = `You need ${state.rerollCost} gold for the next spin.`;
    return;
  }
  state.gold -= state.rerollCost;
  state.rerollCost += 1;
  state.offers = rollHeroes(offerCount(state.day), state.buildings.tavern.level);
  state.offerPage = 0;
  state.selectedOfferId = null;
  state.message = "The reel rattles. New contracts slide into view.";
}

function toggleSelectedActive() {
  const hero = selectedHero();
  if (!hero) return;
  if (!hero.active && activeBench().length >= teamCapacity(state.day)) {
    state.message = `Today’s party can hold ${teamCapacity(state.day)} heroes.`;
    return;
  }
  hero.active = !hero.active;
  state.message = hero.active ? `${hero.name} joins the expedition.` : `${hero.name} waits on the bench.`;
}

function upgradeSelected() {
  const hero = selectedHero();
  if (!hero) return;
  const cost = upgradeCost(hero.level);
  if (cost === null) {
    state.message = `${hero.name} has reached level 5.`;
    return;
  }
  if (state.gold < cost) {
    state.message = `That upgrade costs ${cost} gold.`;
    return;
  }
  state.gold -= cost;
  hero.level += 1;
  state.message = `${hero.name} rises to level ${hero.level}.`;
}

function dismissSelected() {
  const hero = selectedHero();
  if (!hero) return;
  state.bench = state.bench.filter((candidate) => candidate.id !== hero.id);
  state.selectedHeroId = null;
  state.message = `${hero.name} leaves the company.`;
  normalizePages();
}

function normalizePages() {
  const offerVisible = layoutMode === "portrait" ? 3 : layoutMode === "compact" ? 6 : 5;
  const benchVisible = layoutMode === "portrait" ? 4 : layoutMode === "compact" ? 7 : 6;
  state.offerPage = Math.max(0, Math.min(state.offerPage, Math.ceil(state.offers.length / offerVisible) - 1));
  state.benchPage = Math.max(0, Math.min(state.benchPage, Math.ceil(state.bench.length / benchVisible) - 1));
}

function pageOffers(direction) {
  const visible = layoutMode === "portrait" ? 3 : layoutMode === "compact" ? 6 : 5;
  const pages = Math.max(1, Math.ceil(state.offers.length / visible));
  state.offerPage = (state.offerPage + direction + pages) % pages;
}

function pageBench(direction) {
  const visible = layoutMode === "portrait" ? 4 : layoutMode === "compact" ? 7 : 6;
  const pages = Math.max(1, Math.ceil(state.bench.length / visible));
  state.benchPage = (state.benchPage + direction + pages) % pages;
}

function startExpedition() {
  const chosen = activeBench();
  if (!chosen.length) {
    state.message = "Choose at least one active hero before entering the dungeon.";
    return;
  }
  state.selectedHeroId = null;
  state.selectedOfferId = null;
  state.floor = 1;
  state.party = buildParty(chosen);
  state.expeditionStartCount = state.party.length;
  state.expeditionStartIds = chosen.map((hero) => hero.id);
  const supplies = alchemistSupplies(state.buildings.alchemist.level);
  state.potionsRemaining = supplies.count;
  state.potionHealRatio = supplies.healRatio;
  state.potionTargeting = false;
  state.battleLog = [];
  prepareFloor();
}

function buildParty(heroes) {
  const buffAmounts = new Map(heroes.map((hero) => [hero.id, 0]));
  for (const bard of heroes.filter((hero) => hero.type === "bard")) {
    const effects = buildingEffects("bard", state.buildings.bard);
    const available = heroes.filter((hero) => hero.type !== "bard");
    for (let index = 0; index < effects.bardTargets && available.length; index += 1) {
      const targetIndex = Math.floor(Math.random() * available.length);
      const [target] = available.splice(targetIndex, 1);
      buffAmounts.set(target.id, buffAmounts.get(target.id) + effects.bardBuff);
    }
  }

  return heroes.map((hero) => {
    const definition = HERO_TYPES[hero.type];
    const effects = buildingEffects(hero.type, state.buildings[hero.type]);
    const buffAmount = buffAmounts.get(hero.id) ?? 0;
    const power = heroPower(hero.level) * (1 + buffAmount);
    const maxHp = Math.round(power * definition.hp * effects.healthMultiplier);
    return {
      id: `hero-${hero.id}`,
      hero,
      side: "hero",
      type: hero.type,
      label: hero.name,
      row: definition.row,
      power,
      bardBuffPercent: Math.round(buffAmount * 100),
      buildingSpeed: effects.speedMultiplier,
      damageMultiplier: effects.damageMultiplier,
      damageReduction: effects.damageReduction,
      critChance: effects.critChance,
      executeBonus: effects.executeBonus,
      healRatio: effects.healRatio,
      mageTargets: effects.mageTargets,
      maxHp,
      hp: maxHp,
      timer: Math.random() * 450,
      flash: 0,
      actionFlash: 0,
      potionFlash: 0,
    };
  });
}

function floorScale(floor) {
  return 1 + Math.log2(Math.max(1, floor)) * 0.45;
}

function makeEnemy(type, floor = state.floor) {
  const definition = ENEMY_TYPES[type];
  const scale = floorScale(floor);
  const maxHp = Math.round(definition.hp * scale);
  return {
    id: `enemy-${nextEnemyId++}`,
    side: "enemy",
    type,
    label: definition.label,
    row: definition.row,
    maxHp,
    hp: maxHp,
    damage: Math.round(definition.damage * scale),
    timer: 950 + Math.random() * 650,
    returnAt: null,
    flash: 0,
    actionFlash: 0,
  };
}

function generateEnemies(floor) {
  if (isBossFloor(floor)) return [makeEnemy("vaultTyrant", floor)];
  const roster = FLAVOR_ROSTERS[state.flavorKey];
  const total = Math.min(2 + Math.ceil(floor * 0.58), 10);
  const enemies = [];
  for (let index = 0; index < total; index += 1) {
    const roll = Math.random();
    const type = enemyTypeForRoll(state.flavorKey, floor, roll);
    enemies.push(makeEnemy(type, floor));
  }
  if (floor % 3 === 0 || Math.random() < Math.min(0.08 + floor * 0.025, 0.38)) {
    enemies.push(makeEnemy(roster.special, floor));
  }
  return enemies;
}

function prepareFloor() {
  state.view = "battle";
  state.battlePaused = false;
  state.potionTargeting = false;
  state.enemies = generateEnemies(state.floor);
  state.battleTime = 0;
  state.combatEffects = [];
  state.party.forEach((hero, index) => {
    hero.timer = 650 + index * 420 + Math.random() * 220;
  });
  state.battleLog = isBossFloor(state.floor)
    ? ["The Vault Tyrant bars the road to victory."]
    : [`Floor ${state.floor}: ${state.enemies.length} enemies close in.`];
  state.message = isBossFloor(state.floor)
    ? "Boss floor: defeat the Vault Tyrant to claim victory."
    : "The battle runs on its own. Watch the rows and health bars.";
}

function livingParty() {
  return state.party.filter((unit) => unit.hp > 0);
}

function livingEnemies() {
  return state.enemies.filter((unit) => unit.hp > 0);
}

function unitsInRow(units, row) {
  return units.filter((unit) => unit.hp > 0 && unit.row === row);
}

function targetFrontFirst(units) {
  const front = unitsInRow(units, "front");
  return randomLiving(front.length ? front : unitsInRow(units, "back"));
}

function targetBackFirst(units) {
  const back = unitsInRow(units, "back");
  return randomLiving(back.length ? back : unitsInRow(units, "front"));
}

function addCombatEffect(source, target, kind = "attack") {
  if (!source || !target) return;
  source.actionFlash = 420;
  state.combatEffects.push({
    sourceId: source.id,
    sourceSide: source.side,
    targetId: target.id,
    kind,
    remaining: COMBAT_EFFECT_DURATION,
  });
  state.combatEffects = state.combatEffects.slice(-8);
}

function dealDamage(target, amount, source) {
  if (!target || target.hp <= 0) return;
  const sourceLabel = typeof source === "string" ? source : source.label;
  const critical = typeof source === "object"
    && source.side === "hero"
    && source.critChance > 0
    && Math.random() < source.critChance;
  const criticalAmount = critical ? amount * 2 : amount;
  const reducedAmount = target.side === "hero"
    ? criticalAmount * (1 - (target.damageReduction ?? 0))
    : criticalAmount;
  const damage = Math.max(1, Math.round(reducedAmount * COMBAT_DAMAGE_SCALE));
  target.hp = Math.max(0, target.hp - damage);
  target.flash = 420;
  if (typeof source === "object") addCombatEffect(source, target);
  if (critical) logBattle(`${sourceLabel} lands a critical hit.`);
  if (target.hp === 0) logBattle(`${sourceLabel} defeats ${target.label}.`);
  return damage;
}

function logBattle(copy) {
  state.battleLog.unshift(copy);
  state.battleLog = state.battleLog.slice(0, 4);
}

function heroInterval(unit) {
  const definition = HERO_TYPES[unit.type];
  if (!Number.isFinite(definition.interval)) return Infinity;
  const heroLevelSpeed = ["mage", "ranger"].includes(unit.type) ? 1 : speedMultiplier(unit.hero.level);
  return (definition.interval * COMBAT_INTERVAL_SCALE) / (heroLevelSpeed * unit.buildingSpeed);
}

function actHero(unit) {
  if (unit.hp <= 0 || unit.type === "bard") return;
  const definition = HERO_TYPES[unit.type];
  const enemies = livingEnemies();
  if (!enemies.length) return;

  if (unit.type === "mage") {
    const ordered = [...unitsInRow(enemies, "back"), ...unitsInRow(enemies, "front")];
    const targets = ordered.slice(0, unit.mageTargets);
    for (const target of targets) dealDamage(target, unit.power * definition.damage * unit.damageMultiplier, unit);
    logBattle(`${unit.label} arcs magic through ${targets.length} foe${targets.length === 1 ? "" : "s"}.`);
    return;
  }

  let target;
  if (unit.type === "thief") {
    const preferred = unitsInRow(enemies, "front");
    const pool = preferred.length ? preferred : unitsInRow(enemies, "back");
    target = [...pool].sort((a, b) => a.hp - b.hp)[0];
  } else if (unit.type === "barbarian") {
    target = [...enemies].sort((a, b) => b.hp - a.hp)[0];
  } else if (unit.type === "ranger") {
    target = targetBackFirst(enemies);
  } else {
    target = targetFrontFirst(enemies);
  }

  const executeMultiplier = unit.type === "thief" && target.hp <= target.maxHp * 0.5
    ? 1 + unit.executeBonus
    : 1;
  dealDamage(target, unit.power * definition.damage * unit.damageMultiplier * executeMultiplier, unit);
  if (target.hp > 0) logBattle(`${unit.label} strikes ${target.label}.`);

  if (unit.type === "cleric") {
    const damaged = livingParty().filter((ally) => ally.id !== unit.id && ally.hp < ally.maxHp);
    if (damaged.length) {
      const ally = randomItem(damaged);
      const amount = Math.max(1, Math.round(unit.power * unit.healRatio * COMBAT_DAMAGE_SCALE));
      ally.hp = Math.min(ally.maxHp, ally.hp + amount);
      addCombatEffect(unit, ally, "heal");
      logBattle(`${unit.label} restores ${amount} health to ${ally.label}.`);
    }
  }
}

function actEnemy(unit) {
  if (unit.hp <= 0) return;
  const heroes = livingParty();
  if (!heroes.length) return;

  if (unit.type === "necromancer" && livingEnemies().length < 14) {
    state.enemies.push(makeEnemy("skeleton"));
    logBattle("A necromancer drags another skeleton upright.");
    return;
  }

  if (unit.type === "vaultTyrant") {
    const front = unitsInRow(heroes, "front");
    const targets = front.length ? front : unitsInRow(heroes, "back");
    for (const target of targets) dealDamage(target, unit.damage, unit);
    logBattle(`The Vault Tyrant cleaves through the ${front.length ? "front" : "back"} row.`);
    return;
  }

  let target;
  if (unit.type === "archdemon") {
    target = targetBackFirst(heroes);
  } else if (unit.type === "assassin") {
    unit.row = "front";
    unit.returnAt = state.battleTime + 350;
    target = [...heroes].sort((a, b) => a.hp - b.hp)[0];
    logBattle(`${unit.label} blinks forward toward ${target.label}.`);
  } else if (["boneMage", "warlock", "marksman"].includes(unit.type)) {
    target = randomLiving(heroes);
  } else {
    target = targetFrontFirst(heroes);
  }
  dealDamage(target, unit.damage, unit);
  if (target.hp > 0) logBattle(`${unit.label} strikes ${target.label}.`);
}

function updateBattle(milliseconds) {
  if (state.view !== "battle" || state.battlePaused) return;
  const delta = milliseconds * state.battleSpeed;
  state.battleTime += delta;
  state.combatEffects = state.combatEffects
    .map((effect) => ({ ...effect, remaining: effect.remaining - delta }))
    .filter((effect) => effect.remaining > 0);
  for (const unit of [...state.party, ...state.enemies]) {
    unit.flash = Math.max(0, unit.flash - delta);
    unit.actionFlash = Math.max(0, unit.actionFlash - delta);
    unit.potionFlash = Math.max(0, (unit.potionFlash ?? 0) - delta);
  }

  for (const unit of [...livingParty()]) {
    const interval = heroInterval(unit);
    if (!Number.isFinite(interval)) continue;
    unit.timer -= delta;
    while (unit.timer <= 0 && unit.hp > 0 && livingEnemies().length) {
      actHero(unit);
      unit.timer += interval;
    }
  }

  if (livingEnemies().length) {
    for (const unit of [...livingEnemies()]) {
      if (unit.type === "assassin" && unit.returnAt !== null && state.battleTime >= unit.returnAt) {
        unit.row = "back";
        unit.returnAt = null;
      }
      unit.timer -= delta;
      while (unit.timer <= 0 && unit.hp > 0 && livingParty().length) {
        actEnemy(unit);
        unit.timer += ENEMY_TYPES[unit.type].interval * COMBAT_INTERVAL_SCALE;
      }
    }
  }

  const enemiesLeft = livingEnemies().length;
  const heroesLeft = livingParty().length;
  if (enemiesLeft === 0) finishFloor();
  else if (heroesLeft === 0) finishDay("The company was lost below. Tomorrow begins with fresh contracts.", null, "none");
  else {
    const retreatAt = state.expeditionStartCount > 2 ? 2 : Math.max(0, state.expeditionStartCount - 1);
    if (heroesLeft <= retreatAt) finishDay("The party is defeated, remaining heroes flee.", "Party Defeated");
    else if (state.battleTime >= 90000) finishDay("The fight becomes a hopeless stalemate. The company retreats.");
  }
}

function finishFloor() {
  clearCombatFeedback();
  state.view = "floor_result";
  state.floorReward = floorGoldReward(state.day);
  state.gold += state.floorReward;
  state.deepestFloor = Math.max(state.deepestFloor, state.floor);
  const survivorCount = livingParty().length;
  const survivorCopy = `${survivorCount} ${survivorCount === 1 ? "hero remains" : "heroes remain"}`;
  if (isBossFloor(state.floor)) {
    const firstVictory = !state.victoryAchieved;
    state.victoryAchieved = true;
    state.victoryDay ??= state.day;
    state.resultTitle = firstVictory ? "Victory" : "Boss Defeated";
    state.resultCopy = `The Vault Tyrant falls. ${survivorCopy}. The party claims ${state.floorReward} gold and may continue for a deeper record.`;
    state.message = "Victory is secured. Flee safely or continue beyond floor 10 for a deeper record.";
  } else {
    state.resultTitle = `Floor ${state.floor} Cleared`;
    state.resultCopy = `${survivorCopy}. The vault yields ${state.floorReward} gold for day ${state.day}.`;
    state.message = "Take the winnings and flee, or press deeper with your current health.";
  }
}

function continueExpedition() {
  if (state.view !== "floor_result") return;
  state.floor += 1;
  prepareFloor();
}

function finishDay(reason = "The company returns to the surface with its survivors.", title = null, retreatType = "automatic") {
  clearCombatFeedback();
  state.party = livingParty();
  resolveRetreatLevelUps(retreatType);
  const campaignEnded = state.day >= 10;
  state.resultTitle = title ?? (campaignEnded && state.victoryAchieved
    ? "Campaign Victory"
    : state.party.length ? "Expedition Ended" : "No One Returned");
  state.resultCopy = campaignEnded
    ? `${reason} ${state.victoryAchieved
      ? `The Vault Tyrant was defeated on day ${state.victoryDay}; your record is floor ${state.deepestFloor}.`
      : "Ten days expire before the Vault Tyrant is defeated."}`
    : reason;
  state.message = reason;
  state.view = campaignEnded ? "campaign_end" : "day_result";
}

function resolveRetreatLevelUps(retreatType) {
  state.retreatType = retreatType;
  state.retreatLevelChance = retreatLevelChance(state.party.length, retreatType);
  const eligibleIds = state.party
    .filter((unit) => unit.hero.level < 5)
    .map((unit) => unit.hero.id);
  state.retreatLevelUpIds = rollRetreatLevelUps(eligibleIds, state.retreatLevelChance);
}

function manualFleeLevelChance() {
  return retreatLevelChance(livingParty().length, "manual");
}

function retreatLevelResultText() {
  const count = state.retreatLevelUpIds.length;
  if (count === 0) return "no survivors gained a level";
  return `${count} survivor${count === 1 ? "" : "s"} gained a level`;
}

function togglePotionTargeting() {
  if (state.view !== "battle") return;
  if (state.potionTargeting) {
    state.potionTargeting = false;
    return;
  }
  if (state.potionsRemaining <= 0) return;
  if (!livingParty().some((unit) => unit.hp < unit.maxHp)) return;
  state.potionTargeting = true;
}

function usePotionOn(unit) {
  if (state.view !== "battle" || !state.potionTargeting || state.potionsRemaining <= 0) return;
  if (!unit || unit.side !== "hero" || unit.hp <= 0 || unit.hp >= unit.maxHp) return;
  const healing = Math.max(1, Math.round(unit.maxHp * state.potionHealRatio));
  const restored = Math.min(healing, unit.maxHp - unit.hp);
  unit.hp += restored;
  unit.potionFlash = 650;
  state.potionsRemaining -= 1;
  state.potionTargeting = false;
  logBattle(`A potion restores ${restored} health to ${unit.label}.`);
}

function clearCombatFeedback() {
  state.battlePaused = false;
  state.potionTargeting = false;
  state.combatEffects = [];
  for (const unit of [...state.party, ...state.enemies]) {
    unit.flash = 0;
    unit.actionFlash = 0;
    unit.potionFlash = 0;
  }
}

function fleeExpedition() {
  if (state.view !== "floor_result") return;
  finishDay("The company flees with its gold and surviving heroes.", null, "manual");
}

function midBattleFleeCost() {
  return Math.ceil(state.gold / 2);
}

function fleeMidBattle() {
  if (state.view !== "battle") return;
  const cost = midBattleFleeCost();
  state.gold -= cost;
  finishDay(
    cost > 0
      ? `The party abandons the fight and pays ${cost} gold to escape.`
      : "The party abandons the fight and escapes with nothing left to lose.",
    "Battle Abandoned",
    "manual",
  );
}

function advanceDay() {
  if (state.view !== "day_result") return;
  state.day += 1;
  const survivors = state.party.map((unit) => unit.hero);
  const reserves = state.bench.filter((hero) => !state.expeditionStartIds.includes(hero.id));
  for (const hero of survivors) {
    if (state.retreatLevelUpIds.includes(hero.id)) hero.level = Math.min(5, hero.level + 1);
    hero.active = true;
  }
  for (const hero of reserves) hero.active = false;
  state.bench = [...survivors, ...reserves];
  state.offers = rollHeroes(offerCount(state.day), state.buildings.tavern.level);
  state.selectedHeroId = survivors[0]?.id ?? null;
  state.selectedOfferId = null;
  state.offerPage = 0;
  state.benchPage = 0;
  state.rerollCost = 1;
  state.floor = 0;
  state.party = [];
  state.enemies = [];
  state.potionsRemaining = 0;
  state.potionTargeting = false;
  state.expeditionStartIds = [];
  const levelUps = state.retreatLevelUpIds.length;
  state.retreatType = null;
  state.retreatLevelChance = 0;
  state.retreatLevelUpIds = [];
  state.view = "tavern";
  state.message = levelUps > 0
    ? `Day ${state.day}. Survivors return healed; ${levelUps} gained a level. Floors now yield ${floorGoldReward(state.day)} gold.`
    : `Day ${state.day}. Survivors return healed; no one gained a level. Floors now yield ${floorGoldReward(state.day)} gold.`;
}

function resetCampaign() {
  nextHeroId = 1;
  nextEnemyId = 1;
  state = createCampaign();
}

function update(milliseconds) {
  const step = Math.min(100, milliseconds);
  updateBattle(step);
}

function configureLayout(force = false) {
  const portrait = window.innerWidth <= 900 && window.innerHeight >= window.innerWidth;
  const compact = window.innerHeight <= 600 && window.innerWidth > window.innerHeight;
  const nextMode = portrait ? "portrait" : compact ? "compact" : "desktop";
  if (!force && nextMode === layoutMode) return;
  layoutMode = nextMode;
  if (portrait) {
    WIDTH = 720;
    HEIGHT = 1280;
  } else if (compact) {
    WIDTH = 1400;
    HEIGHT = 720;
  } else {
    WIDTH = 1200;
    HEIGHT = 800;
  }
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  canvas.style.setProperty("--game-ratio", String(WIDTH / HEIGHT));
  normalizePages();
}

function roundedRect(x, y, width, height, radius) {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
}

function drawBackground() {
  if (background.complete && background.naturalWidth) {
    const imageRatio = background.naturalWidth / background.naturalHeight;
    const canvasRatio = WIDTH / HEIGHT;
    let sourceWidth = background.naturalWidth;
    let sourceHeight = background.naturalHeight;
    let sourceX = 0;
    let sourceY = 0;
    if (imageRatio > canvasRatio) {
      sourceWidth = sourceHeight * canvasRatio;
      sourceX = (background.naturalWidth - sourceWidth) / 2;
    } else {
      sourceHeight = sourceWidth / canvasRatio;
      sourceY = (background.naturalHeight - sourceHeight) / 2;
    }
    context.drawImage(background, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, WIDTH, HEIGHT);
  } else {
    context.fillStyle = COLORS.ink;
    context.fillRect(0, 0, WIDTH, HEIGHT);
  }
  context.fillStyle = "rgba(1, 5, 10, 0.74)";
  context.fillRect(0, 0, WIDTH, HEIGHT);
  const glow = context.createRadialGradient(WIDTH / 2, HEIGHT * 0.44, 50, WIDTH / 2, HEIGHT * 0.44, Math.max(WIDTH, HEIGHT) * 0.7);
  glow.addColorStop(0, "rgba(31, 56, 76, 0.3)");
  glow.addColorStop(1, "rgba(0, 0, 0, 0.55)");
  context.fillStyle = glow;
  context.fillRect(0, 0, WIDTH, HEIGHT);
}

function drawPanel(rect, alpha = 0.94) {
  roundedRect(rect.x, rect.y, rect.width, rect.height, 15);
  context.fillStyle = `rgba(6, 15, 25, ${alpha})`;
  context.fill();
  context.lineWidth = 1.5;
  context.strokeStyle = COLORS.line;
  context.stroke();
}

function drawHeader() {
  const portrait = layoutMode === "portrait";
  const compact = layoutMode === "compact";
  context.textAlign = "left";
  context.fillStyle = COLORS.goldBright;
  context.font = `small-caps 700 ${portrait ? 48 : compact ? 38 : 42}px Georgia`;
  context.fillText("VAULTBOUND", portrait ? 26 : 34, portrait ? 56 : 51);
  context.fillStyle = COLORS.muted;
  context.font = `italic ${portrait ? 20 : 16}px Georgia`;
  context.fillText("Ten days below", portrait ? 28 : 35, portrait ? 82 : compact ? 72 : 75);

  const statsY = portrait ? 111 : 45;
  context.textAlign = "right";
  context.fillStyle = COLORS.text;
  context.font = `700 ${portrait ? 19 : 17}px Georgia`;
  const floorCopy = state.floor ? `  •  Floor ${state.floor}` : "";
  context.fillText(`Day ${state.day}/10  •  ${state.gold} gold${floorCopy}`, WIDTH - 28, statsY);
  const bossActive = state.view === "battle" && isBossFloor(state.floor);
  context.fillStyle = state.victoryAchieved ? COLORS.heal : bossActive ? COLORS.danger : COLORS.gold;
  context.font = `${portrait ? 17 : 14}px Georgia`;
  const campaignStatus = state.victoryAchieved
    ? `${currentFlavor().name} • VICTORY`
    : bossActive ? "BOSS FLOOR • VAULT TYRANT" : currentFlavor().name;
  fitText(campaignStatus, WIDTH - 28, statsY + (portrait ? 27 : 24), portrait ? 400 : 360);
}

function addHit(rect, action, enabled = true) {
  if (enabled) hitRegions.push({ rect, action });
}

function drawButton(rect, label, options = {}) {
  const { accent = false, danger = false, enabled = true, sublabel = "", action = null } = options;
  roundedRect(rect.x, rect.y, rect.width, rect.height, 9);
  context.fillStyle = !enabled
    ? "rgba(25, 31, 38, 0.68)"
    : danger
      ? "rgba(99, 38, 38, 0.86)"
      : accent
        ? "rgba(119, 85, 34, 0.88)"
        : "rgba(22, 38, 52, 0.96)";
  context.fill();
  context.lineWidth = 1.5;
  context.strokeStyle = !enabled
    ? "rgba(130, 140, 147, 0.2)"
    : danger
      ? COLORS.danger
      : accent
        ? COLORS.gold
        : "rgba(155, 176, 190, 0.4)";
  context.stroke();
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = enabled ? COLORS.text : "rgba(158, 172, 184, 0.55)";
  context.font = `700 ${Math.min(22, rect.height * 0.32)}px Georgia`;
  context.fillText(label, rect.x + rect.width / 2, rect.y + rect.height / 2 - (sublabel ? 7 : 0));
  if (sublabel) {
    context.fillStyle = enabled ? COLORS.muted : "rgba(158, 172, 184, 0.45)";
    context.font = `${Math.min(14, rect.height * 0.2)}px Georgia`;
    context.fillText(sublabel, rect.x + rect.width / 2, rect.y + rect.height / 2 + 14);
  }
  context.textBaseline = "alphabetic";
  if (action) addHit(rect, action, enabled);
}

function fitText(text, x, y, maxWidth) {
  let output = text;
  while (context.measureText(output).width > maxWidth && output.length > 8) output = `${output.slice(0, -2)}…`;
  context.fillText(output, x, y);
}

function drawWrappedText(text, x, y, maxWidth, lineHeight, maxLines = 2) {
  const words = text.split(/\s+/);
  const lines = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (context.measureText(candidate).width <= maxWidth || !line) {
      line = candidate;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  const visible = lines.slice(0, maxLines);
  if (lines.length > maxLines) {
    let last = `${visible[maxLines - 1]}…`;
    while (context.measureText(last).width > maxWidth && last.length > 8) last = `${last.slice(0, -2)}…`;
    visible[maxLines - 1] = last;
  }
  visible.forEach((copy, index) => context.fillText(copy, x, y + index * lineHeight));
}

function drawHeroImage(hero, x, y, size) {
  const image = heroImages[hero.type];
  if (image?.complete && image.naturalWidth) {
    context.drawImage(image, x, y, size, size);
    return;
  }
  context.fillStyle = HERO_TYPES[hero.type].color;
  context.beginPath();
  context.arc(x + size / 2, y + size / 2, size * 0.42, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = COLORS.ink;
  context.textAlign = "center";
  context.font = `700 ${size * 0.3}px Georgia`;
  context.fillText(HERO_TYPES[hero.type].label[0], x + size / 2, y + size * 0.63);
}

function drawHeroCard(hero, rect, options = {}) {
  const { selected = false, offer = false } = options;
  const definition = HERO_TYPES[hero.type];
  roundedRect(rect.x, rect.y, rect.width, rect.height, 12);
  context.fillStyle = selected ? "rgba(31, 52, 69, 0.98)" : "rgba(10, 22, 34, 0.96)";
  context.fill();
  context.lineWidth = selected ? 3 : 1.5;
  context.strokeStyle = selected ? COLORS.goldBright : hero.active ? COLORS.gold : "rgba(157, 174, 185, 0.34)";
  context.stroke();

  const imageSize = Math.min(rect.width - 14, rect.height - 58);
  drawHeroImage(hero, rect.x + (rect.width - imageSize) / 2, rect.y + 5, imageSize);
  if (hero.active && !offer) {
    roundedRect(rect.x + 7, rect.y + 7, 55, 22, 7);
    context.fillStyle = "rgba(111, 77, 28, 0.94)";
    context.fill();
    context.fillStyle = COLORS.goldBright;
    context.font = "700 11px Georgia";
    context.textAlign = "center";
    context.fillText("ACTIVE", rect.x + 34.5, rect.y + 22);
  }
  context.textAlign = "center";
  context.fillStyle = COLORS.text;
  context.font = `700 ${rect.width < 150 ? 14 : 16}px Georgia`;
  fitText(hero.name, rect.x + rect.width / 2, rect.y + rect.height - 30, rect.width - 16);
  context.fillStyle = definition.color;
  context.font = `${rect.width < 150 ? 11 : 12}px Georgia`;
  context.fillText(`${definition.label.toUpperCase()}  •  LV ${hero.level}`, rect.x + rect.width / 2, rect.y + rect.height - 11);
}

function drawSectionTitle(title, copy, x, y, maxWidth) {
  context.textAlign = "left";
  context.fillStyle = COLORS.goldBright;
  context.font = "700 22px Georgia";
  context.fillText(title, x, y);
  const copyX = x + context.measureText(title).width + 18;
  context.fillStyle = COLORS.muted;
  context.font = "italic 14px Georgia";
  fitText(copy, copyX, y, Math.max(80, maxWidth - (copyX - x)));
}

function drawTavern() {
  if (layoutMode === "portrait") drawTavernPortrait();
  else drawTavernLandscape();
}

function drawTavernLandscape() {
  const compact = layoutMode === "compact";
  const offerVisible = compact ? 6 : 5;
  const benchVisible = compact ? 7 : 6;
  const offerStart = state.offerPage * offerVisible;
  const offerSlice = state.offers.slice(offerStart, offerStart + offerVisible);
  const benchStart = state.benchPage * benchVisible;
  const benchSlice = state.bench.slice(benchStart, benchStart + benchVisible);
  const bottomY = HEIGHT - 78;

  drawPanel({ x: 28, y: 94, width: WIDTH - 56, height: 282 });
  drawSectionTitle("THE CONTRACT REEL", `${offerCount(state.day)} offers today • duplicates allowed`, 48, 128, WIDTH - 96);
  const offerAreaX = 74;
  const offerAreaWidth = WIDTH - 148;
  const offerGap = 12;
  const offerWidth = (offerAreaWidth - offerGap * (offerVisible - 1)) / offerVisible;
  offerSlice.forEach((hero, offset) => {
    const index = offerStart + offset;
    const rect = { x: offerAreaX + offset * (offerWidth + offerGap), y: 145, width: offerWidth, height: 210 };
    drawHeroCard(hero, rect, { offer: true, selected: hero.id === state.selectedOfferId });
    addHit(rect, () => selectOffer(index));
  });
  if (!offerSlice.length) {
    context.fillStyle = COLORS.muted;
    context.font = "italic 18px Georgia";
    context.fillText("The reel is empty. Spin again for new contracts.", 76, 240);
  }
  if (state.offers.length > offerVisible) {
    drawButton({ x: 34, y: 222, width: 32, height: 58 }, "‹", { action: () => pageOffers(-1) });
    drawButton({ x: WIDTH - 66, y: 222, width: 32, height: 58 }, "›", { action: () => pageOffers(1) });
  }

  drawPanel({ x: 28, y: 390, width: WIDTH - 56, height: HEIGHT - 488 });
  drawSectionTitle(
    `LOCKED BENCH  ${state.bench.length}/${benchLimit()}`,
    `${activeBench().length}/${teamCapacity(state.day)} active slots`,
    48,
    424,
    WIDTH - 400,
  );
  const detailsWidth = 292;
  const benchAreaX = 62;
  const benchAreaWidth = WIDTH - detailsWidth - 120;
  const benchGap = 9;
  const benchWidth = (benchAreaWidth - benchGap * (benchVisible - 1)) / benchVisible;
  const benchHeight = Math.min(205, HEIGHT - 505);
  benchSlice.forEach((hero, offset) => {
    const rect = { x: benchAreaX + offset * (benchWidth + benchGap), y: 440, width: benchWidth, height: benchHeight };
    drawHeroCard(hero, rect, { selected: hero.id === state.selectedHeroId });
    addHit(rect, () => {
      state.selectedHeroId = hero.id;
      state.selectedOfferId = null;
      state.message = `${hero.name}: ${HERO_TYPES[hero.type].summary}`;
    });
  });
  if (state.bench.length > benchVisible) {
    drawButton({ x: 32, y: 493, width: 25, height: 52 }, "‹", { action: () => pageBench(-1) });
    drawButton({ x: WIDTH - detailsWidth - 51, y: 493, width: 25, height: 52 }, "›", { action: () => pageBench(1) });
  }

  drawHeroDetails({ x: WIDTH - detailsWidth - 32, y: 412, width: detailsWidth - 20, height: HEIGHT - 504 });
  drawButton({ x: 34, y: bottomY, width: 208, height: 56 }, "REROLL", {
    accent: true,
    sublabel: `${state.rerollCost} gold • next costs ${state.rerollCost + 1}`,
    enabled: state.gold >= state.rerollCost,
    action: rerollOffers,
  });
  drawButton({ x: 254, y: bottomY, width: 77, height: 56 }, "NEW", {
    danger: true,
    sublabel: "campaign",
    action: resetCampaign,
  });
  drawButton({ x: 337, y: bottomY, width: 77, height: 56 }, "TOWN", { action: openTown });
  drawButton({ x: WIDTH - 306, y: bottomY, width: 272, height: 56 }, "BEGIN EXPEDITION", {
    accent: true,
    sublabel: `${activeBench().length} heroes selected`,
    enabled: activeBench().length > 0,
    action: startExpedition,
  });
  drawRecruitmentStatus({ x: 430, y: bottomY, width: WIDTH - 752, height: 56 });
}

function drawTavernPortrait() {
  const offerVisible = 3;
  const benchVisible = 4;
  const offerStart = state.offerPage * offerVisible;
  const offerSlice = state.offers.slice(offerStart, offerStart + offerVisible);
  const benchStart = state.benchPage * benchVisible;
  const benchSlice = state.bench.slice(benchStart, benchStart + benchVisible);

  drawPanel({ x: 22, y: 134, width: 676, height: 326 });
  drawSectionTitle("CONTRACT REEL", `${offerCount(state.day)} offers today`, 42, 169, 630);
  const gap = 12;
  const cardWidth = 198;
  offerSlice.forEach((hero, offset) => {
    const index = offerStart + offset;
    const rect = { x: 51 + offset * (cardWidth + gap), y: 188, width: cardWidth, height: 248 };
    drawHeroCard(hero, rect, { offer: true, selected: hero.id === state.selectedOfferId });
    addHit(rect, () => selectOffer(index));
  });
  if (state.offers.length > offerVisible) {
    drawButton({ x: 24, y: 280, width: 24, height: 60 }, "‹", { action: () => pageOffers(-1) });
    drawButton({ x: 672, y: 280, width: 24, height: 60 }, "›", { action: () => pageOffers(1) });
  }

  drawButton({ x: 42, y: 476, width: 250, height: 68 }, "REROLL", {
    accent: true,
    sublabel: `${state.rerollCost} gold • next ${state.rerollCost + 1}`,
    enabled: state.gold >= state.rerollCost,
    action: rerollOffers,
  });
  drawRecruitmentStatus({ x: 308, y: 476, width: 370, height: 68 });

  drawPanel({ x: 22, y: 562, width: 676, height: 278 });
  drawSectionTitle(
    `LOCKED BENCH ${state.bench.length}/${benchLimit()}`,
    `${activeBench().length}/${teamCapacity(state.day)} active`,
    42,
    597,
    630,
  );
  const benchWidth = 147;
  benchSlice.forEach((hero, offset) => {
    const rect = { x: 48 + offset * 157, y: 616, width: benchWidth, height: 202 };
    drawHeroCard(hero, rect, { selected: hero.id === state.selectedHeroId });
    addHit(rect, () => {
      state.selectedHeroId = hero.id;
      state.selectedOfferId = null;
      state.message = `${hero.name}: ${HERO_TYPES[hero.type].summary}`;
    });
  });
  if (state.bench.length > benchVisible) {
    drawButton({ x: 24, y: 676, width: 22, height: 55 }, "‹", { action: () => pageBench(-1) });
    drawButton({ x: 674, y: 676, width: 22, height: 55 }, "›", { action: () => pageBench(1) });
  }

  drawHeroDetails({ x: 22, y: 858, width: 676, height: 244 });
  drawButton({ x: 22, y: 1122, width: 86, height: 74 }, "NEW", {
    danger: true,
    sublabel: "campaign",
    action: resetCampaign,
  });
  drawButton({ x: 116, y: 1122, width: 86, height: 74 }, "TOWN", { action: openTown });
  drawButton({ x: 220, y: 1122, width: 478, height: 74 }, "BEGIN EXPEDITION", {
    accent: true,
    sublabel: `${activeBench().length} heroes selected`,
    enabled: activeBench().length > 0,
    action: startExpedition,
  });
}

function drawHeroDetails(rect) {
  drawPanel(rect, 0.88);
  const offer = selectedOffer();
  const hero = offer ?? selectedHero();
  if (!hero) {
    context.textAlign = "center";
    context.fillStyle = COLORS.muted;
    context.font = "italic 16px Georgia";
    context.fillText("Select a contract or locked hero to inspect them.", rect.x + rect.width / 2, rect.y + rect.height / 2);
    return;
  }
  const definition = HERO_TYPES[hero.type];
  const power = heroPower(hero.level);
  const cost = upgradeCost(hero.level);
  context.textAlign = "left";
  context.fillStyle = COLORS.goldBright;
  context.font = "700 20px Georgia";
  context.fillText(`${hero.name} • ${definition.label}`, rect.x + 18, rect.y + 30);
  context.fillStyle = COLORS.text;
  context.font = "14px Georgia";
  context.fillText(`Level ${hero.level}  •  Power ${power}  •  ${definition.row} row`, rect.x + 18, rect.y + 55);
  context.fillStyle = COLORS.muted;
  context.font = "italic 13px Georgia";
  fitText(definition.summary, rect.x + 18, rect.y + 80, rect.width - 36);

  const buttonY = rect.y + rect.height - 56;
  if (offer) {
    drawButton({ x: rect.x + 12, y: buttonY, width: rect.width - 24, height: 44 }, "HIRE", {
      accent: true,
      sublabel: state.bench.length >= benchLimit() ? "bench full" : "free contract",
      enabled: state.bench.length < benchLimit(),
      action: hireSelectedOffer,
    });
    return;
  }
  const gap = 8;
  const buttonWidth = (rect.width - 36 - gap * 2) / 3;
  drawButton({ x: rect.x + 12, y: buttonY, width: buttonWidth, height: 44 }, hero.active ? "BENCH" : "ACTIVATE", {
    accent: !hero.active,
    action: toggleSelectedActive,
  });
  drawButton({ x: rect.x + 12 + buttonWidth + gap, y: buttonY, width: buttonWidth, height: 44 }, cost === null ? "MAX" : "UPGRADE", {
    sublabel: cost === null ? "level 5" : `${cost} gold`,
    enabled: cost !== null && state.gold >= cost,
    action: upgradeSelected,
  });
  drawButton({ x: rect.x + 12 + (buttonWidth + gap) * 2, y: buttonY, width: buttonWidth, height: 44 }, "DISMISS", {
    danger: true,
    action: dismissSelected,
  });
}

function drawTown() {
  if (layoutMode === "portrait") drawTownPortrait();
  else drawTownLandscape();
}

function drawTownLandscape() {
  const bottomY = HEIGHT - 78;
  const panel = { x: 28, y: 94, width: WIDTH - 56, height: bottomY - 108 };
  drawPanel(panel);
  drawSectionTitle(
    "THE MAYOR’S QUARTER",
    "Buildings reset when the ten-day campaign ends",
    48,
    128,
    WIDTH - 96,
  );

  const columns = layoutMode === "compact" ? 5 : 3;
  const rows = Math.ceil(TOWN_TYPES.length / columns);
  const gap = 12;
  const startX = 48;
  const startY = 145;
  const cardWidth = (WIDTH - 96 - gap * (columns - 1)) / columns;
  const cardHeight = (bottomY - 20 - startY - gap * (rows - 1)) / rows;
  TOWN_TYPES.forEach((type, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    drawTownBuildingCard(type, {
      x: startX + column * (cardWidth + gap),
      y: startY + row * (cardHeight + gap),
      width: cardWidth,
      height: cardHeight,
    });
  });

  drawButton({ x: 34, y: bottomY, width: 208, height: 56 }, "CONTRACT REEL", {
    accent: true,
    action: closeTown,
  });
  drawButton({ x: 254, y: bottomY, width: 160, height: 56 }, "NEW", {
    danger: true,
    sublabel: "reset town",
    action: resetCampaign,
  });
  drawMessage({ x: 430, y: bottomY, width: WIDTH - 464, height: 56 });
}

function drawTownPortrait() {
  drawPanel({ x: 22, y: 134, width: 676, height: 968 });
  drawSectionTitle("MAYOR’S QUARTER", "resets after day 10", 42, 169, 520);
  const pageSize = 6;
  const pageCount = Math.ceil(TOWN_TYPES.length / pageSize);
  state.townPage = Math.max(0, Math.min(state.townPage, pageCount - 1));
  const visible = TOWN_TYPES.slice(state.townPage * pageSize, (state.townPage + 1) * pageSize);
  const gap = 14;
  const cardWidth = 307;
  const cardHeight = 276;
  visible.forEach((type, index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    drawTownBuildingCard(type, {
      x: visible.length % 2 === 1 && index === visible.length - 1
        ? (WIDTH - cardWidth) / 2
        : 42 + column * (cardWidth + gap),
      y: 190 + row * (cardHeight + gap),
      width: cardWidth,
      height: cardHeight,
    });
  });
  drawButton({ x: 574, y: 144, width: 48, height: 36 }, "‹", {
    enabled: state.townPage > 0,
    action: () => { state.townPage -= 1; },
  });
  drawButton({ x: 630, y: 144, width: 48, height: 36 }, "›", {
    enabled: state.townPage < pageCount - 1,
    action: () => { state.townPage += 1; },
  });
  context.textAlign = "right";
  context.fillStyle = COLORS.muted;
  context.font = "13px Georgia";
  context.fillText(`${state.townPage + 1}/${pageCount}`, 562, 168);

  drawButton({ x: 22, y: 1122, width: 330, height: 74 }, "CONTRACT REEL", {
    accent: true,
    action: closeTown,
  });
  drawButton({ x: 368, y: 1122, width: 330, height: 74 }, "NEW CAMPAIGN", {
    danger: true,
    action: resetCampaign,
  });
}

function drawTownBuildingCard(type, rect) {
  const definition = BUILDING_DEFINITIONS[type];
  const building = state.buildings[type];
  const cost = buildingUpgradeCost(building.level);
  const color = definition.color ?? HERO_TYPES[type].color;
  roundedRect(rect.x, rect.y, rect.width, rect.height, 12);
  context.fillStyle = "rgba(10, 22, 34, 0.96)";
  context.fill();
  context.lineWidth = 1.5;
  context.strokeStyle = color;
  context.stroke();

  const portraitSize = Math.min(70, rect.height * 0.28);
  if (definition.utility) drawTownUtilityIcon(definition, rect.x + 12, rect.y + 12, portraitSize);
  else drawHeroImage({ type }, rect.x + 12, rect.y + 12, portraitSize);
  const textX = rect.x + portraitSize + 24;
  context.textAlign = "left";
  context.fillStyle = COLORS.goldBright;
  context.font = `700 ${rect.width < 280 ? 18 : 20}px Georgia`;
  fitText(definition.name, textX, rect.y + 34, rect.width - portraitSize - 36);
  context.fillStyle = color;
  context.font = "700 12px Georgia";
  fitText(`${definition.classLabel.toUpperCase()} • LEVEL ${building.level}`, textX, rect.y + 56, rect.width - portraitSize - 36);

  context.fillStyle = COLORS.text;
  context.font = `700 ${rect.width < 280 ? 13 : 14}px Georgia`;
  fitText(definition.core(building.level), rect.x + 14, rect.y + portraitSize + 30, rect.width - 28);
  context.fillStyle = COLORS.muted;
  context.font = `italic ${rect.width < 280 ? 11 : 12}px Georgia`;
  const detail = definition.utility
    ? type === "alchemist" ? "RESTOCKS EACH EXPEDITION" : "AFFECTS NEW CONTRACTS"
    : `${definition.pathA.label} ${building.pathA}  •  ${definition.pathB.label} ${building.pathB}`;
  fitText(detail, rect.x + 14, rect.y + portraitSize + 52, rect.width - 28);

  const buttonY = rect.y + rect.height - 56;
  const inset = 12;
  const gap = 8;
  const buttonWidth = (rect.width - inset * 2 - gap) / 2;
  const canUpgrade = cost !== null && state.gold >= cost;
  if (definition.utility) {
    drawButton({ x: rect.x + inset, y: buttonY, width: rect.width - inset * 2, height: 44 }, "UPGRADE", {
      accent: canUpgrade,
      enabled: canUpgrade,
      sublabel: cost === null ? "LEVEL 5 • MAX" : `${cost}g • improve town service`,
      action: () => upgradeTownBuilding(type),
    });
    return;
  }
  drawButton({ x: rect.x + inset, y: buttonY, width: buttonWidth, height: 44 }, definition.pathA.label, {
    accent: canUpgrade,
    enabled: canUpgrade,
    sublabel: cost === null ? "MAX" : `${cost}g • ${definition.pathA.short}`,
    action: () => upgradeTownBuilding(type, "pathA"),
  });
  drawButton({ x: rect.x + inset + buttonWidth + gap, y: buttonY, width: buttonWidth, height: 44 }, definition.pathB.label, {
    accent: canUpgrade,
    enabled: canUpgrade,
    sublabel: cost === null ? "MAX" : `${cost}g • ${definition.pathB.short}`,
    action: () => upgradeTownBuilding(type, "pathB"),
  });
}

function drawTownUtilityIcon(definition, x, y, size) {
  const gradient = context.createRadialGradient(x + size * 0.42, y + size * 0.35, 2, x + size / 2, y + size / 2, size * 0.55);
  gradient.addColorStop(0, definition.color);
  gradient.addColorStop(1, "#17202a");
  context.fillStyle = gradient;
  context.beginPath();
  context.arc(x + size / 2, y + size / 2, size * 0.46, 0, Math.PI * 2);
  context.fill();
  context.lineWidth = 2;
  context.strokeStyle = "rgba(245, 221, 165, 0.72)";
  context.stroke();
  context.fillStyle = "#f7e5b8";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = `700 ${size * 0.48}px Georgia`;
  context.fillText(definition.glyph, x + size / 2, y + size / 2 + 1);
  context.textBaseline = "alphabetic";
}

function drawRecruitmentStatus(rect) {
  roundedRect(rect.x, rect.y, rect.width, rect.height, 8);
  context.fillStyle = "rgba(2, 8, 15, 0.74)";
  context.fill();
  context.textAlign = "left";
  context.fillStyle = COLORS.gold;
  context.font = `700 ${layoutMode === "portrait" ? 13 : 11}px Georgia`;
  fitText(offerLevelOddsText(), rect.x + 14, rect.y + rect.height * 0.38, rect.width - 28);
  context.fillStyle = COLORS.text;
  context.font = `italic ${layoutMode === "portrait" ? 13 : 11}px Georgia`;
  fitText(state.message, rect.x + 14, rect.y + rect.height * 0.76, rect.width - 28);
}

function drawMessage(rect) {
  roundedRect(rect.x, rect.y, rect.width, rect.height, 8);
  context.fillStyle = "rgba(2, 8, 15, 0.74)";
  context.fill();
  context.textAlign = "left";
  context.fillStyle = COLORS.text;
  context.font = `italic ${layoutMode === "portrait" ? 15 : 13}px Georgia`;
  fitText(state.message, rect.x + 14, rect.y + rect.height / 2 + 5, rect.width - 28);
}

function drawEnemyPortrait(unit, x, y, size) {
  const definition = ENEMY_TYPES[unit.type];
  const gradient = context.createRadialGradient(x + size * 0.42, y + size * 0.35, 2, x + size / 2, y + size / 2, size * 0.55);
  gradient.addColorStop(0, definition.color);
  gradient.addColorStop(1, "#17202a");
  context.fillStyle = gradient;
  context.beginPath();
  context.arc(x + size / 2, y + size / 2, size * 0.46, 0, Math.PI * 2);
  context.fill();
  context.lineWidth = 2;
  context.strokeStyle = unit.flash > 0 ? "#fff0c0" : "rgba(225, 211, 181, 0.45)";
  context.stroke();
  context.fillStyle = "#f4ead6";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = `700 ${size * 0.42}px Georgia`;
  context.fillText(definition.glyph, x + size / 2, y + size / 2 + 1);
  context.textBaseline = "alphabetic";
}

function drawCombatUnit(unit, rect) {
  combatRects.set(unit.id, {
    x: rect.x + rect.width / 2,
    y: rect.y + rect.height / 2,
  });
  roundedRect(rect.x, rect.y, rect.width, rect.height, 10);
  context.fillStyle = unit.hp > 0 ? "rgba(10, 22, 34, 0.94)" : "rgba(24, 18, 20, 0.8)";
  context.fill();
  const isHit = unit.flash > 0;
  const isActing = unit.actionFlash > 0;
  const potionCandidate = state.view === "battle" && state.potionTargeting && unit.side === "hero" && unit.hp > 0;
  const canReceivePotion = potionCandidate && unit.hp < unit.maxHp;
  const potionGlow = unit.potionFlash > 0;
  context.lineWidth = isHit || isActing || canReceivePotion || potionGlow ? 3 : 1;
  context.strokeStyle = potionGlow || canReceivePotion
    ? COLORS.heal
    : isHit
      ? COLORS.danger
      : isActing
        ? COLORS.goldBright
        : potionCandidate
          ? "rgba(119, 203, 161, 0.25)"
          : "rgba(155, 173, 185, 0.3)";
  context.stroke();
  const portraitSize = Math.min(rect.height - 14, rect.width * 0.44);
  if (unit.side === "hero") drawHeroImage(unit.hero, rect.x + 6, rect.y + 5, portraitSize);
  else drawEnemyPortrait(unit, rect.x + 6, rect.y + 5, portraitSize);
  const textX = rect.x + portraitSize + 15;
  context.textAlign = "left";
  context.fillStyle = COLORS.text;
  context.font = `700 ${rect.width < 135 ? 11 : 14}px Georgia`;
  fitText(unit.label, textX, rect.y + 22, rect.width - portraitSize - 20);
  context.fillStyle = COLORS.muted;
  context.font = `${rect.width < 135 ? 9 : 11}px Georgia`;
  context.fillText(`${unit.row.toUpperCase()} • ${Math.ceil(unit.hp)}/${unit.maxHp}`, textX, rect.y + 41);
  const bar = { x: textX, y: rect.y + rect.height - 18, width: rect.width - portraitSize - 20, height: 8 };
  context.fillStyle = "rgba(70, 23, 27, 0.8)";
  context.fillRect(bar.x, bar.y, bar.width, bar.height);
  context.fillStyle = unit.side === "hero" ? COLORS.heal : COLORS.danger;
  context.fillRect(bar.x, bar.y, bar.width * Math.max(0, unit.hp / unit.maxHp), bar.height);
  if (canReceivePotion) addHit(rect, () => usePotionOn(unit));
}

function drawBattle() {
  combatRects = new Map();
  if (layoutMode === "portrait") drawBattlePortrait();
  else drawBattleLandscape();
  drawCombatEffects();
  if (state.view !== "battle") return;
  const potionRect = layoutMode === "portrait"
    ? { x: 24, y: 1190, width: 162, height: 62 }
    : { x: WIDTH - 686, y: HEIGHT - 74, width: 154, height: 48 };
  const fleeRect = layoutMode === "portrait"
    ? { x: 194, y: 1190, width: 162, height: 62 }
    : { x: WIDTH - 520, y: HEIGHT - 74, width: 154, height: 48 };
  const pauseRect = layoutMode === "portrait"
    ? { x: 364, y: 1190, width: 162, height: 62 }
    : { x: WIDTH - 354, y: HEIGHT - 74, width: 154, height: 48 };
  const speedRect = layoutMode === "portrait"
    ? { x: 534, y: 1190, width: 162, height: 62 }
    : { x: WIDTH - 188, y: HEIGHT - 74, width: 154, height: 48 };
  const hasWoundedHero = livingParty().some((unit) => unit.hp < unit.maxHp);
  drawButton(potionRect, state.potionTargeting ? "CANCEL" : `POTION ×${state.potionsRemaining}`, {
    accent: state.potionTargeting || (state.potionsRemaining > 0 && hasWoundedHero),
    sublabel: state.potionTargeting ? "choose no one" : `${Math.round(state.potionHealRatio * 100)}% max health`,
    enabled: state.potionTargeting || (state.potionsRemaining > 0 && hasWoundedHero),
    action: togglePotionTargeting,
  });
  drawButton(fleeRect, "FLEE", {
    danger: true,
    sublabel: `-${midBattleFleeCost()}g • ${manualFleeLevelChance()}% level-up`,
    action: fleeMidBattle,
  });
  drawButton(pauseRect, state.battlePaused ? "RESUME" : "PAUSE", {
    accent: state.battlePaused,
    action: toggleBattlePause,
  });
  drawButton(speedRect, `SPEED ×${state.battleSpeed}`, {
    action: () => {
      state.battleSpeed = state.battleSpeed === 1 ? 2 : 1;
    },
  });
  if (state.potionTargeting) drawPotionTargetBanner();
  else if (state.battlePaused) drawPauseBanner();
}

function toggleBattlePause() {
  if (state.view !== "battle") return;
  state.battlePaused = !state.battlePaused;
}

function drawPauseBanner() {
  const portrait = layoutMode === "portrait";
  const rect = portrait
    ? { x: 140, y: 610, width: 440, height: 145 }
    : { x: WIDTH / 2 - 155, y: HEIGHT - 220, width: 310, height: 78 };
  drawPanel(rect, 1);
  context.textAlign = "center";
  context.fillStyle = COLORS.goldBright;
  context.font = `small-caps 700 ${portrait ? 28 : 24}px Georgia`;
  context.fillText("BATTLE PAUSED", rect.x + rect.width / 2, rect.y + (portrait ? 60 : 32));
  context.fillStyle = COLORS.muted;
  context.font = `italic ${portrait ? 15 : 13}px Georgia`;
  context.fillText("Press P or tap Resume", rect.x + rect.width / 2, rect.y + (portrait ? 94 : 56));
}

function drawPotionTargetBanner() {
  const portrait = layoutMode === "portrait";
  const rect = portrait
    ? { x: 120, y: 610, width: 480, height: 145 }
    : { x: WIDTH / 2 - 180, y: HEIGHT - 220, width: 360, height: 78 };
  drawPanel(rect, 1);
  context.textAlign = "center";
  context.fillStyle = COLORS.heal;
  context.font = `small-caps 700 ${portrait ? 27 : 23}px Georgia`;
  context.fillText("CHOOSE A WOUNDED HERO", rect.x + rect.width / 2, rect.y + (portrait ? 60 : 32));
  context.fillStyle = COLORS.muted;
  context.font = `italic ${portrait ? 15 : 13}px Georgia`;
  context.fillText(
    `Potion restores ${Math.round(state.potionHealRatio * 100)}% of maximum health`,
    rect.x + rect.width / 2,
    rect.y + (portrait ? 94 : 56),
  );
}

function drawCombatEffects() {
  context.save();
  context.lineCap = "round";
  for (const effect of state.combatEffects) {
    const source = combatRects.get(effect.sourceId);
    const target = combatRects.get(effect.targetId);
    if (!source || !target) continue;
    const strength = Math.max(0, effect.remaining / COMBAT_EFFECT_DURATION);
    const color = effect.kind === "heal"
      ? `rgba(119, 203, 161, ${0.3 + strength * 0.7})`
      : effect.sourceSide === "hero"
        ? `rgba(245, 221, 165, ${0.25 + strength * 0.7})`
        : `rgba(215, 104, 98, ${0.25 + strength * 0.7})`;
    context.strokeStyle = color;
    context.fillStyle = color;
    context.lineWidth = effect.kind === "heal" ? 5 : 4;
    context.beginPath();
    context.moveTo(source.x, source.y);
    context.lineTo(target.x, target.y);
    context.stroke();
    const travel = Math.min(1, (1 - strength) * 1.8);
    const markerX = source.x + (target.x - source.x) * travel;
    const markerY = source.y + (target.y - source.y) * travel;
    context.beginPath();
    context.arc(markerX, markerY, effect.kind === "heal" ? 7 : 6, 0, Math.PI * 2);
    context.fill();
  }
  context.restore();
}

function drawBattleLandscape() {
  drawPanel({ x: 28, y: 92, width: WIDTH - 56, height: HEIGHT - 122 });
  const heroBack = unitsInRow(state.party, "back");
  const heroFront = unitsInRow(state.party, "front");
  const enemyFront = unitsInRow(state.enemies, "front");
  const enemyBack = unitsInRow(state.enemies, "back");
  drawVerticalCombatRow(heroBack, 54, "YOUR BACK", 170);
  drawVerticalCombatRow(heroFront, 270, "YOUR FRONT", 170);
  drawVerticalCombatRow(enemyFront, WIDTH - 440, "ENEMY FRONT", 170);
  drawVerticalCombatRow(enemyBack, WIDTH - 224, "ENEMY BACK", 170);

  const centerX = WIDTH / 2;
  context.textAlign = "center";
  context.fillStyle = isBossFloor(state.floor) ? COLORS.danger : COLORS.goldBright;
  context.font = "small-caps 700 30px Georgia";
  context.fillText(`Floor ${state.floor}`, centerX, 155);
  context.fillStyle = isBossFloor(state.floor) ? COLORS.goldBright : COLORS.muted;
  context.font = "italic 14px Georgia";
  context.fillText(isBossFloor(state.floor) ? "Boss • Vault Tyrant" : currentFlavor().name, centerX, 180);
  drawPanel({ x: centerX - 155, y: 210, width: 310, height: 245 }, 0.82);
  context.textAlign = "left";
  state.battleLog.forEach((line, index) => {
    context.fillStyle = index === 0 ? COLORS.text : COLORS.muted;
    context.font = `${index === 0 ? "italic 14" : "13"}px Georgia`;
    fitText(line, centerX - 135, 246 + index * 45, 270);
  });
  context.textAlign = "center";
  context.fillStyle = COLORS.text;
  context.font = "700 18px Georgia";
  context.fillText(`${livingParty().length} heroes  ⚔  ${livingEnemies().length} enemies`, centerX, 500);
  context.fillStyle = COLORS.muted;
  context.font = "13px Georgia";
  context.fillText("The company retreats automatically when only two remain.", centerX, 528);
}

function drawVerticalCombatRow(units, x, label, width) {
  context.textAlign = "center";
  context.fillStyle = COLORS.muted;
  context.font = "700 12px Georgia";
  context.fillText(label, x + width / 2, 127);
  const available = HEIGHT - 250;
  const height = Math.min(86, Math.max(60, available / Math.max(1, units.length) - 8));
  const gap = Math.min(12, (available - height * units.length) / Math.max(1, units.length - 1));
  units.forEach((unit, index) => {
    drawCombatUnit(unit, { x, y: 146 + index * (height + Math.max(5, gap)), width, height });
  });
}

function drawBattlePortrait() {
  drawPanel({ x: 22, y: 135, width: 676, height: 1034 });
  const enemyBack = unitsInRow(state.enemies, "back");
  const enemyFront = unitsInRow(state.enemies, "front");
  const heroFront = unitsInRow(state.party, "front");
  const heroBack = unitsInRow(state.party, "back");
  drawHorizontalCombatRow(enemyBack, 165, "ENEMY BACK");
  drawHorizontalCombatRow(enemyFront, 390, "ENEMY FRONT");
  drawHorizontalCombatRow(heroFront, 775, "YOUR FRONT");
  drawHorizontalCombatRow(heroBack, 980, "YOUR BACK");

  context.textAlign = "center";
  context.fillStyle = isBossFloor(state.floor) ? COLORS.danger : COLORS.goldBright;
  context.font = "small-caps 700 34px Georgia";
  context.fillText(`Floor ${state.floor}`, 360, 648);
  context.fillStyle = COLORS.muted;
  context.font = "italic 17px Georgia";
  fitText(state.battleLog[0] ?? currentFlavor().name, 360, 683, 590);
  context.fillStyle = COLORS.text;
  context.font = "700 20px Georgia";
  context.fillText(`${livingParty().length} heroes  ⚔  ${livingEnemies().length} enemies`, 360, 720);
}

function drawHorizontalCombatRow(units, y, label) {
  context.textAlign = "left";
  context.fillStyle = COLORS.muted;
  context.font = "700 14px Georgia";
  context.fillText(label, 45, y);
  const maxVisible = 6;
  const visible = units.slice(0, maxVisible);
  const gap = 8;
  const width = (630 - gap * (Math.max(1, visible.length) - 1)) / Math.max(1, visible.length);
  visible.forEach((unit, index) => {
    drawCombatUnit(unit, { x: 45 + index * (width + gap), y: y + 13, width, height: 150 });
  });
}

function drawOverlay() {
  const portrait = layoutMode === "portrait";
  const dialog = portrait
    ? { x: 50, y: 554, width: 620, height: 194 }
    : {
        x: WIDTH / 2 - (layoutMode === "compact" ? 210 : 150),
        y: 180,
        width: layoutMode === "compact" ? 420 : 300,
        height: 300,
      };
  context.save();
  context.shadowColor = "rgba(0, 0, 0, 0.9)";
  context.shadowBlur = 30;
  drawPanel(dialog, 0.99);
  context.restore();
  context.textAlign = "center";
  context.fillStyle = COLORS.goldBright;
  context.font = `small-caps 700 ${portrait ? 30 : 27}px Georgia`;
  fitText(state.resultTitle, WIDTH / 2, dialog.y + (portrait ? 39 : 50), dialog.width - 36);
  context.fillStyle = COLORS.text;
  context.font = `${portrait ? 17 : 15}px Georgia`;
  drawWrappedText(
    state.resultCopy,
    WIDTH / 2,
    dialog.y + (portrait ? 70 : 86),
    dialog.width - (portrait ? 70 : 38),
    portrait ? 20 : 19,
    portrait ? 2 : 3,
  );
  context.fillStyle = COLORS.muted;
  context.font = `italic ${portrait ? 15 : 13}px Georgia`;
  context.fillText(
    `Day ${state.day}/10  •  Deepest floor ${state.deepestFloor}  •  ${state.gold} gold`,
    WIDTH / 2,
    dialog.y + (portrait ? 111 : 159),
  );

  if (state.view === "floor_result") {
    const buttonY = portrait ? dialog.y + 126 : dialog.y + 214;
    const inset = portrait ? 28 : 18;
    const gap = portrait ? 16 : 10;
    const buttonWidth = (dialog.width - inset * 2 - gap) / 2;
    drawButton({ x: dialog.x + inset, y: buttonY, width: buttonWidth, height: portrait ? 68 : 58 }, "FLEE", {
      danger: true,
      sublabel: `${manualFleeLevelChance()}% level-up`,
      action: fleeExpedition,
    });
    drawButton({ x: dialog.x + inset + buttonWidth + gap, y: buttonY, width: buttonWidth, height: portrait ? 68 : 58 }, "CONTINUE", {
      accent: true,
      sublabel: `enter floor ${state.floor + 1}`,
      action: continueExpedition,
    });
  } else if (state.view === "day_result") {
    drawButton({ x: dialog.x + 28, y: dialog.y + (portrait ? 126 : 214), width: dialog.width - 56, height: portrait ? 68 : 58 }, "NEXT DAY", {
      accent: true,
      sublabel: retreatLevelResultText(),
      action: advanceDay,
    });
  } else {
    drawButton({ x: dialog.x + 28, y: dialog.y + (portrait ? 126 : 214), width: dialog.width - 56, height: portrait ? 68 : 58 }, "NEW CAMPAIGN", {
      accent: true,
      action: resetCampaign,
    });
  }
}

function render() {
  hitRegions = [];
  context.clearRect(0, 0, WIDTH, HEIGHT);
  drawBackground();
  drawHeader();
  if (state.view === "tavern") drawTavern();
  else if (state.view === "town") drawTown();
  else drawBattle();
  if (["floor_result", "day_result", "campaign_end"].includes(state.view)) drawOverlay();
}

function pointInRect(x, y, rect) {
  return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
}

canvas.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  canvas.focus();
  const bounds = canvas.getBoundingClientRect();
  const x = ((event.clientX - bounds.left) / bounds.width) * WIDTH;
  const y = ((event.clientY - bounds.top) / bounds.height) * HEIGHT;
  const region = [...hitRegions].reverse().find((candidate) => pointInRect(x, y, candidate.rect));
  if (region) {
    region.action();
    render();
  }
});

window.addEventListener("keydown", (event) => {
  if (event.key.toLowerCase() === "f") {
    if (document.fullscreenElement) document.exitFullscreen();
    else canvas.requestFullscreen();
  } else if (event.key.toLowerCase() === "r" && state.view === "tavern") {
    rerollOffers();
    render();
  } else if (event.key.toLowerCase() === "t" && ["tavern", "town"].includes(state.view)) {
    if (state.view === "tavern") openTown();
    else closeTown();
    render();
  } else if (event.key.toLowerCase() === "p" && state.view === "battle") {
    toggleBattlePause();
    render();
  } else if (event.key === "Enter") {
    if (state.view === "tavern") startExpedition();
    else if (state.view === "floor_result") continueExpedition();
    else if (state.view === "day_result") advanceDay();
    render();
  } else if (event.key === " " && state.view === "battle") {
    event.preventDefault();
    state.battleSpeed = state.battleSpeed === 1 ? 2 : 1;
    render();
  }
});

window.addEventListener("resize", () => {
  configureLayout();
  render();
});

document.addEventListener("fullscreenchange", () => {
  configureLayout();
  render();
});

function frame(now) {
  const delta = Math.min(100, now - previousFrame);
  previousFrame = now;
  update(delta);
  render();
  requestAnimationFrame(frame);
}

window.advanceTime = (milliseconds) => {
  const steps = Math.max(1, Math.ceil(milliseconds / 50));
  const delta = milliseconds / steps;
  for (let index = 0; index < steps; index += 1) update(delta);
  render();
};

window.render_game_to_text = () => {
  const summarizeHero = (hero) => ({
    id: hero.id,
    name: hero.name,
    class: hero.type,
    level: hero.level,
    power: heroPower(hero.level),
    active: hero.active,
  });
  return JSON.stringify({
    coordinateSystem: "Canvas origin is top-left; tavern cards and battle controls are clickable.",
    game: "Vaultbound",
    layout: layoutMode,
    view: state.view,
    day: state.day,
    daysTotal: 10,
    gold: state.gold,
    goldPerClearedFloor: floorGoldReward(state.day),
    victory: {
      achieved: state.victoryAchieved,
      bossFloor: BOSS_FLOOR,
      victoryDay: state.victoryDay,
      currentFloorIsBoss: isBossFloor(state.floor),
      canContinueAfterVictory: true,
    },
    flavor: { key: state.flavorKey, ...currentFlavor(), roster: FLAVOR_ROSTERS[state.flavorKey] },
    teamCapacity: teamCapacity(state.day),
    benchCapacity: benchLimit(),
    rerollCost: state.rerollCost,
    tavernLevel: state.buildings.tavern.level,
    offerLevelChances: offerLevelChances(state.buildings.tavern.level),
    offerCount: state.offers.length,
    offers: state.offers.map(summarizeHero),
    bench: state.bench.map(summarizeHero),
    buildings: Object.fromEntries(
      TOWN_TYPES.map((type) => {
        const building = state.buildings[type];
        return [type, {
          name: BUILDING_DEFINITIONS[type].name,
          level: building.level,
          pathA: building.pathA,
          pathB: building.pathB,
          utility: Boolean(BUILDING_DEFINITIONS[type].utility),
          core: BUILDING_DEFINITIONS[type].core(building.level),
          nextCost: buildingUpgradeCost(building.level),
          effects: buildingEffects(type, building),
        }];
      }),
    ),
    selectedHeroId: state.selectedHeroId,
    selectedOfferId: state.selectedOfferId,
    floor: state.floor,
    deepestFloor: state.deepestFloor,
    battleSpeed: state.battleSpeed,
    battlePaused: state.battlePaused,
    potions: {
      remaining: state.potionsRemaining,
      healingPercent: Math.round(state.potionHealRatio * 100),
      choosingTarget: state.potionTargeting,
      replenishes: "at the start of each daily expedition",
    },
    midBattleFleeCost: state.view === "battle" ? midBattleFleeCost() : null,
    manualFleeLevelChance: ["battle", "floor_result"].includes(state.view) ? manualFleeLevelChance() : null,
    battleTimeMs: Math.round(state.battleTime),
    combatEffects: state.combatEffects.map((effect) => ({
      sourceId: effect.sourceId,
      targetId: effect.targetId,
      kind: effect.kind,
      remainingMs: Math.round(effect.remaining),
    })),
    party: state.party.filter((unit) => unit.hp > 0).map((unit) => ({
      name: unit.label,
      class: unit.type,
      level: unit.hero.level,
      row: unit.row,
      hp: Math.ceil(unit.hp),
      maxHp: unit.maxHp,
      bardBuffPercent: unit.bardBuffPercent,
      attackIntervalMs: Number.isFinite(heroInterval(unit)) ? Math.round(heroInterval(unit)) : null,
      critChance: unit.critChance,
      damageMultiplier: unit.damageMultiplier,
      damageReduction: unit.damageReduction,
      healRatio: unit.healRatio,
      mageTargets: unit.mageTargets,
    })),
    enemies: state.enemies.filter((unit) => unit.hp > 0).map((unit) => ({
      type: unit.type,
      name: unit.label,
      row: unit.row,
      hp: Math.ceil(unit.hp),
      maxHp: unit.maxHp,
    })),
    battleLog: state.battleLog,
    result: ["floor_result", "day_result", "campaign_end"].includes(state.view)
      ? { title: state.resultTitle, copy: state.resultCopy, floorReward: state.floorReward }
      : null,
    retreatLeveling: ["day_result", "campaign_end"].includes(state.view)
      ? {
          type: state.retreatType,
          chance: state.retreatLevelChance,
          levelUpCount: state.retreatLevelUpIds.length,
          levelUpHeroIds: state.retreatLevelUpIds,
        }
      : null,
    message: state.message,
    controls: "Each cleared floor awards gold equal to the current day. Defeat the Vault Tyrant on floor 10 to win; Continue remains available afterward for a deeper record. T toggles Town and Contract Reel. Town buildings reset with each ten-day campaign. During battle, select Potion and then a wounded hero; supplies replenish when the daily expedition begins. Tavern level controls contract level chances. Manual Flee gives each eligible survivor an 80% level-up roll, minus 10 points per other fleeing hero; automatic retreat guarantees it. Select an offer to inspect it, then use Hire to recruit it for free. Tap/click cards and buttons. Mid-battle Flee costs half your current gold, rounded up. R rerolls in the tavern; Enter starts or continues; P pauses; Space changes battle speed; F fullscreen.",
  });
};

configureLayout(true);
render();
requestAnimationFrame(frame);
