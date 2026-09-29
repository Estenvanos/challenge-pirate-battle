import { useState } from "react";
import { DEFAULT_PAGE_SIZE, type MatchConfig } from "../api/contracts";
import { useRanking } from "../hooks/useRanking";

// Placeholder até as telas de menu/ranking existirem: exercita a camada de dados de ponta a ponta.
const DEFAULT_CONFIG: MatchConfig = {
  sessionTimeSec: 120,
  spawnIntervalSec: 3,
};

export function App() {
  const [page, setPage] = useState(1);
  const ranking = useRanking({
    config: DEFAULT_CONFIG,
    page,
    pageSize: DEFAULT_PAGE_SIZE,
  });
  const totalPages = ranking.data?.totalPages ?? 1;

  return (
    <main>
      <h1>Pirate Battle</h1>
      <h2>Ranking</h2>
      {ranking.isPending && <p>Loading…</p>}
      {ranking.isError && <p role="alert">Could not load the ranking.</p>}
      {ranking.data && (
        <ol>
          {ranking.data.items.map((entry) => (
            <li key={entry.matchId} value={entry.position}>
              {entry.playerName} — {entry.score}
            </li>
          ))}
        </ol>
      )}
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => setPage((p) => p - 1)}
      >
        Previous
      </button>
      <span>
        {" "}
        Page {page} of {totalPages}
        {ranking.isFetching && " (updating…)"}{" "}
      </span>
      <button
        type="button"
        disabled={page >= totalPages}
        onClick={() => setPage((p) => p + 1)}
      >
        Next
      </button>
    </main>
  );
}
