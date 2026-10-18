export function retreatLevelChance(heroCount, retreatType) {
  if (heroCount <= 0 || retreatType === "none") return 0;
  if (retreatType === "automatic") return 100;
  return Math.max(0, 80 - Math.max(0, heroCount - 1) * 10);
}

export function rollRetreatLevelUps(heroIds, chance, random = Math.random) {
  return heroIds.filter(() => random() * 100 < chance);
}
