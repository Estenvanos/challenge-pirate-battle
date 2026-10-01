import { useState } from "react";
import { clearPendingSubmissions } from "../api/pendingSubmissions";
import { withUiSounds } from "../shared/audio/uiSounds";
import { MenuButton } from "../shared/components/MenuButton";
import { Modal } from "../shared/components/Modal";
import { pngAsset } from "../shared/utils/assets";
import { clearLastResult } from "../storage/lastResultStorage";
import { resetMockDb } from "./mockDb";
import {
  getScenario,
  resetScenario,
  SCENARIOS,
  selectScenario,
  type ScenarioId,
} from "./scenarios";

const icon = pngAsset("ui/controls/icon_settings.png");

// Menu sections in declaration order.
const GROUPS = new Map<string, ScenarioId[]>();
for (const id of Object.keys(SCENARIOS) as ScenarioId[]) {
  const { group } = SCENARIOS[id];
  GROUPS.set(group, [...(GROUPS.get(group) ?? []), id]);
}

export function ScenarioPanel() {
  const [open, setOpen] = useState(false);
  const current = getScenario();

  function handleReset() {
    resetMockDb();
    clearPendingSubmissions();
    clearLastResult();
    resetScenario();
  }

  return (
    <>
      <button
        type="button"
        className="network-chip"
        aria-haspopup="dialog"
        aria-label={`Network scenario: ${SCENARIOS[current].label}`}
        {...withUiSounds({ onClick: () => setOpen(true) })}
      >
        <img
          className="network-chip__icon"
          src={icon.src}
          srcSet={icon.srcSet}
          alt=""
          draggable={false}
        />
        <span className="network-chip__label">Network</span>
        <span className="network-chip__value">{SCENARIOS[current].label}</span>
      </button>
      {open && (
        <Modal
          wide
          labelledBy="network-title"
          describedBy="network-desc"
          onClose={() => setOpen(false)}
        >
          <h2 id="network-title" className="panel__title">
            Network
          </h2>
          <p id="network-desc" className="modal__text">
            Mock conditions for the ranking and history APIs. Choosing one
            reloads the page; Reset also clears saved matches, pending saves and
            the last result.
          </p>
          <div className="network-menu">
            {[...GROUPS].map(([group, ids]) => (
              <section key={group} className="network-menu__group">
                <h3 className="network-menu__heading">{group}</h3>
                <ul className="network-menu__list">
                  {ids.map((id) => (
                    <li key={id}>
                      <ScenarioOption id={id} active={id === current} />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
          <div className="network-menu__actions">
            <MenuButton variant="secondary" size="sm" onClick={handleReset}>
              Reset mock data
            </MenuButton>
            <MenuButton size="sm" onClick={() => setOpen(false)}>
              Close
            </MenuButton>
          </div>
        </Modal>
      )}
    </>
  );
}

function ScenarioOption({ id, active }: { id: ScenarioId; active: boolean }) {
  const { label, description } = SCENARIOS[id];
  return (
    <button
      type="button"
      className="network-option"
      aria-current={active || undefined}
      aria-labelledby={`network-${id}`}
      aria-describedby={`network-${id}-desc`}
      // Start keyboard focus on the scenario in use.
      autoFocus={active}
      data-autofocus={active || undefined}
      {...withUiSounds({ onClick: () => active || selectScenario(id) })}
    >
      <span className="network-option__title">
        <span id={`network-${id}`}>{label}</span>
        {active && <span className="badge">Active</span>}
      </span>
      <span id={`network-${id}-desc`} className="network-option__desc">
        {description}
      </span>
    </button>
  );
}
