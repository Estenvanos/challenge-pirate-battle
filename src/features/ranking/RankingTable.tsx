import { useState } from "react";
import type { GameOptions } from "../../config/options";
import { LOCAL_PLAYER_ID } from "../../config/player";
import { useRanking } from "../../hooks/useRanking";
import { Pagination } from "../../shared/components/Pagination";
import { formatLogDate } from "../../shared/utils/format";
import { LogState } from "../log/LogState";
import { LOG_PAGE_SIZE } from "../log/constants";

interface RankingTableProps {
  options: GameOptions;
}

export function RankingTable({ options }: RankingTableProps) {
  const [page, setPage] = useState(1);
  const ranking = useRanking({
    config: options,
    page,
    pageSize: LOG_PAGE_SIZE,
  });
  const items = ranking.data?.items ?? [];

  return (
    <>
      <p className="log__subtitle">
        {options.sessionTimeSec} second battles · {options.spawnIntervalSec}{" "}
        second spawn interval
      </p>
      <LogState
        isPending={ranking.isPending}
        isError={ranking.isError && !ranking.data}
        isEmpty={ranking.isSuccess && items.length === 0}
        emptyMessage="No battles recorded with these options yet."
        errorMessage="Could not load the ranking."
        onRetry={() => void ranking.refetch()}
      />
      {items.length > 0 && (
        <table className="log-table">
          <caption className="visually-hidden">
            Ranking for {options.sessionTimeSec} second battles with a{" "}
            {options.spawnIntervalSec} second spawn interval
          </caption>
          <thead>
            <tr>
              <th scope="col">Rank</th>
              <th scope="col">Captain</th>
              <th scope="col">Points</th>
              <th scope="col">Played</th>
            </tr>
          </thead>
          <tbody>
            {items.map((entry) => {
              const isYou = entry.playerId === LOCAL_PLAYER_ID;
              return (
                <tr
                  key={entry.matchId}
                  className={isYou ? "log-table__row--you" : undefined}
                >
                  <td className="log-table__accent">
                    {String(entry.position).padStart(2, "0")}
                  </td>
                  <td className="log-table__name">
                    {entry.playerName}
                    {isYou && <span className="badge">You</span>}
                  </td>
                  <td className="log-table__accent">{entry.score}</td>
                  <td className="log-table__muted">
                    {formatLogDate(entry.date)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      {ranking.data && ranking.data.totalItems > 0 && (
        <Pagination
          page={page}
          totalPages={ranking.data.totalPages}
          isUpdating={ranking.isFetching}
          onPageChange={setPage}
        />
      )}
    </>
  );
}
