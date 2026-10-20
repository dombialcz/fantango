import { HERO_TYPES, HERO_NAMES, heroPower } from "./hero-data.js";
import { ENEMY_TYPES } from "./enemy-data.js";
import { createJourney, heroLevelCap, heroLevelSpeed, heroTrainingCost, remainingInvasions, legacyEffects, legacyRewards, applyLegacyHeroEffects, potionRecoveryChance, campaignSummary, LEGACIES } from "./campaign-journey.js";
import { createVictoryView } from "./campaign-victory-view.js";
import { createEventCampaign, EVENT_BY_ID, resolveEvent, applyEventEffect } from "./campaign-events.js";
import { createEventView } from "./event-view.js";
import { recordChronicle, saveCampaign, loadCampaign, archiveChronicle, createChronicleView } from "./campaign-chronicle.js";
import { expeditionOutcome, townMorale } from "./town-morale.js";
import { createTownIdentity, townHeroEffects, rollTownClass, townRollCost } from "./town-identity.js";
import { offerLevelChances, offerLevelChancesText, rollOfferLevel } from "./hero-offers.js";
import { classCounts, recordClassSelection, classSelectionBonus, boostedOfferLevel, classCrowdingMultiplier } from "./class-balance.js";
import { retreatLevelChance, rollRetreatLevelUps } from "./retreat-levels.js";
import { BOSS_FLOOR, enemyHealthMultiplier, floorGoldReward, isBossFloor } from "./dungeon-progression.js";
import { enemyTypeForRoll, FLAVOR_ROSTERS } from "./enemy-rosters.js";
import { BOSS_DEFINITIONS, BOSS_RULES, rollCampaignBoss } from "./bosses.js";
import { COMBAT_DAMAGE_SCALE, COMBAT_INTERVAL_SCALE, cappedCombatPercent, interceptingKnight, totalDamageReduction } from "./combat-rules.js";
import { createBackdropDepth, targetBackdropFloor, snapBackdropFloor, advanceBackdropDepth, DESCENT_DURATION_MS } from "./battle-backdrop.js";
import { CEMETERY, cemeteryMaxHp, recordFallenHero } from "./cemetery.js";
import { createTownView } from "./town-view.js";
import { createBattleView } from "./battle-view.js";
import { createRosterView } from "./roster-view.js";
import {
  BATTLE_COMMANDS,
  COMMAND_GAIN_PER_DAMAGE,
  COMMAND_IDS,
  COMMAND_MAX,
  COMMAND_START,
  TIME_FREEZE_COOLDOWN_MS,
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
const sceneryMotionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
let layoutMode = "desktop";
let previousFrame = performance.now();
let nextHeroId = 1;
let nextEnemyId = 1;

const COMBAT_EFFECT_DURATION = 700;

const HERO_KEYS = Object.keys(HERO_TYPES);
const TOWN_TYPES = Object.keys(BUILDING_DEFINITIONS);

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

function speedMultiplier(level) {
  return heroLevelSpeed(level);
}

function upgradeCost(level) {
  return heroTrainingCost(level, heroLevelCap(state.journey));
}

function offerLevelOddsText() {
  return `Tavern L${state.buildings.tavern.level}: ${offerLevelChancesText(state.buildings.tavern.level)}`;
}

function makeHero(type = randomItem(HERO_KEYS), tavernLevel = 1) {
  const names = HERO_NAMES[type];
  const name = randomItem(names);
  const rolledLevel = rollOfferLevel(tavernLevel);
  const level = boostedOfferLevel(rolledLevel, type, selectionBonus(), heroLevelCap(state.journey));
  return {
    id: nextHeroId++,
    type,
    name,
    level,
    selectionLevelBonus: level - rolledLevel,
    active: false,
  };
}

function rollHeroes(count, tavernLevel = 1) {
  return Array.from({ length: count }, () => makeHero(rollTownClass(HERO_KEYS, state.town), tavernLevel));
}

function createCampaign(journey = createJourney(), veterans = []) {
  const buildings = createTownBuildings();
  const town = createTownIdentity();
  const flavorKey = randomItem(remainingInvasions(journey));
  const inherited = legacyEffects(journey);
  const seed = crypto.getRandomValues(new Uint32Array(1))[0];
  return {
    view: "town",
    campaignId: crypto.randomUUID(),
    journey,
    conclusion: null,
    victoryRewardId: null,
    carryHeroIds: [],
    day: 1,
    gold: 10 + (town.prefix.gold ?? 0) + (town.settlement.dailyGold ?? 0) + inherited.dailyGold,
    town,
    freeRerollsRemaining: town.settlement.freeRerolls ?? 0,
    flavorKey,
    events: createEventCampaign(flavorKey, seed),
    dayOutlook: "opening",
    chronicle: [
      { day: 1, floor: null, category: "dawn", text: `A little hope, on the edge of the dark. ${town.name} faces ${FLAVORS[flavorKey].name}.` },
      ...veterans.map(hero => ({day:1,floor:null,category:"arrival",text:`${hero.name} (${HERO_TYPES[hero.type].label}, L${hero.level}) arrived from the saved town, ready to fight again.`})),
      ...legacyRewards(journey).map(reward => ({day:1,floor:null,category:"legacy",text:`${reward.name}: ${reward.description}`})),
      ...(inherited.dailyGold ? [{day:1,floor:null,category:"income",text:"Liberated coffers yielded 3 gold."}] : []),
    ],
    bossType: null,
    backdrop: createBackdropDepth(),
    graves: [],
    selectionHistory: [],
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
    bench: veterans.map(hero => ({...hero, active:true})),
    selectedHeroId: null,
    selectedOfferId: null,
    buildings,
    party: [],
    enemies: [],
    battleTime: 0,
    battleSpeed: 1,
    battlePaused: false,
    fleeConfirmation: false,
    commandAutoPaused: false,
    commandAutoPauseEnabled: true,
    commandMeter: COMMAND_START,
    commandTargeting: null,
    enemyFreezeMs: 0,
    freezeCooldownMs: 0,
    divineAegisMs: 0,
    divineAegisTargetId: null,
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
    potionCooldownMs: 0,
    battleLog: [],
    combatEffects: [],
    expeditionStartCount: 0,
    expeditionStartIds: [],
    retreatType: null,
    retreatLevelChance: 0,
    retreatLevelUpIds: [],
    floorReward: 0,
    floorPotionRecovered: false,
    resultTitle: "",
    resultCopy: "",
    message: "Welcome, Mayor. Improve your town, then prepare your company. Upgrade the Tavern before your free first roll for better contracts.",
  };
}

const savedCampaign = loadCampaign();
let state = savedCampaign?.state ?? createCampaign();
state.journey ??= createJourney();
state.campaignId ??= crypto.randomUUID();
state.conclusion ??= null;
state.victoryRewardId ??= null;
state.carryHeroIds ??= [];
state.selectionHistory ??= []; // Saves made before class balancing have no selection history.
state.commandAutoPauseEnabled ??= true;
state.freezeCooldownMs ??= 0;
state.potionCooldownMs ??= 0;
state.divineAegisTargetId ??= null;
// Legacy party-wide shields cannot remain active without a selected hero.
if (state.divineAegisTargetId === null) state.divineAegisMs = 0;
if (savedCampaign) { nextHeroId = savedCampaign.nextHeroId; nextEnemyId = savedCampaign.nextEnemyId; }
function remember(category, text, floor = null) { recordChronicle(state, category, text, floor); }
function persist() { saveCampaign(state, nextHeroId, nextEnemyId); }
const eventView = createEventView({
  root: document.querySelector("#event-screen"),
  onChoice: chooseCampaignEvent,
  onContinue: () => {
    if (state.view !== "event" || !state.events.pending?.result) return;
    state.events.pending = null;
    state.view = "floor_result";
    persist(); render();
    document.querySelector('[data-battle-action="continue"]')?.focus();
  },
});
const chronicleView = createChronicleView({ getState: () => state, onOpen: () => {
  if (state.view === "battle") { state.battlePaused = true; state.commandAutoPaused = false; render(); }
  persist();
} });
function chooseCampaignEvent(choiceIndex) {
  if (state.view !== "event" || !state.events.pending || state.events.pending.result) return;
  const pending = state.events.pending;
  const result = resolveEvent(pending, choiceIndex, state.dayOutlook);
  if (!result) return;
  if (["Restore", "Shared care", "Feast"].includes(result.effect) && livingParty().every(unit => unit.hp === unit.maxHp)) {
    result.text = "The company needs no further healing. A contribution to the town treasury takes the place of unused care and supplies.";
  }
  if (result.effect === "Lost purse" && state.gold === 0) {
    result.text = "There is nothing left to steal, but the dispute shakes the company’s confidence.";
  }
  if (state.day === 10 && ["One contract favour", "Two contract favours"].includes(result.effect)) {
    result.text += " With no time for further contracts, the introduction is exchanged for an immediate payment.";
  }
  result.consequence = applyEventEffect(state, result.effect, pending);
  pending.result = result;
  remember("event", `${EVENT_BY_ID[pending.id].title}. We chose: ${result.choice} ${result.text} ${result.consequence} [Campaign clear ${state.events.clears}]`, state.floor);
  persist(); render();
}
// Save after actions and once a second in combat. A reload resumes combat paused.
document.addEventListener("click", () => queueMicrotask(persist));
document.addEventListener("keydown", () => queueMicrotask(persist));
window.addEventListener("pagehide", persist);
setInterval(persist, 1000);

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
    if (action === "confirm-start") startExpedition(true);
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
  getUnitDetails: battleUnitDetails,
  onInspect: (id) => {
    if (state.view !== "battle" || state.potionTargeting || state.commandTargeting) return;
    state.battlePaused = true;
    state.commandAutoPaused = false;
    battleView.inspect(id);
    render();
  },
  onCommand: (id) => {
    useBattleCommand(id);
    render();
  },
  onTarget: (id) => {
    const target = [...state.party, ...state.enemies].find((unit) => unit.id === id);
    if (state.commandTargeting === "mark" && target?.side === "enemy") markEnemy(target);
    else if (state.commandTargeting === "aegis" && target?.side === "hero") shieldHero(target);
    else if (state.potionTargeting && target?.side === "hero") usePotionOn(target);
    render();
  },
  onAction: (id) => {
    if (id === "potion") togglePotionTargeting();
    if (id === "pause") toggleBattlePause();
    if (id === "auto-pause") toggleCommandAutoPause();
    if (id === "speed") state.battleSpeed = state.battleSpeed === 1 ? 2 : 1;
    if (id === "flee") requestFleeMidBattle();
    if (id === "flee-confirm") fleeMidBattle();
    if (id === "flee-cancel") state.fleeConfirmation = false;
    if (id === "flee-safe") fleeExpedition();
    if (id === "continue") continueExpedition();
    if (id === "next-day") advanceDay();
    if (id === "reset") resetCampaign();
    render();
  },
});

