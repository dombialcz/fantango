import { BATTLE_COMMANDS, COMMAND_IDS, COMMAND_MAX } from "./battle-commands.js";
import { goldPrice, updateGoldBalance } from "./gold-ui.js";

const COMMAND_COPY = {
  hold: "The friendly front row gains armor and damage for six seconds. More living Knights strengthen both bonuses.",
  pilfer: "Reserve one gold per living Thief (up to four), paid only if this floor is cleared. Once per floor.",
  rally: "The whole company attacks faster for six seconds. More living Bards increase the speed bonus.",
  aegis: "Protect the whole party from damage. More living Clerics make the shield last longer.",
  bloodlust: "Sacrifice 10% maximum health from every friendly frontliner, leaving at least 1 HP, then strike the whole enemy front row. More Barbarians increase damage.",
  mark: "Choose an enemy. Heroes who can reach it focus their attacks and strike faster. More Rangers increase the speed bonus.",
  freeze: "Stop enemy attacks, summoning, movement, and timers. More living Mages make the freeze last longer.",
};

function powerCopy(id, power) {
  if (id === "freeze") return `${(power.durationMs / 1000).toFixed(1)}s enemy freeze`;
  if (id === "aegis") return `${(power.durationMs / 1000).toFixed(1)}s invulnerability`;
  if (id === "rally" || id === "mark") return `+${Math.round(power.speedBonus * 100)}% attack speed`;
  if (id === "hold") return `+${Math.round(power.armorBonus * 100)}% armor & damage`;
  if (id === "pilfer") return `+${power.gold} gold on victory`;
  return `×${power.damageMultiplier.toFixed(2)} front-row sweep`;
}

