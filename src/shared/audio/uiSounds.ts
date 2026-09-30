import type { MouseEvent, PointerEvent } from "react";
import { UI_SOUND_URLS, UI_SOUND_VOLUME } from "../../constants/audio";
import { isMuted } from "./mute";

// Sons de interface dos menus (fora da partida; os sons do jogo ficam no SoundManager).
export type UiSound = keyof typeof UI_SOUND_URLS;

const cache = new Map<UiSound, HTMLAudioElement>();

function getAudio(sound: UiSound): HTMLAudioElement {
  let audio = cache.get(sound);
  if (!audio) {
    audio = new Audio(UI_SOUND_URLS[sound]);
    audio.preload = "auto";
    audio.volume = UI_SOUND_VOLUME;
    cache.set(sound, audio);
  }
  return audio;
}

export function playUiSound(sound: UiSound): void {
  if (isMuted()) return;
  const audio = getAudio(sound);
  audio.currentTime = 0;
  // O navegador bloqueia áudio antes da primeira interação: ignora a rejeição.
  audio.play().catch(() => undefined);
}

interface SoundHandlers {
  disabled?: boolean;
  onPointerEnter?: (event: PointerEvent<HTMLButtonElement>) => void;
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
}

// Encadeia os sons de hover/clique com os handlers originais do botão.
export function withUiSounds<T extends SoundHandlers>(props: T): T {
  const { disabled, onPointerEnter, onClick } = props;
  return {
    ...props,
    onPointerEnter: (event: PointerEvent<HTMLButtonElement>) => {
      // Toque não tem hover: evita som duplo ao tocar.
      if (!disabled && event.pointerType === "mouse") playUiSound("hover");
      onPointerEnter?.(event);
    },
    onClick: (event: MouseEvent<HTMLButtonElement>) => {
      playUiSound("click");
      onClick?.(event);
    },
  };
}
