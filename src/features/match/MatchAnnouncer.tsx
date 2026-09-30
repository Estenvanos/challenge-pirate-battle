import { useGameSnapshot } from "../../game/bridge/useGameSnapshot";

// Marcos do tempo anunciados; entre eles o texto não muda, então nada é lido.
const TIME_MARKS_SEC = [10, 30, 60] as const;
const LOW_HEALTH_RATIO = 1 / 3;

function timeMessage(timeLeftSec: number | null): string | null {
  if (timeLeftSec === null || timeLeftSec <= 0) return null;
  const mark = TIME_MARKS_SEC.find((sec) => timeLeftSec <= sec);
  if (mark === undefined) return null;
  return mark === 60 ? "1 minute left" : `${mark} seconds left`;
}

// Região viva da partida: anuncia pontos, marcos de tempo e vida baixa, só
// quando o texto muda (nunca por quadro ou a cada segundo).
export function MatchAnnouncer() {
  const { hp, maxHp, score, timeLeftSec } = useGameSnapshot();
  const message = [
    `Score ${score}`,
    timeMessage(timeLeftSec),
    hp > 0 && hp / maxHp <= LOW_HEALTH_RATIO ? "Health low" : null,
  ]
    .filter(Boolean)
    .join(". ");
  return (
    <p className="visually-hidden" role="status" aria-atomic="true">
      {message}
    </p>
  );
}
