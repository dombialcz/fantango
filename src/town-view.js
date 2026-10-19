import { BATTLE_BACKDROPS } from "./battle-backdrop.js";
import { BUILDING_DEFINITIONS, buildingUpgradeCost } from "./town.js";
import { goldAmount, goldPrice, updateGoldBalance } from "./gold-ui.js";
import { observeTownRestoration } from "./town-art-feedback.js";
import { createBuildingFlavor } from "./building-flavor.js";
import { CEMETERY } from "./cemetery.js";

const DISTRICT_ORDER = ["knight", "ranger", "mage", "thief", "tavern", "cleric", "barbarian", "bard", "alchemist", "cemetery"];
const definitionFor = type => type === "cemetery" ? {name: CEMETERY.name, utility: true} : BUILDING_DEFINITIONS[type];
const escape = value => String(value).replace(/[&<>"']/g, character => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[character]);
const STAGES = ["Humble beginnings", "Established", "Expanded", "Fortified", "Fully restored"];
const DISTRICTS = {
  knight: { color: "#a4bac8", title: "A shield at the city gates", copy: "Knights start with 20% damage reduction and can intercept single-target attacks on allies (50% chance). Frozen Knights cannot intercept; area attacks cannot be intercepted. Barracks improve their damage reduction further, up to the shared 90% cap.", command: "Hold the Line strengthens front-row armor and damage. More living Knights strengthen both bonuses." },
  thief: { color: "#91a7d0", title: "Fortunes favor the unseen", copy: "Thieves fight on the front line with 10% base dodge. Evasion training adds five percentage points per upgrade instead of critical-hit chance. Dodge, crit and damage reduction each cap at 90% after all bonuses.", command: "Pilfer reserves extra gold for a cleared floor. More living Thieves secure a larger haul." },
  bard: { color: "#cf9b7d", title: "Keep the city's heart beating", copy: "A little music outlasts a long night. Give your Bards a stage, and the whole company grows stronger.", command: "Rally accelerates the party. More living Bards make the attack-speed bonus stronger." },
  cleric: { color: "#e2cc8c", title: "A light that will not yield", copy: "The bells call the wounded home. Strengthen the Clerics who keep your company alive.", command: "Divine Aegis makes the party invulnerable. More living Clerics make the protection last longer." },
  barbarian: { color: "#ce8b74", title: "Strength is forged in the dust", copy: "No polished floors. No gentle lessons. The pit prepares Barbarians for whatever waits below.", command: "Bloodlust sacrifices 10% maximum health from the allied front row for a sweeping strike. More living Barbarians increase its damage." },
  ranger: { color: "#9cb887", title: "Eyes beyond the city walls", copy: "Trackers gather at the edge of town. Build a home for the Rangers who never lose their quarry.", command: "Mark Prey focuses a chosen enemy and speeds up attacks against it. More living Rangers increase the speed bonus." },
  mage: { color: "#b39bdb", title: "Knowledge above the rooftops", copy: "Every new floor of the tower opens another page of forbidden knowledge for your Mages.", command: "Time Freeze stops enemy attacks, summoning, and movement. More living Mages make the spell last longer." },
  alchemist: { color: "#82c9b1", title: "A remedy for the road below", copy: "Glass, herbs, and a carefully measured spark. Stock the company with healing for the next expedition.", command: "Potions restore a hero's maximum health. Supplies restock at the start of each daily expedition." },
  tavern: { color: "#dab979", title: "Every expedition starts here", copy: "Keep the hearth warm and the contract reel turning. A better Tavern draws more seasoned adventurers.", command: "New heroes can reach levels 2–4. Each higher level is rolled only after the previous level succeeds. Underused-class bonus levels are added afterward." },
  cemetery: { color: "#a7b6aa" },
};

function artMarkup(type, level) {
  return `<span class="town-art" data-stage="${level}" aria-hidden="true">
    <img class="town-art__image" src="${type === "cemetery" ? CEMETERY.image : `assets/town/levels/${type}-${level}.webp`}" alt="" decoding="async"/>
  </span>`;
}

function levelPips(level) {
  return `<span class="town-pips" aria-hidden="true">${Array.from({ length: 5 }, (_, index) => `<i class="${index < level ? "is-built" : ""}"></i>`).join("")}</span>`;
}

function upgradeButton(type, building, gold, path = null) {
  const definition = BUILDING_DEFINITIONS[type];
  const cost = buildingUpgradeCost(building.level);
  if (cost === null) return "";
  const choice = path ? definition[path] : null;
  return `<button class="town-upgrade gold-purchase" type="button" data-upgrade="${type}" data-path="${path ?? ""}" data-gold-cost="${cost}" title="Pay ${cost} gold to upgrade ${definition.name} to level ${building.level + 1}" ${gold < cost ? "disabled" : ""}>
    <span><strong>${choice ? choice.label : `UPGRADE TO LEVEL ${building.level + 1}`}</strong><small>${choice ? choice.short : definition.core(building.level + 1)}</small></span>
    ${goldPrice(cost)}
  </button>`;
}

function inspectorMarkup(type, snapshot, flavor) {
  if (type === "cemetery") return cemeteryMarkup(snapshot, flavor);
  const definition = BUILDING_DEFINITIONS[type];
  const district = DISTRICTS[type];
  const building = snapshot.buildings[type];
  const cost = buildingUpgradeCost(building.level);
  const pathCopy = definition.utility ? "" : `<p class="town-paths">${definition.pathA.label} <b>${building.pathA}</b><span>·</span>${definition.pathB.label} <b>${building.pathB}</b></p>`;
  return `<div class="town-inspector__art" style="--district-color:${district.color}">
      <span class="town-eyebrow">${definition.utility ? "CITY SERVICE" : `${definition.classLabel.toUpperCase()} DISTRICT`}</span>
      ${artMarkup(type, building.level)}
    </div>
    <div class="town-inspector__body">
      <div class="town-inspector__heading"><h2 tabindex="-1">${definition.name}</h2><span class="town-level-badge">LV ${building.level}</span></div>
      <p class="town-inspector__tagline">${district.title}</p>
      <p class="town-building-flavor">${escape(flavor)}</p>
      <div class="town-restoration"><span>${STAGES[building.level - 1]}</span>${levelPips(building.level)}</div>
      <p class="town-inspector__copy">${district.copy}</p>
      <div class="town-benefit"><span class="town-eyebrow">CURRENT BENEFIT</span><strong>${definition.core(building.level)}</strong>${pathCopy}</div>
      <div class="town-command-note"><span class="town-eyebrow">${definition.commandLabel ?? (type === "alchemist" ? "HEALING SUPPLIES" : "THE CONTRACT REEL")}</span><p>${district.command}</p></div>
      <div class="town-upgrades"><div class="town-upgrades__heading"><span>${cost === null ? "District complete" : "Next improvement"}</span><small>${cost === null ? "LEVEL 5 / 5" : `LEVEL ${building.level + 1}`}</small></div>
        ${cost === null ? `<p class="town-complete">Fully restored. Your company has the best this district can offer.</p>` : `<button class="town-upgrade" type="button" data-open-upgrade="${type}" aria-haspopup="dialog"><span><strong>UPGRADE</strong><small>View level ${building.level + 1} improvements</small></span>${goldPrice(cost, "COST")}</button>`}
        ${cost !== null ? `<p class="town-upgrades__help gold-purchase-note">${snapshot.gold < cost ? `Need ${cost - snapshot.gold} more gold to purchase this upgrade.` : `Choose an improvement in the upgrade dialog. ${definition.utility ? "Applies to future supplies or contracts." : "Choose one bonus for every hero of this class."}`}</p>` : ""}
      </div>
    </div>`;
}

function cemeteryMarkup(snapshot, flavor) {
  const graves = snapshot.graves ?? [];
  const entries = [...graves].reverse().map(grave => `<li class="cemetery-grave" data-grave="${escape(grave.heroId)}">
    <img src="assets/heroes/${escape(grave.class)}.png" alt="" loading="lazy"/>
    <div><div class="cemetery-grave__heading"><strong>${escape(grave.name)}</strong><span>LV ${escape(grave.level)}</span></div>
      <small>${escape(BUILDING_DEFINITIONS[grave.class]?.classLabel ?? grave.class)} · Day ${escape(grave.day)} · Floor ${escape(grave.floor)}</small>
      <p>${escape(grave.campaignName)}</p><p>Slain by <b>${escape(grave.killer)}</b></p></div>
  </li>`).join("");
  return `<div class="town-inspector__art" style="--district-color:${DISTRICTS.cemetery.color}"><span class="town-eyebrow">A PLACE OF REMEMBRANCE</span>${artMarkup("cemetery",1)}</div>
    <div class="town-inspector__body cemetery-inspector">
      <div class="town-inspector__heading"><h2>Cemetery</h2><span class="town-level-badge">MEMORIAL</span></div>
      <p class="town-inspector__tagline">Their names remain. Their courage carries on.</p>
      <p class="town-building-flavor">${escape(flavor)}</p>
      <div class="town-benefit cemetery-benefit"><span class="town-eyebrow">LEGACY OF THE FALLEN</span><strong>+${graves.length}% maximum health</strong><p>${graves.length} fallen ${graves.length === 1 ? "hero" : "heroes"} · All living heroes benefit.</p></div>
      <p class="cemetery-rules">Each hero lost in combat grants +1% maximum health to the living, including future recruits. The bonus stacks additively, on top of town and Bard bonuses. It does not restore current HP. No upgrades or gold required.</p>
      <div class="cemetery-register-heading"><h3>Book of the Fallen</h3><span>${graves.length} remembered</span></div>
      ${graves.length ? `<ol class="cemetery-register" tabindex="0" aria-label="Fallen heroes">${entries}</ol>` : `<div class="cemetery-empty"><span aria-hidden="true">✦</span><h3>No names carved in stone.</h3><p>May it stay that way. Fallen heroes will be remembered here.</p></div>`}
      <p class="cemetery-reset-note">The memorial and its health bonus reset with each ten-day campaign. Dismissed heroes are not counted.</p>
    </div>`;
}

export function createTownView({ root, onUpgrade, onClose, onReset }) {
  const flavor = createBuildingFlavor();
  const levels = new Map();
  let selectedType = "tavern";
  let snapshot = null;
  let signature = "";
  let mobileTrigger = null;
  const mobile = window.matchMedia("(max-width: 760px)");
  root.innerHTML = `<div class="town-shell">
    <header class="town-header">
      <button class="town-brand" type="button" data-town-action="close" aria-label="Return to the contract reel">VAULTBOUND<span>TEN DAYS BELOW</span></button>
      <div class="town-header__right"><span class="town-gold"></span><button class="town-return" type="button" data-town-action="close">Prepare company <span aria-hidden="true">→</span></button></div>
    </header>
    <nav class="campaign-steps" aria-label="Daily expedition"><span aria-current="step"><b>01</b> Town</span><button type="button" data-town-action="close"><b>02</b> Company</button><span><b>03</b> Dungeon</span></nav>
    <div class="town-intro"><div><span class="town-eyebrow">YOUR CITY. THEIR LAST SAFE HAVEN.</span><div class="town-title-row"><h1></h1><div class="town-countdown" role="timer" aria-live="off"><span class="town-countdown__label">THE TEN-DAY DEADLINE</span><div class="town-countdown__day">DAY <strong></strong><span> / 10</span></div><span class="town-countdown__remaining"></span><div class="town-countdown__ticks" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div></div></div><p class="town-flavor"></p><ul class="town-traits"></ul></div><span class="town-campaign"></span></div>
    <div class="town-panorama"><div><span class="town-eyebrow">BEFORE THE GATES OPEN</span><h2>A little hope, on the edge of the dark.</h2><p class="town-roll-status"></p></div><button type="button" data-town-action="close">Prepare your company <span aria-hidden="true">→</span></button></div>
    <div class="town-layout">
      <section class="town-districts" aria-label="Town districts">
        <div class="town-districts__heading"><span>TEN DISTRICTS · ONE COMPANY</span><span class="town-improvements"></span></div>
        <div class="town-grid">${DISTRICT_ORDER.map((type) => `<button class="town-district" type="button" data-district="${type}" style="--district-color:${DISTRICTS[type].color}" aria-pressed="false">
          <span class="town-district__top"><span>${type === "cemetery" ? "REMEMBRANCE" : definitionFor(type).utility ? "CITY SERVICE" : definitionFor(type).classLabel.toUpperCase()}</span><span class="town-district__level"></span></span>
          ${artMarkup(type, 1)}
          <span class="town-district__name">${definitionFor(type).name}</span>
          <span class="town-district__bottom">${type === "cemetery" ? `<span class="cemetery-card__count"></span>` : levelPips(1)}<span class="town-district__cost"></span></span>
        </button>`).join("")}</div>
        <footer class="town-districts__footer"><p><span aria-hidden="true">✦</span> Every improvement brings more of your city to life.</p><span>Town progress resets with each ten-day campaign.</span></footer>
      </section>
      <aside class="town-inspector" aria-label="Selected district"></aside>
    </div>
    <footer class="town-footer"><p class="town-message" role="status" aria-live="polite"></p><button type="button" data-town-action="reset">New campaign</button></footer>
    <dialog class="town-upgrade-dialog" aria-labelledby="town-upgrade-title" aria-describedby="town-upgrade-flavor"></dialog>
    <dialog class="town-sheet" aria-label="District details"><button type="button" class="town-sheet__close" data-town-action="dismiss" aria-label="Close district details">Close <span aria-hidden="true">×</span></button><div class="town-sheet__content"></div></dialog>
  </div>`;

  const upgradeDialog = root.querySelector(".town-upgrade-dialog");
  const inspector = root.querySelector(".town-inspector");
  const sheet = root.querySelector(".town-sheet");
  const sheetContent = root.querySelector(".town-sheet__content");
  const cards = [...root.querySelectorAll("[data-district]")];
  observeTownRestoration(root);

  function updateInspector() {
    if (!snapshot) return;
    const activePath = root.contains(document.activeElement) ? document.activeElement.dataset.path : null;
    const passage = flavor.current(selectedType) || flavor.next(selectedType);
    const markup = inspectorMarkup(selectedType, snapshot, passage);
    inspector.innerHTML = markup;
    sheetContent.innerHTML = markup;
    if (activePath !== null && activePath !== undefined) {
      const container = sheet.open ? sheetContent : inspector;
      container.querySelector(`[data-path="${activePath}"]`)?.focus({ preventScroll: true });
    }
  }

  function closeUpgrade() {
    upgradeDialog.close();
    // A purchase rebuilds the inspector; restore focus to the replacement button.
    const container = sheet.open ? sheetContent : inspector;
    (container.querySelector("[data-open-upgrade]") ?? container.querySelector(".town-inspector__heading h2") ?? mobileTrigger)?.focus({ preventScroll: true });
  }

  function openUpgrade(trigger) {
    const type = trigger.dataset.openUpgrade;
    const building = snapshot.buildings[type];
    const definition = BUILDING_DEFINITIONS[type];
    const cost = buildingUpgradeCost(building.level);
    if (cost === null) return;
    upgradeDialog.dataset.type = type;
    upgradeDialog.innerHTML = `<span class="town-eyebrow">LEVEL ${building.level} → ${building.level + 1}</span>
      <h2 id="town-upgrade-title">Upgrade ${escape(definition.name)}</h2>
      <p class="town-building-flavor" id="town-upgrade-flavor">${escape(flavor.current(type))}</p>
      <div class="town-upgrade-dialog__benefit"><span>${definition.utility ? "INCLUDED IN THIS UPGRADE" : "INCLUDED WITH EITHER CHOICE"}</span><strong>${escape(definition.core(building.level + 1))}</strong></div>
      <div class="town-upgrade-options">${definition.utility ? upgradeButton(type, building, snapshot.gold) : upgradeButton(type, building, snapshot.gold, "pathA") + upgradeButton(type, building, snapshot.gold, "pathB")}</div>
      <p class="town-upgrades__help">${snapshot.gold < cost ? `Need ${cost - snapshot.gold} more gold.` : `Choose ${definition.utility ? "Upgrade" : "one improvement"} to spend ${cost} gold.`}</p>
      <button type="button" class="town-upgrade-cancel" data-town-action="cancel-upgrade" autofocus>Cancel</button>`;
    upgradeDialog.showModal();
  }
  upgradeDialog.addEventListener("cancel", event => { event.preventDefault(); closeUpgrade(); });

  function dismissSheet() {
    if (sheet.open) sheet.close();
    mobileTrigger?.focus({ preventScroll: true });
  }

  root.addEventListener("click", (event) => {
    const districtButton = event.target.closest("[data-district]");
    if (districtButton) {
      selectedType = districtButton.dataset.district;
      flavor.next(selectedType);
      cards.forEach((card) => card.setAttribute("aria-pressed", String(card.dataset.district === selectedType)));
      updateInspector();
      if (mobile.matches) {
        mobileTrigger = districtButton;
        sheet.showModal();
      }
      return;
    }
    const openButton = event.target.closest("[data-open-upgrade]");
    if (openButton) { openUpgrade(openButton); return; }
    const upgrade = event.target.closest("[data-upgrade]");
    if (upgrade && !upgrade.disabled && upgradeDialog.open) {
      const type = upgrade.dataset.upgrade;
      const previousLevel = snapshot.buildings[type].level;
      onUpgrade(type, upgrade.dataset.path || null);
      if (snapshot.buildings[type].level > previousLevel) closeUpgrade();
      return;
    }
    const action = event.target.closest("[data-town-action]")?.dataset.townAction;
    if (action === "cancel-upgrade") { closeUpgrade(); return; }
    if (event.target === upgradeDialog) {
      const bounds = upgradeDialog.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) closeUpgrade();
    }
    if (action === "dismiss") dismissSheet();
    if (action === "close") onClose();
    if (action === "reset") onReset();
    if (event.target === sheet) {
      const bounds = sheet.getBoundingClientRect();
      if (event.clientY < bounds.top || event.clientX < bounds.left || event.clientX > bounds.right) dismissSheet();
    }
  });
  mobile.addEventListener("change", () => { if (!mobile.matches) dismissSheet(); });

  return {
    render(next) {
      const wasVisible = !root.hidden;
      root.hidden = !next.visible;
      document.body.classList.toggle("town-open", next.visible);
      if (!next.visible) {
        if (upgradeDialog.open) upgradeDialog.close();
        if (sheet.open) sheet.close();
        if (wasVisible) window.scrollTo(0, 0);
        return;
      }
      for (const [type, building] of Object.entries(next.buildings)) {
        if (levels.has(type) && building.level > levels.get(type)) flavor.next(type);
        levels.set(type, building.level);
      }
      snapshot = next;
      root.querySelector("h1").textContent = next.town.name;
      root.setAttribute("aria-label", next.town.name);
      root.querySelector(".town-flavor").textContent = next.town.flavor;
      const traits = root.querySelector(".town-traits");
      if (traits.dataset.town !== next.town.name) {
        traits.replaceChildren(...next.town.bonuses.map((bonus) => {
          const item = document.createElement("li"); item.textContent = bonus.replace("recruitment weight", "recruitment chance"); return item;
        }));
        traits.dataset.town = next.town.name;
      }
      const nextSignature = JSON.stringify([next.day, next.gold, next.flavorKey, next.flavorName, next.message, next.buildings, next.rolledToday, next.town, next.morale, next.graves]);
      if (nextSignature === signature && wasVisible) return;
      signature = nextSignature;
      const panorama = root.querySelector(".town-panorama");
      const backdrop = BATTLE_BACKDROPS[next.flavorKey];
      if (backdrop) panorama.style.setProperty("--town-campaign-scene", `url("${backdrop.image}")`);
      else panorama.style.removeProperty("--town-campaign-scene");
      panorama.dataset.campaign = next.flavorKey ?? "";
      panorama.querySelector("h2").textContent = next.morale.text;
      panorama.dataset.morale = next.morale.tone;
      const countdown = root.querySelector(".town-countdown");
      countdown.dataset.urgency = next.day === 10 ? "last" : next.day >= 7 ? "urgent" : "steady";
      countdown.setAttribute("aria-label", `Day ${next.day} of 10. ${next.day === 10 ? "Final day." : `${11 - next.day} days left, including today.`}`);
      countdown.querySelector("strong").textContent = next.day;
      countdown.querySelector(".town-countdown__remaining").textContent = next.day === 10 ? "FINAL DAY · NOW OR NEVER" : `${11 - next.day} DAYS LEFT · INCLUDING TODAY`;
      countdown.querySelectorAll("i").forEach((tick, index) => {
        tick.classList.toggle("is-spent", index < next.day - 1);
        tick.classList.toggle("is-today", index === next.day - 1);
      });
      updateGoldBalance(root.querySelector(".town-gold"), next.gold);
      root.querySelector(".town-campaign").textContent = next.flavorName;
      root.querySelector(".town-message").textContent = next.message;
      root.querySelector(".town-roll-status").textContent = next.rolledToday ? "Your contracts are waiting at the reel. Town improvements apply to your next roll." : "Your daily roll is still sealed. Improve the Tavern first to give better heroes a chance to appear.";
      const improvements = Object.values(next.buildings).reduce((total, building) => total + building.level - 1, 0);
      root.querySelector(".town-improvements").textContent = `${improvements} / 36 improvements`;
      for (const card of cards) {
        const type = card.dataset.district;
        if (type === "cemetery") {
          const count = next.graves?.length ?? 0;
          card.setAttribute("aria-pressed", String(type === selectedType));
          card.setAttribute("aria-label", `Cemetery, ${count} fallen heroes. +${count}% maximum health for all living heroes. Free to inspect; cannot be upgraded.`);
          card.querySelector(".town-district__level").textContent = "MEMORIAL";
          card.querySelector(".cemetery-card__count").textContent = `${count} fallen`;
          card.querySelector(".town-district__cost").textContent = `+${count}% health`;
          continue;
        }
        const building = next.buildings[type];
        const cost = buildingUpgradeCost(building.level);
        card.setAttribute("aria-pressed", String(type === selectedType));
        card.setAttribute("aria-label", `${BUILDING_DEFINITIONS[type].name}, level ${building.level} of 5. Inspect district for free.${cost === null ? " Fully upgraded." : ` Upgrades cost ${cost} gold.`}`);
        const art = card.querySelector(".town-art");
        if (art.dataset.stage !== String(building.level)) {
          art.dataset.stage = building.level;
          art.querySelector("img").src = `assets/town/levels/${type}-${building.level}.webp`;
        }
        card.querySelector(".town-district__level").textContent = `LV ${building.level}`;
        card.querySelectorAll(".town-pips i").forEach((pip, index) => pip.classList.toggle("is-built", index < building.level));
        card.querySelector(".town-district__cost").innerHTML = cost === null ? "Complete" : `${goldAmount(cost)}<small>upgrade</small>`;
        card.classList.toggle("can-upgrade", cost !== null && next.gold >= cost);
      }
      updateInspector();
    },
    snapshot() {
      return { selectedDistrict: selectedType, detailDialogOpen: sheet.open, upgradeDialogOpen: upgradeDialog.open, buildingFlavor: flavor.current(selectedType), artworkStages: STAGES };
    },
  };
}
