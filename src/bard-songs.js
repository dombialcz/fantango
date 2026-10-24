export const SONG_ORDER = Object.freeze(['rally', 'defense', 'power']);
export const SONG_COOLDOWN_MS = 6000;
export const SONGS = Object.freeze({
  rally: Object.freeze({ label: 'Rally Song', color: 'red', speedBonus: .1 }),
  defense: Object.freeze({ label: 'Song of Defense', color: 'blue', reduction: .15 }),
  power: Object.freeze({ label: 'Song of Power', color: 'gold', damageBonus: .2 }),
});
export function songPower(song, bards, strength = 1) {
  const selected = SONG_ORDER.includes(song) ? song : 'rally';
  const count = Math.max(0, Math.floor(bards));
  const multiplier = (count === 0 ? 0 : count >= 2 ? 1.5 : 1) * strength;
  const definition = SONGS[selected];
  return { song: selected,
    speedBonus: (definition.speedBonus ?? 0) * multiplier,
    reduction: Math.min(.9, (definition.reduction ?? 0) * multiplier),
    damageBonus: (definition.damageBonus ?? 0) * multiplier };
}
export function nextSong(song) { return SONG_ORDER[(SONG_ORDER.indexOf(song) + 1) % SONG_ORDER.length]; }
export function songEffectText(power) {
  const percent = value => Number((value * 100).toFixed(1));
  return power.song === 'rally' ? `+${percent(power.speedBonus)}% attack speed`
    : power.song === 'defense' ? `${percent(power.reduction)}% less damage`
      : `+${percent(power.damageBonus)}% damage & healing`;
}
// Remove old passive blessings once, preserving identity and wounds.
export function migrateBardSongs(state) {
  if (state.bardSongsVersion === 2) return;
  if (state.bardSongsVersion !== 1) for (const unit of state.party ?? []) {
    const buff = unit.bardBuffAmount ?? (unit.bardBuffPercent ?? 0) / 100;
    if (buff > 0) {
      const factor = 1 + buff;
      unit.power /= factor;
      if (unit.baseMaxHp !== undefined) unit.baseMaxHp /= factor;
      unit.maxHp /= factor;
      unit.hp = Math.min(unit.hp, unit.maxHp);
    }
    unit.bardBuffAmount = 0;
    unit.bardBuffPercent = 0;
  }
  state.bardSongsVersion = 2;
  state.bardNextSong = 'defense';
  state.bardActiveSong = 'rally';
  state.bardSongCooldownMs = (state.view === 'battle' && state.party?.some(h => h.type === 'bard' && h.hp > 0)) ? SONG_COOLDOWN_MS : 0;
  delete state.bardSongMs;
  delete state.bardSongPower;
  state.rallyMs = 0;
  state.rallySpeedBonus = 0;
}
