import { BATTLE_COMMANDS, COMMAND_IDS, COMMAND_MAX } from "./battle-commands.js";
import { ENEMY_PORTRAITS } from "./enemy-art.js";
import { goldPrice, updateGoldBalance } from "./gold-ui.js";
import { BATTLE_BACKDROPS } from "./battle-backdrop.js";
import { createBattleContext } from "./contextual-help.js";
import { createUnitInspector } from "./battle-unit-inspector.js";

const COMMAND_COPY = {
  hold: "The friendly front row gains armor and damage for six seconds. More living Knights strengthen both bonuses.",
  pilfer: "Reserve one gold per living Thief (up to four), paid only if this floor is cleared. Once per floor.",
  rally: "The whole company attacks faster for six seconds. More living Bards increase the speed bonus.",
  aegis: "Choose one hero to make invulnerable for eight seconds.",
  bloodlust: "Deal 1.5× the combined attack damage of all living friendly frontliners to every enemy in the front row. If that row is empty, strike the back row. No health cost.",
  mark: "Choose an enemy. Heroes who can reach it focus their attacks and strike faster for ten seconds, or until it dies. More Rangers increase the speed bonus.",
  freeze: "Stop enemy attacks, summoning, movement, and timers. More living Mages make the freeze last longer. Costs 100 Command, with a ten-second cooldown after the freeze ends.",
};

function powerCopy(id, power) {
  if (id === "freeze") return `${(power.durationMs / 1000).toFixed(1)}s enemy freeze`;
  if (id === "aegis") return `${(power.durationMs / 1000).toFixed(1)}s shield · one hero`;
  if (id === "rally" || id === "mark") return `+${Math.round(power.speedBonus * 100)}% attack speed`;
  if (id === "hold") return `+${Math.round(power.armorBonus * 100)}% armor & damage`;
  if (id === "pilfer") return `+${power.gold} gold on victory`;
  return `×${power.damageMultiplier.toFixed(2)} combined frontline damage`;
}

