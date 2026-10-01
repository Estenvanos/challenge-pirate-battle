import { GAME_SOUND_URLS, GAME_SOUND_VOLUME } from "../../constants/audio";

export type GameSound = keyof typeof GAME_SOUND_URLS;

// Share preloaded originals across matches; each play clones one for overlap.
let sources: Map<string, HTMLAudioElement> | null = null;

function getSources(): Map<string, HTMLAudioElement> {
  if (!sources) {
    sources = new Map();
    for (const url of Object.values(GAME_SOUND_URLS).flat()) {
      const audio = new Audio(url);
      audio.preload = "auto";
      sources.set(url, audio);
    }
  }
  return sources;
}

/** Owns active match sounds and stops them when the match ends. */
export class SoundManager {
  private readonly sources = getSources();
  private readonly playing = new Set<HTMLAudioElement>();
  private readonly nextVariant = new Map<GameSound, number>();

  /** The global mute lives in the UI; the game only asks before each sound. */
  constructor(private readonly isMuted: () => boolean) {}

  play(sound: GameSound): void {
    if (this.isMuted()) return;
    const variants = GAME_SOUND_URLS[sound];
    const index = this.nextVariant.get(sound) ?? 0;
    this.nextVariant.set(sound, (index + 1) % variants.length);
    const source = this.sources.get(variants[index]);
    if (!source) return;

    const audio = source.cloneNode() as HTMLAudioElement;
    audio.volume = GAME_SOUND_VOLUME;
    this.playing.add(audio);
    audio.addEventListener("ended", () => this.playing.delete(audio), {
      once: true,
    });
    audio.play().catch(() => this.playing.delete(audio));
  }

  destroy(): void {
    for (const audio of this.playing) audio.pause();
    this.playing.clear();
  }
}
