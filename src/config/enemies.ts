// Tipos de inimigo: movimento, taxa de spawn, vida, arma e aparência.
// Para criar ou rebalancear um inimigo, basta mexer aqui.

/** Modelo de barco (vela e leme), comum ao jogador e aos inimigos. */
export interface ShipMotion {
  /** Velocidade máxima para a frente (px/s). */
  readonly maxSpeed: number;
  /** Aceleração até a velocidade pedida (px/s²). */
  readonly acceleration: number;
  /** Desaceleração quando a velocidade pedida é menor que a atual (px/s²). */
  readonly drag: number;
  /** Velocidade de giro com o leme todo (rad/s); igual parado ou em movimento. */
  readonly turnSpeed: number;
  /** Raio de colisão (px), ~meia largura do casco. */
  readonly radius: number;
  /** Meio comprimento do casco (px): a colisão com ilhas cobre proa e popa. */
  readonly hullHalfLength: number;
}

/** Projétil de uma arma. */
export interface ProjectileSpec {
  /** Velocidade (px/s). */
  readonly speed: number;
  /** Distância máxima percorrida antes de cair na água (px). */
  readonly range: number;
  /** Vida que tira do navio atingido. */
  readonly damage: number;
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
  readonly projectile: ProjectileSpec;
}

export interface EnemySpec extends ShipMotion {
  /** Peso no sorteio do spawn, relativo à soma dos pesos de todos os tipos. */
  readonly spawnWeight: number;
  readonly maxHp: number;
  /** Escala do sprite; o `radius` deve acompanhar. */
  readonly spriteScale: number;
  readonly sprites: DamageSprites;
  /** Dano no jogador ao abalroá-lo; quem abalroa explode no impacto. */
  readonly ramDamage?: number;
  /** Quem tem arma mantém distância e atira; quem não tem persegue o jogador. */
  readonly weapon?: EnemyWeapon;
}

export type EnemyKind = "chaser" | "shooter" | "bigShooter";

/** Navio grande, em relação ao médio; com raio ~41 ele ainda passa em canais de um tile (128 px). */
const BIG_SCALE = 1.2;

const RED: DamageSprites = Object.freeze({
  stages: Object.freeze(["ship_3", "ship_9", "ship_15"] as const),
  destroyed: "ship_21",
});

const YELLOW: DamageSprites = Object.freeze({
  stages: Object.freeze(["ship_6", "ship_12", "ship_18"] as const),
  destroyed: "ship_24",
});

const BLUE: DamageSprites = Object.freeze({
  stages: Object.freeze(["ship_5", "ship_11", "ship_17"] as const),
  destroyed: "ship_23",
});

const WEAPON: EnemyWeapon = Object.freeze({
  keepDistance: 380,
  attackRange: 560,
  aimTolerance: 0.14,
  fireCooldownSec: 2.2,
  projectile: Object.freeze({ speed: 520, range: 620, damage: 5 }),
});

/** O navio grande atira mais fraco: compensa a vida maior. */
const BIG_WEAPON: EnemyWeapon = Object.freeze({
  ...WEAPON,
  projectile: Object.freeze({ ...WEAPON.projectile, damage: 4 }),
});

/** Recebe o navio do jogador porque os inimigos usam o mesmo casco. */
export function createEnemyConfig(
  player: ShipMotion & { readonly spriteScale: number },
) {
  // Navio médio: mesmo casco do jogador.
  const medium = {
    radius: player.radius,
    hullHalfLength: player.hullHalfLength,
    spriteScale: player.spriteScale,
  };
  // Mais lento que o jogador (210 px/s), mas rápido o bastante para alcançá-lo nas curvas.
  const chaserMotion = {
    maxSpeed: 150,
    acceleration: 225,
    drag: 225,
    turnSpeed: 2,
  };
  // O mais lento e o que gira menos: dá para fugir da mira dele.
  const shooterMotion = {
    maxSpeed: 125,
    acceleration: 187.5,
    drag: 187.5,
    turnSpeed: 1.7,
  };

  const biggerShooterMotion = {
    maxSpeed: 115,
    acceleration: 177.5,
    drag: 177.5,
    turnSpeed: 1.5,
  };

  const kinds: Readonly<Record<EnemyKind, EnemySpec>> = Object.freeze({
    /** Vermelho: persegue o jogador. */
    chaser: Object.freeze({
      ...medium,
      ...chaserMotion,
      spawnWeight: 0.2,
      maxHp: 15,
      sprites: RED,
      ramDamage: 10,
    }),
    /** Amarelo: mantém distância e atira. */
    shooter: Object.freeze({
      ...medium,
      ...shooterMotion,
      spawnWeight: 0.56,
      maxHp: 20,
      sprites: YELLOW,
      weapon: WEAPON,
    }),
    /** Azul grande: um Shooter com mais vida. */
    bigShooter: Object.freeze({
      ...medium,
      ...biggerShooterMotion,
      radius: player.radius * BIG_SCALE,
      hullHalfLength: player.hullHalfLength * BIG_SCALE,
      maxHp: 30,
      spriteScale: player.spriteScale * BIG_SCALE,
      spawnWeight: 0.24,
      sprites: BLUE,
      weapon: BIG_WEAPON,
    }),
  });

  return Object.freeze({
    /**
     * Erro de rumo (rad) em que a IA vira o leme todo; abaixo disso o giro é
     * proporcional, para o navio não ficar ziguezagueando sobre o alvo.
     */
    fullRudderAngle: 0.6,
    /** Fração mínima da velocidade em curva: o inimigo freia quanto mais desalinhado está do rumo. */
    minTurnThrottle: 0.3,
    /** Quantas células à frente no caminho a IA mira (contorno de ilhas). */
    pathLookahead: 2,
    kinds,
  });
}