export function createBattleView({ root, heroTypes, enemyTypes, onCommand, onTarget, onAction }) {
  let current = null;
  let selectedCommand = null;
  const cards = new Map();
  const commandButtons = new Map();
  const rowKeys = ["hero-back", "hero-front", "enemy-front", "enemy-back"];
  const rank = (key, title) => `<section class="battle-rank" data-rank="${key}"><h3>${title}<span></span></h3><div class="battle-rank__units"></div></section>`;
  root.innerHTML = `<div class="battle-shell">
    <header class="battle-header"><div><span class="battle-eyebrow">VAULTBOUND · EXPEDITION</span><h1></h1></div><div class="battle-header__stats"><span class="battle-campaign"></span><span class="battle-day"></span><strong class="battle-gold"></strong></div></header>
    <div class="battle-arena">
      <div class="battle-side battle-side--heroes"><h2>YOUR COMPANY <span></span></h2><div class="battle-side__ranks">${rank("hero-back", "REAR GUARD")}${rank("hero-front", "FRONT LINE")}</div></div>
      <section class="battle-report" aria-label="Battle status"><span class="battle-report__sigil" aria-hidden="true">⚔</span><h2></h2><p class="battle-report__copy" role="status"></p><div class="battle-result-actions"></div><ol class="battle-log" aria-label="Recent battle actions"></ol></section>
      <div class="battle-side battle-side--enemies"><h2>THE OPPOSITION <span></span></h2><div class="battle-side__ranks">${rank("enemy-front", "FRONT LINE")}${rank("enemy-back", "REAR GUARD")}</div></div>
      <svg class="battle-strikes" aria-hidden="true"><defs><filter id="strike-glow"><feGaussianBlur stdDeviation="2"/></filter></defs><g></g></svg>
    </div>
    <section class="battle-command-station" aria-label="Battle commands">
      <div class="battle-command-heading"><div><span class="battle-eyebrow">THE MAYOR'S ORDERS</span><h2>Battle commands</h2></div><div class="battle-resource"><div><span>COMMAND</span><strong></strong></div><div class="battle-resource__track"><i></i></div></div><div class="battle-active-effects" aria-live="off"></div></div>
      <div class="battle-command-deck">${COMMAND_IDS.map((id, index) => `<button class="battle-command" type="button" data-command="${id}" aria-describedby="command-description"><span class="battle-command__art"><img src="assets/commands/${id}.webp" alt=""/><span class="battle-command__key">${index + 1}</span><span class="battle-command__cost">${BATTLE_COMMANDS[id].cost}<small>CMD</small></span><span class="battle-command__count"></span><span class="battle-command__active"></span></span><strong>${BATTLE_COMMANDS[id].label}</strong><span class="battle-command__power"></span><span class="battle-command__reason"></span></button>`).join("")}</div>
      <p class="battle-command-description" id="command-description">Damage dealt and received fills Command. Orders grow stronger with matching living heroes.</p>
    </section>
    <footer class="battle-controls"><span class="battle-target-help"></span><div><button data-battle-action="potion" type="button"></button><button data-battle-action="flee" class="battle-flee" type="button"></button><button data-battle-action="pause" type="button"></button><button data-battle-action="speed" type="button"></button></div></footer>
  </div>`;

  const rows = new Map(rowKeys.map((key) => [key, root.querySelector(`[data-rank="${key}"] .battle-rank__units`)]));
  for (const id of COMMAND_IDS) commandButtons.set(id, root.querySelector(`[data-command="${id}"]`));
  const arena = root.querySelector(".battle-arena");
  const strikeGroup = root.querySelector(".battle-strikes g");
  const description = root.querySelector(".battle-command-description");
  const actionButtons = new Map(["potion", "flee", "pause", "speed"].map((id) => [id, root.querySelector(`[data-battle-action="${id}"]`)]));

  function explainCommand(id) {
    if (!current) return;
    selectedCommand = id;
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
    if (target && current?.targeting) onTarget(target.dataset.unit);
    const action = event.target.closest("[data-battle-action]");
    if (action && !action.disabled) onAction(action.dataset.battleAction);
  });
  root.addEventListener("pointerover", (event) => {
    const button = event.target.closest("[data-command]");
    if (button) explainCommand(button.dataset.command);
  });
  root.addEventListener("focusin", (event) => {
    const button = event.target.closest("[data-command]");
    if (button) explainCommand(button.dataset.command);
  });

  function updateCard(unit, state) {
    let card = cards.get(unit.id);
    const definition = unit.side === "hero" ? heroTypes[unit.type] : enemyTypes[unit.type];
    if (!card) {
      card = document.createElement("button");
      card.type = "button";
      card.className = "battle-unit";
      card.dataset.unit = unit.id;
      card.innerHTML = `<span class="battle-unit__portrait">${unit.side === "hero" ? `<img src="${definition.image}" alt=""/>` : `<span class="battle-enemy-glyph" style="--enemy-color:${definition.color}">${definition.glyph}</span>`}</span><span class="battle-unit__info"><strong></strong><small></small><span class="battle-unit__health"><i></i></span><span class="battle-unit__hp"></span></span><span class="battle-unit__status"></span>`;
      cards.set(unit.id, card);
    }
    const isHero = unit.side === "hero";
    const targetable = state.targeting === "mark" ? !isHero : state.targeting === "potion" && isHero && unit.hp < unit.maxHp;
    card.disabled = !targetable;
    card.classList.toggle("is-targetable", targetable);
    card.classList.toggle("is-hit", unit.flash > 0);
    card.classList.toggle("is-acting", unit.actionFlash > 0);
    card.classList.toggle("is-marked", !isHero && state.markedEnemyId === unit.id);
    card.classList.toggle("is-frozen", !isHero && state.effects.freeze > 0);
    card.classList.toggle("is-shielded", isHero && state.effects.aegis > 0);
    card.classList.toggle("is-holding", isHero && unit.row === "front" && state.effects.hold > 0);
    card.classList.toggle("is-healed", (unit.potionFlash ?? 0) > 0);
    card.dataset.side = unit.side;
    card.querySelector(".battle-unit__info strong").textContent = unit.label;
    card.querySelector(".battle-unit__info small").textContent = isHero ? `${definition.label} · L${unit.hero.level}` : definition.label;
    card.querySelector(".battle-unit__health i").style.width = `${Math.max(0, unit.hp / unit.maxHp) * 100}%`;
    card.querySelector(".battle-unit__hp").textContent = `${Math.ceil(unit.hp)} / ${unit.maxHp} HP`;
    card.querySelector(".battle-unit__status").textContent = !isHero && state.effects.freeze > 0 ? "FROZEN" : isHero && state.effects.aegis > 0 ? "AEGIS" : state.markedEnemyId === unit.id ? "MARKED" : "";
    card.setAttribute("aria-label", `${unit.label}, ${definition.label}, ${Math.ceil(unit.hp)} of ${unit.maxHp} health${targetable ? ", select target" : ""}`);
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
      line.setAttribute("stroke", effect.kind === "heal" ? "#83d4b3" : effect.sourceSide === "hero" ? "#ead298" : "#dc8279");
      line.setAttribute("opacity", Math.min(0.8, effect.remaining / 700));
      line.setAttribute("stroke-width", "2");
      strikeGroup.append(line);
    }
  }

  return {
    render(state) {
      const wasVisible = !root.hidden;
      root.hidden = !state.visible;
      document.body.classList.toggle("battle-open", state.visible);
      if (!state.visible) return;
      current = state;
      root.classList.toggle("is-paused", state.paused);
      root.classList.toggle("is-result", state.view !== "battle");
      root.classList.toggle("is-boss", state.boss);
      root.querySelector(".battle-header h1").textContent = state.boss ? "The Vault Tyrant" : `Floor ${state.floor}`;
      root.querySelector(".battle-campaign").textContent = state.flavor;
      root.querySelector(".battle-day").textContent = `Day ${state.day} / 10`;
      updateGoldBalance(root.querySelector(".battle-gold"), state.gold);

      const visibleUnits = [...state.party, ...state.enemies].filter((unit) => unit.hp > 0);
      const ids = new Set(visibleUnits.map((unit) => unit.id));
      for (const [id, card] of cards) if (!ids.has(id)) { card.remove(); cards.delete(id); }
      for (const unit of visibleUnits) updateCard(unit, state);
      for (const key of rowKeys) {
        const row = rows.get(key);
        row.parentElement.querySelector("h3 span").textContent = row.children.length;
        row.parentElement.classList.toggle("is-empty", row.children.length === 0);
      }
      root.querySelector(".battle-side--heroes h2 span").textContent = state.party.filter((unit) => unit.hp > 0).length;
      root.querySelector(".battle-side--enemies h2 span").textContent = state.enemies.filter((unit) => unit.hp > 0).length;
      const result = state.view !== "battle";
      root.querySelector(".battle-report > h2").textContent = result ? state.resultTitle : state.targeting ? "Choose your target" : state.paused ? "Battle paused" : "Into the depths";
      root.querySelector(".battle-report__copy").textContent = result ? state.resultCopy : state.targeting === "mark" ? "Select a highlighted enemy to mark." : state.targeting === "potion" ? "Select a wounded hero to heal." : state.paused ? "Take a breath. Your orders still work." : state.log[0] ?? "The company fights on.";
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
          : state.view === "campaign_end" ? `<button type="button" data-battle-action="reset">New campaign</button>` : "";
      }
      const meter = Math.floor(state.meter);
      root.querySelector(".battle-resource strong").textContent = `${meter} / ${COMMAND_MAX}`;
      root.querySelector(".battle-resource__track i").style.width = `${state.meter}%`;
      const effectCopy = Object.entries(state.effects).filter(([, duration]) => duration > 0).map(([id, duration]) => `${BATTLE_COMMANDS[id].label} ${(duration / 1000).toFixed(1)}s`);
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
      actionButtons.get("potion").innerHTML = state.targeting === "potion" ? "Cancel potion" : `Potion ×${state.potions}<small>${state.potionHealPercent}% max HP</small>`;
      actionButtons.get("potion").disabled = result || (state.targeting !== "potion" && (state.potions <= 0 || !state.party.some((unit) => unit.hp > 0 && unit.hp < unit.maxHp)));
      const flee = actionButtons.get("flee");
      const fleeSignature = `${state.fleeCost}:${state.levelChance}`;
      if (flee.dataset.priceSignature !== fleeSignature) {
        flee.dataset.priceSignature = fleeSignature;
        flee.classList.add("gold-purchase");
        flee.dataset.goldCost = state.fleeCost;
        flee.innerHTML = `Flee ${goldPrice(state.fleeCost, "LOSE")}<span class="flee-penalty-note">Half your gold</span><small>${state.levelChance}% level-up chance</small>`;
        flee.title = `Flee now and lose ${state.fleeCost} gold (half your gold, rounded up). ${state.levelChance}% level-up chance per survivor. Retreat between floors to avoid the gold penalty.`;
        flee.setAttribute("aria-label", `Flee now. Lose ${state.fleeCost} gold, half your gold rounded up. ${state.levelChance}% level-up chance per survivor.`);
      }
      actionButtons.get("pause").textContent = state.paused ? "Resume" : "Pause";
      actionButtons.get("speed").textContent = `Speed ×${state.speed}`;
      for (const [id, button] of actionButtons) if (id !== "potion") button.disabled = result;
      root.querySelector(".battle-target-help").textContent = state.targeting ? "Choose a highlighted target · Esc cancels" : "Orders work while paused. The party auto-flees when only two remain.";
      if (selectedCommand) explainCommand(selectedCommand);
      if (!wasVisible) { selectedCommand = null; arena.scrollTop = 0; }
      drawStrikes(state.combatEffects);
    },
  };
}
