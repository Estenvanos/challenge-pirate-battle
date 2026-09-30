// Valores de balanceamento do jogo. Sistemas leem daqui; nada de números mágicos.
import { createEnemyConfig } from "./enemies";
import type { GameOptions } from "./options";

export type { ShipMotion } from "./enemies";

const PLAYER = Object.freeze({
  /** Velocidade máxima para a frente (px/s). */
  maxSpeed: 75,
  /** Aceleração com a vela aberta (px/s²); ~1,9 s até a velocidade máxima. */
  acceleration: 40,
  /** Desaceleração sem vela, à deriva (px/s²); ~3 s até parar. */
  drag: 25,
  /** Velocidade de giro máxima, em velocidade máxima (rad/s). */
  maxTurnSpeed: 1.1,
  /** Quão rápido o leme muda a velocidade de giro (rad/s²). */
  turnAcceleration: 2.2,
  /** Fração do giro disponível com o navio parado (o leme precisa de água passando). */
  minRudder: 0.3,
  /** Raio do círculo de colisão (px), ~meia largura do casco. */
  radius: 26,
  /** Rotação inicial (rad); -π/2 aponta para cima. */
  initialRotation: -Math.PI / 2,
});

export const GAME_CONFIG = Object.freeze({
  loop: Object.freeze({
    /** Passo fixo da simulação (s). */
    stepSec: 1 / 60,
    /** Maior delta de quadro aceito (s); evita avalanche de passos após travadas. */
    maxFrameDeltaSec: 0.25,
  }),
  player: PLAYER,
  spawn: Object.freeze({
    /** Distância mínima (px) do ponto de spawn até o jogador. */
    minPlayerDistance: 360,
  }),
  /** Tipos de inimigo e a taxa de spawn de cada um: veja `enemies.ts`. */
  enemies: createEnemyConfig(PLAYER),
  projectile: Object.freeze({
    /** Velocidade (px/s). */
    speed: 220,
    /** Distância máxima percorrida antes de sumir (px). */
    range: 400,
    radius: 5,
  }),
});

export type GameConfig = typeof GAME_CONFIG;

/**
 * Snapshot congelado de uma partida: config + opções do jogador. Mudanças
 * posteriores só valem para a próxima partida.
 */
export function createMatchConfig(options: Readonly<GameOptions>) {
  return Object.freeze({
    ...GAME_CONFIG,
    sessionTimeSec: options.sessionTimeSec,
    spawn: Object.freeze({
      ...GAME_CONFIG.spawn,
      /** Intervalo entre spawns (s), da tela Options. */
      intervalSec: options.spawnIntervalSec,
    }),
  });
}

export type MatchConfig = ReturnType<typeof createMatchConfig>;
