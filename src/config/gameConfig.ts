// Valores de balanceamento do jogo. Sistemas leem daqui; nada de números mágicos.
import { createEnemyConfig, type DamageSprites } from "./enemies";
import type { GameOptions } from "./options";

export type { ShipMotion } from "./enemies";

const PLAYER = Object.freeze({
  /** Velocidade máxima para a frente (px/s). */
  maxSpeed: 210,
  /** Aceleração com a vela aberta (px/s²); ~0,66 s até a velocidade máxima. */
  acceleration: 320,
  /** Desaceleração sem vela (px/s²); ~0,9 s até parar. */
  drag: 240,
  /** Velocidade de giro (rad/s); igual parado ou em movimento. */
  turnSpeed: 2.5,
  /** Escala do sprite do navio; `radius` e `hullHalfLength` acompanham. */
  spriteScale: 1.35,
  /** Raio de colisão (px), ~meia largura do casco. */
  radius: 34,
  /** Meio comprimento do casco (px). */
  hullHalfLength: 67,
  /** Rotação inicial (rad); -π/2 aponta para cima. */
  initialRotation: -Math.PI / 2,
  maxHp: 100,
  /** Reparo: a cada `everyKills` inimigos destruídos por tiro, recupera `amount` de vida (até `maxHp`). */
  repair: Object.freeze({ everyKills: 3, amount: 10 }),
  /** Pirata preto: do intacto ao mais danificado, e o casco cinza ao afundar. */
  sprites: Object.freeze({
    stages: Object.freeze(["ship_2", "ship_8", "ship_14"] as const),
    destroyed: "ship_20",
  }) satisfies DamageSprites,
  weapons: Object.freeze({
    /** Canhão de proa: um projétil por disparo. */
    front: Object.freeze({
      cooldownSec: 0.45,
      shots: 1,
      speed: 720,
      range: 720,
      damage: 5.75,
    }),
    /** Bordada (bombordo ou boreste): projéteis paralelos; cada lado tem seu cooldown. */
    side: Object.freeze({
      cooldownSec: 1.2,
      shots: 3,
      speed: 620,
      range: 460,
      damage: 5.75,
    }),
    /** Distância entre os canhões de uma bordada, ao longo do casco (px). */
    shotSpacing: 32,
  }),
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
    minPlayerDistance: 700,
  }),
  /** Tipos de inimigo e a taxa de spawn de cada um: veja `enemies.ts`. */
  enemies: createEnemyConfig(PLAYER),
  /** Velocidade e alcance ficam em cada arma. */
  projectile: Object.freeze({ radius: 5 }),
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
