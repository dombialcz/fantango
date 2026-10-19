export const CEMETERY = Object.freeze({ name: "Cemetery", image: "assets/town/cemetery.webp", healthPerHero: .01 });

export function cemeteryHealthMultiplier(graves) {
  return 1 + graves.length * CEMETERY.healthPerHero;
}

export function cemeteryMaxHp(baseHealth, graves) {
  return Math.max(1, Math.round(baseHealth * cemeteryHealthMultiplier(graves)));
}

// Snapshot identity at the fatal hit, before the dead hero leaves the active party.
export function recordFallenHero(graves, unit, source, {day, floor, campaignKey, campaignName}) {
  if (unit.side !== "hero" || !unit.hero || unit.hp > 0 || graves.some(grave => grave.heroId === unit.hero.id)) return false;
  graves.push({ heroId: unit.hero.id, name: unit.hero.name ?? unit.label, class: unit.type, level: unit.hero.level,
    day, floor, campaignKey, campaignName,
    killer: typeof source === "string" ? source : source?.label ?? "Unknown foe",
    killerType: typeof source === "object" ? source?.type ?? null : null });
  return true;
}
