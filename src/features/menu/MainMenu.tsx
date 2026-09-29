import { MenuButton } from "../../shared/components/MenuButton";
import { Panel } from "../../shared/components/Panel";
import { pngAsset } from "../../shared/utils/assets";
import type { LogTab } from "../log/constants";

interface MainMenuProps {
  onPlay: () => void;
  onOptions: () => void;
  onOpenLog: (tab: LogTab) => void;
}

const title = pngAsset("ui/menu/title_pirate_battle.png");
const ship = pngAsset("ships/ship_2.png");

export function MainMenu({ onPlay, onOptions, onOpenLog }: MainMenuProps) {
  return (
    <Panel labelledBy="menu-title">
      <h1 id="menu-title" className="menu__title">
        <img
          src={title.src}
          srcSet={title.srcSet}
          alt="Pirate Battle"
          width={384}
          height={128}
        />
      </h1>
      <p className="menu__tagline">Set sail. Take command.</p>
      <div className="menu__actions">
        <MenuButton onClick={onPlay}>Play</MenuButton>
        <MenuButton onClick={onOptions}>Options</MenuButton>
      </div>
      <img
        className="menu__ship"
        src={ship.src}
        srcSet={ship.srcSet}
        alt=""
        width={66}
        height={113}
      />
      <p className="menu__hint">Navigate the islands. Survive the battle.</p>
      <div className="menu__log-actions">
        <MenuButton
          variant="secondary"
          size="sm"
          onClick={() => onOpenLog("ranking")}
        >
          Ranking
        </MenuButton>
        <MenuButton
          variant="secondary"
          size="sm"
          onClick={() => onOpenLog("history")}
        >
          Match History
        </MenuButton>
      </div>
    </Panel>
  );
}
