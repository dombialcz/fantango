export const CROWDING_MULTIPLIER = .8;

export function classCounts(heroes, types) {
  const counts = Object.fromEntries(types.map(type => [type, 0]));
  for (const hero of heroes) if (Object.hasOwn(counts, hero.type)) counts[hero.type] += 1;
  return counts;
}

// One departure per day; reserves, hires and rerolls are not class selections.
export function recordClassSelection(history, day, heroes, types) {
  return [...history.filter(entry => entry.day !== day), {day, counts: classCounts(heroes, types)}];
}

export function classSelectionBonus(history, day, types) {
  const recent = history.filter(entry => entry.day < day && entry.day >= day - 2);
  const counts = Object.fromEntries(types.map(type => [type, recent.reduce((total, entry) => total + (entry.counts[type] ?? 0), 0)]));
  const minimum = Math.min(...Object.values(counts));
  return {
    days: recent.map(entry => entry.day).sort((a, b) => a - b),
    averages: Object.fromEntries(types.map(type => [type, recent.length ? counts[type] / recent.length : 0])),
    classes: recent.length ? types.filter(type => counts[type] === minimum) : [],
  };
}

export function boostedOfferLevel(level, type, bonus) {
  return Math.min(5, level + (bonus.classes.includes(type) ? 1 : 0));
}

export function classCrowdingMultiplier(count) {
  return count > 2 ? CROWDING_MULTIPLIER : 1;
}
