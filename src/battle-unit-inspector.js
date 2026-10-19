import { ENEMY_PORTRAITS } from './enemy-art.js';

const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);

export function createUnitInspector({ root, heroTypes, getDetails, restoreFocus }) {
  const dialog = document.createElement('dialog');
  dialog.className = 'battle-unit-dialog';
  dialog.id = 'battle-unit-details';
  dialog.setAttribute('aria-labelledby', 'battle-unit-details-title');
  dialog.innerHTML = `<button type="button" class="battle-unit-dialog__close" autofocus>Close details <span aria-hidden="true">×</span></button><div class="battle-unit-dialog__content"></div><p class="battle-unit-dialog__pause">Combat is paused. Close this panel, then Resume when ready.</p>`;
  root.append(dialog);
  const content = dialog.querySelector('.battle-unit-dialog__content');
  let selectedId = null;
  let signature = '';
  function close() {
    const previous = selectedId;
    selectedId = null;
    signature = '';
    if (dialog.open) dialog.close();
    if (previous) restoreFocus(previous);
  }
  dialog.querySelector('button').addEventListener('click', close);
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) close();
  });
  return {
    select(id) { selectedId = id; signature = ''; },
    selected() { return selectedId; },
    render(visible) {
      if (!selectedId) return;
      const details = visible ? getDetails(selectedId) : null;
      if (!details) { close(); return; }
      const nextSignature = JSON.stringify(details);
      if (nextSignature !== signature) {
        signature = nextSignature;
        const portrait = details.side === 'hero' ? heroTypes[details.type].image : ENEMY_PORTRAITS[details.type]?.image;
        const list = entries => entries.map(text => `<li>${escape(text)}</li>`).join('');
        content.innerHTML = `<div class="battle-unit-dialog__portrait">${portrait ? `<img src="${escape(portrait)}" alt="Full portrait of ${escape(details.name)}"/>` : ''}</div>
          <div class="battle-unit-dialog__body"><span class="battle-eyebrow">${details.side === 'hero' ? 'YOUR COMPANY' : 'THE OPPOSITION'} · COMBAT PAUSED</span>
          <h2 id="battle-unit-details-title">${escape(details.name)}</h2><p class="battle-unit-dialog__subtitle">${escape(details.subtitle)}</p>
          <p>${escape(details.behavior)}</p>
          <h3>Combat stats</h3><dl class="battle-unit-stats">${details.stats.map(([label,value]) => `<div><dt>${escape(label)}</dt><dd>${escape(value)}</dd></div>`).join('')}</dl>
          <h3>Bonuses &amp; modifiers</h3><ul>${list(details.bonuses)}</ul>
          <h3>Active effects</h3>${details.effects.length ? `<ul>${list(details.effects)}</ul>` : '<p>No temporary effects.</p>'}
          <p class="battle-unit-dialog__note">${escape(details.note)}</p></div>`;
      }
      if (!dialog.open) {
        dialog.showModal();
        dialog.querySelector('button').focus({ preventScroll: true });
      }
    },
  };
}
