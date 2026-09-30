import { END_REASON_LABELS } from "../../constants/ui";
import type { EndReason } from "../../schemas/match";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "2-digit",
  month: "short",
});
const timeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export function formatLogDate(iso: string): string {
  const date = new Date(iso);
  const parts = dateFormatter.formatToParts(date);
  const day = parts.find((p) => p.type === "day")?.value ?? "";
  const month = parts.find((p) => p.type === "month")?.value ?? "";
  return `${day} ${month.toUpperCase()} · ${timeFormatter.format(date)}`;
}

export function formatDuration(totalSec: number): string {
  const sec = Math.max(0, Math.round(totalSec));
  const minutes = String(Math.floor(sec / 60)).padStart(2, "0");
  const seconds = String(sec % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function formatEndReason(reason: EndReason): string {
  return END_REASON_LABELS[reason];
}
