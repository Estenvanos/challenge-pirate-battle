import { isMuted } from "../../shared/audio/mute";

// Sons da partida. Cada som pode ter variações, tocadas em rodízio.
const SOUNDS = {
  cannonFire: [
    "/assets/sounds/cannon_fire_1.wav",
    "/assets/sounds/cannon_fire_2.wav",
    "/assets/sounds/cannon_fire_3.wav",
  ],
  cannonBroadside: ["/assets/sounds/cannon_broadside.wav"],
  woodHit: [
    "/assets/sounds/ship_wood_hit_1.wav",
    "/assets/sounds/ship_wood_hit_2.wav",
  ],
  shipExplosion: [
    "/assets/sounds/ship_explosion_1.wav",
    "/assets/sounds/ship_explosion_2.wav",
  ],
  shipSinking: ["/assets/sounds/ship_sinking.wav"],
  gameOver: ["/assets/sounds/game_over.wav"],
  gameComplete: ["/assets/sounds/game_complete.wav"],
} as const;

export type GameSound = keyof typeof SOUNDS;

const VOLUME = 0.5;

/**
 * Toca os efeitos sonoros do jogo. Os arquivos são pré-carregados uma vez; cada
 * execução usa um clone, para disparos seguidos se sobreporem em vez de cortar
 * o som anterior.
 */
export class SoundManager {
  private readonly sources = new Map<string, HTMLAudioElement>();
  private readonly playing = new Set<HTMLAudioElement>();
  private readonly nextVariant = new Map<GameSound, number>();

  constructor() {
    for (const url of Object.values(SOUNDS).flat()) {
      const audio = new Audio(url);
      audio.preload = "auto";
      this.sources.set(url, audio);
    }
  }

  play(sound: GameSound): void {
    if (isMuted()) return;
    const variants = SOUNDS[sound];
    const index = this.nextVariant.get(sound) ?? 0;
    this.nextVariant.set(sound, (index + 1) % variants.length);
    const source = this.sources.get(variants[index]);
    if (!source) return;

    const audio = source.cloneNode() as HTMLAudioElement;
    audio.volume = VOLUME;
    this.playing.add(audio);
    audio.addEventListener("ended", () => this.playing.delete(audio), {
      once: true,
    });
    // O navegador bloqueia áudio antes da primeira interação: ignora a rejeição.
    audio.play().catch(() => this.playing.delete(audio));
  }

  destroy(): void {
    for (const audio of this.playing) audio.pause();
    this.playing.clear();
    this.sources.clear();
  }
}
