import type { CSSProperties } from "react";
import { MenuButton } from "../../shared/components/MenuButton";
import { Panel } from "../../shared/components/Panel";
import { pngAsset } from "../../shared/utils/assets";

const title = pngAsset("ui/menu/title_pirate_battle.png");
const ship = pngAsset("ships/ship_2.png");

interface ArenaLoadingProps {
  progress: number | null;
  onRetry: () => void;
}

export function ArenaLoading({ progress, onRetry }: ArenaLoadingProps) {
  const percent = Math.round((progress ?? 0) * 100);
  return (
    <div className="arena-loading">
      <Panel>
        <p className="menu__title">
          <img
            src={title.src}
            srcSet={title.srcSet}
            alt="Pirate Battle"
            width={384}
            height={128}
          />
        </p>
        {progress === null ? (
          <div className="arena-loading__error" role="alert">
            <p className="modal__text">The arena could not be loaded.</p>
            <MenuButton size="sm" onClick={onRetry}>
              Retry
            </MenuButton>
          </div>
        ) : (
          <>
            <p className="menu__tagline" role="status">
              Charting the waters…
            </p>
            <div
              className="arena-loading__voyage"
              style={{ "--hp": progress } as CSSProperties}
            >
              <div className="arena-loading__sea">
                <span className="arena-loading__ship">
                  <img
                    src={ship.src}
                    srcSet={ship.srcSet}
                    alt=""
                    draggable={false}
                  />
                </span>
              </div>
              <div
                className="hud__bar"
                role="progressbar"
                aria-label="Loading arena"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={percent}
              >
                <span className="hud__fill" />
                <span className="hud__bar-value">{percent}%</span>
              </div>
            </div>
            <p className="menu__hint">
              A broadside fires three shots. Line them up.
            </p>
          </>
        )}
      </Panel>
    </div>
  );
}
