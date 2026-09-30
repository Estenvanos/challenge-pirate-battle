import { clearPendingSubmissions } from "../api/pendingSubmissions";
import { clearLastResult } from "../storage/lastResultStorage";
import { resetMockDb } from "./mockDb";
import {
  getScenario,
  resetScenario,
  SCENARIOS,
  selectScenario,
  type ScenarioId,
} from "./scenarios";

export function ScenarioPanel() {
  const current = getScenario();

  function handleReset() {
    resetMockDb();
    clearPendingSubmissions();
    clearLastResult();
    resetScenario();
  }

  return (
    <details className="scenario-panel">
      <summary>
        Network:{" "}
        <span className="scenario-panel__current">{SCENARIOS[current]}</span>
      </summary>
      <label className="scenario-panel__field">
        Mock API scenario
        <select
          value={current}
          onChange={(event) => selectScenario(event.target.value as ScenarioId)}
        >
          {Object.entries(SCENARIOS).map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <button type="button" onClick={handleReset}>
        Reset mock data
      </button>
      <p className="scenario-panel__note">
        Reset clears saved matches, pending submissions and the last result.
      </p>
    </details>
  );
}
