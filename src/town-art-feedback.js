// Presentation-only feedback: the game still owns all prices and building levels.
export function observeTownRestoration(root) {
  const pending = new Map();
  const observer = new MutationObserver((records) => {
    for (const record of records) {
      const art = record.target;
      const card = art.closest("[data-district]");
      const previous = Number(record.oldValue);
      const level = Number(art.dataset.stage);
      if (!card) continue;
      const type = card.dataset.district;
      const image = art.querySelector("img");
      const source = image.getAttribute("src");
      const current = pending.get(type);
      if (current) {
        clearTimeout(current.timer);
        current.arts.forEach((item) => item.classList.remove("is-restoring"));
        card.classList.remove("town-restoration-flash");
        pending.delete(type);
      }
      if (!previous || level <= previous) continue;
      const effect = { arts: [], timer: null };
      pending.set(type, effect);
      image.decode().catch(() => {}).then(() => {
        if (pending.get(type) !== effect || art.dataset.stage !== String(level) || root.hidden) return;
        card.classList.remove("town-restoration-flash");
        // Wait until decoded replacement art is ready; never replay on simple inspection.
        effect.arts = [...root.querySelectorAll(".town-art")].filter((item) => item.querySelector("img")?.getAttribute("src") === source);
        for (const item of effect.arts) {
          item.dataset.restoration = `RESTORED · LEVEL ${level}`;
          item.classList.add("is-restoring");
        }
        card.classList.add("town-restoration-flash");
        effect.timer = setTimeout(() => {
          effect.arts.forEach((item) => item.classList.remove("is-restoring"));
          card.classList.remove("town-restoration-flash");
          if (pending.get(type) === effect) pending.delete(type);
        }, 1900);
      });
    }
  });
  observer.observe(root, { subtree: true, attributes: true, attributeFilter: ["data-stage"], attributeOldValue: true });
  return observer;
}
