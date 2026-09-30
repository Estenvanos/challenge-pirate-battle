import { GAME_SOUND_URLS, GAME_SOUND_VOLUME } from "../../constants/audio";
import { isMuted } from "../../shared/audio/mute";

export type GameSound = keyof typeof GAME_SOUND_URLS;

// Originais pré-carregados uma vez por página e compartilhados entre partidas:
// criar um Audio por partida baixava tudo de novo (pelo service worker do MSW)
// e fazia a memória crescer a cada ciclo (docs/profiling).
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

/**
 * Toca os efeitos sonoros do jogo. Cada execução usa um clone do original,
 * para disparos seguidos se sobreporem em vez de cortar o som anterior.
 */
export class SoundManager {
  private readonly sources = getSources();
  private readonly playing = new Set<HTMLAudioElement>();
  private readonly nextVariant = new Map<GameSound, number>();

  play(sound: GameSound): void {
    if (isMuted()) return;
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
    // O navegador bloqueia áudio antes da primeira interação: ignora a rejeição.
    audio.play().catch(() => this.playing.delete(audio));
  }

  destroy(): void {
    for (const audio of this.playing) audio.pause();
    this.playing.clear();
  }
}
