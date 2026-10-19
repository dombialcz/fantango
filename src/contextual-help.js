const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
const percent = value => Math.round((value ?? 0) * 100);
const average = value => Number(value).toLocaleString('en', {maximumFractionDigits: 1});
const plural = (label, count) => count === 1 ? label : label === 'Thief' ? 'Thieves' : `${label}s`;

// Update the contents, not the disclosure itself: open state and keyboard focus survive renders.
function update(node, key, markup) {
  if (node.dataset.contextKey === key) return;
  node.dataset.contextKey = key;
  node.innerHTML = markup;
}

function countsFor(snapshot) {
  const counts = {};
  for (const hero of snapshot.bench) if (hero.active) counts[hero.type] = (counts[hero.type] ?? 0) + 1;
  return counts;
}

export function createRosterContext(root, heroTypes) {
  const favour = root.querySelector('.reel-variety');
  root.querySelector('.contract-machine').append(favour);
  favour.innerHTML = `<div class="context-heading"><span aria-hidden="true">✦</span><div><strong>Recruitment favour</strong><small>Underused classes · +1 level</small></div></div><div class="context-favoured"></div><details class="context-details favour-details"><summary>Why these classes?</summary><div class="context-favour-explanation"></div></details>`;
  const balance = root.querySelector('.company-balance');
  balance.insertAdjacentHTML('afterend', `<details class="context-details company-balance-help"><summary>How party balance works</summary><p>Two of a class fight at full strength. Deploy three or more and <strong>every member of that class loses 20% maximum health and damage</strong>. This is one flat penalty, not another 20% per extra hero.</p><p>Reserves never count. Composition is locked at departure: deaths do not lift the penalty during the expedition. Move a hero to reserves before leaving to avoid it.</p></details>`);
  const notice = document.createElement('div');
  notice.className = 'roster-context-notice'; notice.hidden = true;
  notice.innerHTML = '<p role="status"></p><button type="button" data-context-review>Review party ↓</button>';
  root.querySelector('.contract-help').after(notice);
  const departure = document.createElement('small'); departure.className = 'roster-departure-warning'; departure.hidden = true;
  root.querySelector('.roster-launch-copy').after(departure);
  let previousCounts = null, previousDay = null, noticeType = null;
  notice.querySelector('button').addEventListener('click', () => {
    notice.hidden = true; noticeType = null;
    const target = root.querySelector('.company-balance-help > summary');
    target.focus({preventScroll:true});
    target.scrollIntoView({block:'center',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
  });

  function decorateInspector(snapshot, counts) {
    const inspector = root.querySelector('.roster-inspector');
    const offered = snapshot.offers.find(hero => hero.id === snapshot.selectedOfferId);
    const hero = offered ?? snapshot.bench.find(hero => hero.id === snapshot.selectedHeroId);
    if (!hero) return;
    const anchor = inspector.querySelector('.hero-town-bonus');
    if (!anchor || inspector.querySelector('.hero-context')) return;
    const label = heroTypes[hero.type].label;
    const affectedCount = (counts[hero.type] ?? 0) + (offered ? 1 : 0);
    const blocks = [];
    if (hero.selectionLevelBonus) blocks.push(`<div class="context-benefit hero-balance-note"><strong>✦ +1 underused-class level</strong><p>${offered ? `Tavern roll L${hero.level - hero.selectionLevelBonus} <span aria-hidden="true">→</span> <b>Level ${hero.level}</b>. ${label} is among your least-used classes.` : `Recruited with +1 level for choosing an underused class. This is already part of ${escape(hero.name)}’s level, not a new bonus each morning.`}</p></div>`);
    if (hero.crowdingPenaltyPercent) blocks.push(`<div class="context-caution hero-balance-note"><strong>${offered ? 'Hiring into this party' : 'Crowded ranks'} · −20% health &amp; damage</strong><p>${offered ? `This makes ${affectedCount} active ${plural(label, affectedCount)}. All of them—not just this recruit—take the penalty.` : `There are ${affectedCount} active ${plural(label, affectedCount)}. Every one is affected.`}</p><div class="context-stat-change"><span>Health <s>${hero.unpenalizedHealth}</s> <b>${hero.health}</b></span><span>Damage <s>${hero.unpenalizedDamage}</s> <b>${hero.damage}</b></span></div><p class="context-action-hint">Reserve ${affectedCount - 2} ${plural(label, affectedCount - 2)} to keep two active. Fixed for the expedition when you leave.</p></div>`);
    if (hero.type === 'thief') blocks.push(`<details class="context-details hero-dodge-help"><summary><span>Dodge <b>${percent(hero.evasionChance)}%</b></span><span class="context-info" aria-hidden="true">i</span></summary><p>Thieves start with <strong>10% dodge</strong>. Each Evasion choice at the Thieves’ Guild adds 5 percentage points; town traits can add more. Current total: <strong>${percent(hero.evasionChance)}%</strong>. An evaded hit deals no damage. Dodge is capped at 90%.</p></details>`);
    if (!blocks.length) return;
    const container = document.createElement('div'); container.className = 'hero-context'; container.innerHTML = blocks.join('');
    anchor.before(container);
  }

  return { render(snapshot) {
    const counts = countsFor(snapshot), bonus = snapshot.selectionBonus;
    const key = JSON.stringify([bonus,snapshot.maxHeroLevel]);
    const favoured = favour.querySelector('.context-favoured');
    update(favoured, key, bonus.classes.length ? `<div class="context-class-chips">${bonus.classes.map(type => `<span><img src="${heroTypes[type].image}" alt=""/>${heroTypes[type].label}<b>+1</b></span>`).join('')}</div><p class="context-caption">New contracts only · maximum level ${Math.min(6,snapshot.maxHeroLevel ?? 5)}</p>` : '<p class="context-opening">No bonus yet.</p><p class="context-caption">Your first expedition sets tomorrow’s favour.</p>');
    const explanation = favour.querySelector('.context-favour-explanation');
    update(explanation, key, `<p>Your least-deployed classes get <strong>+1 level on new contracts</strong>, after the Tavern roll. All ties qualify. Hired heroes do not gain this level again.</p>${bonus.days.length ? `<table class="context-usage"><caption>Day${bonus.days.length > 1 ? 's' : ''} ${bonus.days.join(' & ')} · average heroes deployed per day</caption><thead><tr><th scope="col">Class</th><th scope="col">Average</th></tr></thead><tbody>${Object.keys(heroTypes).map(type => `<tr ${bonus.classes.includes(type) ? 'class="is-favoured"' : ''}><th scope="row">${heroTypes[type].label}${bonus.classes.includes(type) ? ' <span>+1</span>' : ''}</th><td>${average(bonus.averages[type])}</td></tr>`).join('')}</tbody></table>` : '<p>Day 1 has no bonus. Day 2 uses your first expedition; after that, we average the previous two days.</p>'}<p>Only the team you actually send below counts—not reserves, hiring or rerolling. Favour is recalculated each morning.</p>`);
    const crowded = snapshot.crowdedClasses;
    const pairs = Object.entries(counts).filter(([,count])=>count===2);
    const copy = crowded.length ? `${crowded.map(({type,count})=>`${heroTypes[type].label} ×${count}`).join(' · ')} — −20% health & damage for every member of those classes.` : pairs.length ? `${pairs.map(([type])=>heroTypes[type].label).join(' / ')} pair${pairs.length>1?'s':''} at full strength. A third of the same class triggers −20% health & damage.` : 'No class penalty. Two of a class can fight at full strength.';
    if (balance.textContent !== copy) balance.textContent = copy;
    balance.classList.toggle('has-penalty',crowded.length>0);
    balance.classList.toggle('has-pair',!crowded.length&&pairs.length>0);
    departure.hidden = crowded.length === 0;
    departure.textContent = crowded.length ? `Departing with crowded ${crowded.map(({type})=>heroTypes[type].label).join(' / ')} ranks: −20% health & damage.` : '';
    if (previousDay !== snapshot.day) { previousCounts=null;noticeType=null;notice.hidden=true; }
    const crossing = previousCounts && Object.keys(counts).find(type=>(previousCounts[type]??0)<=2&&counts[type]>=3);
    if (crossing) {
      noticeType=crossing;notice.hidden=false;
    }
    if (noticeType && (counts[noticeType]??0)<3) { notice.hidden=true;noticeType=null; }
    if (noticeType) {
      const message=`${heroTypes[noticeType].label} ranks are crowded. All ${counts[noticeType]} now show −20% health & damage.`;
      if(notice.querySelector('p').textContent!==message)notice.querySelector('p').textContent=message;
    }
    previousCounts={...counts};previousDay=snapshot.day;
    for (const card of root.querySelectorAll('[data-contract]')) {
      const hero=snapshot.offers.find(hero=>hero.id===Number(card.dataset.contract));
      if(!hero) continue;
      let warning=card.querySelector('.contract-crowding-hint');
      const hire=card.querySelector('[data-hire]');
      if(hero.crowdingPenaltyPercent) {
        if(!warning) {warning=document.createElement('p');warning.className='contract-crowding-hint';warning.id=`contract-risk-${hero.id}`;hire.before(warning);}
        warning.textContent=`3+ ${plural(heroTypes[hero.type].label,3)} · −20% HP / damage`;
        hire.setAttribute('aria-describedby',warning.id);
      } else {warning?.remove();hire.removeAttribute('aria-describedby');}
    }
    decorateInspector(snapshot,counts);
  }};
}

export function createBattleContext(root, heroTypes) {
  const panel=document.createElement('details');panel.className='context-details battle-party-context';panel.hidden=true;
  panel.innerHTML='<summary><span>Party traits</span><span class="context-info" aria-hidden="true">i</span></summary><div></div>';
  root.querySelector('.battle-side--heroes .battle-side__ranks').after(panel);
  let key='';
  return {render(party) {
    const living=party.filter(unit=>unit.hp>0);
    const thieves=[...new Set(living.filter(unit=>unit.type==='thief').map(unit=>percent(unit.evasionChance)))];
    const crowded=[...new Set(living.filter(unit=>unit.crowdingPenaltyPercent).map(unit=>unit.type))];
    const next=JSON.stringify([thieves,crowded]);
    panel.hidden=!thieves.length&&!crowded.length;
    if(next===key)return;key=next;
    panel.querySelector('summary > span').textContent=crowded.length?'Crowded ranks · −20%':'Thief dodge · '+thieves.map(value=>value+'%').join(' / ');
    panel.querySelector('div').innerHTML=`${crowded.length?`<p><strong>${crowded.map(type=>heroTypes[type].label).join(' · ')}: −20% maximum health &amp; damage.</strong> Three or more departed together. The penalty lasts the whole expedition, even after deaths.</p>`:''}${thieves.length?`<p>Thief dodge: <strong>${thieves.map(value=>value+'%').join(' / ')}</strong>. Base 10%, plus Guild and town bonuses, capped at 90%. An evaded hit deals no damage.</p>`:''}`;
  }};
}
