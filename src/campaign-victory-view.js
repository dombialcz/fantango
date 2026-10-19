import { BATTLE_BACKDROPS } from './battle-backdrop.js';
import { LEGACIES, heroLevelCap, remainingInvasions, legacyRewards } from './campaign-journey.js';
import { BOSS_DEFINITIONS } from './bosses.js';
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);

export function createVictoryView({root, heroTypes, flavors, onReward, onVeteran, onContinue, onReset, onChronicle, onDownload}) {
  let campaignId = null;
  root.addEventListener('click', event => {
    const reward = event.target.closest('[data-legacy]'); if (reward) onReward(reward.dataset.legacy);
    const hero = event.target.closest('[data-veteran]'); if (hero && !hero.disabled) onVeteran(Number(hero.dataset.veteran));
    const action = event.target.closest('[data-victory-action]');
    if (!action || action.disabled) return;
    ({continue:onContinue,reset:onReset,chronicle:onChronicle,download:onDownload})[action.dataset.victoryAction]?.();
  });
  return { render(state) {
    const wasVisible = !root.hidden;
    root.hidden = state.view !== 'campaign_victory';
    document.body.classList.toggle('victory-open', !root.hidden);
    if (root.hidden) return;
    const summary = state.conclusion;
    const previous = state.journey.completed;
    const final = previous.length === 3;
    const survivors = summary.survivors;
    const required = Math.min(2, survivors.length);
    if (campaignId !== state.campaignId) {
      campaignId = state.campaignId;
      const highlights = summary.chronicle.filter(entry => ['event','training','level'].includes(entry.category)).slice(-5);
      const all = [...previous,summary];
      const remembered = final ? all.flatMap(campaign => campaign.fallen) : summary.fallen;
      const days = final ? all.reduce((total,campaign)=>total+campaign.day,0) : summary.day;
      const clears = final ? all.reduce((total,campaign)=>total+campaign.clears,0) : summary.clears;
      root.style.setProperty('--victory-scene', `url("${BATTLE_BACKDROPS[state.flavorKey].image}")`);
      root.innerHTML = `<div class="victory-wrap">
        <header class="victory-header"><div><span class="victory-eyebrow">${final ? 'FOUR TOWNS SAVED · JOURNEY COMPLETE' : `INVASION ${previous.length+1} OF 4 · VICTORY`}</span><h1 tabindex="-1">${final ? 'The dawn belongs to us.' : 'The invasion is ended.'}</h1><p><strong>${escape(BOSS_DEFINITIONS[state.bossType]?.label ?? 'The dungeon lord')}</strong> has fallen. ${escape(state.town.name)} stands.</p></div><div class="victory-chronicle-host"></div></header>
        <div class="victory-stats"><div><b>${days}</b><span>${final ? "Days fought" : "Day of victory"}</span></div><div><b>${clears}</b><span>Floors cleared</span></div><div><b>${summary.survivors.length}</b><span>Heroes returned</span></div><div><b>${remembered.length}</b><span>Heroes remembered</span></div><div><b>${summary.gold}</b><span>Gold in the treasury</span></div></div>
        <section class="victory-story"><span class="victory-eyebrow">FROM THE CHRONICLE</span><h2>A little hope became a home.</h2><p>${final ? 'Four invasions ended. Four towns greet the morning. The names carried from one battlefield to the next will not be forgotten.' : 'The survivors bring word to the surface. Doors open, bells answer, and the town begins to breathe again. Some of the company will stay to guard what you saved.'}</p>
          ${highlights.length ? `<ol>${highlights.map(e => `<li><small>Day ${e.day}${e.floor === null ? '' : ` · Floor ${e.floor}`}</small><p>${escape(e.text)}</p></li>`).join('')}</ol>` : '<p>The company held together through the dark and brought the fight to its source.</p>'}
          ${remembered.length ? `<details><summary>Remember the fallen · ${remembered.length}</summary><ul>${remembered.map(h => `<li>${escape(h.name)} · ${heroTypes[h.class]?.label ?? escape(h.class ?? '')} · Level ${h.level} · Day ${h.day}, floor ${h.floor}</li>`).join('')}</ul></details>` : '<p class="victory-note">Every hero who fell below is remembered in the full chronicle.</p>'}
          <button type="button" data-victory-action="chronicle">Read the full chronicle ↗</button>
        </section>
        ${previous.length || final ? `<section class="victory-towns"><span class="victory-eyebrow">THE JOURNEY SO FAR</span><h2>${all.length} ${all.length === 1 ? 'town' : 'towns'} saved</h2><ol>${all.map(c => `<li><strong>${escape(c.town.name)}</strong><span>${escape(flavors[c.flavorKey].name)} · Day ${c.day}</span>${c.rewardId ? `<small>${escape(Object.values(LEGACIES).flat().find(r => r.id === c.rewardId)?.name ?? '')}</small>` : ''}</li>`).join('')}</ol></section>` : ''}
        ${final ? `<section class="victory-company"><span class="victory-eyebrow">THOSE WHO BROUGHT THE DAWN</span><h2>The company that endured</h2><div class="victory-veterans">${survivors.map(h=>`<article><img src="${heroTypes[h.type].image}" alt=""/><strong>${escape(h.name)}</strong><small>${heroTypes[h.type].label} · Level ${h.level}</small><small>${h.townsSaved ?? 1} ${(h.townsSaved ?? 1) === 1 ? 'town saved' : 'towns saved'}</small></article>`).join('')}</div></section>` : `<section class="victory-legacy"><span class="victory-eyebrow">WHAT WILL YOU CARRY FORWARD?</span><h2>Choose one legacy</h2><p>This blessing joins your company for every remaining invasion.</p><div class="victory-rewards">${LEGACIES[state.flavorKey].map(r => `<button type="button" data-legacy="${r.id}" aria-pressed="false"><strong>${escape(r.name)}</strong><span>${escape(r.description)}</span></button>`).join('')}</div></section>
        <section class="victory-company"><span class="victory-eyebrow">THOSE WHO CARRY THE STORY</span><h2>Choose ${required} ${required === 1 ? 'veteran' : 'veterans'}</h2><p>Keep their names and levels. They arrive fully healed; the new town provides their equipment and training benefits. The other survivors remain as defenders.</p><div class="victory-veterans">${survivors.map(h => `<button type="button" data-veteran="${h.id}" aria-pressed="false"><img src="${heroTypes[h.type].image}" alt=""/><span><strong>${escape(h.name)}</strong><small>${heroTypes[h.type].label} · Level ${h.level}</small></span><i aria-hidden="true">✓</i></button>`).join('')}</div><p class="victory-selection" role="status"></p></section>`}
        ${legacyRewards(state.journey).length ? `<section class="victory-blessings"><h2>Legacies earned</h2><ul>${legacyRewards(state.journey).map(r=>`<li><strong>${escape(r.name)}</strong> · ${escape(r.description)}</li>`).join('')}</ul></section>` : ''}
        <footer class="victory-footer"><div><strong>${final ? 'Their story is complete.' : `Next invasion · Hero level cap ${Math.min(8,heroLevelCap(state.journey)+1)}`}</strong><p>${final ? 'Keep the chronicle, or begin a new journey with a fresh company.' : `A new town faces ${remainingInvasions(state.journey).filter(f=>f!==state.flavorKey).map(f=>flavors[f].name).join(', ')}. The next invasion is chosen at random. Each town begins on day one with fresh buildings, supplies and floor difficulty.`}</p></div><div><button type="button" data-victory-action="download">Download journey</button>${final ? '<button class="victory-primary" type="button" data-victory-action="reset">Begin a new journey →</button>' : '<button class="victory-primary" type="button" data-victory-action="continue" disabled>Defend another town →</button>'}</div></footer>
      </div>`;
    }
    for (const button of root.querySelectorAll('[data-legacy]')) button.setAttribute('aria-pressed',String(state.victoryRewardId === button.dataset.legacy));
    for (const button of root.querySelectorAll('[data-veteran]')) {
      const selected = state.carryHeroIds.includes(Number(button.dataset.veteran));
      button.setAttribute('aria-pressed',String(selected));
      button.disabled = !selected && state.carryHeroIds.length >= required;
    }
    const selection = root.querySelector('.victory-selection');
    if (selection) selection.textContent = `${state.carryHeroIds.length} of ${required} selected. ${state.victoryRewardId ? 'Legacy chosen.' : 'Choose a legacy to continue.'}`;
    const next = root.querySelector('[data-victory-action="continue"]');
    if (next) next.disabled = !state.victoryRewardId || state.carryHeroIds.length !== required;
    if (!wasVisible) { window.scrollTo(0,0); root.querySelector('h1').focus({preventScroll:true}); }
  } };
}
