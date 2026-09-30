import { useRef, type KeyboardEvent } from "react";
import type { GameOptions } from "../../config/options";
import { MenuButton } from "../../shared/components/MenuButton";
import { Panel } from "../../shared/components/Panel";
import { HistoryTable } from "../history/HistoryTable";
import { RankingTable } from "../ranking/RankingTable";
import { LOG_TABS, type LogTab } from "../../constants/ui";

interface CaptainsLogProps {
  tab: LogTab;
  options: GameOptions;
  playerName: string | null;
  onTabChange: (tab: LogTab) => void;
  onBack: () => void;
}

export function CaptainsLog({
  tab,
  options,
  playerName,
  onTabChange,
  onBack,
}: CaptainsLogProps) {
  const tabRefs = useRef<Partial<Record<LogTab, HTMLButtonElement | null>>>({});

  // Setas alternam entre as abas (padrão WAI-ARIA de tabs).
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const index = LOG_TABS.findIndex((t) => t.id === tab);
    const offset = event.key === "ArrowRight" ? 1 : -1;
    const next =
      LOG_TABS[(index + offset + LOG_TABS.length) % LOG_TABS.length].id;
    onTabChange(next);
    tabRefs.current[next]?.focus();
  }

  return (
    <Panel wide labelledBy="log-title">
      <h1 id="log-title" className="panel__title">
        Captain&apos;s Log
      </h1>
      <div
        className="log__tabs"
        role="tablist"
        aria-label="Captain's Log sections"
        onKeyDown={handleKeyDown}
      >
        {LOG_TABS.map(({ id, label }) => {
          const selected = id === tab;
          return (
            <MenuButton
              key={id}
              ref={(node) => {
                tabRefs.current[id] = node;
              }}
              id={`log-tab-${id}`}
              role="tab"
              size="sm"
              variant={selected ? "primary" : "secondary"}
              aria-selected={selected}
              aria-controls="log-panel"
              tabIndex={selected ? 0 : -1}
              onClick={() => onTabChange(id)}
            >
              {label}
            </MenuButton>
          );
        })}
      </div>
      <div
        id="log-panel"
        className="log__panel"
        role="tabpanel"
        aria-labelledby={`log-tab-${tab}`}
      >
        {tab === "ranking" ? (
          <RankingTable
            key={`${options.sessionTimeSec}-${options.spawnIntervalSec}`}
            options={options}
          />
        ) : (
          <HistoryTable playerName={playerName} />
        )}
      </div>
      <MenuButton onClick={onBack}>Main Menu</MenuButton>
    </Panel>
  );
}
