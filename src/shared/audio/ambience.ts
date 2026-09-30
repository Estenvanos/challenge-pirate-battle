import { isMuted, subscribeMuted } from "./mute";

// Som de fundo do jogo inteiro: loop do mar mais um papagaio de vez em quando.
const OCEAN_URL = "/assets/sounds/ocean_ambience_loop.wav";
const PARROT_URLS = [
  "/assets/sounds/parrot_squawk_1.wav",
  "/assets/sounds/parrot_squawk_2.wav",
  "/assets/sounds/parrot_squawk_3.wav",
];

const OCEAN_VOLUME = 0.6;
const PARROT_VOLUME = 0.12;
const PARROT_MIN_GAP_MS = 15_000;
const PARROT_MAX_GAP_MS = 40_000;

/** Liga o som ambiente e devolve a função que o desliga. */
export function startAmbience(): () => void {
  const ocean = new Audio(OCEAN_URL);
  ocean.loop = true;
  ocean.volume = OCEAN_VOLUME;
  ocean.muted = isMuted();
  const unsubscribeMuted = subscribeMuted(() => (ocean.muted = isMuted()));

  const parrots = PARROT_URLS.map((url) => {
    const audio = new Audio(url);
    audio.volume = PARROT_VOLUME;
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
      PARROT_MIN_GAP_MS +
      Math.random() * (PARROT_MAX_GAP_MS - PARROT_MIN_GAP_MS);
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
