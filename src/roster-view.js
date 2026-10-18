const escape = (value) => String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);

export function createRosterView({ root, heroTypes, onAction, onHero, onOffer, onHire }) {
  let signature = "";
  let wasRolling = false;
  root.innerHTML = `<div class="roster-shell">
    <header class="roster-header"><button type="button" class="roster-brand" data-roster-action="town" aria-label="Return to town">VAULTBOUND<small>TEN DAYS BELOW</small></button><div><span class="roster-day"></span><span class="roster-gold"></span><button type="button" data-roster-action="town">← Town</button></div></header>
    <nav class="campaign-steps" aria-label="Daily expedition"><button type="button" data-roster-action="town"><b>01</b> Town</button><span aria-current="step"><b>02</b> Company</span><span><b>03</b> Dungeon</span></nav>
    <div class="roster-intro"><div><span class="roster-eyebrow">A COMPANY WORTH GAMBLING ON</span><h1>The Contract Reel</h1><p>Roll for strangers. Hire your favorites. Keep them alive.</p></div><span class="roster-flavor"></span></div>
    <section class="contract-machine" aria-label="Hero slot machine">
      <div class="contract-machine__main"><div class="roster-section-heading"><h2>Today's contracts</h2><span class="roster-offer-count"></span></div><div class="contract-window"><div class="contract-reel"></div><div class="contract-seal"><span aria-hidden="true">✦</span><h3>Fortune has yet to turn.</h3><p>Your first roll is free. Improve the Tavern in town before you roll for better hero odds.</p></div></div><p class="contract-help"></p></div>
      <div class="contract-controls"><span class="roster-eyebrow">THE TAVERN'S GAMBLE</span><div class="reel-emblem" aria-hidden="true">✦</div><button type="button" class="roster-roll-button" data-roster-action="roll"></button><p class="reel-cost-note"></p><div class="reel-odds"></div><button class="reel-town-link" type="button" data-roster-action="town">Improve the Tavern ↗</button></div>
    </section>
    <div class="roster-lower"><section class="company-board" aria-label="Locked company"><div class="roster-section-heading"><div><span class="roster-eyebrow">SAFE FROM REROLLS</span><h2>Your company</h2></div><span class="roster-team-count"></span></div><p class="company-help">Hired heroes stay locked. Select one to train, reserve, or dismiss.</p><div class="company-party"></div><div class="reserve-heading"><span>RESERVES</span><span>Two extra places · do not enter battle</span></div><div class="company-reserves"></div></section><aside class="roster-inspector" aria-label="Hero details" aria-live="polite"></aside></div>
    <footer class="roster-launch"><div><span class="roster-eyebrow">WHEN YOUR COMPANY IS READY</span><p class="roster-launch-copy"></p></div><button type="button" class="roster-deploy" data-roster-action="start">Enter the dungeon <span aria-hidden="true">→</span></button></footer><p class="roster-message" role="status" aria-live="polite"></p>
  </div>`;

  function offerCard(hero, snapshot) {
    const type = heroTypes[hero.type];
    return `<article class="contract-card ${snapshot.selectedOfferId === hero.id ? "is-selected" : ""}" data-contract="${hero.id}" style="--hero-color:${type.color}"><button class="contract-inspect" type="button" data-offer="${hero.id}" aria-label="Inspect ${escape(hero.name)}, ${type.label}, level ${hero.level}" aria-pressed="${snapshot.selectedOfferId === hero.id}"><span class="contract-level">LV ${hero.level}</span><img src="${type.image}" alt=""/><span class="contract-class">${type.label}</span><strong>${escape(hero.name)}</strong><small>${type.row === "front" ? "Front" : "Back"} row · ${hero.power} power</small></button><button class="contract-hire" type="button" data-hire="${hero.id}" ${snapshot.bench.length >= snapshot.benchCapacity ? "disabled" : ""}>Hire <span>FREE +</span></button></article>`;
  }

  function lockedCard(hero, reserve = false) {
    if (!hero) return `<div class="company-empty"><span aria-hidden="true">${reserve ? "+" : "◇"}</span><span>${reserve ? "Reserve space" : "Open party slot"}</span></div>`;
    const type = heroTypes[hero.type];
    return `<button type="button" class="company-hero ${hero.selected ? "is-selected" : ""}" data-hero="${hero.id}" aria-label="Inspect ${escape(hero.name)}, ${type.label}, level ${hero.level}, ${reserve ? "reserve" : "active party"}" aria-pressed="${hero.selected}" style="--hero-color:${type.color}"><img src="${type.image}" alt=""/><span class="company-hero__copy"><small>${type.label} <b>LV ${hero.level}</b></small><strong>${escape(hero.name)}</strong><span>${reserve ? "Reserve" : `${type.row === "front" ? "Front" : "Back"} row`} <i aria-hidden="true">◆</i></span></span></button>`;
  }

  function inspector(snapshot) {
    const offered = snapshot.offers.find((hero) => hero.id === snapshot.selectedOfferId);
    const hero = offered ?? snapshot.bench.find((hero) => hero.id === snapshot.selectedHeroId);
    if (!hero) return `<div class="hero-inspector-empty"><span aria-hidden="true">◇</span><h2>Know your company.</h2><p>Select a contract or hired hero to inspect their strengths.</p><small>Looking is free. Hiring is a separate choice.</small></div>`;
    const type = heroTypes[hero.type];
    const cost = hero.level >= 5 ? null : hero.level * hero.level;
    return `<div class="hero-inspector-heading" style="--hero-color:${type.color}"><img src="${type.image}" alt=""/><div><span class="roster-eyebrow">${offered ? "AVAILABLE CONTRACT" : hero.active ? "ACTIVE PARTY" : "LOCKED RESERVE"}</span><h2>${escape(hero.name)}</h2><p>${type.label} · Level ${hero.level} · ${type.row === "front" ? "Front" : "Back"} row</p></div></div><div class="hero-stats"><span><b>${hero.power}</b>Power</span><span><b>${hero.health}</b>Health</span><span><b>${hero.damage}</b>Damage</span></div><p class="hero-behavior">${escape(hero.summary)}</p><p class="hero-town-bonus">Town bonuses included. Bard power buffs are assigned when the expedition begins.</p>${offered ? `<p class="hero-contract-note">Like this hero? The <strong>Hire</strong> button is directly beneath their contract. No gold required.</p>` : `<div class="hero-management"><button type="button" data-roster-action="upgrade" ${cost === null || snapshot.gold < cost ? "disabled" : ""}><span>${cost === null ? "Maximum level reached" : `Train to level ${hero.level + 1}`}</span><b>${cost === null ? "LV 5" : `${cost}g`}</b></button><button type="button" data-roster-action="toggle" ${!hero.active && snapshot.activeCount >= snapshot.teamCapacity ? "disabled" : ""}>${hero.active ? "Move to reserves" : "Add to active party"}</button><button class="hero-dismiss" type="button" data-roster-action="dismiss">Dismiss hero</button></div>`}`;
  }

  root.addEventListener("click", (event) => {
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
    if (hero) { onHero(Number(hero.dataset.hero)); return; }
    const action = event.target.closest("[data-roster-action]");
    if (action && !action.disabled) onAction(action.dataset.rosterAction);
  });

  return {
    render(snapshot) {
      const wasVisible = !root.hidden;
      root.hidden = !snapshot.visible;
      document.body.classList.toggle("roster-open", snapshot.visible);
      if (!snapshot.visible) { if (wasVisible) window.scrollTo(0, 0); return; }
      const rolling = snapshot.rollRemainingMs > 0;
      const nextSignature = JSON.stringify({ ...snapshot, rollRemainingMs: rolling });
      if (signature === nextSignature && wasVisible) return;
      signature = nextSignature;
      root.querySelector(".roster-day").textContent = `DAY ${snapshot.day} / 10`;
      root.querySelector(".roster-gold").textContent = `◈ ${snapshot.gold} gold`;
      root.querySelector(".roster-flavor").textContent = snapshot.flavor;
      root.querySelector(".roster-offer-count").textContent = !snapshot.rolledToday ? `${snapshot.dailyOffers} to discover` : rolling ? "Rolling…" : `${snapshot.offers.length} available · swipe / scroll to browse`;
      const reel = root.querySelector(".contract-reel");
      const reelKey = JSON.stringify([snapshot.rolledToday, rolling, snapshot.offers.map((hero) => hero.id), snapshot.selectedOfferId, snapshot.bench.length >= snapshot.benchCapacity]);
      if (reel.dataset.key !== reelKey) {
        const scroll = reel.scrollLeft;
        const focusedOffer = reel.contains(document.activeElement) ? document.activeElement.dataset.offer : null;
        reel.dataset.key = reelKey;
        reel.classList.toggle("is-rolling", rolling);
        reel.classList.toggle("is-sealed", !snapshot.rolledToday);
        reel.classList.toggle("is-revealing", wasRolling && !rolling);
        reel.innerHTML = !snapshot.rolledToday || rolling ? Array.from({ length: 5 }, (_, index) => `<div class="reel-mystery" style="--reel-delay:${index * -130}ms" aria-hidden="true"><div>${Object.values(heroTypes).map((type) => `<img src="${type.image}" alt=""/>`).join("")}</div><span>?</span></div>`).join("") : snapshot.offers.length ? snapshot.offers.map((hero) => offerCard(hero, snapshot)).join("") : `<div class="reel-exhausted"><h3>All contracts claimed.</h3><p>Reroll for new faces, or take your company below.</p></div>`;
        reel.scrollLeft = wasRolling ? 0 : scroll;
        if (focusedOffer) reel.querySelector(`[data-offer="${focusedOffer}"]`)?.focus({ preventScroll: true });
      }
      wasRolling = rolling;
      root.querySelector(".contract-seal").hidden = snapshot.rolledToday;
      root.querySelector(".contract-help").textContent = rolling ? "The reel is turning. Your locked company stays safe." : snapshot.rolledToday && snapshot.bench.length >= snapshot.benchCapacity ? `Company full (${snapshot.bench.length}/${snapshot.benchCapacity}). Dismiss a hired hero to make room for another contract.` : snapshot.rolledToday ? "Inspect a portrait. Hire below it. Unhired contracts disappear on a reroll." : "No contracts are generated until you roll. The Tavern's level at that moment sets the odds.";
      const rollButton = root.querySelector(".roster-roll-button");
      const price = snapshot.rolledToday ? snapshot.rerollCost : 0;
      rollButton.disabled = rolling || snapshot.gold < price;
      rollButton.innerHTML = rolling ? `Rolling<span>The fates are deciding…</span>` : `${snapshot.rolledToday ? "Reroll heroes" : "Roll for heroes"}<span>${price ? `${price} gold · pull the reel ↻` : "First roll · FREE ↻"}</span>`;
      root.querySelector(".reel-cost-note").textContent = snapshot.rolledToday ? `Next reroll: ${snapshot.rerollCost + 1}g. Hired heroes stay.` : "Then 1g, 2g, 3g… per reroll today.";
      root.querySelector(".reel-odds").innerHTML = `<span>TAVERN · LEVEL ${snapshot.tavernLevel}</span><strong>${escape(snapshot.odds)}</strong><small>Bonus levels roll in sequence; each step must succeed.</small>`;
      root.querySelectorAll('[data-roster-action="town"]').forEach((button) => { button.disabled = rolling; });
      root.querySelector(".roster-team-count").textContent = `${snapshot.activeCount} / ${snapshot.teamCapacity} active`;
      const active = snapshot.bench.filter((hero) => hero.active);
      const reserves = snapshot.bench.filter((hero) => !hero.active);
      const companyKey = JSON.stringify([snapshot.bench, snapshot.selectedHeroId, snapshot.teamCapacity]);
      if (root.querySelector(".company-board").dataset.key !== companyKey) {
        root.querySelector(".company-board").dataset.key = companyKey;
        root.querySelector(".company-party").innerHTML = Array.from({ length: snapshot.teamCapacity }, (_, index) => lockedCard(active[index] && { ...active[index], selected: active[index].id === snapshot.selectedHeroId })).join("");
        // Unused party places can hold additional reserves until they are deployed.
        root.querySelector(".company-reserves").innerHTML = Array.from({ length: Math.max(2, reserves.length) }, (_, index) => lockedCard(reserves[index] && { ...reserves[index], selected: reserves[index].id === snapshot.selectedHeroId }, true)).join("");
      }
      const inspectorNode = root.querySelector(".roster-inspector");
      const inspectorKey = JSON.stringify([snapshot.selectedOfferId, snapshot.selectedHeroId, snapshot.gold, snapshot.bench, snapshot.offers, snapshot.activeCount, snapshot.buildings]);
      if (inspectorNode.dataset.key !== inspectorKey) {
        const focusedAction = inspectorNode.contains(document.activeElement) ? document.activeElement.dataset.rosterAction : null;
        inspectorNode.dataset.key = inspectorKey;
        inspectorNode.innerHTML = inspector(snapshot);
        if (focusedAction) inspectorNode.querySelector(`[data-roster-action="${focusedAction}"]:not(:disabled)`)?.focus({ preventScroll: true });
      }
      root.querySelector(".roster-launch-copy").textContent = snapshot.activeCount ? `${snapshot.activeCount} ${snapshot.activeCount === 1 ? "hero" : "heroes"} ready · ${snapshot.potions} healing potion${snapshot.potions === 1 ? "" : "s"} · floor 10 holds the boss` : "Hire a hero to fill your first party slot.";
      root.querySelector(".roster-deploy").disabled = rolling || !snapshot.activeCount;
      root.querySelector(".roster-message").textContent = snapshot.message;
    },
    focus() { root.querySelector('.roster-roll-button:not(:disabled), .roster-deploy:not(:disabled)')?.focus({ preventScroll: true }); },
  };
}