export function createBattleView({ root, heroTypes, enemyTypes, onCommand, onTarget, onAction, onInspect, getUnitDetails }) {
  let current = null;
  let selectedCommand = null;
  const cards = new Map();
  const commandButtons = new Map();
  const rowKeys = ["hero-back", "hero-front", "enemy-front", "enemy-back"];
  const rank = (key, title) => `<section class="battle-rank" data-rank="${key}"><h3>${title}<span></span></h3><div class="battle-rank__units"></div></section>`;
  root.innerHTML = `<div class="battle-backdrop" aria-hidden="true"><img alt="" decoding="async"/></div><div class="battle-shell">
    <header class="battle-header"><div><span class="battle-eyebrow">VAULTBOUND · EXPEDITION</span><h1></h1></div><div class="battle-header__stats"><span class="battle-campaign"></span><span class="battle-day"></span><strong class="battle-gold"></strong></div></header>
    <div class="battle-arena">
      <div class="battle-side battle-side--heroes"><h2>YOUR COMPANY <span></span></h2><div class="battle-side__ranks">${rank("hero-back", "REAR GUARD")}${rank("hero-front", "FRONT LINE")}</div></div>
      <section class="battle-report" aria-label="Battle status"><span class="battle-report__sigil" aria-hidden="true">⚔</span><h2></h2><p class="battle-report__copy" role="status"></p><p class="battle-boss-intel"></p><div class="battle-result-actions"></div><ol class="battle-log" aria-label="Recent battle actions"></ol></section>
      <div class="battle-side battle-side--enemies"><h2>THE OPPOSITION <span></span></h2><div class="battle-side__ranks">${rank("enemy-front", "FRONT LINE")}${rank("enemy-back", "REAR GUARD")}</div></div>
      <svg class="battle-strikes" aria-hidden="true"><defs><filter id="strike-glow"><feGaussianBlur stdDeviation="2"/></filter></defs><g></g></svg>
    </div>
    <section class="battle-command-station" aria-label="Battle commands">
      <div class="battle-command-heading"><div><span class="battle-eyebrow">THE MAYOR'S ORDERS</span><h2>Battle commands</h2></div><div class="battle-resource"><div><span>COMMAND</span><strong></strong></div><div class="battle-resource__track"><i></i></div></div><div class="battle-active-effects" aria-live="off"></div></div>
      <div class="battle-command-deck">${COMMAND_IDS.map((id, index) => `<button class="battle-command" type="button" data-command="${id}" aria-describedby="command-description"><span class="battle-command__art"><img src="assets/commands/${id}.webp" alt=""/><span class="battle-command__key">${index + 1}</span><span class="battle-command__cost">${BATTLE_COMMANDS[id].cost}<small>CMD</small></span><span class="battle-command__count"></span><span class="battle-command__active"></span></span><strong>${BATTLE_COMMANDS[id].label}</strong><span class="battle-command__power"></span><span class="battle-command__reason"></span></button>`).join("")}<button class="battle-command battle-potion" data-battle-action="potion" type="button" aria-describedby="command-description"><span class="battle-command__art"><img src="assets/items/healing-potion.webp" alt=""/><span class="battle-command__key">8</span><span class="battle-command__cost"><span class="battle-potion__count"></span><small>LEFT</small></span><span class="battle-command__active battle-potion__timer"></span></span><strong class="battle-potion__label"></strong><span class="battle-command__power battle-potion__detail"></span><span class="battle-command__reason battle-potion__reason"></span></button></div>
      <p class="battle-command-description" id="command-description">Damage dealt and received fills Command. Orders grow stronger with matching living heroes.</p>
    </section>
    <footer class="battle-controls"><span class="battle-control-preferences"><button class="battle-auto-pause" data-battle-action="auto-pause" type="button" aria-pressed="true" title="Pause combat when Command reaches 100. Starts on every expedition.">Auto pause at 100: ON</button><span class="battle-target-help"></span></span><div><button data-battle-action="flee" class="battle-flee" type="button"></button><button data-battle-action="pause" type="button"></button><button data-battle-action="speed" type="button"></button></div></footer>
  </div>
  <dialog id="battle-flee-confirmation" class="battle-flee-dialog" aria-labelledby="flee-dialog-title" aria-describedby="flee-dialog-description">
    <span class="battle-eyebrow">LEAVE THE EXPEDITION</span>
    <h2 id="flee-dialog-title">Abandon this battle?</h2>
    <p id="flee-dialog-description">Your surviving heroes will return to town. Escaping during a fight costs half your gold, rounded up.</p>
    <div class="battle-flee-summary"><span>Gold lost on escape</span><strong class="battle-flee-confirm-cost"></strong></div>
    <p class="battle-flee-levels"></p>
    <p class="battle-flee-paused">Combat is paused. Cancel keeps it paused.</p>
    <div class="battle-flee-actions"><button type="button" data-battle-action="flee-cancel" autofocus>Cancel</button><button type="button" class="gold-purchase" data-battle-action="flee-confirm"></button></div>
  </dialog>`;

  const rows = new Map(rowKeys.map((key) => [key, root.querySelector(`[data-rank="${key}"] .battle-rank__units`)]));
  const contextualHelp = createBattleContext(root, heroTypes);
  for (const id of COMMAND_IDS) commandButtons.set(id, root.querySelector(`[data-command="${id}"]`));
  const arena = root.querySelector(".battle-arena");
  const backdrop = root.querySelector(".battle-backdrop");
  const backdropImage = backdrop.querySelector("img");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let backdropTheme = null;
  backdropImage.addEventListener("load", () => {
    backdrop.style.setProperty("--scene-image-height", `${backdropImage.naturalHeight / backdropImage.naturalWidth * 100}vw`);
    backdrop.classList.add("is-loaded");
  });
  backdropImage.addEventListener("error", () => backdrop.classList.remove("is-loaded"));
  const strikeGroup = root.querySelector(".battle-strikes g");
  const description = root.querySelector(".battle-command-description");
  const fleeDialog = root.querySelector(".battle-flee-dialog");
  fleeDialog.addEventListener("cancel", event => { event.preventDefault(); onAction("flee-cancel"); });
  fleeDialog.addEventListener("click", event => {
    if (event.target !== fleeDialog) return;
    const bounds = fleeDialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onAction("flee-cancel");
  });
  const actionButtons = new Map(["potion", "flee", "pause", "speed"].map((id) => [id, root.querySelector(`[data-battle-action="${id}"]`)]));
  const unitInspector = createUnitInspector({ root, heroTypes, getDetails: getUnitDetails,
    restoreFocus: id => (cards.get(id) ?? actionButtons.get("pause"))?.focus({ preventScroll: true }) });

  function explainCommand(id) {
    if (!current) return;
    selectedCommand = id;
    if (id === "potion") {
      description.textContent = `Potion · ${current.potions} remaining · restores ${current.potionHealPercent}% maximum health to one wounded hero. No Command cost. Two-second cooldown follows battle speed and pauses with combat.`;
      return;
    }
    const command = current.commands[id];
    description.textContent = `${BATTLE_COMMANDS[id].label} · ${powerCopy(id, command.power)}. ${COMMAND_COPY[id]}${command.reason ? ` (${command.reason})` : ""}`;
  }

  root.addEventListener("click", (event) => {
    const command = event.target.closest("[data-command]");
    if (command) {
      const id = command.dataset.command;
      explainCommand(id);
      if (current?.view === "battle" && !current.commands[id].reason) onCommand(id);
      return;
    }
    const target = event.target.closest("[data-unit]");
    if (target && !target.disabled) {
      if (current?.targeting) onTarget(target.dataset.unit);
      else if (current?.view === "battle") onInspect(target.dataset.unit);
      return;
    }
    const action = event.target.closest("[data-battle-action]");
    if (action && !action.disabled) {
      if (action.dataset.battleAction === "potion") explainCommand("potion");
      onAction(action.dataset.battleAction);
    }
  });
  root.addEventListener("pointerover", (event) => {
    const button = event.target.closest("[data-command], .battle-potion");
    if (button) explainCommand(button.dataset.command ?? "potion");
  });
  root.addEventListener("focusin", (event) => {
    const button = event.target.closest("[data-command], .battle-potion");
    if (button) explainCommand(button.dataset.command ?? "potion");
  });

  function updateCard(unit, state) {
    let card = cards.get(unit.id);
    const definition = unit.side === "hero" ? heroTypes[unit.type] : enemyTypes[unit.type];
    // Campaign reset reuses numeric IDs; never keep the previous unit's portrait.
    if (card && (card.dataset.unitType !== unit.type || card.dataset.side !== unit.side)) {
      card.remove();
      cards.delete(unit.id);
      card = null;
    }
    if (!card) {
      card = document.createElement("button");
      card.type = "button";
      card.className = "battle-unit";
      card.dataset.unit = unit.id;
      card.dataset.unitType = unit.type;
      const enemyArt = ENEMY_PORTRAITS[unit.type];
      const portrait = unit.side === "hero" ? definition.image : enemyArt?.image;
      const fallback = `<span class="battle-enemy-glyph" style="--enemy-color:${definition.color}">${definition.glyph}</span>`;
      card.innerHTML = `<span class="battle-unit__portrait">${portrait ? `<img src="${portrait}" alt="" decoding="async"/>` : fallback}</span><span class="battle-unit__info"><strong></strong><small></small><span class="battle-unit__health"><i></i></span><span class="battle-unit__hp"></span></span><span class="battle-unit__status"></span>`;
      if (unit.side === "enemy") {
        card.dataset.enemyType = unit.type;
        card.dataset.faction = enemyArt?.faction ?? "unknown";
        card.querySelector("img")?.addEventListener("error", () => {
          card.querySelector(".battle-unit__portrait").innerHTML = fallback;
        }, { once: true });
      }
      cards.set(unit.id, card);
    }
    const isHero = unit.side === "hero";
    const targetable = state.targeting === "mark" ? !isHero : state.targeting === "aegis" ? isHero : state.targeting === "potion" && isHero && unit.hp < unit.maxHp;
    const shielded = isHero && state.effects.aegis > 0 && state.divineAegisTargetId === unit.id;
    card.disabled = state.targeting ? !targetable : state.view !== "battle";
    if (!state.targeting) { card.setAttribute("aria-haspopup", "dialog"); card.setAttribute("aria-controls", "battle-unit-details"); }
    else { card.removeAttribute("aria-haspopup"); card.removeAttribute("aria-controls"); }
    card.classList.toggle("is-targetable", targetable);
    card.classList.toggle("is-hit", unit.flash > 0);
    card.classList.toggle("is-acting", unit.actionFlash > 0);
    card.classList.toggle("is-marked", !isHero && state.markedEnemyId === unit.id);
    const frozen = isHero ? unit.frozenMs > 0 : state.effects.freeze > 0;
    card.classList.toggle("is-frozen", frozen);
    card.classList.toggle("is-boss", Boolean(unit.boss));
    card.classList.toggle("is-shielded", shielded);
    card.classList.toggle("is-holding", isHero && unit.row === "front" && state.effects.hold > 0);
    card.classList.toggle("is-healed", (unit.potionFlash ?? 0) > 0);
    card.dataset.side = unit.side;
    card.querySelector(".battle-unit__info strong").textContent = unit.label;
    card.querySelector(".battle-unit__info small").textContent = isHero ? `${definition.label} · L${unit.hero.level}` : unit.boss ? "FLOOR 10 · BOSS" : definition.label;
    card.querySelector(".battle-unit__health i").style.width = `${Math.max(0, unit.hp / unit.maxHp) * 100}%`;
    card.querySelector(".battle-unit__hp").textContent = `${Math.ceil(unit.hp)} / ${unit.maxHp} HP`;
    card.querySelector(".battle-unit__status").textContent = frozen ? "FROZEN" : unit.evadeFlash > 0 ? "EVADE" : unit.interceptFlash > 0 ? "INTERCEPT" : shielded ? "AEGIS" : state.markedEnemyId === unit.id ? "MARKED" : unit.empowered ? "EMPOWERED" : unit.crowdingPenaltyPercent ? "CROWDED −20%" : "";
    const crowdingNote = unit.crowdingPenaltyPercent ? " −20% maximum health and damage: three or more of this class departed together. Applies for the whole expedition." : "";
    card.title = (definition.summary ?? definition.label) + crowdingNote + (state.targeting ? "" : " Click to inspect full portrait and combat stats.");
    card.setAttribute("aria-label", `${unit.label}${unit.boss ? ", final boss" : ""}, ${definition.label}, ${Math.ceil(unit.hp)} of ${unit.maxHp} health${crowdingNote}${frozen ? ", frozen" : ""}${targetable ? ", select target" : state.targeting ? "" : ", inspect character"}`);
    const row = rows.get(`${unit.side}-${unit.row}`);
    if (card.parentElement !== row) row.append(card);
  }

  function drawStrikes(effects) {
    const bounds = arena.getBoundingClientRect();
    const svg = root.querySelector(".battle-strikes");
    svg.setAttribute("viewBox", `0 0 ${bounds.width} ${bounds.height}`);
    strikeGroup.replaceChildren();
    for (const effect of effects) {
      const source = cards.get(effect.sourceId)?.getBoundingClientRect();
      const target = cards.get(effect.targetId)?.getBoundingClientRect();
      if (!source || !target) continue;
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", source.x + source.width / 2 - bounds.x);
      line.setAttribute("y1", source.y + source.height / 2 - bounds.y + arena.scrollTop);
      line.setAttribute("x2", target.x + target.width / 2 - bounds.x);
      line.setAttribute("y2", target.y + target.height / 2 - bounds.y + arena.scrollTop);
      line.setAttribute("stroke", effect.kind === "heal" ? "#83d4b3" : effect.kind === "freeze" ? "#a2c8f4" : effect.kind === "intercept" ? "#a1cce3" : effect.sourceSide === "hero" ? "#ead298" : "#dc8279");
      line.setAttribute("opacity", Math.min(0.8, effect.remaining / 700));
      line.setAttribute("stroke-width", "2");
      strikeGroup.append(line);
    }
  }

  return {
    inspect(id) { unitInspector.select(id); },
    inspectedUnit() { return unitInspector.selected(); },
    backdropSnapshot() {
      if (root.hidden || !current) return null;
      const depth = current.backdrop;
      return { theme: backdropTheme, image: BATTLE_BACKDROPS[backdropTheme]?.image,
        targetDepthPercent: Math.round((depth?.target ?? 0) * 100),
        displayedDepthPercent: Math.round((reducedMotion.matches ? depth?.target ?? 0 : depth?.progress ?? 0) * 10000) / 100,
        reducedMotion: reducedMotion.matches, loaded: backdrop.classList.contains("is-loaded") };
    },
    render(state) {
      const wasVisible = !root.hidden;
      root.hidden = !state.visible;
      document.body.classList.toggle("battle-open", state.visible);
      if (!state.visible) { if (fleeDialog.open) fleeDialog.close(); unitInspector.render(false); return; }
      current = state;
      const theme = BATTLE_BACKDROPS[state.flavorKey] ? state.flavorKey : "undead";
      if (theme !== backdropTheme) {
        backdropTheme = theme;
        backdrop.classList.remove("is-loaded");
        backdrop.style.setProperty("--scene-image-height", "300vw");
        backdrop.style.setProperty("--scene-tint", BATTLE_BACKDROPS[theme].tint);
        backdropImage.src = BATTLE_BACKDROPS[theme].image;
      }
      root.dataset.campaign = theme;
      const progress = reducedMotion.matches ? state.backdrop?.target ?? 0 : state.backdrop?.progress ?? 0;
      backdrop.style.setProperty("--scene-progress", progress);
      backdrop.dataset.depth = String(Math.round(progress * 100));
      root.classList.toggle("is-paused", state.paused);
      root.classList.toggle("is-result", state.view !== "battle");
      root.classList.toggle("is-boss", state.boss);
      root.querySelector(".battle-header h1").textContent = state.boss ? state.bossInfo?.label ?? "Final boss" : `Floor ${state.floor}`;
      const intel = root.querySelector(".battle-boss-intel");
      intel.hidden = !state.boss;
      intel.textContent = state.boss ? `FLOOR 10 · ${state.bossInfo?.summary ?? "Defeat the dungeon lord and its guards."}` : "";
      root.querySelector(".battle-campaign").textContent = state.flavor;
      root.querySelector(".battle-day").textContent = `Day ${state.day} / 10`;
      updateGoldBalance(root.querySelector(".battle-gold"), state.gold);

      const visibleUnits = [...state.party, ...state.enemies].filter((unit) => unit.hp > 0);
      const ids = new Set(visibleUnits.map((unit) => unit.id));
      for (const [id, card] of cards) if (!ids.has(id)) { card.remove(); cards.delete(id); }
      for (const unit of visibleUnits) updateCard(unit, state);
      contextualHelp.render(state.party);
      for (const key of rowKeys) {
        const row = rows.get(key);
        row.parentElement.querySelector("h3 span").textContent = row.children.length;
        row.parentElement.classList.toggle("is-empty", row.children.length === 0);
      }
      root.querySelector(".battle-side--heroes h2 span").textContent = state.party.filter((unit) => unit.hp > 0).length;
      root.querySelector(".battle-side--enemies h2 span").textContent = state.enemies.filter((unit) => unit.hp > 0).length;
      const result = state.view !== "battle";
      root.querySelector(".battle-report > h2").textContent = result ? state.resultTitle : state.targeting ? "Choose your target" : state.commandAutoPaused ? "Command full — battle paused" : state.paused ? "Battle paused" : "Into the depths";
      root.querySelector(".battle-report__copy").textContent = result ? state.resultCopy : state.targeting === "mark" ? "Select a highlighted enemy to mark." : state.targeting === "aegis" ? "Select a hero to shield for eight seconds." : state.targeting === "potion" ? "Select a wounded hero to heal." : state.commandAutoPaused ? "Choose an order, then Resume or press P to continue." : state.paused ? "Take a breath. Your orders still work." : state.log[0] ?? "The company fights on.";
      const logSignature = JSON.stringify(state.log);
      const log = root.querySelector(".battle-log");
      if (log.dataset.signature !== logSignature) {
        log.dataset.signature = logSignature;
        log.replaceChildren(...state.log.slice(1, 4).map((copy) => { const li = document.createElement("li"); li.textContent = copy; return li; }));
      }
      const resultActions = root.querySelector(".battle-result-actions");
      const actionSignature = `${state.view}:${state.floor}:${state.levelChance}`;
      if (resultActions.dataset.signature !== actionSignature) {
        resultActions.dataset.signature = actionSignature;
        resultActions.innerHTML = state.view === "floor_result"
          ? `<button type="button" data-battle-action="flee-safe">Flee safely <span class="gold-free">FREE</span><small>${state.levelChance}% level-up chance</small></button><button type="button" data-battle-action="continue">Continue<small>Enter floor ${state.floor + 1}</small></button>`
          : state.view === "day_result" ? `<button type="button" data-battle-action="next-day">Next day<small>${state.levelResult}</small></button>`
          : state.view === "campaign_end" ? `<button type="button" data-battle-action="reset">New journey</button>` : "";
      }
      const meter = Math.floor(state.meter);
      root.querySelector(".battle-resource strong").textContent = `${meter} / ${COMMAND_MAX}`;
      root.querySelector(".battle-resource__track i").style.width = `${state.meter}%`;
      const effectCopy = Object.entries(state.effects).filter(([, duration]) => duration > 0).map(([id, duration]) => `${BATTLE_COMMANDS[id].label} ${(duration / 1000).toFixed(1)}s`);
      effectCopy.push(...(state.eventBonuses ?? []));
      if (state.pilferPending > 0) effectCopy.push(`Pilfer +${state.pilferPending}g pending`);
      root.querySelector(".battle-active-effects").textContent = effectCopy.join(" · ");
      for (const id of COMMAND_IDS) {
        const command = state.commands[id];
        const button = commandButtons.get(id);
        const activeMs = state.effects[id] ?? 0;
        const unavailable = Boolean(command.reason) || result;
        button.setAttribute("aria-disabled", String(unavailable));
        button.classList.toggle("is-ready", !unavailable);
        button.classList.toggle("is-active", activeMs > 0);
        button.classList.toggle("is-targeting", id === state.targeting);
        button.querySelector(".battle-command__count").textContent = `×${command.count}`;
        button.querySelector(".battle-command__active").textContent = activeMs > 0 ? `${(activeMs / 1000).toFixed(1)}s` : "";
        button.querySelector(".battle-command__power").textContent = powerCopy(id, command.power);
        button.querySelector(".battle-command__reason").textContent = activeMs > 0 ? "ACTIVE" : command.reason ?? "READY";
        button.title = `${COMMAND_COPY[id]} ${command.reason ?? "Ready to cast."}`;
        button.setAttribute("aria-label", `${BATTLE_COMMANDS[id].label}, ${BATTLE_COMMANDS[id].cost} command, ${command.count} matching heroes, ${command.reason ?? "ready"}`);
      }
      const potion = actionButtons.get("potion");
      const cooldown = state.potionCooldownMs ?? 0;
      const cooldownText = `${(Math.ceil(cooldown / 100) / 10).toFixed(1)}s`;
      const potionReason = state.potions <= 0 ? "No potions" : cooldown > 0 ? "Cooldown" : state.targeting === "potion" ? "Cancel" : !state.party.some(unit => unit.hp > 0 && unit.hp < unit.maxHp) ? "No wounded heroes" : "Ready";
      potion.querySelector(".battle-potion__label").textContent = state.targeting === "potion" ? "Cancel potion" : "Potion";
      potion.querySelector(".battle-potion__count").textContent = state.potions;
      potion.querySelector(".battle-potion__detail").textContent = `${state.potionHealPercent}% max HP · 2s cooldown`;
      potion.querySelector(".battle-potion__reason").textContent = potionReason;
      potion.querySelector(".battle-potion__timer").textContent = cooldown > 0 && state.potions > 0 ? cooldownText : "";
      potion.classList.toggle("is-targeting", state.targeting === "potion");
      potion.classList.toggle("is-empty", state.potions <= 0);
      potion.disabled = result || cooldown > 0 || (state.targeting !== "potion" && (state.potions <= 0 || !state.party.some((unit) => unit.hp > 0 && unit.hp < unit.maxHp)));
      potion.setAttribute("aria-disabled", String(potion.disabled));
      potion.classList.toggle("is-ready", !potion.disabled);
      potion.setAttribute("aria-pressed", String(state.targeting === "potion"));
      potion.setAttribute("aria-label", `Potion, ${state.potions} remaining, heals ${state.potionHealPercent}% maximum health. ${state.potions <= 0 ? "No potions left." : cooldown > 0 ? `Ready in ${cooldownText} of combat time.` : state.targeting === "potion" ? "Cancel choosing a hero." : "Choose a wounded hero."}`);
      const flee = actionButtons.get("flee");
      const fleeSignature = `${state.fleeCost}:${state.levelChance}`;
      if (flee.dataset.priceSignature !== fleeSignature) {
        flee.dataset.priceSignature = fleeSignature;
        flee.classList.add("gold-purchase");
        flee.dataset.goldCost = state.fleeCost;
        flee.setAttribute("aria-haspopup", "dialog");
        flee.setAttribute("aria-controls", "battle-flee-confirmation");
        flee.innerHTML = `Flee ${goldPrice(state.fleeCost, "LOSE")}<span class="flee-penalty-note">Half your gold</span><small>${state.levelChance}% level-up chance</small>`;
        flee.title = `Review retreat. Confirming loses ${state.fleeCost} gold (half your gold, rounded up). ${state.levelChance}% level-up chance per survivor. Retreat between floors to avoid the gold penalty.`;
        flee.setAttribute("aria-label", `Review retreat. Lose ${state.fleeCost} gold only if confirmed, half your gold rounded up. ${state.levelChance}% level-up chance per survivor.`);
      }
      const autoPause = root.querySelector('[data-battle-action="auto-pause"]');
      autoPause.setAttribute("aria-pressed", String(state.commandAutoPauseEnabled));
      autoPause.textContent = `Auto pause at 100: ${state.commandAutoPauseEnabled ? "ON" : "OFF"}`;
      autoPause.disabled = result;
      actionButtons.get("potion").title = `Heal one wounded hero. Two seconds of combat time between uses; pauses with combat and follows battle speed. No Command cost. Each cleared floor has a ${state.potionRecoveryPercent}% chance to restore one potion.`;
      actionButtons.get("pause").textContent = state.paused ? "Resume" : "Pause";
      actionButtons.get("speed").textContent = `Speed ×${state.speed}`;
      for (const [id, button] of actionButtons) if (id !== "potion") button.disabled = result;
      root.querySelector(".battle-target-help").textContent = state.targeting ? "Choose a highlighted target · Esc cancels" : "Orders work while paused. The party auto-flees when only two remain.";
      if (selectedCommand) explainCommand(selectedCommand);
      if (!wasVisible) { selectedCommand = null; arena.scrollTop = 0; }
      drawStrikes(state.combatEffects);
      unitInspector.render(state.view === "battle");
      if (state.view === "battle" && state.fleeConfirmation) {
        const dialogSignature = `${state.fleeCost}:${state.levelChance}`;
        if (fleeDialog.dataset.signature !== dialogSignature) {
          fleeDialog.dataset.signature = dialogSignature;
          fleeDialog.querySelector(".battle-flee-confirm-cost").innerHTML = goldPrice(state.fleeCost, "LOSE");
          fleeDialog.querySelector(".battle-flee-levels").textContent = `Each eligible survivor has a ${state.levelChance}% chance to gain a level.`;
          const confirm = fleeDialog.querySelector('[data-battle-action="flee-confirm"]');
          confirm.innerHTML = `Confirm flee ${goldPrice(state.fleeCost, "LOSE")}`;
          confirm.dataset.goldCost = state.fleeCost;
        }
        if (!fleeDialog.open) {
          fleeDialog.showModal();
          fleeDialog.querySelector('[data-battle-action="flee-cancel"]').focus();
        }
      } else if (fleeDialog.open) {
        fleeDialog.close();
        if (state.view === "battle") actionButtons.get("flee").focus({ preventScroll: true });
        else root.querySelector(".battle-result-actions button")?.focus({ preventScroll: true });
      }
    },
  };
}
