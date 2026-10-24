import { goldAmount, goldPrice, updateGoldBalance } from "./gold-ui.js";
import { createRosterContext } from "./contextual-help.js";

const escape = (value) => String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);

export function createRosterView({ root, heroTypes, onAction, onHero, onOffer, onHire }) {
  let signature = "";
  let wasRolling = false;
  root.innerHTML = `<div class="roster-shell">
    <header class="roster-header"><button type="button" class="roster-brand" data-roster-action="town" aria-label="Return to town">VAULTBOUND<small>TEN DAYS BELOW</small></button><div><span class="roster-day"></span><span class="roster-gold"></span><button type="button" data-roster-action="town">← Town</button></div></header>
    <nav class="campaign-steps" aria-label="Daily expedition"><button type="button" data-roster-action="town"><b>01</b> Town</button><span aria-current="step"><b>02</b> Company</span><span><b>03</b> Dungeon</span><a class="tutorial-link" href="tutorial.html">Tutorial ↗</a></nav>
    <div class="roster-intro"><div><span class="roster-eyebrow">A COMPANY WORTH GAMBLING ON</span><h1>The Contract Reel</h1><p>Roll for strangers. Hire your favorites. Keep them alive.</p></div><span class="roster-flavor"></span></div>
    <section class="contract-machine" aria-label="Hero slot machine">
      <div class="contract-machine__main"><div class="roster-section-heading"><h2>Today's contracts</h2><span class="roster-offer-count"></span></div><div class="contract-carousel"><div class="contract-window"><div class="contract-reel" id="contract-reel"></div><div class="contract-seal"><span aria-hidden="true">✦</span><h3>Fortune has yet to turn.</h3><p>Your first roll is free. Improve the Tavern in town before you roll for better hero odds.</p></div></div><button class="contract-reel-nav contract-reel-nav--previous" type="button" data-reel-step="-1" aria-label="Previous hero" aria-controls="contract-reel" disabled><span aria-hidden="true">‹</span></button><button class="contract-reel-nav contract-reel-nav--next" type="button" data-reel-step="1" aria-label="Next hero" aria-controls="contract-reel" disabled><span aria-hidden="true">›</span></button></div><p class="contract-help"></p></div>
      <div class="contract-controls"><span class="roster-eyebrow">THE TAVERN'S GAMBLE</span><div class="reel-emblem" aria-hidden="true">✦</div><button type="button" class="roster-roll-button" data-roster-action="roll"></button><p class="reel-cost-note"></p><div class="reel-odds"></div><button class="reel-town-link" type="button" data-roster-action="town">Improve the Tavern ↗</button></div>
    </section>
    <div class="roster-lower"><section class="company-board" aria-label="Locked company"><div class="roster-section-heading"><div><span class="roster-eyebrow">SAFE FROM REROLLS</span><h2>Your company</h2></div><span class="roster-team-count"></span></div><p class="company-help" id="company-move-help">Hired heroes stay safe from rerolls. Click a hero to move them; if the destination is full, choose a hero there to swap.</p><div class="party-heading"><h3>Active party</h3><span>Enter the dungeon</span></div><div class="company-party" role="group" aria-label="Active party"></div><div class="reserve-heading"><h3>Reserve <span>— staying at the tavern</span></h3><span>Two places · do not enter battle</span></div><div class="company-reserves" role="group" aria-label="Reserve — staying at the tavern"></div><div class="company-swap" hidden><p class="company-swap-copy" role="status"></p><button type="button" data-roster-action="cancel-swap">Cancel swap</button></div></section><aside class="roster-inspector" aria-label="Hero details" aria-live="polite"></aside></div>
    <footer class="roster-launch"><div><span class="roster-eyebrow">WHEN YOUR COMPANY IS READY</span><p class="roster-launch-copy"></p></div><button type="button" class="roster-deploy" data-roster-action="start">Enter the dungeon <span aria-hidden="true">→</span></button></footer><p class="roster-message" role="status" aria-live="polite"></p>
    <dialog class="roster-departure-dialog" aria-labelledby="departure-title" aria-describedby="departure-copy">
      <span class="roster-eyebrow">BEFORE YOU DESCEND</span><h2 id="departure-title">Your company has empty slots</h2>
      <p id="departure-copy"></p>
      <div class="roster-departure-actions"><button type="button" data-departure="cancel" autofocus>Back to company</button><button type="button" data-departure="confirm">Enter anyway →</button></div>
    </dialog>
    <dialog class="roster-dismiss-dialog" aria-labelledby="dismiss-title" aria-describedby="dismiss-copy">
      <span class="roster-eyebrow">LEAVING THE COMPANY</span><h2 id="dismiss-title">Dismiss this hero?</h2>
      <p id="dismiss-copy"></p>
      <div class="roster-departure-actions"><button type="button" data-dismiss="cancel" autofocus>Keep hero</button><button type="button" data-dismiss="confirm">Dismiss hero</button></div>
    </dialog>
  </div>`;
  const departureDialog = root.querySelector('.roster-departure-dialog');
  function cancelDeparture() {
    departureDialog.close();
    root.querySelector('.roster-deploy').focus({ preventScroll: true });
  }
  departureDialog.addEventListener('cancel', event => { event.preventDefault(); cancelDeparture(); });
  departureDialog.addEventListener('click', event => {
    const choice = event.target.closest('[data-departure]')?.dataset.departure;
    if (choice === 'cancel') cancelDeparture();
    if (choice === 'confirm' && departureDialog.open) {
      departureDialog.close();
      onAction('confirm-start');
    }
  });
  const dismissDialog = root.querySelector('.roster-dismiss-dialog');
  let dismissHeroId = null;
  function cancelDismissal() {
    dismissDialog.close();
    dismissHeroId = null;
    root.querySelector('[data-roster-action="dismiss"]')?.focus({ preventScroll: true });
  }
  dismissDialog.addEventListener('cancel', event => { event.preventDefault(); cancelDismissal(); });
  dismissDialog.addEventListener('click', event => {
    const choice = event.target.closest('[data-dismiss]')?.dataset.dismiss;
    if (choice === 'cancel' || event.target === dismissDialog) cancelDismissal();
    if (choice === 'confirm' && dismissDialog.open) {
      const id = dismissHeroId;
      dismissDialog.close();
      dismissHeroId = null;
      onAction('confirm-dismiss', id);
      root.querySelector('[data-hero], .roster-roll-button')?.focus({ preventScroll: true });
    }
  });
  root.querySelector('.reel-odds').insertAdjacentHTML('afterend', '<div class="reel-variety" aria-label="Underused class bonus"></div>');
  root.querySelector('.company-help').insertAdjacentHTML('afterend', '<p class="company-balance" role="status"></p>');
  const contextualHelp = createRosterContext(root, heroTypes);

  const reel = root.querySelector(".contract-reel");
  const previous = root.querySelector('[data-reel-step="-1"]');
  const next = root.querySelector('[data-reel-step="1"]');
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let reelAvailable = false;
  let scrollTarget = null;
  function updateReelNavigation() {
    const maximum = Math.max(0, reel.scrollWidth - reel.clientWidth);
    previous.disabled = !reelAvailable || reel.scrollLeft <= 1;
    next.disabled = !reelAvailable || reel.scrollLeft >= maximum - 1;
    if (scrollTarget !== null && Math.abs(reel.scrollLeft - scrollTarget) <= 1) scrollTarget = null;
  }
  reel.addEventListener("scroll", updateReelNavigation, { passive: true });
  for (const input of ["pointerdown", "wheel"]) reel.addEventListener(input, () => { scrollTarget = null; }, { passive: true });
  new ResizeObserver(updateReelNavigation).observe(reel);
  function scrollOneHero(direction) {
    if (!reelAvailable) return;
    const card = reel.querySelector(".contract-card");
    if (!card) return;
    const stride = card.getBoundingClientRect().width + parseFloat(getComputedStyle(reel).columnGap);
    const maximum = Math.max(0, reel.scrollWidth - reel.clientWidth);
    scrollTarget = Math.max(0, Math.min(maximum, (scrollTarget ?? reel.scrollLeft) + direction * stride));
    reel.scrollTo({ left: scrollTarget, behavior: reducedMotion.matches ? "instant" : "smooth" });
    updateReelNavigation();
  }

  function offerCard(hero, snapshot) {
    const type = heroTypes[hero.type];
    return `<article class="contract-card ${snapshot.selectedOfferId === hero.id ? "is-selected" : ""}" data-contract="${hero.id}" style="--hero-color:${type.color}"><button class="contract-inspect" type="button" data-offer="${hero.id}" aria-label="Inspect ${escape(hero.name)}, ${type.label}, level ${hero.level}${hero.selectionLevelBonus ? ', includes underused class bonus' : ''}" aria-pressed="${snapshot.selectedOfferId === hero.id}"><span class="contract-level">LV ${hero.level}</span><span class="contract-portrait"><img src="${type.image}" alt=""/></span><span class="contract-class">${type.label}</span><strong>${escape(hero.name)}</strong><small>${type.row === "front" ? "Front" : "Back"} row · ${hero.power} power</small>${hero.selectionLevelBonus ? '<span class="contract-variety">+1 UNDERUSED CLASS</span>' : ''}${hero.townRecruitment ? `<span class="contract-availability ${hero.townRecruitment.startsWith("Common") ? "is-common" : "is-scarce"}" title="${escape(hero.townRecruitment)}">${hero.townRecruitment.startsWith("Common") ? "COMMON HERE" : "SCARCE HERE"}</span>` : ""}</button><button class="contract-hire" type="button" data-hire="${hero.id}" ${snapshot.bench.length >= snapshot.benchCapacity ? "disabled" : ""}>Hire <span class="gold-free">FREE +</span></button></article>`;
  }

  function lockedCard(hero, reserve = false, swapHero = null) {
    if (!hero) return `<div class="company-empty"><span aria-hidden="true">${reserve ? "+" : "◇"}</span><span>${reserve ? "Reserve space" : "Open party slot"}</span></div>`;
    const type = heroTypes[hero.type];
    const swapTarget = swapHero && swapHero.active !== hero.active;
    const action = swapTarget ? `Swap ${swapHero.name} with` : swapHero?.id === hero.id ? "Cancel swap for" : reserve ? "Move to active party or select to swap:" : "Move to tavern reserve or select to swap:";
    return `<button type="button" class="company-hero ${hero.selected ? "is-selected" : ""} ${hero.crowdingPenaltyPercent ? 'is-crowded' : ''} ${swapHero?.id === hero.id ? "is-swapping" : ""} ${swapTarget ? "is-swap-target" : ""}" data-hero="${hero.id}" aria-label="${escape(action)} ${escape(hero.name)}, ${type.label}, level ${hero.level}, ${reserve ? "reserve at the tavern" : "active party"}${hero.crowdingPenaltyPercent ? ', minus 20% health and damage' : ''}" aria-pressed="${hero.selected}" aria-describedby="company-move-help" style="--hero-color:${type.color}"><img src="${type.image}" alt=""/><span class="company-hero__copy"><small>${type.label} <b>LV ${hero.level}</b></small><strong>${escape(hero.name)}</strong><span>${reserve ? "At the tavern" : `${type.row === "front" ? "Front" : "Back"} row`} <i aria-hidden="true">◆</i></span>${hero.crowdingPenaltyPercent ? '<span class="company-crowding">−20% HP / DMG</span>' : ''}${swapTarget ? '<span class="company-swap-label">Swap ↔</span>' : ''}</span></button>`;
  }

  function inspector(snapshot) {
    const offered = snapshot.offers.find((hero) => hero.id === snapshot.selectedOfferId);
    const hero = offered ?? snapshot.bench.find((hero) => hero.id === snapshot.selectedHeroId);
    if (!hero) return `<div class="hero-inspector-empty"><span aria-hidden="true">◇</span><h2>Know your company.</h2><p>Select a contract or hired hero to inspect their strengths.</p><small>Looking is free. Hiring is a separate choice.</small></div>`;
    const type = heroTypes[hero.type];
    const destinationFull = hero.active ? snapshot.bench.filter(candidate => !candidate.active).length >= 2 : snapshot.activeCount >= snapshot.teamCapacity;
    const cost = hero.level >= (snapshot.maxHeroLevel ?? 5) ? null : hero.level * hero.level;
    return `<div class="hero-inspector-heading" style="--hero-color:${type.color}"><img src="${type.image}" alt=""/><div><span class="roster-eyebrow">${offered ? "AVAILABLE CONTRACT" : hero.active ? "ACTIVE PARTY" : "RESERVE · STAYING AT THE TAVERN"}</span><h2>${escape(hero.name)}</h2><p>${type.label} · Level ${hero.level} · ${type.row === "front" ? "Front" : "Back"} row</p></div></div><div class="hero-stats"><span><b>${hero.power}</b>Power</span><span><b>${hero.health}</b>Health</span><span><b>${hero.damage}</b>Damage</span></div><p class="hero-behavior">${escape(hero.summary)}</p>${hero.townRecruitment ? `<p class="hero-town-availability">${escape(hero.townRecruitment)}. Recruitment rarity does not change this hero’s stats.</p>` : ""}<p class="hero-town-bonus">Town bonuses included. Bard songs apply during combat while a Bard lives.</p>${offered ? `<p class="hero-contract-note">Like this hero? The <strong>Hire</strong> button is directly beneath their contract. No gold required.</p>` : `<div class="hero-management"><button type="button" class="${cost === null ? "" : "gold-purchase"}" data-roster-action="upgrade" ${cost === null ? "" : `data-gold-cost="${cost}"`} title="${cost === null ? "Maximum hero level" : `Pay ${cost} gold to train ${escape(hero.name)} to level ${hero.level + 1}`}" ${cost === null || snapshot.gold < cost ? "disabled" : ""}><span>${cost === null ? "Maximum level reached" : `Train to level ${hero.level + 1}`}${cost !== null && snapshot.gold < cost ? `<small class="gold-shortfall">Need ${cost - snapshot.gold} more gold</small>` : ""}</span>${cost === null ? `<b>LV ${snapshot.maxHeroLevel ?? 5}</b>` : goldPrice(cost)}</button><button type="button" data-roster-action="toggle">${destinationFull ? hero.active ? "Swap with a reserve hero" : "Swap with an active hero" : hero.active ? "Move to tavern reserve" : "Add to active party"}</button><button class="hero-dismiss" type="button" data-roster-action="dismiss">Dismiss hero</button></div>`}`;
  }

  root.addEventListener("click", (event) => {
    const navigation = event.target.closest("[data-reel-step]");
    if (navigation) { if (!navigation.disabled) scrollOneHero(Number(navigation.dataset.reelStep)); return; }
    const hire = event.target.closest("[data-hire]");
    if (hire && !hire.disabled) {
      const keyboard = event.detail === 0;
      const id = Number(hire.dataset.hire);
      onHire(id);
      if (keyboard) root.querySelector(`[data-hero="${id}"]`)?.focus({ preventScroll: true });
      return;
    }
    const offer = event.target.closest("[data-offer]");
    if (offer) { onOffer(Number(offer.dataset.offer)); return; }
    const hero = event.target.closest("[data-hero]");
    if (hero) {
      const id = hero.dataset.hero;
      onHero(Number(id));
      root.querySelector(`[data-hero="${id}"]`)?.focus({ preventScroll: true });
      return;
    }
    const action = event.target.closest("[data-roster-action]");
    if (action && !action.disabled) onAction(action.dataset.rosterAction);
  });

  return {
    confirmDismissal(hero) {
      dismissHeroId = hero.id;
      root.querySelector('#dismiss-title').textContent = `Dismiss ${hero.name}?`;
      root.querySelector('#dismiss-copy').textContent = `${hero.name}, level ${hero.level} ${heroTypes[hero.type].label}, will leave your company permanently. This cannot be undone.`;
      if (!dismissDialog.open) dismissDialog.showModal();
    },
    warnEmptySlots(active, capacity) {
      const empty = capacity - active;
      root.querySelector('#departure-copy').textContent = `Only ${active} of ${capacity} hero slots are filled. You have ${empty} empty ${empty === 1 ? 'slot' : 'slots'}. Hire more heroes or move reserves into your active party before descending, or enter with your current company.`;
      if (!departureDialog.open) departureDialog.showModal();
    },
    render(snapshot) {
      const wasVisible = !root.hidden;
      root.hidden = !snapshot.visible;
      document.body.classList.toggle("roster-open", snapshot.visible);
      if (!snapshot.visible) { if (departureDialog.open) departureDialog.close(); if (dismissDialog.open) { dismissDialog.close(); dismissHeroId = null; } if (wasVisible) window.scrollTo(0, 0); return; }
      const rolling = snapshot.rollRemainingMs > 0;
      const nextSignature = JSON.stringify({ ...snapshot, rollRemainingMs: rolling });
      if (signature === nextSignature && wasVisible) return;
      signature = nextSignature;
      root.querySelector(".roster-day").textContent = `DAY ${snapshot.day} / 10`;
      updateGoldBalance(root.querySelector(".roster-gold"), snapshot.gold);
      root.querySelector(".roster-flavor").textContent = `${snapshot.flavor} · Invasion ${snapshot.journeyNumber ?? 1}/4 · Hero cap ${snapshot.maxHeroLevel ?? 5}`;
      root.querySelector(".roster-offer-count").textContent = !snapshot.rolledToday ? `${snapshot.dailyOffers} to discover` : rolling ? "Rolling…" : `${snapshot.offers.length} available · arrows or swipe to browse`;
      reelAvailable = snapshot.rolledToday && !rolling && snapshot.offers.length > 0;
      const reelKey = JSON.stringify([snapshot.rolledToday, rolling, snapshot.offers.map((hero) => hero.id), snapshot.selectedOfferId, snapshot.bench.length >= snapshot.benchCapacity, snapshot.offers.map(hero => hero.townRecruitment)]);
      if (reel.dataset.key !== reelKey) {
        const scroll = reel.scrollLeft;
        scrollTarget = null;
        const focusedOffer = reel.contains(document.activeElement) ? document.activeElement.dataset.offer : null;
        reel.dataset.key = reelKey;
        reel.classList.toggle("is-rolling", rolling);
        reel.classList.toggle("is-sealed", !snapshot.rolledToday);
        reel.classList.toggle("is-revealing", wasRolling && !rolling);
        reel.innerHTML = !snapshot.rolledToday || rolling ? Array.from({ length: 5 }, (_, index) => `<div class="reel-mystery" style="--reel-delay:${index * -130}ms" aria-hidden="true"><div>${Object.values(heroTypes).map((type) => `<img src="${type.image}" alt=""/>`).join("")}</div><span>?</span></div>`).join("") : snapshot.offers.length ? snapshot.offers.map((hero) => offerCard(hero, snapshot)).join("") : `<div class="reel-exhausted"><h3>All contracts claimed.</h3><p>Reroll for new faces, or take your company below.</p></div>`;
        reel.scrollLeft = wasRolling ? 0 : scroll;
        if (focusedOffer) reel.querySelector(`[data-offer="${focusedOffer}"]`)?.focus({ preventScroll: true });
      }
      updateReelNavigation();
      wasRolling = rolling;
      root.querySelector(".contract-seal").hidden = snapshot.rolledToday;
      root.querySelector(".contract-help").textContent = rolling ? "The reel is turning. Your locked company stays safe." : snapshot.rolledToday && snapshot.bench.length >= snapshot.benchCapacity ? `Company full (${snapshot.bench.length}/${snapshot.benchCapacity}). Dismiss a hired hero to make room for another contract.` : snapshot.rolledToday ? "Inspect a portrait. Hire below it. Unhired contracts disappear on a reroll." : "No contracts are generated until you roll. The Tavern's level at that moment sets the odds.";
      const rollButton = root.querySelector(".roster-roll-button");
      const price = snapshot.nextRollCost;
      rollButton.disabled = rolling || snapshot.gold < price;
      rollButton.classList.toggle("gold-purchase", price > 0 && !rolling);
      rollButton.classList.toggle("is-free", price === 0 && !rolling);
      if (price > 0 && !rolling) rollButton.dataset.goldCost = price;
      else delete rollButton.dataset.goldCost;
      rollButton.title = rolling ? "Reel is turning" : price ? `Pay ${price} gold to replace all unhired contracts. Hired heroes stay.` : snapshot.rolledToday ? "Daily bonus: free reroll" : "First daily roll is free";
      rollButton.innerHTML = rolling ? `Rolling<span class="roll-caption">The fates are deciding…</span>` : `${snapshot.rolledToday ? "Reroll heroes" : "Roll for heroes"}${price ? goldPrice(price) : `<span class="gold-free">${snapshot.rolledToday ? "BONUS ROLL" : "FIRST ROLL"} · FREE ↻</span>`}`;
      root.querySelector(".reel-cost-note").innerHTML = snapshot.rolledToday ? `${snapshot.gold < price ? `<span class="gold-shortfall">Need ${price - snapshot.gold} more gold.</span>` : price > 0 ? "Spends gold immediately. " : "Your bonus reroll is free. "}After this: ${goldAmount(snapshot.rerollCost + (price > 0 ? 1 : 0))}<br/>Hired heroes stay.` : `${snapshot.freeRerollsRemaining ? `${snapshot.freeRerollsRemaining} additional free reroll${snapshot.freeRerollsRemaining === 1 ? "" : "s"}, then ` : "Later rolls cost "}${goldAmount(1)}, then 2, 3… today.`;
      root.querySelector(".reel-odds").innerHTML = `<span>TAVERN · LEVEL ${snapshot.tavernLevel}</span><strong>${escape(snapshot.odds)}</strong><small>Higher levels require the previous level to succeed. Underused-class levels are added afterward.</small>`;
      root.querySelectorAll('[data-roster-action="town"]').forEach((button) => { button.disabled = rolling; });
      root.querySelector(".roster-team-count").textContent = `${snapshot.activeCount} / ${snapshot.teamCapacity} active`;
      const active = snapshot.bench.filter((hero) => hero.active);
      const reserves = snapshot.bench.filter((hero) => !hero.active);
      const swapHero = snapshot.bench.find(hero => hero.id === snapshot.swapHeroId);
      const swapNotice = root.querySelector('.company-swap');
      swapNotice.hidden = !swapHero;
      root.querySelector('.company-swap-copy').textContent = swapHero ? `Choose ${swapHero.active ? "a reserve hero at the tavern" : "an active party member"} to swap with ${swapHero.name}.` : "";
      const companyKey = JSON.stringify([snapshot.bench, snapshot.selectedHeroId, snapshot.teamCapacity, snapshot.swapHeroId]);
      if (root.querySelector(".company-board").dataset.key !== companyKey) {
        root.querySelector(".company-board").dataset.key = companyKey;
        root.querySelector(".company-party").innerHTML = Array.from({ length: snapshot.teamCapacity }, (_, index) => lockedCard(active[index] && { ...active[index], selected: active[index].id === snapshot.selectedHeroId }, false, swapHero)).join("");
        // Keep any additional reserves from older saves visible until they are moved.
        root.querySelector(".company-reserves").innerHTML = Array.from({ length: Math.max(2, reserves.length) }, (_, index) => lockedCard(reserves[index] && { ...reserves[index], selected: reserves[index].id === snapshot.selectedHeroId }, true, swapHero)).join("");
      }
      const inspectorNode = root.querySelector(".roster-inspector");
      const inspectorKey = JSON.stringify([snapshot.selectedOfferId, snapshot.selectedHeroId, snapshot.gold, snapshot.bench, snapshot.offers, snapshot.activeCount, snapshot.buildings, snapshot.cemeteryBonusPercent]);
      if (inspectorNode.dataset.key !== inspectorKey) {
        const focusedAction = inspectorNode.contains(document.activeElement) ? document.activeElement.dataset.rosterAction : null;
        inspectorNode.dataset.key = inspectorKey;
        inspectorNode.innerHTML = inspector(snapshot);
        const bonusNote = inspectorNode.querySelector(".hero-town-bonus");
        if (bonusNote && snapshot.cemeteryBonusPercent > 0) bonusNote.textContent = `Includes +${snapshot.cemeteryBonusPercent}% maximum health from the Cemetery, plus town bonuses. Bard songs apply during combat while a Bard lives.`;
        if (focusedAction) inspectorNode.querySelector(`[data-roster-action="${focusedAction}"]:not(:disabled)`)?.focus({ preventScroll: true });
      }
      root.querySelector(".roster-launch-copy").textContent = snapshot.activeCount ? `${snapshot.activeCount} ${snapshot.activeCount === 1 ? "hero" : "heroes"} ready · ${snapshot.potions} healing potion${snapshot.potions === 1 ? "" : "s"} · floor 10 holds the boss` : "Hire a hero to fill your first party slot.";
      root.querySelector(".roster-deploy").disabled = rolling || !snapshot.activeCount;
      root.querySelector(".roster-message").textContent = snapshot.message;
      contextualHelp.render(snapshot);
    },
    focus() { root.querySelector('.roster-roll-button:not(:disabled), .roster-deploy:not(:disabled)')?.focus({ preventScroll: true }); },
  };
}
