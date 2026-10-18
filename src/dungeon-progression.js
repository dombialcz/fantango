export const BOSS_FLOOR = 10;

export function floorGoldReward(day) {
  return Math.max(1, Math.floor(day));
}

export function isBossFloor(floor) {
  return floor === BOSS_FLOOR;
}
