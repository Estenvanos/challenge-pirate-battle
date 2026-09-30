// Valores de balanceamento do jogo. Sistemas leem daqui; nada de números mágicos.
import type { GameOptions } from "./options";

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

/** Inimigos ~20% mais lentos que o jogador, com a mesma sensação de inércia. */
const ENEMY_SPEED_FACTOR = 0.8;

// Mesmo modelo de barco do jogador (vela, deriva e leme), em escala.
const ENEMY_MOTION = Object.freeze({
  maxSpeed: PLAYER.maxSpeed * ENEMY_SPEED_FACTOR,
  acceleration: PLAYER.acceleration * ENEMY_SPEED_FACTOR,
  drag: PLAYER.drag * ENEMY_SPEED_FACTOR,
  maxTurnSpeed: PLAYER.maxTurnSpeed,
  turnAcceleration: PLAYER.turnAcceleration,
  minRudder: PLAYER.minRudder,
  radius: PLAYER.radius,
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
    /** Chance de cada spawn ser Chaser; o resto é Shooter. */
    chaserChance: 0.6,
  }),
  enemies: Object.freeze({
    /**
     * Erro de rumo (rad) em que a IA vira o leme todo; abaixo disso o giro é
     * proporcional, para o navio não ficar ziguezagueando sobre o alvo.
     */
    fullRudderAngle: 0.6,
    /** Quantas células à frente no caminho a IA mira (contorno de ilhas). */
    pathLookahead: 2,
    chaser: ENEMY_MOTION,
    shooter: Object.freeze({
      ...ENEMY_MOTION,
      /** Recolhe a vela quando o jogador está mais perto que isso (px). */
      keepDistance: 240,
      /** Dispara só com o jogador dentro deste alcance (px). */
      attackRange: 340,
      /** Só dispara com a proa a até este ângulo do jogador (rad). */
      aimTolerance: 0.25,
      /** Intervalo entre disparos (s). */
      fireCooldownSec: 1.8,
    }),
  }),
  projectile: Object.freeze({
    /** Velocidade (px/s). */
    speed: 220,
    /** Distância máxima percorrida antes de sumir (px). */
    range: 400,
    radius: 5,
  }),
});

export type GameConfig = typeof GAME_CONFIG;

export type ShipMotion = typeof ENEMY_MOTION;

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
