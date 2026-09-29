import type { GameOptions } from "../../config/options";
import { MenuButton } from "../../shared/components/MenuButton";
import { Panel } from "../../shared/components/Panel";

interface MatchScreenProps {
  config: Readonly<GameOptions>;
  playerName: string;
  onExit: () => void;
}

// Placeholder da partida: o GameCanvas (PixiJS) será montado aqui.
export function MatchScreen({ config, playerName, onExit }: MatchScreenProps) {
  return (
    <Panel labelledBy="match-title">
      <h1 id="match-title" className="panel__title">
        Battle
      </h1>
      <p className="match__status" role="status">
        Match started
      </p>
      <p className="match__note">Good luck, {playerName}!</p>
      <dl className="match__config">
        <div>
          <dt>Session time</dt>
          <dd>{config.sessionTimeSec} s</dd>
        </div>
        <div>
          <dt>Enemy spawn time</dt>
          <dd>{config.spawnIntervalSec} s</dd>
        </div>
      </dl>
      <p className="match__note">The combat arena is coming soon.</p>
      <MenuButton onClick={onExit}>Main Menu</MenuButton>
    </Panel>
  );
}
