import type { GameOptions } from "../../config/options";
import { MenuButton } from "../../shared/components/MenuButton";
import { GameCanvas } from "./GameCanvas";
import { TouchControls } from "./TouchControls";

interface MatchScreenProps {
  config: Readonly<GameOptions>;
  playerName: string;
  onExit: () => void;
}

// Tela da partida: arena com o navio do jogador; HUD e combate virão depois.
export function MatchScreen({ config, playerName, onExit }: MatchScreenProps) {
  return (
    <section className="match" aria-labelledby="match-title">
      <h1 id="match-title" className="visually-hidden">
        Battle — {playerName}, {config.sessionTimeSec} s session,{" "}
        {config.spawnIntervalSec} s enemy spawn
      </h1>
      <GameCanvas />
      <TouchControls />
      <div className="match__bar">
        <MenuButton size="sm" variant="secondary" onClick={onExit}>
          Main Menu
        </MenuButton>
      </div>
    </section>
  );
}
