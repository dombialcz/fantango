import { expeditionOutcome, townMorale } from "./town-morale.js";
import { createTownIdentity, townHeroEffects, rollTownClass, townRollCost } from "./town-identity.js";
import { offerLevelChances, rollOfferLevel } from "./hero-offers.js";
import { retreatLevelChance, rollRetreatLevelUps } from "./retreat-levels.js";
import { BOSS_FLOOR, floorGoldReward, isBossFloor } from "./dungeon-progression.js";
import { enemyTypeForRoll, FLAVOR_ROSTERS } from "./enemy-rosters.js";
import { BOSS_DEFINITIONS, BOSS_RULES, rollCampaignBoss } from "./bosses.js";
import { createTownView } from "./town-view.js";
import { createBattleView } from "./battle-view.js";
import { createRosterView } from "./roster-view.js";
import {
  BATTLE_COMMANDS,
  COMMAND_GAIN_PER_DAMAGE,
  COMMAND_IDS,
  COMMAND_MAX,
  COMMAND_START,
  commandPower,
} from "./battle-commands.js";
import {
  BUILDING_DEFINITIONS,
  alchemistSupplies,
  buildingEffects,
  buildingUpgradeCost,
  createTownBuildings,
} from "./town.js";

const canvas = document.querySelector("#dungeon-game");
let layoutMode = "desktop";
let previousFrame = performance.now();
let nextHeroId = 1;
let nextEnemyId = 1;

const COMBAT_DAMAGE_SCALE = 0.25;
const COMBAT_INTERVAL_SCALE = 1.5;
const COMBAT_EFFECT_DURATION = 700;

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
  orcs: { name: "Orc Warband", description: "Green-skinned goblins and orcs march beneath the warlord's burning banner." },
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
  goblin: { label: "Goblin", row: "front", hp: 42, damage: 16, interval: 1050, color: "#7f9a53", glyph: "G" },
  orc: { label: "Orc", row: "front", hp: 175, damage: 32, interval: 1950, color: "#66804a", glyph: "O" },
  goblinArcher: { label: "Goblin Archer", row: "back", hp: 58, damage: 38, interval: 1500, color: "#85954e", glyph: "G" },
  orcShaman: { label: "Orc Hexer", row: "back", hp: 95, damage: 42, interval: 1800, color: "#718c5d", glyph: "H" },
  ...BOSS_DEFINITIONS,
};

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
  return Array.from({ length: count }, () => makeHero(rollTownClass(HERO_KEYS, state.town), tavernLevel));
}

function createCampaign() {
  const buildings = createTownBuildings();
  const town = createTownIdentity();
  return {
    view: "town",
    day: 1,
    gold: 10 + (town.prefix.gold ?? 0) + (town.settlement.dailyGold ?? 0),
    town,
    freeRerollsRemaining: town.settlement.freeRerolls ?? 0,
    flavorKey: randomItem(Object.keys(FLAVORS)),
    bossType: null,
    deepestFloor: 0,
    expeditionRecordBefore: 0,
    expeditionClearedFloor: 0,
    lastExpedition: null,
    victoryAchieved: false,
    victoryDay: null,
    floor: 0,
    rerollCost: 1,
    offers: [],
    rolledToday: false,
    rollRemainingMs: 0,
    bench: [],
    selectedHeroId: null,
    selectedOfferId: null,
    buildings,
    party: [],
    enemies: [],
    battleTime: 0,
    battleSpeed: 1,
    battlePaused: false,
    commandAutoPaused: false,
    commandMeter: COMMAND_START,
    commandTargeting: null,
    enemyFreezeMs: 0,
    divineAegisMs: 0,
    rallyMs: 0,
    rallySpeedBonus: 0,
    markedEnemyId: null,
    markMs: 0,
    markSpeedBonus: 0,
    holdLineMs: 0,
    holdArmorBonus: 0,
    holdDamageBonus: 0,
    pilferUsed: false,
    pilferPending: 0,
    floorPilferGold: 0,
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
    message: "Welcome, Mayor. Improve your town, then prepare your company. Upgrade the Tavern before your free first roll for better contracts.",
  };
}

let state = createCampaign();

const townView = createTownView({
  root: document.querySelector("#town-screen"),
  onUpgrade: (type, path) => {
    upgradeTownBuilding(type, path);
    render();
  },
  onClose: () => {
    closeTown();
    render();
    rosterView.focus();
  },
  onReset: () => {
    resetCampaign();
    render();
  },
});

const rosterView = createRosterView({
  root: document.querySelector("#roster-screen"),
  heroTypes: HERO_TYPES,
  onAction: (action) => {
    if (action === "roll") rerollOffers();
    if (action === "town") openTown();
    if (action === "start") startExpedition();
    if (action === "upgrade") upgradeSelected();
    if (action === "toggle") toggleSelectedActive();
    if (action === "dismiss") dismissSelected();
    render();
  },
  onOffer: (id) => { selectOffer(state.offers.findIndex((hero) => hero.id === id)); render(); },
  onHire: (id) => { recruitOffer(state.offers.findIndex((hero) => hero.id === id)); render(); },
  onHero: (id) => {
    if (state.view !== "tavern" || !state.bench.some((hero) => hero.id === id)) return;
    state.selectedHeroId = id;
    state.selectedOfferId = null;
    render();
  },
});