const victoryView = createVictoryView({root:document.querySelector("#victory-screen"),heroTypes:HERO_TYPES,flavors:FLAVORS,
  onReward:chooseLegacy,onVeteran:chooseVeteran,onContinue:defendNextTown,
  onReset:()=>{resetCampaign();render();},onChronicle:()=>chronicleView.open(),onDownload:downloadJourney});

function currentFlavor() {
  return FLAVORS[state.flavorKey];
}

function activeBench() {
  return state.bench.filter((hero) => hero.active);
}

function selectionBonus() {
  return classSelectionBonus(state.selectionHistory, state.day, HERO_KEYS);
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
  remember("upgrade", `${definition.name} upgraded to level ${building.level}${path ? `; chose ${definition[path].label}` : ""}. Spent ${cost} gold.`);
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
  remember("hire", `${hero.name}, a level ${hero.level} ${HERO_TYPES[hero.type].label}, joined the company.`);
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
  remember("roll", `Reviewed ${offerCount(state.day)} contracts; spent ${cost} gold.`);
  if (state.rolledToday && state.freeRerollsRemaining > 0) {
    state.freeRerollsRemaining -= 1;
    if (state.eventRerollsRemaining > 0) { state.eventRerollsRemaining -= 1; remember("favour", "Used one event contract favour for a free reroll."); }
  }
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
  remember("company", state.message);
}

function upgradeSelected() {
  const hero = selectedHero();
  if (!hero) return;
  const cost = upgradeCost(hero.level);
  if (cost === null) {
    state.message = `${hero.name} has reached the current level cap of ${heroLevelCap(state.journey)}.`;
    return;
  }
  if (state.gold < cost) {
    state.message = `That upgrade costs ${cost} gold.`;
    return;
  }
  state.gold -= cost;
  hero.level += 1;
  remember("training", `${hero.name} trained to level ${hero.level}. Spent ${cost} gold.`);
  state.message = `${hero.name} rises to level ${hero.level}.`;
}

function dismissSelected() {
  const hero = selectedHero();
  if (!hero) return;
  state.bench = state.bench.filter((candidate) => candidate.id !== hero.id);
  remember("dismissal", `${hero.name} left the company.`);
  state.selectedHeroId = null;
  state.message = `${hero.name} leaves the company.`;
}

function startExpedition(confirmed = false) {
  if (state.view !== "tavern" || state.rollRemainingMs > 0) return;
  const chosen = activeBench();
  if (!chosen.length) {
    state.message = "Choose at least one active hero before entering the dungeon.";
    return;
  }
  if (!confirmed && chosen.length < teamCapacity(state.day)) {
    rosterView.warnEmptySlots(chosen.length, teamCapacity(state.day));
    return;
  }
  state.selectedHeroId = null;
  state.selectedOfferId = null;
  state.expeditionRecordBefore = state.deepestFloor;
  state.expeditionClearedFloor = 0;
  state.floor = 1;
  state.backdrop = createBackdropDepth();
  state.party = buildParty(chosen);
  state.selectionHistory = recordClassSelection(state.selectionHistory, state.day, chosen, HERO_KEYS);
  state.expeditionStartCount = state.party.length;
  state.expeditionStartIds = chosen.map((hero) => hero.id);
  remember("departure", `${chosen.length} heroes descended: ${chosen.map(h => `${h.name} (${HERO_TYPES[h.type].label}, L${h.level})`).join(", ")}.`);
  const supplies = alchemistSupplies(state.buildings.alchemist.level);
  state.potionsRemaining = supplies.count;
  state.potionHealRatio = supplies.healRatio;
  state.potionCooldownMs = 0;
  state.commandAutoPauseEnabled = true;
  state.potionTargeting = false;
  state.battleLog = [];
  prepareFloor();
  const crowded = Object.entries(classCounts(chosen, HERO_KEYS)).filter(([, count]) => count > 2);
  for (const [type, count] of crowded) logBattle(`${count} ${HERO_TYPES[type].label}s: all take −20% health and damage for this expedition.`);
}

