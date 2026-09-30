import { pngAsset } from "../../shared/utils/assets";
import { formatDuration } from "../../shared/utils/format";

// HUD do topo: por enquanto só visual, com valores fixos (pontuação zerada, o tempo
// cheio da sessão e a vida cheia). Virão do useGameSnapshot quando a simulação tiver
// pontuação, timer e dano.
export function Hud({ sessionTimeSec }: { sessionTimeSec: number }) {
  const heart = pngAsset("ui/hud/icon_heart.png");
  return (
    <dl className="hud">
      <Counter icon="score" label="Score" value="0" />
      <Counter
        icon="time"
        label="Time left"
        value={formatDuration(sessionTimeSec)}
      />
      <div className="hud__health">
        <img
          className="hud__heart"
          src={heart.src}
          srcSet={heart.srcSet}
          alt=""
          draggable={false}
        />
        <dt className="visually-hidden">Health</dt>
        <dd className="hud__bar">
          <span className="hud__fill" />
          <span className="hud__bar-value">100 / 100</span>
        </dd>
      </div>
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
