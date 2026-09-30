import { useState } from "react";
import type { GameOptions } from "../config/options";
import { CaptainsLog } from "../features/log/CaptainsLog";
import type { LogTab } from "../features/log/constants";
import { MatchScreen } from "../features/match/MatchScreen";
import { MainMenu } from "../features/menu/MainMenu";
import { OptionsScreen } from "../features/options/OptionsScreen";
import { PlayerNameDialog } from "../features/player/PlayerNameDialog";
import { readOptions, writeOptions } from "../storage/optionsStorage";
import { readPlayerName, writePlayerName } from "../storage/playerStorage";

// Máquina de telas simples: um refresh sempre volta ao menu, abandonando a partida.
type Screen =
  | { name: "menu" }
  | { name: "options" }
  | { name: "log"; tab: LogTab }
  | { name: "match"; config: Readonly<GameOptions>; playerName: string };

export function App() {
  const [screen, setScreen] = useState<Screen>({ name: "menu" });
  const [options, setOptions] = useState(readOptions);
  const [playerName, setPlayerName] = useState(readPlayerName);
  const [askingName, setAskingName] = useState(false);

  const goToMenu = () => setScreen({ name: "menu" });

  function changeOptions(next: GameOptions) {
    writeOptions(next);
    setOptions(next);
  }

  // Cada partida usa um snapshot congelado das opções vigentes.
  function startMatch(name: string) {
    setScreen({
      name: "match",
      config: Object.freeze({ ...options }),
      playerName: name,
    });
  }

  function handlePlay() {
    if (playerName) startMatch(playerName);
    else setAskingName(true);
  }

  function handleNameSubmit(name: string) {
    writePlayerName(name);
    setPlayerName(name);
    setAskingName(false);
    startMatch(name);
  }

  function renderScreen() {
    switch (screen.name) {
      case "menu":
        return (
          <MainMenu
            onPlay={handlePlay}
            onOptions={() => setScreen({ name: "options" })}
            onOpenLog={(tab) => setScreen({ name: "log", tab })}
          />
        );
      case "options":
        return (
          <OptionsScreen
            options={options}
            onChange={changeOptions}
            onBack={goToMenu}
          />
        );
      case "log":
        return (
          <CaptainsLog
            tab={screen.tab}
            options={options}
            playerName={playerName}
            onTabChange={(tab) => setScreen({ name: "log", tab })}
            onBack={goToMenu}
          />
        );
      case "match":
        return (
          <MatchScreen
            config={screen.config}
            playerName={screen.playerName}
            options={options}
            onOptionsChange={changeOptions}
            onExit={goToMenu}
          />
        );
    }
  }

  return (
    <main className="scene">
      {renderScreen()}
      {askingName && (
        <PlayerNameDialog
          onSubmit={handleNameSubmit}
          onCancel={() => setAskingName(false)}
        />
      )}
      <img
        className="scene__logo"
        src="/assets/logo_jungle_gaming.svg"
        alt="Jungle Gaming"
        width={124}
        height={62}
      />
    </main>
  );
}
