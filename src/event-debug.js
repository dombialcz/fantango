import { readSavedCampaign, CAMPAIGN_SAVE_KEY } from './campaign-chronicle.js';
import { EVENT_BY_ID, eventChance, resolveEvent, effectPreview, applyEventEffect } from './campaign-events.js';
const pools = { general: 'General', assassins: 'Assassins’ Guild', undead: 'Undead Uprising', demons: 'Demonic Invasion', orcs: 'Orc Warband', windfall: 'Guaranteed windfall' };
const outlook = document.querySelector('#outlook');
let signature = '';
let campaignSeed = null;
function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}
function datum(list, label, value) {
  const group = element('div'); group.append(element('dt', label), element('dd', String(value))); list.append(group);
}
function paragraph(host, text, className) { host.append(element('p', text, className)); }
function render(force = false) {
  const saved = readSavedCampaign();
  const nextSignature = JSON.stringify([saved?.state, outlook.value]);
  if (!force && signature === nextSignature) return;
  signature = nextSignature;
  document.querySelector('#empty-state').hidden = Boolean(saved);
  document.querySelector('#campaign').hidden = !saved;
  if (!saved) return;
  const s = saved.state, events = s.events;
  const tone = outlook.value === 'current' ? s.dayOutlook : outlook.value === 'bleak' ? 'no-progress' : 'progress';
  document.querySelector('#town-name').textContent = s.town.name;
  document.querySelector('#campaign-flavor').textContent = pools[s.flavorKey] ?? s.flavorKey;
  const stats = document.querySelector('#campaign-stats'); stats.replaceChildren();
  datum(stats, 'Day', `${s.day} / 10`); datum(stats, 'Total clears', events.clears); datum(stats, 'Campaign seed', events.seed);
  datum(stats, 'Morning outlook', s.dayOutlook); datum(stats, 'Saved screen', s.view);
  const completed = events.next - (events.pending ? 1 : 0);
  datum(stats, 'Completed events', `${completed} / ${events.plan.length}`);
  const next = events.plan[events.next];
  document.querySelector('#next-event').textContent = events.pending
    ? `${EVENT_BY_ID[events.pending.id]?.title ?? events.pending.id}: ${events.pending.result ? 'outcome revealed; awaiting acknowledgement' : 'awaiting your choice'}.`
    : next ? `Next: ${EVENT_BY_ID[next.id]?.title ?? next.id}, after ${next.at} total clears (${Math.max(0, next.at - events.clears)} more).` : 'All scheduled events have been encountered.';
  const list = document.querySelector('#event-schedule');
  const open = new Set([...list.querySelectorAll('details[open]')].map(node => node.dataset.event));
  const firstRender = !list.children.length || campaignSeed !== events.seed;
  campaignSeed = events.seed;
  const focusedEvent = document.activeElement?.tagName === 'SUMMARY' ? document.activeElement.closest('details')?.dataset.event : null;
  const fragment = document.createDocumentFragment();
  events.plan.forEach((entry, index) => {
    const event = EVENT_BY_ID[entry.id];
    if (!event) return;
    const isPending = events.pending?.id === entry.id;
    const status = isPending ? events.pending.result ? 'revealed' : 'awaiting-choice' : index < events.next ? 'completed' : index === events.next ? 'next' : 'upcoming';
    const log = s.chronicle.find(record => record.category === 'event' && record.text.startsWith(`${event.title}.`));
    const item = element('li', undefined, 'event-item'); item.dataset.event = entry.id; item.dataset.status = status;
    const row = element('div', undefined, 'event-row');
    row.append(element('span', String(index + 1).padStart(2, '0'), 'event-number'));
    const image = element('img'); image.src = `assets/events/${entry.id}.svg`; image.alt = ''; row.append(image);
    const heading = element('div', undefined, 'event-heading'); heading.append(element('h3', event.title), element('div', `${entry.id} · ${pools[event.pool]} · after ${entry.at} total clears`, 'event-meta')); row.append(heading);
    const statusLabel = { completed: 'Completed', revealed: 'Outcome revealed', 'awaiting-choice': 'Awaiting choice', next: 'Next encounter', upcoming: 'Upcoming' }[status];
    const badge = element('div', statusLabel, 'event-status');
    badge.append(element('small', log ? `Day ${log.day} · Floor ${log.floor}` : isPending ? `Day ${s.day} · Floor ${s.floor}` : `${Math.max(0, entry.at - events.clears)} clears to go`)); row.append(badge); item.append(row);
    const details = element('details'); details.dataset.event = entry.id;
    details.open = open.has(entry.id) || firstRender && ['next', 'revealed', 'awaiting-choice'].includes(status);
    details.append(element('summary', 'Inspect choices, outcomes and rolls'));
    const content = element('div', undefined, 'event-detail');
    paragraph(content, event.description, 'event-description');
    const rolls = element('dl', undefined, 'rolls');
    datum(rolls, 'Outcome roll', String(entry.outcomeRoll)); datum(rolls, 'Reward roll', String(entry.rewardRoll)); datum(rolls, 'Target roll', String(entry.targetRoll)); content.append(rolls);
    if (isPending && events.pending.result) {
      const result = events.pending.result;
      paragraph(content, `Actual choice: ${result.choice} ${result.text} ${result.consequence}`, 'actual-result');
    } else if (log) paragraph(content, `Recorded result: ${log.text}`, 'actual-result');
    const choices = element('div', undefined, 'choice-grid');
    event.choices.forEach((choice, choiceIndex) => {
      const card = element('section', undefined, 'choice'); card.append(element('h4', choice.label));
      const chance = event.guaranteed ? 1 : eventChance(choice, tone);
      const result = resolveEvent(entry, choiceIndex, tone);
      paragraph(card, `${event.guaranteed ? 'Guaranteed benefit' : `${Math.round(chance * 100)}% favourable chance`} · ${result.favourable ? 'Would be favourable' : 'Would be unfavourable'} under this preview.`, 'prediction');
      if (!event.guaranteed) {
        paragraph(card, `Favourable: ${choice.good.text} ${effectPreview(choice.good.effect, s.day)}`);
        paragraph(card, `Unfavourable: ${choice.bad.text} ${effectPreview(choice.bad.effect, s.day)}`);
      } else paragraph(card, effectPreview(choice.effect, s.day, s.potionHealRatio));
      const partyRequired = ['Restore', 'Shared care', 'Feast', 'Wound', 'Deep wound', 'Party strain'].includes(result.effect);
      if (!partyRequired || s.party.some(unit => unit.hp > 0)) {
        const copy = structuredClone(s);
        paragraph(card, `With today’s state: ${applyEventEffect(copy, result.effect, entry)}`, 'consequence');
      } else paragraph(card, 'Party-dependent result; no living expedition party is currently selected.', 'consequence');
      choices.append(card);
    });
    content.append(choices); details.append(content); item.append(details); fragment.append(item);
  });
  list.replaceChildren(fragment);
  if (focusedEvent) [...list.querySelectorAll('details')].find(detail => detail.dataset.event === focusedEvent)?.querySelector('summary')?.focus({ preventScroll: true });
  document.querySelector('#save-status').textContent = 'Showing the latest saved run';
}
outlook.addEventListener('change', () => render(true));
document.querySelector('#refresh').addEventListener('click', () => render(true));
window.addEventListener('storage', event => { if (event.key === CAMPAIGN_SAVE_KEY || event.key === null) render(); });
window.addEventListener('pageshow', () => render());
render();