function heroEffects(type) {
  return applyLegacyHeroEffects(townHeroEffects(type, buildingEffects(type, state.buildings[type]), state.town), state.journey);
}

function buildParty(heroes) {
  const counts = classCounts(heroes, HERO_KEYS);
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
    const crowdingMultiplier = classCrowdingMultiplier(counts[hero.type]);
    const baseMaxHp = power * definition.hp * effects.healthMultiplier * crowdingMultiplier;
    const maxHp = cemeteryMaxHp(baseMaxHp, state.graves);
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
      damageMultiplier: effects.damageMultiplier * crowdingMultiplier,
      crowdingPenaltyPercent: crowdingMultiplier < 1 ? 20 : 0,
      damageReduction: effects.damageReduction,
      critChance: effects.critChance,
      evasionChance: effects.evasionChance,
      executeBonus: effects.executeBonus,
      healRatio: effects.healRatio,
      mageTargets: effects.mageTargets,
      baseMaxHp,
      cemeteryBonusPercent: state.graves.length,
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
  const maxHp = Math.round(definition.hp * scale * enemyHealthMultiplier(floor));
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
  targetBackdropFloor(state.backdrop, state.floor);
  if (sceneryMotionPreference.matches) advanceBackdropDepth(state.backdrop, DESCENT_DURATION_MS);
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
  state.commandMeter = state.events.nextCommand ?? Math.min(COMMAND_MAX, COMMAND_START + legacyEffects(state.journey).startingCommandBonus);
  state.events.activeAttack = state.events.nextAttack;
  if (state.events.nextCommand !== null) remember("effect", `Event consequence took effect: battle begins with ${state.events.nextCommand} Command.`, state.floor);
  if (state.events.nextAttack !== 1) remember("effect", `Event consequence took effect: ${Math.round((state.events.nextAttack - 1) * 100)}% attack damage this battle.`, state.floor);
  state.events.nextCommand = null;
  state.events.nextAttack = 1;
  state.commandTargeting = null;
  state.enemyFreezeMs = 0;
  state.freezeCooldownMs = 0;
  state.divineAegisMs = 0;
  state.divineAegisTargetId = null;
  state.floorPotionRecovered = false;
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
  if (commandId === "freeze" && state.freezeCooldownMs > 0) return `cooldown ${(state.freezeCooldownMs / 1000).toFixed(1)}s`;
  if (state.commandMeter < command.cost) return `needs ${command.cost}`;
  if (commandId === "pilfer" && state.pilferUsed) return "used this floor";
  if (commandId === "freeze" && state.enemyFreezeMs > 0) return "already active";
  if (commandId === "aegis" && state.divineAegisMs > 0) return "already active";
  if (commandId === "rally" && state.rallyMs > 0) return "already active";
  if (commandId === "mark" && state.markMs > 0) return "already active";
  if (commandId === "hold" && state.holdLineMs > 0) return "already active";
  if (commandId === "bloodlust" && livingEnemies().length === 0) return "no enemies";
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
  if (commandId === "mark" || commandId === "aegis") {
    state.commandTargeting = commandId;
    state.potionTargeting = false;
    return;
  }

  const count = commandHeroCount(commandId);
  const power = commandPower(commandId, count);
  spendCommand(commandId);
  flashCommandHeroes(commandId);

  if (commandId === "freeze") {
    state.enemyFreezeMs = power.durationMs;
    state.freezeCooldownMs = power.durationMs + TIME_FREEZE_COOLDOWN_MS;
    logBattle(`${count} Mage${count === 1 ? "" : "s"} freeze time for ${(power.durationMs / 1000).toFixed(1)} seconds.`);
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
    const targets = enemyFront.length ? enemyFront : unitsInRow(livingEnemies(), "back");
    const combinedStrike = alliedFront.reduce((damage, hero) => damage
      + hero.power * HERO_TYPES[hero.type].damage * hero.damageMultiplier * heroCommandDamageMultiplier(hero), 0);
    for (const hero of alliedFront) hero.actionFlash = 850;
    for (const enemy of targets) dealDamage(enemy, combinedStrike * power.damageMultiplier, "Bloodlust", { area: true });
    logBattle(`Bloodlust rallies the front line and smashes ${targets.length} foe${targets.length === 1 ? "" : "s"} in the enemy ${enemyFront.length ? "front" : "back"} row.`);
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
  logBattle(`${target.label} is marked for ten seconds: attackers gain +${Math.round(power.speedBonus * 100)}% speed against it.`);
}

function shieldHero(target) {
  if (state.commandTargeting !== "aegis" || !target || target.side !== "hero" || target.hp <= 0 || commandUnavailableReason("aegis")) return;
  const power = commandPower("aegis", commandHeroCount("aegis"));
  spendCommand("aegis");
  flashCommandHeroes("aegis");
  state.divineAegisTargetId = target.id;
  state.divineAegisMs = power.durationMs;
  logBattle(`Divine Aegis shields ${target.label} for eight seconds.`);
}

function hasDivineAegis(target) {
  return target?.side === "hero" && state.divineAegisMs > 0 && state.divineAegisTargetId === target.id;
}

function gainCommandMeter(damage) {
  if (state.view !== "battle" || damage <= 0) return;
  const previous = state.commandMeter;
  state.commandMeter = Math.min(COMMAND_MAX, state.commandMeter + damage * COMMAND_GAIN_PER_DAMAGE);
  if (state.commandAutoPauseEnabled && previous < COMMAND_MAX && state.commandMeter === COMMAND_MAX) {
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

function damageReductionFor(unit) {
  const armor = unit.row === "front" && state.holdLineMs > 0 ? state.holdArmorBonus : 0;
  return totalDamageReduction(unit.damageReduction ?? 0, armor, state.town.prefix.enemyDamage ?? 1);
}

function rememberFallenHero(unit, source) {
  const recorded = recordFallenHero(state.graves, unit, source, { day: state.day, floor: state.floor,
    campaignKey: state.flavorKey, campaignName: currentFlavor().name });
  if (!recorded) return;
  remember("death", `${unit.label}, ${HERO_TYPES[unit.type].label}, fell. The Cemetery remembers them.`, state.floor);
  for (const ally of livingParty()) {
    ally.baseMaxHp ??= ally.maxHp / (1 + (ally.cemeteryBonusPercent ?? 0) / 100);
    ally.maxHp = cemeteryMaxHp(ally.baseMaxHp, state.graves);
    ally.cemeteryBonusPercent = state.graves.length;
    // A death increases capacity, not current HP. Healing remains a separate action.
  }
  logBattle(`The Cemetery remembers ${unit.label}. The living gain +${state.graves.length}% maximum health.`);
}

function dealDamage(target, amount, source, { area = false, logStrike = false } = {}) {
  if (!target || target.hp <= 0) return;
  const enemyAttack = target.side === "hero" && typeof source === "object" && source.side === "enemy";
  if (hasDivineAegis(target)) {
    target.flash = 240;
    return 0;
  }
  let protectedAlly = null;
  if (enemyAttack && !area) {
    const knight = interceptingKnight(livingParty(), target);
    if (knight) {
      protectedAlly = target;
      target = knight;
      target.interceptFlash = 700;
      addCombatEffect(knight, protectedAlly, "intercept");
    }
  }
  // A shielded Knight also blocks attacks they intercept for another hero.
  if (hasDivineAegis(target)) {
    target.flash = 240;
    return 0;
  }
  const dodge = target.side === "enemy"
    ? target.type === "shadowAssassin" ? BOSS_RULES.evasion : target.evasionChance ?? 0
    : enemyAttack ? target.evasionChance ?? state.town.prefix.evasion ?? 0 : 0;
  if (dodge > 0 && Math.random() < cappedCombatPercent(dodge)) {
    target.evadeFlash = 700;
    if (typeof source === "object") addCombatEffect(source, target, "dodge");
    logBattle(protectedAlly ? `${target.label} intercepts for ${protectedAlly.label} and dodges the attack.` : `${target.label} evades the hit.`);
    return 0;
  }
  const sourceLabel = typeof source === "string" ? source : source.label;
  const critical = typeof source === "object"
    && source.side === "hero"
    && source.critChance > 0
    && Math.random() < cappedCombatPercent(source.critChance);
  const criticalAmount = critical ? amount * 2 : amount;
  const reducedAmount = target.side === "hero"
    ? criticalAmount * (1 - damageReductionFor(target))
    : criticalAmount * (1 - cappedCombatPercent(target.damageReduction));
  const damage = Math.max(1, Math.round(reducedAmount * COMBAT_DAMAGE_SCALE));
  const previousHp = target.hp;
  target.hp = Math.max(0, target.hp - damage);
  const actualDamage = previousHp - target.hp;
  target.flash = 420;
  if (typeof source === "object") addCombatEffect(source, target);
  if (critical) logBattle(`${sourceLabel} lands a critical hit.`);
  if (target.hp === 0) {
    if (target.side === "hero") rememberFallenHero(target, source);
    logBattle(`${sourceLabel} defeats ${target.label}.`);
  }
  else if (logStrike) logBattle(`${sourceLabel} strikes ${target.label}.`);
  if (protectedAlly) logBattle(`${target.label} intercepts the attack on ${protectedAlly.label} (${actualDamage} damage).`);
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
  return (unit.row === "front" && state.holdLineMs > 0 ? 1 + state.holdDamageBonus : 1) * state.events.dayPower * state.events.activeAttack;
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
      const amount = Math.max(1, Math.round(unit.power * unit.healRatio * COMBAT_DAMAGE_SCALE * state.events.dayPower));
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
    const damage = targets.reduce((total, target) => total + dealDamage(target, attackDamage, unit, { area: true }), 0);
    logBattle(damage > 0
      ? `${unit.label} ${unit.type === "infernalDragon" ? "breathes fire across" : "cleaves through"} the ${front.length ? "front" : "back"} row.`
      : targets.every(hasDivineAegis) ? `Divine Aegis turns aside ${unit.label}'s attack.`
        : `The ${front.length ? "front" : "back"} row evades ${unit.label}'s attack.`);
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
  dealDamage(target, attackDamage, unit, { logStrike: skill !== "heal" });
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
    unit.interceptFlash = Math.max(0, (unit.interceptFlash ?? 0) - delta);
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
  state.freezeCooldownMs = Math.max(0, state.freezeCooldownMs - delta);
  state.potionCooldownMs = Math.max(0, Math.round((state.potionCooldownMs - delta) * 1000) / 1000);
  state.divineAegisMs = Math.max(0, state.divineAegisMs - delta);
  if (state.divineAegisMs === 0 || !livingParty().some(hero => hero.id === state.divineAegisTargetId)) {
    state.divineAegisMs = 0;
    state.divineAegisTargetId = null;
  }
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
  if (state.view !== "battle") return;
  snapBackdropFloor(state.backdrop, state.floor);
  state.expeditionClearedFloor = state.floor;
  clearCombatFeedback();
  state.view = "floor_result";
  state.floorReward = floorGoldReward(state.day);
  state.floorPilferGold = state.pilferPending;
  state.gold += state.floorReward + state.floorPilferGold;
  const newRecord = state.floor > state.deepestFloor;
  state.deepestFloor = Math.max(state.deepestFloor, state.floor);
  remember("floor", `Cleared floor ${state.floor}. ${livingParty().length} survived; gained ${state.floorReward + state.floorPilferGold} gold.${newRecord ? " A new depth record." : ""}`, state.floor);
  if (state.events.activeAttack !== 1) remember("effect", "The event attack modifier expired with the battle.", state.floor);
  state.events.activeAttack = 1;
  const survivorCount = livingParty().length;
  const survivorCopy = `${survivorCount} ${survivorCount === 1 ? "hero remains" : "heroes remain"}`;
  if (isBossFloor(state.floor)) {
    const firstVictory = !state.victoryAchieved;
    state.victoryAchieved = true;
    state.victoryDay ??= state.day;
    state.resultTitle = firstVictory ? "Victory" : "Boss Defeated";
    const lootCopy = state.floorPilferGold ? `, plus ${state.floorPilferGold} pilfered gold` : "";
    state.resultCopy = `${BOSS_DEFINITIONS[state.bossType].label} falls. ${survivorCopy}. The party claims ${state.floorReward} gold${lootCopy} and brings the invasion to an end.`;
    state.message = "The invasion has ended. Remember the fallen and choose what to carry forward.";
  } else {
    state.resultTitle = `Floor ${state.floor} Cleared`;
    const lootCopy = state.floorPilferGold ? ` Thieves also secure ${state.floorPilferGold} pilfered gold.` : "";
    state.resultCopy = `${survivorCopy}. The vault yields ${state.floorReward} gold for day ${state.day}.${lootCopy}`;
    state.message = "Take the winnings and flee, or press deeper with your current health.";
  }
  state.floorPotionRecovered = Math.random() < potionRecoveryChance(state.buildings.alchemist.level, state.journey);
  if (state.floorPotionRecovered) {
    state.potionsRemaining += 1;
    state.resultCopy += " Recovered one healing potion.";
    remember("supplies", "Recovered one healing potion after clearing the floor.", state.floor);
  }
  state.events.clears += 1;
  if (isBossFloor(state.floor)) {
    concludeCampaign();
    persist();
    return;
  }
  const scheduled = state.events.plan[state.events.next];
  if (scheduled && state.events.clears >= scheduled.at) {
    state.events.pending = { ...scheduled, result: null };
    state.events.next += 1;
    state.view = "event";
  }
  persist();
}

function continueExpedition() {
  if (state.view !== "floor_result" || state.floor >= BOSS_FLOOR) return;
  state.floor += 1;
  prepareFloor();
}

function finishDay(reason = "The company returns to the surface with its survivors.", title = null, retreatType = "automatic") {
  if (state.view === "campaign_victory") return;
  snapBackdropFloor(state.backdrop, state.floor);
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
  remember("return", `${reason} ${state.party.length} of ${state.expeditionStartCount} heroes returned; ${state.gold} gold in the treasury.`, state.floor);
  if (state.events.activeAttack !== 1) remember("effect", "The event attack modifier expired with the battle.", state.floor);
  state.events.activeAttack = 1;
  if (state.events.dayPower !== 1) remember("effect", "The shared-cache damage and healing bonus ended with the day.");
  state.events.dayPower = 1;
  if (campaignEnded) remember("ending", state.resultCopy);
  persist();
}

function resolveRetreatLevelUps(retreatType) {
  state.retreatType = retreatType;
  state.retreatLevelChance = retreatLevelChance(state.party.length, retreatType);
  const eligibleIds = state.party
    .filter((unit) => unit.hero.level < heroLevelCap(state.journey))
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
  if (state.potionsRemaining <= 0 || state.potionCooldownMs > 0) return;
  if (!livingParty().some((unit) => unit.hp < unit.maxHp)) return;
  state.commandTargeting = null;
  state.potionTargeting = true;
}

function usePotionOn(unit) {
  if (state.view !== "battle" || !state.potionTargeting || state.potionsRemaining <= 0 || state.potionCooldownMs > 0) return;
  if (!unit || unit.side !== "hero" || unit.hp <= 0 || unit.hp >= unit.maxHp) return;
  const healing = Math.max(1, Math.round(unit.maxHp * state.potionHealRatio));
  const restored = Math.min(healing, unit.maxHp - unit.hp);
  unit.hp += restored;
  unit.potionFlash = 650;
  state.potionsRemaining -= 1;
  state.potionCooldownMs = 2000;
  state.potionTargeting = false;
  logBattle(`A potion restores ${restored} health to ${unit.label}.`);
  remember("potion", `A potion restored ${restored} HP to ${unit.label}.`, state.floor);
}

function clearCombatFeedback() {
  state.fleeConfirmation = false;
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
    unit.interceptFlash = 0;
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

function requestFleeMidBattle() {
  if (state.view !== "battle") return;
  state.battlePaused = true;
  state.fleeConfirmation = true;
}

function fleeMidBattle() {
  if (state.view !== "battle" || !state.fleeConfirmation) return;
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
  if (state.eventRerollsRemaining > 0) remember("favour", `${state.eventRerollsRemaining} unused event contract favour(s) expired.`);
  state.day += 1;
  state.gold += (state.town.settlement.dailyGold ?? 0) + legacyEffects(state.journey).dailyGold;
  state.eventRerollsRemaining = state.events.nextDayRerolls;
  state.freeRerollsRemaining = (state.town.settlement.freeRerolls ?? 0) + state.events.nextDayRerolls;
  state.events.nextDayRerolls = 0;
  const morning = townMorale(state.day, state.lastExpedition, state.victoryAchieved);
  state.dayOutlook = morning.tone;
  remember("dawn", morning.text);
  const survivors = state.party.map((unit) => unit.hero);
  const reserves = state.bench.filter((hero) => !state.expeditionStartIds.includes(hero.id));
  for (const hero of survivors) {
    if (state.retreatLevelUpIds.includes(hero.id)) { hero.level = Math.min(heroLevelCap(state.journey), hero.level + 1); remember("level", `${hero.name} returned at level ${hero.level}.`); }
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
  if (legacyEffects(state.journey).dailyGold) remember("income", "Liberated coffers yielded 3 gold.");
  if (state.town.settlement.dailyGold) remember("income", "The Estate yielded 1 gold.");
  if (state.eventRerollsRemaining) remember("favour", `${state.eventRerollsRemaining} extra free reroll(s) available today from yesterday’s encounters.`);
  state.message = levelUps > 0
    ? `Day ${state.day}. Survivors return healed; ${levelUps} gained a level. Floors now yield ${floorGoldReward(state.day)} gold.`
    : `Day ${state.day}. Survivors return healed; no one gained a level. Floors now yield ${floorGoldReward(state.day)} gold.`;
  persist();
}

function concludeCampaign() {
  if (state.conclusion) return;
  clearCombatFeedback();
  state.party = livingParty();
  state.victoryAchieved = true;
  state.victoryDay ??= state.day;
  state.events.pending = null;
  state.events.activeAttack = 1;
  state.events.dayPower = 1;
  state.view = "campaign_victory";
  for (const unit of state.party) unit.hero.townsSaved = (unit.hero.townsSaved ?? 0) + 1;
  remember("victory", `${BOSS_DEFINITIONS[state.bossType]?.label ?? "The dungeon lord"} has fallen. ${state.town.name} is saved. The invasion ended on day ${state.victoryDay}.`, BOSS_FLOOR);
  remember("ending", `${state.party.length} heroes survived; ${state.graves.length} are remembered. ${state.journey.completed.length === 3 ? "Four towns are saved. The journey is complete." : "The company prepares to answer another town’s call."}`);
  state.conclusion = campaignSummary(state);
  state.carryHeroIds = state.party.length <= 2 ? state.party.map(unit => unit.hero.id) : [];
}

function chooseLegacy(id) {
  if (state.view !== "campaign_victory" || state.journey.completed.length >= 3 || !LEGACIES[state.flavorKey].some(reward => reward.id === id)) return;
  state.victoryRewardId = id;
  persist(); render();
}

function chooseVeteran(id) {
  if (state.view !== "campaign_victory" || !livingParty().some(unit => unit.hero.id === id)) return;
  if (state.carryHeroIds.includes(id)) state.carryHeroIds = state.carryHeroIds.filter(heroId => heroId !== id);
  else if (state.carryHeroIds.length < Math.min(2,livingParty().length)) state.carryHeroIds.push(id);
  persist(); render();
}

function defendNextTown() {
  if (state.view !== "campaign_victory" || state.journey.completed.length >= 3) return;
  const reward = LEGACIES[state.flavorKey].find(reward => reward.id === state.victoryRewardId);
  const veterans = livingParty().filter(unit => state.carryHeroIds.includes(unit.hero.id)).map(unit => ({...unit.hero}));
  if (!reward || veterans.length !== Math.min(2,livingParty().length) || veterans.length !== state.carryHeroIds.length) return;
  remember("legacy", `The company chose ${reward.name}. ${reward.description}`);
  remember("departure", `${veterans.map(hero=>hero.name).join(" and ") || "A new company"} will answer the next town’s call. The other survivors remain as defenders.`);
  const completed = {...campaignSummary(state),rewardId:reward.id,carriedHeroIds:veterans.map(hero=>hero.id)};
  const journey = {completed:[...state.journey.completed,completed],legacies:[...state.journey.legacies,reward.id]};
  archiveChronicle(state);
  state = createCampaign(journey,veterans);
  persist(); render();
  window.scrollTo(0,0);
  document.querySelector(".town-brand")?.focus({preventScroll:true});
}

function downloadJourney() {
  const campaigns = [...state.journey.completed, campaignSummary(state)];
  const text = campaigns.map(campaign => [`${campaign.town.name} — ${FLAVORS[campaign.flavorKey].name}`, ...campaign.chronicle.map(entry => `Day ${entry.day}${entry.floor === null ? "" : ` · Floor ${entry.floor}`} · ${entry.text}`)].join("\n")).join("\n\n");
  const url = URL.createObjectURL(new Blob([text],{type:"text/markdown"}));
  const link = document.createElement("a"); link.href = url; link.download = "vaultbound-journey.md"; link.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
}

function resetCampaign() {
  archiveChronicle(state);
  nextHeroId = 1;
  nextEnemyId = 1;
  state = createCampaign();
  window.scrollTo(0,0);
  persist();
}

function update(milliseconds) {
  const step = Math.min(100, milliseconds);
  if (state.rollRemainingMs > 0) {
    state.rollRemainingMs = Math.max(0, state.rollRemainingMs - step);
    if (state.rollRemainingMs === 0) state.message = `${state.offers.length} contracts revealed. Inspect a hero, then use Hire beneath the portrait. Your company is safe from rerolls.`;
  }
  updateBattle(step);
  // Scenery follows real time, not combat speed. Pause also freezes the descent.
  if (state.view === "battle" && (!state.battlePaused || sceneryMotionPreference.matches)) {
    advanceBackdropDepth(state.backdrop, sceneryMotionPreference.matches ? DESCENT_DURATION_MS : step);
  }
}

function configureLayout(force = false) {
  const portrait = window.innerWidth <= 900 && window.innerHeight >= window.innerWidth;
  const compact = window.innerHeight <= 600 && window.innerWidth > window.innerHeight;
  const nextMode = portrait ? "portrait" : compact ? "compact" : "desktop";
  if (!force && nextMode === layoutMode) return;
  layoutMode = nextMode;
}

function render() {
  eventView.render(state);
  victoryView.render(state);
  const townVisible = state.view === "town";
  townView.render({
    visible: townVisible,
    buildings: state.buildings,
    town: state.town,
    morale: townMorale(state.day, state.lastExpedition, state.victoryAchieved),
    gold: state.gold,
    day: state.day,
    flavorName: currentFlavor().name,
    flavorKey: state.flavorKey,
    message: state.message,
    rolledToday: state.rolledToday,
    journeyNumber: state.journey.completed.length+1,
    heroLevelCap: heroLevelCap(state.journey),
    legacies: legacyRewards(state.journey),
    potionRecoveryPercent: Math.round(potionRecoveryChance(state.buildings.alchemist.level,state.journey)*100),
    graves: state.graves,
  });
  const battleVisible = ["battle", "floor_result", "day_result", "campaign_end"].includes(state.view);
  battleView.render(battleVisible ? battlePresentation() : { visible: false });
  const activeCounts = classCounts(activeBench(), HERO_KEYS);
  const presentHero = (hero, offered = false) => {
    const definition = HERO_TYPES[hero.type];
    const effects = heroEffects(hero.type);
    const power = heroPower(hero.level);
    const prospectiveActive = offered && activeBench().length < teamCapacity(state.day);
    const crowdingCount = activeCounts[hero.type] + (prospectiveActive ? 1 : 0);
    const crowdingMultiplier = hero.active || prospectiveActive ? classCrowdingMultiplier(crowdingCount) : 1;
    let summary = definition.summary;
    if (hero.type === "mage") summary = `Strikes up to ${effects.mageTargets} different enemies per attack, starting in the back row. Spell targets come from the Mage Guild.`;
    if (hero.type === "bard") summary = `Gives ${effects.bardTargets} random non-bard ${effects.bardTargets === 1 ? "ally" : "allies"} +${Math.round(effects.bardBuff * 100)}% power at expedition start.`;
    if (hero.type === "knight") summary += ` ${Math.round(totalDamageReduction(effects.damageReduction, 0, state.town.prefix.enemyDamage ?? 1) * 100)}% damage reduction, including town bonuses.`;
    return { ...hero, power, health: cemeteryMaxHp(power * definition.hp * effects.healthMultiplier * crowdingMultiplier, state.graves), damage: Math.round(power * definition.damage * effects.damageMultiplier * crowdingMultiplier), crowdingPenaltyPercent: crowdingMultiplier < 1 ? 20 : 0, prospectiveActive, summary,
      unpenalizedHealth: cemeteryMaxHp(power * definition.hp * effects.healthMultiplier, state.graves),
      unpenalizedDamage: Math.round(power * definition.damage * effects.damageMultiplier), evasionChance: effects.evasionChance };
  };
  rosterView.render(state.view === "tavern" ? {
    visible: true, day: state.day, gold: state.gold, flavor: currentFlavor().name,
    maxHeroLevel: heroLevelCap(state.journey), journeyNumber: state.journey.completed.length+1,
    rolledToday: state.rolledToday, rollRemainingMs: state.rollRemainingMs,
    rerollCost: state.rerollCost, nextRollCost: townRollCost(state), freeRerollsRemaining: state.freeRerollsRemaining, dailyOffers: offerCount(state.day),
    tavernLevel: state.buildings.tavern.level, odds: offerLevelOddsText().replace(/^Tavern L\d+: /, ""),
    offers: state.rollRemainingMs > 0 ? [] : state.offers.map(hero => presentHero(hero, true)),
    bench: state.bench.map(hero => presentHero(hero)), selectedHeroId: state.selectedHeroId, selectedOfferId: state.selectedOfferId,
    activeCount: activeBench().length, teamCapacity: teamCapacity(state.day), benchCapacity: benchLimit(),
    potions: alchemistSupplies(state.buildings.alchemist.level).count, buildings: state.buildings, message: state.message,
    cemeteryBonusPercent: state.graves.length,
    selectionBonus: selectionBonus(),
    crowdedClasses: Object.entries(activeCounts).filter(([, count]) => count > 2).map(([type, count]) => ({type, count})),
  } : { visible: false });
  chronicleView.place(state.view);
  canvas.hidden = true;
}

// Inspection reads the same modifiers and timing helpers used by combat.
function battleUnitDetails(id) {
  const unit = [...state.party, ...state.enemies].find(unit => unit.id === id && unit.hp > 0);
  if (!unit) return null;
  const hero = unit.side === "hero";
  const definition = hero ? HERO_TYPES[unit.type] : ENEMY_TYPES[unit.type];
  const percent = value => `${Number((value * 100).toFixed(2))}%`;
  const number = value => Number(value.toFixed(2));
  const seconds = ms => `${Number((ms / 1000).toFixed(2))}s`;
  const interval = hero ? heroInterval(unit) : enemyInterval(unit);
  const rawDamage = hero
    ? unit.power * definition.damage * unit.damageMultiplier * heroCommandDamageMultiplier(unit)
    : unit.damage * (enemyEmpowered(unit) ? BOSS_RULES.allyDamage : 1);
  const damage = rawDamage > 0 ? Math.max(1, Math.round(rawDamage * COMBAT_DAMAGE_SCALE)) : 0;
  const crit = hero ? cappedCombatPercent(unit.critChance) : 0;
  const dodge = unit.type === "shadowAssassin" ? BOSS_RULES.evasion : cappedCombatPercent(unit.evasionChance);
  const reduction = hero ? damageReductionFor(unit) : cappedCombatPercent(unit.damageReduction);
  const frozen = hero ? unit.frozenMs ?? 0 : state.enemyFreezeMs;
  const stats = [
    ["Health", `${Math.ceil(unit.hp)} / ${number(unit.maxHp)} HP`],
    ["Damage / hit", damage],
    ["Attack interval", Number.isFinite(interval) ? seconds(interval) : "Does not attack"],
    ["Critical chance", percent(crit)],
    ["Critical hit damage", crit > 0 ? Math.max(1, Math.round(rawDamage * 2 * COMBAT_DAMAGE_SCALE)) : "No critical hits"],
    ["Dodge chance", percent(dodge)],
    ["Damage reduction", percent(reduction)],
  ];
  const bonuses = [], effects = [];
  if (hero) {
    const building = state.buildings[unit.type];
    const district = BUILDING_DEFINITIONS[unit.type];
    stats.splice(1, 0, ["Power", number(unit.power)]);
    stats.push(["Permanent attack speed", `×${number(unit.buildingSpeed)}`]);
    bonuses.push(`Level ${unit.hero.level}: ${heroPower(unit.hero.level)} base power${["mage", "ranger", "bard"].includes(unit.type) ? "" : `; +${percent(speedMultiplier(unit.hero.level) - 1)} attack speed`}.`);
    const guards = livingParty().some(ally => ally.id !== unit.id && ally.type === "knight" && !(ally.frozenMs > 0));
    stats.push(["Ally intercept chance", guards ? "50% · single-target enemy attacks" : "0% · no available Knight"]);
    if (unit.type === "knight") stats.push(["Intercept for allies", frozen || livingParty().length < 2 ? "0% · unavailable" : "50% · single-target attacks"]);
    if (unit.type === "mage") stats.push(["Spell targets", unit.mageTargets]);
    if (unit.type === "cleric") stats.push(["Healing / action", `${Math.max(1, Math.round(unit.power * unit.healRatio * COMBAT_DAMAGE_SCALE * state.events.dayPower))} HP · one wounded ally`]);
    if (unit.type === "thief") stats.push(["Damage vs ≤50% HP", Math.max(1, Math.round(rawDamage * (1 + unit.executeBonus) * COMBAT_DAMAGE_SCALE))]);
    bonuses.push(`${district.name} · level ${building.level}: ${district.core(building.level)}`);
    for (const path of ["pathA", "pathB"]) if (building[path] > 0 && district[path]) bonuses.push(`${district[path].label} ×${building[path]}: ${district[path].short} per upgrade`);
    if (unit.bardBuffPercent) bonuses.push(`Bard blessing: +${unit.bardBuffPercent}% power (included in health and damage).`);
    if (unit.cemeteryBonusPercent) bonuses.push(`Cemetery: +${unit.cemeteryBonusPercent}% maximum health.`);
    if (unit.crowdingPenaltyPercent) bonuses.push(`Crowding: −${unit.crowdingPenaltyPercent}% maximum health and damage for this expedition.`);
    const prefix = state.town.prefix;
    if (["health", "speed", "crit", "evasion", "enemyDamage"].some(key => prefix[key] !== undefined)) bonuses.push(`Town · ${prefix.name}: ${prefix.bonus}`);
    if (state.town.settlement.classType === unit.type) bonuses.push(`Town · ${state.town.settlement.name}: ${state.town.settlement.bonus}`);
    for (const legacy of legacyRewards(state.journey)) if (["healthMultiplier", "damageMultiplier", "critChance", "damageReduction", "evasionChance"].some(key => legacy[key] !== undefined)) bonuses.push(`Legacy · ${legacy.name}: ${legacy.description}`);
    if (unit.type === "bard") {
      const bard = heroEffects("bard");
      bonuses.push(`Blesses ${bard.bardTargets} non-Bard ${bard.bardTargets === 1 ? "ally" : "allies"} with +${percent(bard.bardBuff)} power when the expedition begins. Does not attack.`);
    }
    if (state.holdLineMs > 0 && unit.row === "front") effects.push(`Hold the Line: +${percent(state.holdArmorBonus)} armor and +${percent(state.holdDamageBonus)} damage · ${seconds(state.holdLineMs)}`);
    if (state.rallyMs > 0) effects.push(`Rally: +${percent(state.rallySpeedBonus)} attack speed · ${seconds(state.rallyMs)}`);
    const marked = activeMarkedEnemy();
    if (marked && heroCanReach(unit, marked)) effects.push(`Mark Prey: +${percent(state.markSpeedBonus)} attack speed against ${marked.label} · ${seconds(state.markMs)}`);
    if (state.events.dayPower !== 1) effects.push(`Shared cache: +${percent(state.events.dayPower - 1)} damage and healing today.`);
    if (state.events.activeAttack !== 1) effects.push(`Event: ${percent(state.events.activeAttack - 1)} attack damage this battle.`);
    if (hasDivineAegis(unit)) effects.push(`Divine Aegis: invulnerable · ${seconds(state.divineAegisMs)}`);
  } else {
    bonuses.push(`Floor ${state.floor}: ×${number(floorScale(state.floor))} base health/damage scaling; ×${number(enemyHealthMultiplier(state.floor))} additional enemy health. Included above.`);
    if (enemyEmpowered(unit)) effects.push(`Guild Master: +${percent(BOSS_RULES.allyDamage - 1)} damage and +${percent(BOSS_RULES.allySpeed - 1)} attack speed.`);
    if (state.markedEnemyId === unit.id && state.markMs > 0) effects.push(`Marked: reachable heroes focus this enemy and attack faster · ${seconds(state.markMs)}`);
  }
  if (frozen > 0) effects.push(`Frozen: attacks stopped · ${seconds(frozen)}`);
  const enemyBehavior = {
    necromancer: "Summons a skeleton each action while fewer than 14 enemies remain, then attacks a random hero.",
    assassin: "Blinks forward to strike the lowest-health hero, then retreats.",
    archdemon: "Targets the back row first.",
    boneMage: "Attacks a random living hero.", warlock: "Attacks a random living hero.",
    marksman: "Attacks a random living hero.", goblinArcher: "Attacks a random living hero.", orcShaman: "Attacks a random living hero.",
  };
  return { id, name: unit.label, type: unit.type, side: unit.side,
    subtitle: `${definition.label}${hero ? ` · Level ${unit.hero.level}` : unit.boss ? " · Boss" : ""} · ${unit.row === "front" ? "Front line" : "Rear guard"}`,
    behavior: hero ? definition.summary : BOSS_DEFINITIONS[unit.type]?.summary ?? enemyBehavior[unit.type] ?? "Attacks the front row, reaching the rear when the front falls.",
    stats, bonuses, effects,
    note: "Damage is per target, before the target’s armor, dodge or shields; critical hits double the unrounded damage. Attack intervals use battle time and include current speed bonuses. Critical chance, dodge and damage reduction are capped at 90%.",
  };
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
    flavorKey: state.flavorKey,
    backdrop: state.backdrop,
    party: state.party,
    enemies: state.enemies.map(unit => ({ ...unit, empowered: enemyEmpowered(unit) })),
    log: state.battleLog,
    combatEffects: state.combatEffects,
    meter: state.commandMeter,
    eventBonuses: [
      ...(state.events.dayPower !== 1 ? ["Shared cache: +5% damage and healing today"] : []),
      ...(state.events.activeAttack !== 1 ? [`Event: ${Math.round((state.events.activeAttack - 1) * 100)}% attack damage this battle`] : []),
      ...(state.events.nextCommand !== null ? [`Next battle: ${state.events.nextCommand} starting Command`] : []),
      ...(state.events.nextAttack !== 1 ? [`Next battle: ${Math.round((state.events.nextAttack - 1) * 100)}% attack damage`] : []),
    ],
    targeting: state.potionTargeting ? "potion" : state.commandTargeting,
    markedEnemyId: state.markedEnemyId,
    divineAegisTargetId: state.divineAegisTargetId,
    paused: state.battlePaused,
    fleeConfirmation: Boolean(state.fleeConfirmation),
    commandAutoPaused: state.commandAutoPaused,
    commandAutoPauseEnabled: state.commandAutoPauseEnabled,
    speed: state.battleSpeed,
    potions: state.potionsRemaining,
    potionHealPercent: Math.round(state.potionHealRatio * 100),
    potionRecoveryPercent: Math.round(potionRecoveryChance(state.buildings.alchemist.level,state.journey)*100),
    potionCooldownMs: state.potionCooldownMs,
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

function toggleCommandAutoPause() {
  if (state.view !== "battle") return;
  state.commandAutoPauseEnabled = !state.commandAutoPauseEnabled;
  if (state.commandAutoPauseEnabled && state.commandMeter >= COMMAND_MAX && !state.battlePaused) {
    state.battlePaused = true;
    state.commandAutoPaused = true;
    logBattle("Command full. Battle paused — choose an order, then Resume.");
  }
}

function toggleBattlePause() {
  if (state.view !== "battle") return;
  state.battlePaused = !state.battlePaused;
  state.commandAutoPaused = false;
}

window.addEventListener("keydown", (event) => {
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  // Enter and Space on a focused HTML control must activate that control only.
  if (event.target.closest?.("button, a, input, select, textarea, summary") && ["Enter", " "].includes(event.key)) return;
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
  } else if (state.view === "battle" && event.key === "8") {
    togglePotionTargeting();
    render();
  } else if (state.view === "battle" && event.key === "Escape") {
    state.commandTargeting = null;
    state.potionTargeting = false;
    render();
  } else if (event.key === "Enter") {
    event.preventDefault();
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
    selectionLevelBonus: hero.selectionLevelBonus ?? 0,
  });
  return JSON.stringify({
    coordinateSystem: "Town, recruitment, and battle use responsive HTML controls. Daily flow: town → company → dungeon. All seven battle commands are visible from the start.",
    game: "Vaultbound",
    journey: {invasion:state.journey.completed.length+1,levelCap:heroLevelCap(state.journey),
      completed:state.journey.completed.map(c=>({town:c.town.name,flavor:c.flavorKey,day:c.day,reward:c.rewardId})),
      remaining:remainingInvasions(state.journey).filter(f=>!state.victoryAchieved || f!==state.flavorKey),
      legacies:legacyRewards(state.journey).map(r=>({id:r.id,name:r.name,description:r.description})),
      complete:state.victoryAchieved && state.journey.completed.length===3,
      selectedReward:state.victoryRewardId,selectedVeterans:state.carryHeroIds},
    conclusion:state.view === "campaign_victory" ? state.conclusion : null,
    layout: layoutMode,
    view: state.view,
    events: { clears: state.events.clears, encountered: state.events.next, pending: state.events.pending, dayPower: state.events.dayPower, nextCommand: state.events.nextCommand, nextAttack: state.events.nextAttack, activeAttack: state.events.activeAttack, nextDayRerolls: state.events.nextDayRerolls },
    chronicle: state.chronicle.slice(-12),
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
      canContinueAfterVictory: false,
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
    classBalance: { selectionHistory: state.selectionHistory, offerBonus: selectionBonus(),
      crowding: { threshold: 3, healthMultiplier: .8, damageMultiplier: .8, fixedForExpedition: true } },
    offerCount: state.offers.length,
    offers: state.rollRemainingMs > 0 ? [] : state.offers.map(summarizeHero),
    bench: state.bench.map(summarizeHero),
    cemetery: { name: CEMETERY.name, upgradeable: false, fallenCount: state.graves.length,
      healthBonusPercent: state.graves.length, graves: state.graves, resetsWithCampaign: true },
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
    fleeConfirmation: Boolean(state.fleeConfirmation),
    commandAutoPaused: state.commandAutoPaused,
    commandAutoPauseEnabled: state.commandAutoPauseEnabled,
    commands: {
      meter: Math.floor(state.commandMeter),
      gainPerDamage: COMMAND_GAIN_PER_DAMAGE,
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
        freezeCooldownMs: Math.round(state.freezeCooldownMs),
        divineAegisMs: Math.round(state.divineAegisMs),
        divineAegisTargetId: state.divineAegisTargetId,
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
      cooldownMs: Math.ceil(state.potionCooldownMs),
      reuseDelayMs: 2000,
      cooldownClock: "combat",
      replenishes: "at the start of each daily expedition",
      floorRecoveryChance: potionRecoveryChance(state.buildings.alchemist.level,state.journey),
      recoveredThisFloor: Boolean(state.floorPotionRecovered),
    },
    midBattleFleeCost: state.view === "battle" ? midBattleFleeCost() : null,
    manualFleeLevelChance: ["battle", "floor_result"].includes(state.view) ? manualFleeLevelChance() : null,
    battleTimeMs: Math.round(state.battleTime),
    battleBackdrop: battleView.backdropSnapshot(),
    inspectedUnitId: battleView.inspectedUnit(),
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
      evasionChance: unit.evasionChance,
      interceptChance: unit.type === "knight" ? .5 : 0,
      effectiveDamageReduction: damageReductionFor(unit),
      cemeteryBonusPercent: unit.cemeteryBonusPercent,
      crowdingPenaltyPercent: unit.crowdingPenaltyPercent ?? 0,
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
    controls: "Begin each day in town, then prepare the company. R rolls heroes: first daily roll free, then 1g, 2g, 3g. Offers use the Tavern level when rolled. Inspect portraits; Hire below each offer for free. Hired heroes are safe from rerolls. T toggles Town. Each cleared floor pays the current day in gold. Clear floor 10 to end the invasion, review its chronicle and carry one legacy and two survivors to a new town. Four different invasions complete the journey. Hero caps rise from 5 to 8; hero-level attack speed stops growing at level 5. All seven battle commands are visible from the start; click one or press 1–7. Auto pause at 100 Command starts ON each expedition and can be toggled; choose an order, then Resume or press P. Damage fills Command at 0.12 points per damage, and matching living heroes determine command power. Time Freeze costs 100 Command and has a ten-second cooldown after freezing. Divine Aegis shields one selected hero for eight seconds. Mark Prey focuses a selected enemy and speeds up reachable attackers for ten seconds, ending early if the target dies. Each cleared floor rolls Alchemist level × 10% potion recovery, plus 50 percentage points with the Undead potion legacy. Click any hero or enemy to pause and inspect their full portrait, combat stats, bonuses and effects. Close details leaves combat paused. Potion requires selecting a wounded hero and has a two-second cooldown in combat time, paused with battle and scaled by battle speed. Press 8 to prepare or cancel a potion. Esc cancels targeting. Commands and potions work while paused. P pauses; Space changes speed; F toggles fullscreen. Enter begins or continues an expedition or advances the day (focused buttons activate normally). Mid-battle Flee pauses combat and asks for confirmation before costing half your gold. Cancel keeps combat paused. Safe Flee is free between floors. Town buildings reset after the ten-day campaign.",
  });
};

if (state.victoryAchieved && !state.conclusion) {
  if (!livingParty().length) state.party = buildParty(state.bench.filter(hero=>hero.active));
  state.floor = BOSS_FLOOR;
  concludeCampaign();
  persist();
}
configureLayout(true);
render();
requestAnimationFrame(frame);
