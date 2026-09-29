import { RoundButton } from "./RoundButton";

interface PaginationProps {
  page: number;
  totalPages: number;
  isUpdating: boolean;
  onPageChange: (page: number) => void;
}

export function Pagination({
  page,
  totalPages,
  isUpdating,
  onPageChange,
}: PaginationProps) {
  const lastPage = Math.max(1, totalPages);
  return (
    <nav className="pagination" aria-label="Pagination">
      <RoundButton
        icon="turn_left"
        label="Previous page"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      />
      <span className="pagination__label" aria-live="polite">
        Page {page} of {lastPage}
        {isUpdating && (
          <span className="pagination__updating"> · updating…</span>
        )}
      </span>
      <RoundButton
        icon="turn_right"
        label="Next page"
        disabled={page >= lastPage}
        onClick={() => onPageChange(page + 1)}
      />
    </nav>
  );
}
