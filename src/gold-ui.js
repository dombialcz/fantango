// One currency treatment, reusing Fantango's original coin artwork.
export const GOLD_ICON = '<img class="gold-coin" src="assets/coin-token.png" width="24" height="24" alt="" aria-hidden="true" decoding="async"/>';

export function goldAmount(amount) {
  return `<span class="gold-amount">${GOLD_ICON}<b class="gold-value">${Math.max(0, Math.round(amount))}</b><span class="gold-unit">gold</span></span>`;
}

export function goldPrice(amount, label = "PAY") {
  return `<span class="gold-price"><span class="gold-price__label">${label}</span>${goldAmount(amount)}</span>`;
}

export function updateGoldBalance(element, amount) {
  if (element.dataset.goldBalance === String(amount)) return;
  element.dataset.goldBalance = amount;
  element.innerHTML = goldAmount(amount);
}
