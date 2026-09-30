import { pngAsset } from "../../shared/utils/assets";
import { formatDuration } from "../../shared/utils/format";

// HUD do topo: por enquanto só visual, com valores fixos (pontuação zerada e o tempo
// cheio da sessão). Virão do useGameSnapshot quando a simulação tiver pontuação e timer.
export function Hud({ sessionTimeSec }: { sessionTimeSec: number }) {
  return (
    <dl className="hud">
      <Counter icon="score" label="Score" value="0" />
      <Counter
        icon="time"
        label="Time left"
        value={formatDuration(sessionTimeSec)}
      />
    </dl>
  );
}

function Counter({
  icon,
  label,
  value,
}: {
  icon: "score" | "time";
  label: string;
  value: string;
}) {
  const image = pngAsset(`ui/hud/icon_${icon}.png`);
  return (
    <div className="hud__counter">
      <img
        className="hud__icon"
        src={image.src}
        srcSet={image.srcSet}
        alt=""
        draggable={false}
      />
      <dt className="visually-hidden">{label}</dt>
      <dd className="hud__value">{value}</dd>
    </div>
  );
}
