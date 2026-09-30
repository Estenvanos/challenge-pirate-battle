import { MenuButton } from "../../shared/components/MenuButton";

interface LogStateProps {
  isPending: boolean;
  isError: boolean;
  isEmpty: boolean;
  emptyMessage: string;
  errorMessage: string;
  onRetry: () => void;
}

export function LogState({
  isPending,
  isError,
  isEmpty,
  emptyMessage,
  errorMessage,
  onRetry,
}: LogStateProps) {
  if (isPending) {
    return (
      <p className="log-state" role="status">
        Loading…
      </p>
    );
  }
  if (isError) {
    return (
      <div className="log-state log-state--error" role="alert">
        <p>{errorMessage}</p>
        <MenuButton variant="secondary" size="sm" onClick={onRetry}>
          Try again
        </MenuButton>
      </div>
    );
  }
  if (isEmpty) {
    return <p className="log-state">{emptyMessage}</p>;
  }
  return null;
}
