import { useState } from "react";
import { LOCAL_PLAYER_ID } from "../../config/player";
import { useMatchHistory } from "../../hooks/useMatchHistory";
import { Pagination } from "../../shared/components/Pagination";
import {
  formatDuration,
  formatEndReason,
  formatLogDate,
} from "../../shared/utils/format";
import { LogState } from "../log/LogState";
import { LOG_PAGE_SIZE } from "../log/constants";

interface HistoryTableProps {
  playerName: string | null;
}

export function HistoryTable({ playerName }: HistoryTableProps) {
  const [page, setPage] = useState(1);
  const history = useMatchHistory({
    playerId: LOCAL_PLAYER_ID,
    page,
    pageSize: LOG_PAGE_SIZE,
  });
  const items = history.data?.items ?? [];

  return (
    <>
      <p className="log__subtitle">
        {playerName ? `${playerName} · ` : ""}Your recent battles
      </p>
      <LogState
        isPending={history.isPending}
        isError={history.isError && !history.data}
        isEmpty={history.isSuccess && items.length === 0}
        emptyMessage="No battles yet. Set sail!"
        errorMessage="Could not load your match history."
        onRetry={() => void history.refetch()}
      />
      {items.length > 0 && (
        <table className="log-table">
          <caption className="visually-hidden">Your match history</caption>
          <thead>
            <tr>
              <th scope="col">Date</th>
              <th scope="col">Points</th>
              <th scope="col">Duration</th>
              <th scope="col">Result</th>
            </tr>
          </thead>
          <tbody>
            {items.map((match) => (
              <tr key={match.matchId}>
                <td>{formatLogDate(match.date)}</td>
                <td className="log-table__accent">{match.score}</td>
                <td>{formatDuration(match.durationSec)}</td>
                <td
                  className={
                    match.endReason === "timeUp"
                      ? "log-table__result--time"
                      : "log-table__result--defeat"
                  }
                >
                  {formatEndReason(match.endReason)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {history.data && history.data.totalItems > 0 && (
        <Pagination
          page={page}
          totalPages={history.data.totalPages}
          isUpdating={history.isFetching}
          onPageChange={setPage}
        />
      )}
    </>
  );
}
