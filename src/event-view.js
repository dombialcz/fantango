import { EVENT_BY_ID, effectPreview } from './campaign-events.js';
import { updateGoldBalance } from './gold-ui.js';
export function createEventView({ root, onChoice, onContinue }) {
  let signature = '';
  root.addEventListener('click', event => {
    const choice = event.target.closest('[data-event-choice]');
    if (choice) onChoice(Number(choice.dataset.eventChoice));
    if (event.target.closest('[data-event-continue]')) onContinue();
  });
  return {
    render(state) {
      root.hidden = state.view !== 'event';
      document.body.classList.toggle('event-open', !root.hidden);
      if (root.hidden) { signature = ''; return; }
      const pending = state.events.pending;
      const nextSignature = JSON.stringify([pending, state.day, state.floor, state.gold]);
      if (signature === nextSignature) return;
      signature = nextSignature;
      const event = EVENT_BY_ID[pending.id];
      root.innerHTML = `<div class="event-shell"><header class="event-header"><span class="event-eyebrow">DAY ${state.day} · FLOOR ${state.floor} CLEARED</span><span class="event-gold"></span></header><article class="event-card" aria-labelledby="event-title"><div class="event-art"><img src="assets/events/${event.id}.svg" alt="" width="144" height="144"/></div><span class="event-eyebrow">${pending.result ? 'A CHOICE REMEMBERED' : event.guaranteed ? 'A MOMENT OF GOOD FORTUNE' : 'BETWEEN THE BATTLES'}</span><h1 id="event-title" tabindex="-1"></h1><p class="event-description"></p><div class="event-choices"></div><div class="event-result" role="status"></div><p class="event-context">The battle is over. Your company waits for your decision.</p></article><p class="event-footnote">${event.guaranteed ? 'Both choices offer a guaranteed benefit.' : 'Fortune is uncertain. Your company’s outlook shapes what follows.'} Choices are recorded in your chronicle.</p></div>`;
      updateGoldBalance(root.querySelector('.event-gold'), state.gold);
      root.querySelector('h1').textContent = event.title;
      root.querySelector('.event-description').textContent = event.description;
      const choices = root.querySelector('.event-choices');
      if (!pending.result) event.choices.forEach((choice, index) => {
        const button = document.createElement('button'); button.type = 'button'; button.dataset.eventChoice = index;
        const label = document.createElement('strong'); label.textContent = choice.label;
        const detail = document.createElement('span'); detail.textContent = event.guaranteed ? effectPreview(choice.effect, state.day, state.potionHealRatio) : `May bring: ${effectPreview(choice.good.effect, state.day)}. Risk: ${effectPreview(choice.bad.effect, state.day)}.`;
        button.append(label, detail); choices.append(button);
      });
      if (pending.result) {
        const result = root.querySelector('.event-result');
        for (const [className, content] of [['event-choice-made', pending.result.choice], ['event-outcome', pending.result.text], ['event-consequence', pending.result.consequence]]) {
          const paragraph = document.createElement('p'); paragraph.className = className; paragraph.textContent = content; result.append(paragraph);
        }
        const button = document.createElement('button'); button.type = 'button'; button.dataset.eventContinue = ''; button.textContent = 'Return to the company →'; result.append(button);
        root.querySelector('.event-context').textContent = 'Continue deeper or retreat safely after acknowledging this outcome.';
      }
      root.querySelector('h1').focus({ preventScroll: true });
      window.scrollTo(0, 0);
    },
  };
}