const battleView = createBattleView({
  root: document.querySelector("#battle-screen"),
  heroTypes: HERO_TYPES,
  enemyTypes: ENEMY_TYPES,
  onCommand: (id) => {
    useBattleCommand(id);
    render();
  },
  onTarget: (id) => {
    const target = [...state.party, ...state.enemies].find((unit) => unit.id === id);
    if (state.commandTargeting === "mark" && target?.side === "enemy") markEnemy(target);
    else if (state.potionTargeting && target?.side === "hero") usePotionOn(target);
    render();
  },
  onAction: (id) => {
    if (id === "potion") togglePotionTargeting();
    if (id === "pause") toggleBattlePause();
    if (id === "speed") state.battleSpeed = state.battleSpeed === 1 ? 2 : 1;
    if (id === "flee") fleeMidBattle();
    if (id === "flee-safe") fleeExpedition();
    if (id === "continue") continueExpedition();
    if (id === "next-day") advanceDay();
    if (id === "reset") resetCampaign();
    render();
  },
});

function currentFlavor() {
  return FLAVORS[state.flavorKey];
}

function activeBench() {
  return state.bench.filter((hero) => hero.active);
}

function selectedHero() {
  return state.bench.find((hero) => hero.id === state.selectedHeroId) ?? null;
}

function openTown() {
  if (state.view !== "tavern" || state.rollRemainingMs > 0) return;
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
  if (state.view !== "tavern" || state.rollRemainingMs > 0) return;
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
}

function selectOffer(index) {
  if (state.view !== "tavern" || state.rollRemainingMs > 0) return;
  const hero = state.offers[index];
  if (!hero) return;
  state.selectedOfferId = hero.id;
  state.selectedHeroId = null;
  state.message = `${hero.name}: ${HERO_TYPES[hero.type].summary}`;
}

function rerollOffers() {
  if (state.view !== "tavern" || state.rollRemainingMs > 0) return;
  const cost = townRollCost(state);
  if (state.gold < cost) {
    state.message = `You need ${cost} gold for the next spin.`;
    return;
  }
  state.gold -= cost;
  if (state.rolledToday && state.freeRerollsRemaining > 0) state.freeRerollsRemaining -= 1;
  else if (cost > 0) state.rerollCost += 1;
  state.rolledToday = true;
  state.rollRemainingMs = 1300;
  state.offers = rollHeroes(offerCount(state.day), state.buildings.tavern.level);
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
}

