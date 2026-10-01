const SOUNDS_DIR = "/assets/sounds";

export const GAME_SOUND_URLS = {
  cannonFire: [
    `${SOUNDS_DIR}/cannon_fire_1.wav`,
    `${SOUNDS_DIR}/cannon_fire_2.wav`,
    `${SOUNDS_DIR}/cannon_fire_3.wav`,
  ],
  cannonBroadside: [`${SOUNDS_DIR}/cannon_broadside.wav`],
  woodHit: [
    `${SOUNDS_DIR}/ship_wood_hit_1.wav`,
    `${SOUNDS_DIR}/ship_wood_hit_2.wav`,
  ],
  shipExplosion: [
    `${SOUNDS_DIR}/ship_explosion_1.wav`,
    `${SOUNDS_DIR}/ship_explosion_2.wav`,
  ],
  shipSinking: [`${SOUNDS_DIR}/ship_sinking.wav`],
  gameOver: [`${SOUNDS_DIR}/game_over.wav`],
  gameComplete: [`${SOUNDS_DIR}/game_complete.wav`],
} as const;

export const GAME_SOUND_VOLUME = 0.5;
export const UI_SOUND_URLS = {
  hover: `${SOUNDS_DIR}/ui_hover.wav`,
  click: `${SOUNDS_DIR}/ui_click.wav`,
  open: `${SOUNDS_DIR}/ui_open.wav`,
  close: `${SOUNDS_DIR}/ui_close.wav`,
} as const;

export const UI_SOUND_VOLUME = 0.5;

export const AMBIENCE = Object.freeze({
  oceanUrl: `${SOUNDS_DIR}/ocean_ambience_loop.wav`,
  oceanVolume: 0.6,
  parrotUrls: [
    `${SOUNDS_DIR}/parrot_squawk_1.wav`,
    `${SOUNDS_DIR}/parrot_squawk_2.wav`,
    `${SOUNDS_DIR}/parrot_squawk_3.wav`,
  ],
  parrotVolume: 0.12,
  parrotMinGapMs: 15_000,
  parrotMaxGapMs: 40_000,
});
