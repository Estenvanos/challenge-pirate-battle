import type { CSSProperties } from "react";
import { useGameSnapshot } from "../../hooks/useGameSnapshot";
import { pngAsset } from "../../shared/utils/assets";
import { formatDuration } from "../../shared/utils/format";

function healthLevel(ratio: number): "full" | "mid" | "low" {
  if (ratio <= 1 / 3) return "low";
  return ratio <= 2 / 3 ? "mid" : "full";
}

export function Hud({ sessionTimeSec }: { sessionTimeSec: number }) {
  const { hp, maxHp, score, timeLeftSec } = useGameSnapshot();
  const ratio = hp / maxHp;
  const heart = pngAsset("ui/hud/icon_heart.png");
  return (
    <dl className="hud">
      <Counter icon="score" label="Score" value={String(score)} />
      <Counter
        icon="time"
        label="Time left"
        value={formatDuration(timeLeftSec ?? sessionTimeSec)}
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
          <span
            className={`hud__fill hud__fill--${healthLevel(ratio)}`}
            style={{ "--hp": ratio } as CSSProperties}
          />
          <span className="hud__bar-value">
            {hp} / {maxHp}
          </span>
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
