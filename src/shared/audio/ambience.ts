import { AMBIENCE } from "../../constants/audio";
import { isMuted, subscribeMuted } from "./mute";

// Som de fundo do jogo inteiro: loop do mar mais um papagaio de vez em quando.

/** Liga o som ambiente e devolve a função que o desliga. */
export function startAmbience(): () => void {
  const ocean = new Audio(AMBIENCE.oceanUrl);
  ocean.loop = true;
  ocean.volume = AMBIENCE.oceanVolume;
  ocean.muted = isMuted();
  const unsubscribeMuted = subscribeMuted(() => (ocean.muted = isMuted()));

  const parrots = AMBIENCE.parrotUrls.map((url) => {
    const audio = new Audio(url);
    audio.volume = AMBIENCE.parrotVolume;
    return audio;
  });

  // O navegador bloqueia áudio antes da primeira interação: tenta a cada gesto
  // (play() em um áudio que já toca não faz nada) e ignora a rejeição.
  const resume = () => {
    if (!document.hidden) ocean.play().catch(() => undefined);
  };
  const onVisibilityChange = () => {
    if (document.hidden) ocean.pause();
    else resume();
  };

  let parrotTimer = 0;
  const scheduleParrot = () => {
    const gap =
      AMBIENCE.parrotMinGapMs +
      Math.random() * (AMBIENCE.parrotMaxGapMs - AMBIENCE.parrotMinGapMs);
    parrotTimer = window.setTimeout(() => {
      // Só canta junto com o mar (aba visível e áudio já liberado).
      if (!ocean.paused && !isMuted()) {
        const parrot = parrots[Math.floor(Math.random() * parrots.length)];
        parrot.play().catch(() => undefined);
      }
      scheduleParrot();
    }, gap);
  };

  resume();
  scheduleParrot();
  window.addEventListener("pointerdown", resume);
  window.addEventListener("keydown", resume);
  document.addEventListener("visibilitychange", onVisibilityChange);

  return () => {
    unsubscribeMuted();
    window.clearTimeout(parrotTimer);
    window.removeEventListener("pointerdown", resume);
    window.removeEventListener("keydown", resume);
    document.removeEventListener("visibilitychange", onVisibilityChange);
    ocean.pause();
    for (const parrot of parrots) parrot.pause();
  };
}