function startExpedition() {
  if (state.view !== "tavern" || state.rollRemainingMs > 0) return;
  const chosen = activeBench();
  if (!chosen.length) {
    state.message = "Choose at least one active hero before entering the dungeon.";
    return;
  }
  state.selectedHeroId = null;
  state.selectedOfferId = null;
  state.expeditionRecordBefore = state.deepestFloor;
  state.expeditionClearedFloor = 0;
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

function heroEffects(type) {
  return townHeroEffects(type, buildingEffects(type, state.buildings[type]), state.town);
}

function buildParty(heroes) {
  const buffAmounts = new Map(heroes.map((hero) => [hero.id, 0]));
  for (const bard of heroes.filter((hero) => hero.type === "bard")) {
    const effects = heroEffects("bard");
    const available = heroes.filter((hero) => hero.type !== "bard");
    for (let index = 0; index < effects.bardTargets && available.length; index += 1) {
      const targetIndex = Math.floor(Math.random() * available.length);
      const [target] = available.splice(targetIndex, 1);
      buffAmounts.set(target.id, buffAmounts.get(target.id) + effects.bardBuff);
    }
  }

  return heroes.map((hero) => {
    const definition = HERO_TYPES[hero.type];
    const effects = heroEffects(hero.type);
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
    boss: Boolean(BOSS_DEFINITIONS[type]),
    attacks: 0,
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
  if (isBossFloor(floor)) {
    state.bossType ??= rollCampaignBoss(state.flavorKey);
    const definition = BOSS_DEFINITIONS[state.bossType];
    return [state.bossType, ...(definition.escorts ?? [])].map(type => makeEnemy(type, floor));
  }
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
  state.commandAutoPaused = false;
  state.potionTargeting = false;
  resetFloorCommands();
  state.enemies = generateEnemies(state.floor);
  state.battleTime = 0;
  state.combatEffects = [];
  state.party.forEach((hero, index) => {
    hero.timer = 650 + index * 420 + Math.random() * 220;
    hero.frozenMs = 0;
  });
  state.battleLog = isBossFloor(state.floor)
    ? [`${BOSS_DEFINITIONS[state.bossType].label} bars the road to victory.`]
    : [`Floor ${state.floor}: ${state.enemies.length} enemies close in.`];
  state.message = isBossFloor(state.floor)
    ? `Boss floor: defeat ${BOSS_DEFINITIONS[state.bossType].label} and any guards to claim victory.`
    : "The battle runs on its own. Watch the rows and health bars.";
}

function livingParty() {
  return state.party.filter((unit) => unit.hp > 0);
}

function livingEnemies() {
  return state.enemies.filter((unit) => unit.hp > 0);
}

function resetFloorCommands() {
  state.commandMeter = COMMAND_START;
  state.commandTargeting = null;
  state.enemyFreezeMs = 0;
  state.divineAegisMs = 0;
  state.rallyMs = 0;
  state.rallySpeedBonus = 0;
  state.markedEnemyId = null;
  state.markMs = 0;
  state.markSpeedBonus = 0;
  state.holdLineMs = 0;
  state.holdArmorBonus = 0;
  state.holdDamageBonus = 0;
  state.pilferUsed = false;
  state.pilferPending = 0;
  state.floorPilferGold = 0;
}

function commandHeroCount(commandId) {
  const classType = BATTLE_COMMANDS[commandId].classType;
  return livingParty().filter((unit) => unit.type === classType).length;
}

function activeMarkedEnemy() {
  if (state.markMs <= 0 || state.markedEnemyId === null) return null;
  return livingEnemies().find((unit) => unit.id === state.markedEnemyId) ?? null;
}

function heroCanReach(unit, target) {
  if (!target) return false;
  if (["ranger", "mage"].includes(unit.type)) return true;
  return target.row === "front" || unitsInRow(livingEnemies(), "front").length === 0;
}

function commandUnavailableReason(commandId) {
  const command = BATTLE_COMMANDS[commandId];
  if (state.view !== "battle") return "battle only";
  if (commandHeroCount(commandId) === 0) return `needs ${HERO_TYPES[command.classType].label}`;
  if (state.commandMeter < command.cost) return `needs ${command.cost}`;
  if (commandId === "pilfer" && state.pilferUsed) return "used this floor";
  if (commandId === "freeze" && state.enemyFreezeMs > 0) return "already active";
  if (commandId === "aegis" && state.divineAegisMs > 0) return "already active";
  if (commandId === "rally" && state.rallyMs > 0) return "already active";
  if (commandId === "mark" && state.markMs > 0) return "already active";
  if (commandId === "hold" && state.holdLineMs > 0) return "already active";
  if (commandId === "bloodlust" && unitsInRow(livingEnemies(), "front").length === 0) return "no enemy front";
  if (commandId === "bloodlust" && unitsInRow(livingParty(), "front").length === 0) return "no allied front";
  return null;
}

function spendCommand(commandId) {
  state.commandMeter = Math.max(0, state.commandMeter - BATTLE_COMMANDS[commandId].cost);
  state.commandTargeting = null;
  state.potionTargeting = false;
}

function flashCommandHeroes(commandId) {
  const classType = BATTLE_COMMANDS[commandId].classType;
  for (const unit of livingParty().filter((hero) => hero.type === classType)) unit.actionFlash = 850;
}

function useBattleCommand(commandId) {
  if (commandUnavailableReason(commandId)) return;
  if (commandId === "mark") {
    state.commandTargeting = "mark";
    state.potionTargeting = false;
    return;
  }

  const count = commandHeroCount(commandId);
  const power = commandPower(commandId, count);
  spendCommand(commandId);
  flashCommandHeroes(commandId);

  if (commandId === "freeze") {
    state.enemyFreezeMs = power.durationMs;
    logBattle(`${count} Mage${count === 1 ? "" : "s"} freeze time for ${(power.durationMs / 1000).toFixed(1)} seconds.`);
  } else if (commandId === "aegis") {
    state.divineAegisMs = power.durationMs;
    logBattle(`Divine Aegis shields the party for ${(power.durationMs / 1000).toFixed(1)} seconds.`);
  } else if (commandId === "rally") {
    state.rallyMs = power.durationMs;
    state.rallySpeedBonus = power.speedBonus;
    for (const hero of livingParty()) hero.timer /= 1 + power.speedBonus;
    logBattle(`Rally grants the party +${Math.round(power.speedBonus * 100)}% attack speed.`);
  } else if (commandId === "hold") {
    state.holdLineMs = power.durationMs;
    state.holdArmorBonus = power.armorBonus;
    state.holdDamageBonus = power.damageBonus;
    logBattle(`Hold the Line grants the front +${Math.round(power.armorBonus * 100)}% armor and damage.`);
  } else if (commandId === "pilfer") {
    state.pilferUsed = true;
    state.pilferPending = power.gold;
    logBattle(`The Thieves pilfer ${power.gold} gold, secured if this floor is cleared.`);
  } else if (commandId === "bloodlust") {
    const alliedFront = unitsInRow(livingParty(), "front");
    const enemyFront = unitsInRow(livingEnemies(), "front");
    const strongestBarbarian = livingParty()
      .filter((unit) => unit.type === "barbarian")
      .sort((a, b) => b.power * b.damageMultiplier - a.power * a.damageMultiplier)[0];
    for (const hero of alliedFront) {
      const healthCost = Math.ceil(hero.maxHp * power.healthCostRatio);
      hero.hp = Math.max(1, hero.hp - healthCost);
      hero.flash = 700;
    }
    const normalStrike = strongestBarbarian.power
      * HERO_TYPES.barbarian.damage
      * strongestBarbarian.damageMultiplier;
    for (const enemy of enemyFront) dealDamage(enemy, normalStrike * power.damageMultiplier, "Bloodlust");
    logBattle(`Bloodlust sacrifices the front line and smashes ${enemyFront.length} foe${enemyFront.length === 1 ? "" : "s"}.`);
  }
}

function markEnemy(target) {
  if (state.commandTargeting !== "mark" || target?.hp <= 0 || commandUnavailableReason("mark")) return;
  const count = commandHeroCount("mark");
  const power = commandPower("mark", count);
  spendCommand("mark");
  flashCommandHeroes("mark");
  state.markedEnemyId = target.id;
  state.markMs = power.durationMs;
  state.markSpeedBonus = power.speedBonus;
  for (const hero of livingParty().filter((unit) => heroCanReach(unit, target))) {
    hero.timer /= 1 + power.speedBonus;
  }
  logBattle(`${target.label} is marked: attackers gain +${Math.round(power.speedBonus * 100)}% speed against it.`);
}

function gainCommandMeter(damage) {
  if (state.view !== "battle" || damage <= 0) return;
  const previous = state.commandMeter;
  state.commandMeter = Math.min(COMMAND_MAX, state.commandMeter + damage * COMMAND_GAIN_PER_DAMAGE);
  if (state.view === "battle" && previous < COMMAND_MAX && state.commandMeter === COMMAND_MAX) {
    state.battlePaused = true;
    state.commandAutoPaused = true;
    logBattle("Command full. Battle paused — choose an order, then Resume.");
  }
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
  if (target.type === "shadowAssassin" && target.side === "enemy" && Math.random() < BOSS_RULES.evasion) {
    target.evadeFlash = 700;
    logBattle("The Shadow Assassin evades the hit.");
    return 0;
  }
  const sourceLabel = typeof source === "string" ? source : source.label;
  if (target.side === "hero" && state.divineAegisMs > 0) {
    target.flash = 240;
    return 0;
  }
  if (target.side === "hero" && typeof source === "object" && source.side === "enemy") {
    if (state.town.prefix.evasion && Math.random() < state.town.prefix.evasion) {
      logBattle(`${target.label} evades the attack.`);
      return 0;
    }
    amount *= state.town.prefix.enemyDamage ?? 1;
  }
  const critical = typeof source === "object"
    && source.side === "hero"
    && source.critChance > 0
    && Math.random() < source.critChance;
  const criticalAmount = critical ? amount * 2 : amount;
  const holdArmor = target.side === "hero" && target.row === "front" && state.holdLineMs > 0
    ? state.holdArmorBonus
    : 0;
  const reducedAmount = target.side === "hero"
    ? criticalAmount * (1 - Math.min(0.8, (target.damageReduction ?? 0) + holdArmor))
    : criticalAmount;
  const damage = Math.max(1, Math.round(reducedAmount * COMBAT_DAMAGE_SCALE));
  const previousHp = target.hp;
  target.hp = Math.max(0, target.hp - damage);
  const actualDamage = previousHp - target.hp;
  target.flash = 420;
  if (typeof source === "object") addCombatEffect(source, target);
  if (critical) logBattle(`${sourceLabel} lands a critical hit.`);
  if (target.hp === 0) logBattle(`${sourceLabel} defeats ${target.label}.`);
  if (typeof source === "object" && source.side !== target.side) gainCommandMeter(actualDamage);
  return actualDamage;
}

function logBattle(copy) {
  state.battleLog.unshift(copy);
  state.battleLog = state.battleLog.slice(0, 4);
}

function heroInterval(unit) {
  const definition = HERO_TYPES[unit.type];
  if (!Number.isFinite(definition.interval)) return Infinity;
  const heroLevelSpeed = ["mage", "ranger"].includes(unit.type) ? 1 : speedMultiplier(unit.hero.level);
  const rallyMultiplier = state.rallyMs > 0 ? 1 + state.rallySpeedBonus : 1;
  const markMultiplier = activeMarkedEnemy() && heroCanReach(unit, activeMarkedEnemy())
    ? 1 + state.markSpeedBonus
    : 1;
  return (definition.interval * COMBAT_INTERVAL_SCALE)
    / (heroLevelSpeed * unit.buildingSpeed * rallyMultiplier * markMultiplier);
}

function heroCommandDamageMultiplier(unit) {
  return unit.row === "front" && state.holdLineMs > 0 ? 1 + state.holdDamageBonus : 1;
}

function actHero(unit) {
  if (unit.hp <= 0 || unit.type === "bard" || unit.frozenMs > 0) return;
  const definition = HERO_TYPES[unit.type];
  const enemies = livingEnemies();
  if (!enemies.length) return;

  if (unit.type === "mage") {
    const marked = activeMarkedEnemy();
    const normalOrder = [...unitsInRow(enemies, "back"), ...unitsInRow(enemies, "front")];
    const ordered = marked ? [marked, ...normalOrder.filter((enemy) => enemy.id !== marked.id)] : normalOrder;
    const targets = ordered.slice(0, unit.mageTargets);
    for (const target of targets) {
      dealDamage(target, unit.power * definition.damage * unit.damageMultiplier * heroCommandDamageMultiplier(unit), unit);
    }
    logBattle(`${unit.label} arcs magic through ${targets.length} foe${targets.length === 1 ? "" : "s"}.`);
    return;
  }

  let target = activeMarkedEnemy();
  if (target && !heroCanReach(unit, target)) target = null;
  if (!target && unit.type === "thief") {
    const preferred = unitsInRow(enemies, "front");
    const pool = preferred.length ? preferred : unitsInRow(enemies, "back");
    target = [...pool].sort((a, b) => a.hp - b.hp)[0];
  } else if (!target && unit.type === "barbarian") {
    target = [...enemies].sort((a, b) => b.hp - a.hp)[0];
  } else if (!target && unit.type === "ranger") {
    target = targetBackFirst(enemies);
  } else if (!target) {
    target = targetFrontFirst(enemies);
  }

  const executeMultiplier = unit.type === "thief" && target.hp <= target.maxHp * 0.5
    ? 1 + unit.executeBonus
    : 1;
  const dealt = dealDamage(
    target,
    unit.power * definition.damage * unit.damageMultiplier * executeMultiplier * heroCommandDamageMultiplier(unit),
    unit,
  );
  if (dealt > 0 && target.hp > 0) logBattle(`${unit.label} strikes ${target.label}.`);

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

function enemyEmpowered(unit) {
  return unit.side === "enemy" && unit.type !== "guildMaster"
    && livingEnemies().some(enemy => enemy.type === "guildMaster");
}

function enemyInterval(unit) {
  return ENEMY_TYPES[unit.type].interval * COMBAT_INTERVAL_SCALE / (enemyEmpowered(unit) ? BOSS_RULES.allySpeed : 1);
}

function actEnemy(unit) {
  if (unit.hp <= 0) return;
  const heroes = livingParty();
  if (!heroes.length) return;
  unit.attacks = (unit.attacks ?? 0) + 1;
  const skill = BOSS_DEFINITIONS[unit.type]?.skill;
  const attackDamage = unit.damage * (enemyEmpowered(unit) ? BOSS_RULES.allyDamage : 1);

  if (skill === "freeze" && unit.attacks % BOSS_RULES.freezeEvery === 0) {
    for (const hero of heroes) {
      hero.frozenMs = BOSS_RULES.freezeMs;
      addCombatEffect(unit, hero, "freeze");
    }
    logBattle("The Evil Spirit freezes the company for 2 seconds.");
    return;
  }
  if (skill === "summon" && unit.attacks % BOSS_RULES.summonEvery === 0 && livingEnemies().length < BOSS_RULES.enemyCap) {
    const summoned = makeEnemy(randomItem(["skeleton", "zombie", "boneMage"]));
    state.enemies.push(summoned);
    addCombatEffect(unit, summoned, "summon");
    logBattle(`The Lich summons a ${summoned.label}.`);
    return;
  }
  if (skill === "heal") {
    const wounded = livingEnemies().filter(ally => ally.id !== unit.id && ally.hp < ally.maxHp)
      .sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp);
    if (wounded.length) {
      const ally = wounded[0];
      const amount = Math.min(ally.maxHp - ally.hp, Math.round(ally.maxHp * BOSS_RULES.healRatio));
      ally.hp += amount;
      ally.potionFlash = 700;
      addCombatEffect(unit, ally, "heal");
      logBattle(`The Elder Shaman heals ${ally.label} for ${amount} HP.`);
    }
  }

  if (unit.type === "necromancer" && livingEnemies().length < 14) {
    state.enemies.push(makeEnemy("skeleton"));
    logBattle("A necromancer drags another skeleton upright.");
    return;
  }

  if (skill === "rowAttack") {
    const front = unitsInRow(heroes, "front");
    const targets = front.length ? front : unitsInRow(heroes, "back");
    const damage = targets.reduce((total, target) => total + dealDamage(target, attackDamage, unit), 0);
    logBattle(damage > 0
      ? `${unit.label} ${unit.type === "infernalDragon" ? "breathes fire across" : "cleaves through"} the ${front.length ? "front" : "back"} row.`
      : `Divine Aegis turns aside ${unit.label}'s attack.`);
    return;
  }

  let target;
  if (unit.type === "archdemon") {
    target = targetBackFirst(heroes);
  } else if (unit.type === "assassin" || skill === "assassin") {
    unit.row = "front";
    unit.returnAt = state.battleTime + 350;
    target = [...heroes].sort((a, b) => a.hp - b.hp)[0];
    logBattle(`${unit.label} blinks forward toward ${target.label}.`);
  } else if (["boneMage", "warlock", "marksman", "goblinArcher", "orcShaman"].includes(unit.type)) {
    target = randomLiving(heroes);
  } else {
    target = targetFrontFirst(heroes);
  }
  const damage = dealDamage(target, attackDamage, unit);
  if (damage > 0 && target.hp > 0 && skill !== "heal") logBattle(`${unit.label} strikes ${target.label}.`);
}

function updateBattle(milliseconds) {
  if (state.view !== "battle" || state.battlePaused) return;
  const delta = milliseconds * state.battleSpeed;
  const enemiesFrozen = state.enemyFreezeMs > 0;
  state.battleTime += delta;
  state.combatEffects = state.combatEffects
    .map((effect) => ({ ...effect, remaining: effect.remaining - delta }))
    .filter((effect) => effect.remaining > 0);
  for (const unit of [...state.party, ...state.enemies]) {
    unit.flash = Math.max(0, unit.flash - delta);
    unit.actionFlash = Math.max(0, unit.actionFlash - delta);
    unit.potionFlash = Math.max(0, (unit.potionFlash ?? 0) - delta);
    unit.evadeFlash = Math.max(0, (unit.evadeFlash ?? 0) - delta);
    if (unit.side === "enemy" && enemiesFrozen && unit.returnAt !== null) unit.returnAt += delta;
  }

  for (const unit of [...livingParty()]) {
    if (state.battlePaused) break;
    const frozenTime = Math.min(delta, unit.frozenMs ?? 0);
    unit.frozenMs = Math.max(0, (unit.frozenMs ?? 0) - delta);
    const interval = heroInterval(unit);
    if (!Number.isFinite(interval)) continue;
    unit.timer -= delta - frozenTime;
    while (!state.battlePaused && !(unit.frozenMs > 0) && unit.timer <= 0 && unit.hp > 0 && livingEnemies().length) {
      actHero(unit);
      unit.timer += interval;
    }
  }

  if (!state.battlePaused && livingEnemies().length && !enemiesFrozen) {
    for (const unit of [...livingEnemies()]) {
      if (state.battlePaused) break;
      if (["assassin", "shadowAssassin"].includes(unit.type) && unit.returnAt !== null && state.battleTime >= unit.returnAt) {
        unit.row = "back";
        unit.returnAt = null;
      }
      unit.timer -= delta;
      while (!state.battlePaused && unit.timer <= 0 && unit.hp > 0 && livingParty().length) {
        actEnemy(unit);
        unit.timer += enemyInterval(unit);
      }
    }
  }

  state.enemyFreezeMs = Math.max(0, state.enemyFreezeMs - delta);
  state.divineAegisMs = Math.max(0, state.divineAegisMs - delta);
  state.rallyMs = Math.max(0, state.rallyMs - delta);
  state.markMs = Math.max(0, state.markMs - delta);
  state.holdLineMs = Math.max(0, state.holdLineMs - delta);
  if (!activeMarkedEnemy()) {
    state.markedEnemyId = null;
    state.markMs = 0;
    state.markSpeedBonus = 0;
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
  state.expeditionClearedFloor = state.floor;
  clearCombatFeedback();
  state.view = "floor_result";
  state.floorReward = floorGoldReward(state.day);
  state.floorPilferGold = state.pilferPending;
  state.gold += state.floorReward + state.floorPilferGold;
  state.deepestFloor = Math.max(state.deepestFloor, state.floor);
  const survivorCount = livingParty().length;
  const survivorCopy = `${survivorCount} ${survivorCount === 1 ? "hero remains" : "heroes remain"}`;
  if (isBossFloor(state.floor)) {
    const firstVictory = !state.victoryAchieved;
    state.victoryAchieved = true;
    state.victoryDay ??= state.day;
    state.resultTitle = firstVictory ? "Victory" : "Boss Defeated";
    const lootCopy = state.floorPilferGold ? `, plus ${state.floorPilferGold} pilfered gold` : "";
    state.resultCopy = `${BOSS_DEFINITIONS[state.bossType].label} falls. ${survivorCopy}. The party claims ${state.floorReward} gold${lootCopy} and may continue for a deeper record.`;
    state.message = "Victory is secured. Flee safely or continue beyond floor 10 for a deeper record.";
  } else {
    state.resultTitle = `Floor ${state.floor} Cleared`;
    const lootCopy = state.floorPilferGold ? ` Thieves also secure ${state.floorPilferGold} pilfered gold.` : "";
    state.resultCopy = `${survivorCopy}. The vault yields ${state.floorReward} gold for day ${state.day}.${lootCopy}`;
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
  state.pilferPending = 0;
  state.party = livingParty();
  resolveRetreatLevelUps(retreatType);
  const expedition = {
    clearedFloor: state.expeditionClearedFloor,
    recordBefore: state.expeditionRecordBefore,
    previousClearedFloor: state.lastExpedition?.clearedFloor ?? null,
    departed: state.expeditionStartCount,
    returned: state.party.length,
    retreatType,
  };
  state.lastExpedition = { ...expedition, outcome: expeditionOutcome(expedition) };
  const campaignEnded = state.day >= 10;
  state.resultTitle = title ?? (campaignEnded && state.victoryAchieved
    ? "Campaign Victory"
    : state.party.length ? "Expedition Ended" : "No One Returned");
  state.resultCopy = campaignEnded
    ? `${reason} ${state.victoryAchieved
      ? `${BOSS_DEFINITIONS[state.bossType]?.label ?? "The dungeon lord"} was defeated on day ${state.victoryDay}; your record is floor ${state.deepestFloor}.`
      : "Ten days expire before the dungeon lord is defeated."}`
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
  state.commandTargeting = null;
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
  state.commandAutoPaused = false;
  state.potionTargeting = false;
  state.commandTargeting = null;
  state.combatEffects = [];
  for (const unit of [...state.party, ...state.enemies]) {
    unit.flash = 0;
    unit.actionFlash = 0;
    unit.potionFlash = 0;
    unit.evadeFlash = 0;
    unit.frozenMs = 0;
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
  state.gold += state.town.settlement.dailyGold ?? 0;
  state.freeRerollsRemaining = state.town.settlement.freeRerolls ?? 0;
  const survivors = state.party.map((unit) => unit.hero);
  const reserves = state.bench.filter((hero) => !state.expeditionStartIds.includes(hero.id));
  for (const hero of survivors) {
    if (state.retreatLevelUpIds.includes(hero.id)) hero.level = Math.min(5, hero.level + 1);
    hero.active = true;
  }
  for (const hero of reserves) hero.active = false;
  state.bench = [...survivors, ...reserves];
  state.offers = [];
  state.rolledToday = false;
  state.rollRemainingMs = 0;
  state.selectedHeroId = survivors[0]?.id ?? null;
  state.selectedOfferId = null;
  state.rerollCost = 1;
  state.floor = 0;
  state.party = [];
  state.enemies = [];
  state.potionsRemaining = 0;
  state.potionTargeting = false;
  state.commandTargeting = null;
  state.expeditionStartIds = [];
  const levelUps = state.retreatLevelUpIds.length;
  state.retreatType = null;
  state.retreatLevelChance = 0;
  state.retreatLevelUpIds = [];
  state.view = "town";
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
  if (state.rollRemainingMs > 0) {
    state.rollRemainingMs = Math.max(0, state.rollRemainingMs - step);
    if (state.rollRemainingMs === 0) state.message = `${state.offers.length} contracts revealed. Inspect a hero, then use Hire beneath the portrait. Your company is safe from rerolls.`;
  }
  updateBattle(step);
}

function configureLayout(force = false) {
  const portrait = window.innerWidth <= 900 && window.innerHeight >= window.innerWidth;
  const compact = window.innerHeight <= 600 && window.innerWidth > window.innerHeight;
  const nextMode = portrait ? "portrait" : compact ? "compact" : "desktop";
  if (!force && nextMode === layoutMode) return;
  layoutMode = nextMode;
}

function render() {
  const townVisible = state.view === "town";
  townView.render({
    visible: townVisible,
    buildings: state.buildings,
    town: state.town,
    morale: townMorale(state.day, state.lastExpedition, state.victoryAchieved),
    gold: state.gold,
    day: state.day,
    flavorName: currentFlavor().name,
    message: state.message,
    rolledToday: state.rolledToday,
  });
  const battleVisible = ["battle", "floor_result", "day_result", "campaign_end"].includes(state.view);
  battleView.render(battleVisible ? battlePresentation() : { visible: false });
  const presentHero = (hero) => {
    const definition = HERO_TYPES[hero.type];
    const effects = heroEffects(hero.type);
    const power = heroPower(hero.level);
    let summary = definition.summary;
    if (hero.type === "mage") summary = `Strikes up to ${effects.mageTargets} different enemies per attack, starting in the back row. Spell targets come from the Mage Guild.`;
    if (hero.type === "bard") summary = `Gives ${effects.bardTargets} random non-bard ${effects.bardTargets === 1 ? "ally" : "allies"} +${Math.round(effects.bardBuff * 100)}% power at expedition start.`;
    return { ...hero, power, health: Math.round(power * definition.hp * effects.healthMultiplier), damage: Math.round(power * definition.damage * effects.damageMultiplier), summary };
  };
  rosterView.render(state.view === "tavern" ? {
    visible: true, day: state.day, gold: state.gold, flavor: currentFlavor().name,
    rolledToday: state.rolledToday, rollRemainingMs: state.rollRemainingMs,
    rerollCost: state.rerollCost, nextRollCost: townRollCost(state), freeRerollsRemaining: state.freeRerollsRemaining, dailyOffers: offerCount(state.day),
    tavernLevel: state.buildings.tavern.level, odds: offerLevelOddsText().replace(/^Tavern L\d+: /, ""),
    offers: state.rollRemainingMs > 0 ? [] : state.offers.map(presentHero),
    bench: state.bench.map(presentHero), selectedHeroId: state.selectedHeroId, selectedOfferId: state.selectedOfferId,
    activeCount: activeBench().length, teamCapacity: teamCapacity(state.day), benchCapacity: benchLimit(),
    potions: alchemistSupplies(state.buildings.alchemist.level).count, buildings: state.buildings, message: state.message,
  } : { visible: false });
  canvas.hidden = true;
}

function battlePresentation() {
  return {
    visible: true,
    view: state.view,
    floor: state.floor,
    boss: isBossFloor(state.floor),
    bossInfo: BOSS_DEFINITIONS[state.bossType] ?? null,
    day: state.day,
    gold: state.gold,
    flavor: currentFlavor().name,
    party: state.party,
    enemies: state.enemies.map(unit => ({ ...unit, empowered: enemyEmpowered(unit) })),
    log: state.battleLog,
    combatEffects: state.combatEffects,
    meter: state.commandMeter,
    targeting: state.potionTargeting ? "potion" : state.commandTargeting,
    markedEnemyId: state.markedEnemyId,
    paused: state.battlePaused,
    commandAutoPaused: state.commandAutoPaused,
    speed: state.battleSpeed,
    potions: state.potionsRemaining,
    potionHealPercent: Math.round(state.potionHealRatio * 100),
    fleeCost: midBattleFleeCost(),
    levelChance: manualFleeLevelChance(),
    levelResult: retreatLevelResultText(),
    resultTitle: state.resultTitle,
    resultCopy: state.resultCopy,
    pilferPending: state.pilferPending,
    commands: Object.fromEntries(COMMAND_IDS.map((id) => [id, {
      count: commandHeroCount(id),
      power: commandPower(id, commandHeroCount(id)),
      reason: commandUnavailableReason(id),
    }])),
    effects: {
      freeze: state.enemyFreezeMs,
      aegis: state.divineAegisMs,
      rally: state.rallyMs,
      mark: state.markMs,
      hold: state.holdLineMs,
    },
  };
}

function toggleBattlePause() {
  if (state.view !== "battle") return;
  state.battlePaused = !state.battlePaused;
  state.commandAutoPaused = false;
}

window.addEventListener("keydown", (event) => {
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  // Enter and Space on a focused HTML control must activate that control only.
  if (event.target.closest?.("button, a, input, select, textarea") && ["Enter", " "].includes(event.key)) return;
  if (document.querySelector("dialog[open]")) return;
  if (event.repeat && ["r", "t", "enter"].includes(event.key.toLowerCase())) return;
  if (event.key.toLowerCase() === "f") {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.querySelector("main").requestFullscreen();
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
  } else if (state.view === "battle" && /^[1-7]$/.test(event.key)) {
    useBattleCommand(COMMAND_IDS[Number(event.key) - 1]);
    render();
  } else if (state.view === "battle" && event.key === "Escape") {
    state.commandTargeting = null;
    state.potionTargeting = false;
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
    coordinateSystem: "Town, recruitment, and battle use responsive HTML controls. Daily flow: town → company → dungeon. All seven battle commands are visible from the start.",
    game: "Vaultbound",
    layout: layoutMode,
    view: state.view,
    townPresentation: state.view === "town" ? townView.snapshot() : null,
    day: state.day,
    daysTotal: 10,
    gold: state.gold,
    goldPerClearedFloor: floorGoldReward(state.day),
    victory: {
      achieved: state.victoryAchieved,
      bossFloor: BOSS_FLOOR,
      victoryDay: state.victoryDay,
      currentFloorIsBoss: isBossFloor(state.floor),
      bossType: state.bossType,
      canContinueAfterVictory: true,
    },
    flavor: { key: state.flavorKey, ...currentFlavor(), roster: FLAVOR_ROSTERS[state.flavorKey] },
    teamCapacity: teamCapacity(state.day),
    benchCapacity: benchLimit(),
    rerollCost: state.rerollCost,
    rolledToday: state.rolledToday,
    rollRemainingMs: Math.ceil(state.rollRemainingMs),
    nextRollCost: townRollCost(state),
    freeRerollsRemaining: state.freeRerollsRemaining,
    town: state.town,
    morale: townMorale(state.day, state.lastExpedition, state.victoryAchieved),
    lastExpedition: state.lastExpedition,
    dailyOfferCount: offerCount(state.day),
    tavernLevel: state.buildings.tavern.level,
    offerLevelChances: offerLevelChances(state.buildings.tavern.level),
    offerCount: state.offers.length,
    offers: state.rollRemainingMs > 0 ? [] : state.offers.map(summarizeHero),
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
    commandAutoPaused: state.commandAutoPaused,
    commands: {
      meter: Math.floor(state.commandMeter),
      maximum: COMMAND_MAX,
      visibleFromStart: true,
      targeting: state.commandTargeting,
      pilferUsed: state.pilferUsed,
      pilferPending: state.pilferPending,
      available: Object.fromEntries(COMMAND_IDS.map((commandId) => {
        const count = commandHeroCount(commandId);
        return [commandId, {
          label: BATTLE_COMMANDS[commandId].label,
          building: BUILDING_DEFINITIONS[BATTLE_COMMANDS[commandId].classType].name,
          heroClass: BATTLE_COMMANDS[commandId].classType,
          livingHeroes: count,
          cost: BATTLE_COMMANDS[commandId].cost,
          power: commandPower(commandId, count),
          usable: commandUnavailableReason(commandId) === null,
          unavailableReason: commandUnavailableReason(commandId),
        }];
      })),
      effects: {
        enemyFreezeMs: Math.round(state.enemyFreezeMs),
        divineAegisMs: Math.round(state.divineAegisMs),
        rallyMs: Math.round(state.rallyMs),
        rallySpeedBonus: state.rallySpeedBonus,
        markedEnemyId: state.markedEnemyId,
        markMs: Math.round(state.markMs),
        markSpeedBonus: state.markSpeedBonus,
        holdLineMs: Math.round(state.holdLineMs),
        holdArmorBonus: state.holdArmorBonus,
        holdDamageBonus: state.holdDamageBonus,
      },
    },
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
      frozenMs: Math.round(unit.frozenMs ?? 0),
    })),
    enemies: state.enemies.filter((unit) => unit.hp > 0).map((unit) => ({
      type: unit.type,
      name: unit.label,
      row: unit.row,
      hp: Math.ceil(unit.hp),
      maxHp: unit.maxHp,
      boss: unit.boss,
      ability: BOSS_DEFINITIONS[unit.type]?.summary ?? null,
      empowered: enemyEmpowered(unit),
      damage: unit.damage * (enemyEmpowered(unit) ? BOSS_RULES.allyDamage : 1),
      attackIntervalMs: Math.round(enemyInterval(unit)),
    })),
    battleLog: state.battleLog,
    result: ["floor_result", "day_result", "campaign_end"].includes(state.view)
      ? {
          title: state.resultTitle,
          copy: state.resultCopy,
          floorReward: state.floorReward,
          pilferGold: state.floorPilferGold,
        }
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
    controls: "Begin each day in town, then prepare the company. R rolls heroes: first daily roll free, then 1g, 2g, 3g. Offers use the Tavern level when rolled. Inspect portraits; Hire below each offer for free. Hired heroes are safe from rerolls. T toggles Town. Each cleared floor pays the current day in gold. Defeat the campaign boss on floor 10 to win; Continue remains available afterward. All seven battle commands are visible from the start; click one or press 1–7. Combat auto-pauses when Command reaches full; choose an order, then Resume or press P. Damage fills Command, and matching living heroes determine command power. Mark Prey requires selecting an enemy. Potion requires selecting a wounded hero. Esc cancels targeting. Commands and potions work while paused. P pauses; Space changes speed; F toggles fullscreen. Enter begins or continues an expedition or advances the day (focused buttons activate normally). Mid-battle Flee costs half your gold. Safe Flee is free between floors. Town buildings reset after the ten-day campaign.",
  });
};

configureLayout(true);
render();
requestAnimationFrame(frame);
