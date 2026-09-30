// Tipos de inimigo: movimento, taxa de spawn, vida, arma e aparência.
// Para criar ou rebalancear um inimigo, basta mexer aqui.

/** Modelo de barco (vela, deriva e leme), comum ao jogador e aos inimigos. */
export interface ShipMotion {
  /** Velocidade máxima para a frente (px/s). */
  readonly maxSpeed: number;
  /** Aceleração com a vela aberta (px/s²). */
  readonly acceleration: number;
  /** Desaceleração sem vela, à deriva (px/s²). */
  readonly drag: number;
  /** Velocidade de giro máxima, em velocidade máxima (rad/s). */
  readonly maxTurnSpeed: number;
  /** Quão rápido o leme muda a velocidade de giro (rad/s²). */
  readonly turnAcceleration: number;
  /** Fração do giro disponível com o navio parado. */
  readonly minRudder: number;
  /** Raio do círculo de colisão (px). */
  readonly radius: number;
}

/** Navio em png/<pasta>/ships/<nome>.png. */
export type ShipSprite = `ship_${number}`;

/** Aparência conforme a vida cai. */
export interface DamageSprites {
  /** Do intacto ao mais danificado, divididos igualmente pela vida. */
  readonly stages: readonly ShipSprite[];
  /** Casco cinza, mostrado quando a vida chega a 0. */
  readonly destroyed: ShipSprite;
}

export interface EnemyWeapon {
  /** Recolhe a vela quando o jogador está mais perto que isso (px). */
  readonly keepDistance: number;
  /** Dispara só com o jogador dentro deste alcance (px). */
  readonly attackRange: number;
  /** Só dispara com a proa a até este ângulo do jogador (rad). */
  readonly aimTolerance: number;
  /** Intervalo entre disparos (s). */
  readonly fireCooldownSec: number;
}

export interface EnemySpec extends ShipMotion {
  /** Peso no sorteio do spawn, relativo à soma dos pesos de todos os tipos. */
  readonly spawnWeight: number;
  readonly maxHp: number;
  /** Escala do sprite; o `radius` deve acompanhar. */
  readonly spriteScale: number;
  readonly sprites: DamageSprites;
  /** Quem tem arma mantém distância e atira; quem não tem persegue o jogador. */
  readonly weapon?: EnemyWeapon;
}

export type EnemyKind = "chaser" | "shooter" | "bigShooter";

/** Inimigos ~20% mais lentos que o jogador, com a mesma sensação de inércia. */
const SPEED_FACTOR = 0.8;

/** Escala do navio grande; com raio ~31 ele ainda passa em canais de um tile (64 px). */
const BIG_SCALE = 1.2;

const RED: DamageSprites = Object.freeze({
  stages: Object.freeze(["ship_3", "ship_9", "ship_15"] as const),
  destroyed: "ship_21",
});

const YELLOW: DamageSprites = Object.freeze({
  stages: Object.freeze(["ship_6", "ship_12", "ship_18"] as const),
  destroyed: "ship_24",
});

const WEAPON: EnemyWeapon = Object.freeze({
  keepDistance: 240,
  attackRange: 340,
  aimTolerance: 0.25,
  fireCooldownSec: 1.8,
});

/** Recebe o navio do jogador porque os inimigos usam o mesmo modelo, em escala. */
export function createEnemyConfig(player: ShipMotion) {
  // Navio médio: mesmo casco do jogador.
  const medium = {
    maxSpeed: player.maxSpeed * SPEED_FACTOR,
    acceleration: player.acceleration * SPEED_FACTOR,
    drag: player.drag * SPEED_FACTOR,
    maxTurnSpeed: player.maxTurnSpeed,
    turnAcceleration: player.turnAcceleration,
    minRudder: player.minRudder,
    radius: player.radius,
    maxHp: 3,
    spriteScale: 1,
  };

  const kinds: Readonly<Record<EnemyKind, EnemySpec>> = Object.freeze({
    /** Vermelho: persegue o jogador. */
    chaser: Object.freeze({ ...medium, spawnWeight: 0.5, sprites: RED }),
    /** Amarelo: mantém distância e atira. */
    shooter: Object.freeze({
      ...medium,
      spawnWeight: 0.35,
      sprites: YELLOW,
      weapon: WEAPON,
    }),
    /** Amarelo grande: um Shooter com mais vida. */
    bigShooter: Object.freeze({
      ...medium,
      radius: player.radius * BIG_SCALE,
      maxHp: 6,
      spriteScale: BIG_SCALE,
      spawnWeight: 0.15,
      sprites: YELLOW,
      weapon: WEAPON,
    }),
  });

  return Object.freeze({
    /**
     * Erro de rumo (rad) em que a IA vira o leme todo; abaixo disso o giro é
     * proporcional, para o navio não ficar ziguezagueando sobre o alvo.
     */
    fullRudderAngle: 0.6,
    /** Quantas células à frente no caminho a IA mira (contorno de ilhas). */
    pathLookahead: 2,
    kinds,
  });
}
