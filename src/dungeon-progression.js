export const BOSS_FLOOR = 10;
export const ENEMY_HEALTH_PER_FLOOR = 0.1;

export function floorGoldReward(day) {
  return Math.max(1, Math.floor(day));
}

export function isBossFloor(floor) {
  return floor === BOSS_FLOOR;
}

// A linear bonus on top of existing depth scaling, including the first floor.
export function enemyHealthMultiplier(floor) {
  return 1 + Math.max(1, Math.floor(floor)) * ENEMY_HEALTH_PER_FLOOR;
}
