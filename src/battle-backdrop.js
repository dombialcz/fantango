import { BOSS_FLOOR } from "./dungeon-progression.js";

export const DESCENT_DURATION_MS = 18000;
export const BATTLE_BACKDROPS = Object.freeze({
  undead: { image: "assets/battle/undead-descent.webp", name: "Graveyard to the Lich Crypt", tint: "#38204c24" },
  demons: { image: "assets/battle/demons-descent.webp", name: "Town Gate to the Infernal Depths", tint: "#4e20141c" },
  assassins: { image: "assets/battle/assassins-descent.webp", name: "Hidden Cellars to the Guild Vault", tint: "#1d293f24" },
  orcs: { image: "assets/battle/orcs-descent.webp", name: "Broken Walls to the Warband Cavern", tint: "#263d201f" },
});

// Percentages cover the scrollable travel, so 100% never reveals an empty image edge.
export function floorBackdropProgress(floor) {
  return Math.max(0, Math.min(1, (Number(floor) || 0) / BOSS_FLOOR));
}

export function createBackdropDepth() {
  return { progress: 0, from: 0, target: 0, elapsedMs: 0 };
}

export function targetBackdropFloor(depth, floor) {
  const target = floorBackdropProgress(floor);
  if (target === depth.target) return;
  depth.from = depth.progress;
  depth.target = target;
  depth.elapsedMs = 0;
}

export function advanceBackdropDepth(depth, milliseconds) {
  if (depth.progress === depth.target) return;
  depth.elapsedMs = Math.min(DESCENT_DURATION_MS, depth.elapsedMs + Math.max(0, milliseconds));
  const t = depth.elapsedMs / DESCENT_DURATION_MS;
  const eased = t * t * (3 - 2 * t);
  depth.progress = t === 1 ? depth.target : depth.from + (depth.target - depth.from) * eased;
}
