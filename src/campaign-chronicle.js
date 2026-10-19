export const CAMPAIGN_SAVE_KEY = 'vaultbound:campaign:v1';
const ARCHIVE_KEY = 'vaultbound:chronicles:v1';
export function recordChronicle(state, category, text, floor = null) {
  const entry = { day: state.day, floor, category, text };
  state.chronicle.push(entry);
}
export function chronicleText(campaign) {
  return [`${campaign.town.name} — ${campaign.flavorKey}`, 'Ten Days Below', '', ...campaign.chronicle.flatMap((entry, index, all) => [
    ...(index === 0 || entry.day !== all[index - 1].day ? [`\nDay ${entry.day}`] : []),
    `${entry.floor === null ? '' : `Floor ${entry.floor} · `}${entry.text}`,
  ])].join('\n');
}
export function saveCampaign(state, nextHeroId, nextEnemyId) {
  try { localStorage.setItem(CAMPAIGN_SAVE_KEY, JSON.stringify({ version: 1, state, nextHeroId, nextEnemyId })); } catch { /* Gameplay continues when storage is unavailable. */ }
}
export function readSavedCampaign() {
  try {
    const saved = JSON.parse(localStorage.getItem(CAMPAIGN_SAVE_KEY));
    if (saved?.version !== 1 || !saved.state?.events?.plan?.length || !Array.isArray(saved.state.chronicle) || !saved.state.town?.name || !Number.isInteger(saved.nextHeroId) || !Number.isInteger(saved.nextEnemyId)) return null;
    return saved;
  } catch { return null; }
}
export function loadCampaign() {
  const saved = readSavedCampaign();
  if (saved?.state.view === 'battle') { saved.state.battlePaused = true; saved.state.commandAutoPaused = false; }
  return saved;
}
export function archivedChronicles() {
  try { const value = JSON.parse(localStorage.getItem(ARCHIVE_KEY)); return Array.isArray(value) ? value : []; } catch { return []; }
}
export function archiveChronicle(state) {
  if (state.chronicle.length <= 1) return;
  try {
    const archive = { town: state.town, flavorKey: state.flavorKey, chronicle: state.chronicle, victoryAchieved: state.victoryAchieved };
    localStorage.setItem(ARCHIVE_KEY, JSON.stringify([archive, ...archivedChronicles()].slice(0, 5)));
  } catch { /* Current chronicle can still be downloaded. */ }
}
export function createChronicleView({ getState, onOpen }) {
  const trigger = document.createElement('button'); trigger.className = 'chronicle-trigger'; trigger.type = 'button'; trigger.textContent = 'Chronicle';
  const dialog = document.createElement('dialog'); dialog.className = 'chronicle-dialog'; dialog.setAttribute('aria-label', 'Campaign chronicle');
  dialog.innerHTML = '<header><div><span class="event-eyebrow">THE COMPANY REMEMBERS</span><h2>Chronicle</h2></div><button type="button" data-close>Close ×</button></header><label>Adventure <select aria-label="Choose a chronicle"></select></label><div class="chronicle-entries"></div><footer><button type="button" data-download>Download chronicle</button><a href="event-debug.html" target="_blank" rel="noopener">Debug event schedule ↗</a><span>Saved on this browser · last five adventures retained</span></footer>';
  document.body.append(trigger, dialog);
  let campaigns = [], selected = null;
  const select = dialog.querySelector('select');
  function show() {
    selected = campaigns[Number(select.value)] ?? campaigns[0];
    const container = dialog.querySelector('.chronicle-entries'); container.replaceChildren();
    let day = null;
    for (const entry of selected.chronicle) {
      if (day !== entry.day) { day = entry.day; const heading = document.createElement('h3'); heading.textContent = `Day ${day}`; container.append(heading); }
      const paragraph = document.createElement('p'); paragraph.className = `chronicle-entry chronicle-entry--${entry.category}`;
      if (entry.floor !== null) { const label = document.createElement('span'); label.textContent = `Floor ${entry.floor} · `; paragraph.append(label); }
      paragraph.append(document.createTextNode(entry.text)); container.append(paragraph);
    }
  }
  trigger.addEventListener('click', () => {
    onOpen(); campaigns = [getState(), ...archivedChronicles()];
    select.replaceChildren(...campaigns.map((campaign, index) => { const option = document.createElement('option'); option.value = index; option.textContent = `${index ? 'Previous' : 'Current'} · ${campaign.town.name}`; return option; }));
    select.value = '0'; show(); dialog.showModal();
  });
  select.addEventListener('change', show);
  dialog.querySelector('[data-close]').addEventListener('click', () => { dialog.close(); trigger.focus(); });
  dialog.querySelector('[data-download]').addEventListener('click', () => {
    const url = URL.createObjectURL(new Blob([chronicleText(selected)], { type: 'text/markdown' }));
    const link = document.createElement('a'); link.href = url; link.download = 'vaultbound-chronicle.md'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  return { dialog, place(view) {
    const selector = view === 'town' ? '.town-header__right' : view === 'tavern' ? '.roster-header > div' : view === 'event' ? '.event-header' : '.battle-header__stats';
    const host = document.querySelector(selector);
    if (host && trigger.parentElement !== host) host.append(trigger);
  } };
}
