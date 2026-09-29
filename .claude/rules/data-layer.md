---
paths:
  - "src/api/**"
  - "src/mocks/**"
  - "src/storage/**"
---

# Data layer rules (Axios, TanStack Query, MSW, storage)

## Boundaries
- Axios is used only in `src/api/` through `httpClient.ts` (baseURL, timeout). Components never import Axios.
- TanStack Query is used only through hooks in `src/api/hooks` (`useRanking`, `useMatchHistory`, `useSubmitMatch`).
- Contracts (`MatchRecord`, `RankingEntry`, `Page<T>`, end reason, config used) live in `contracts.ts` and are shared by the client and MSW handlers.
- All query keys come from `queryKeys.ts` (factory functions, include page and config filters).

## Queries
- Handle loading, empty, error, background refetch (`isFetching`), retries with backoff. Refetch when tabs become visible again.
- Pagination with `placeholderData: keepPreviousData`.
- Out-of-order responses must never overwrite newer data: rely on query-key-scoped caching and abort signals (`signal` passed to Axios); never write query results into local state.
- Ranking compares matches with the **same configuration**, sorted by score with a deterministic tie-break (see ARCHITECTURE.md).

## Submission
- The client generates `matchId` when the match ends; the server upserts by `matchId` → resubmits and repeated clicks return the existing record (no duplicates in history or ranking).
- Before sending, persist the record in `pendingSubmissions.ts`; remove it only after confirmation. Pending records survive refresh and can be retried manually and automatically.
- After a successful submission, invalidate ranking and history queries.
- A pending submission never blocks starting another match.

## MSW
- Handlers, fixtures and scenarios are shared between dev, tests and the published build (the worker runs in production too).
- `mockDb.ts` persists confirmed records in `localStorage`; fixtures represent other players.
- Scenarios: success, empty, multi-page, slow, variable latency, out-of-order, timeout, network error, 4xx/5xx, ranking/history read failures, timeout-after-write, unavailable-at-match-end then recovery.
- Scenario selection and reset via `ScenarioPanel` (and a query/localStorage flag usable by Playwright). Latency and randomness must be controllable (seeded) in tests.

## Storage
- All `localStorage` access goes through `localStore.ts`: namespaced keys, versioned, `try/catch`, runtime validation of parsed data, safe fallback to defaults.
- Persisted: options, last completed result, pending submissions, mock DB, selected scenario.
