export function offerLevelChances(day) {
  const chances = [];
  let chance = Math.max(0, (day - 1) * 10);
  for (let level = 2; level <= 4 && chance >= 10; level += 1) {
    chances.push({ level, chance: Math.min(100, chance) });
    chance /= 2;
  }
  return chances;
}

export function rollOfferLevel(day, random = Math.random) {
  let level = 1;
  for (const step of offerLevelChances(day)) {
    if (random() * 100 >= step.chance) break;
    level = step.level;
  }
  return level;
}
