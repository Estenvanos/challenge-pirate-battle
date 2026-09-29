import type { EndReason } from "../../api/contracts";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "2-digit",
  month: "short",
});
const timeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** "08 SEP · 21:42" no fuso local. */
export function formatLogDate(iso: string): string {
  const date = new Date(iso);
  const parts = dateFormatter.formatToParts(date);
  const day = parts.find((p) => p.type === "day")?.value ?? "";
  const month = parts.find((p) => p.type === "month")?.value ?? "";
  return `${day} ${month.toUpperCase()} · ${timeFormatter.format(date)}`;
}

/** Segundos para "mm:ss". */
export function formatDuration(totalSec: number): string {
  const sec = Math.max(0, Math.round(totalSec));
  const minutes = String(Math.floor(sec / 60)).padStart(2, "0");
  const seconds = String(sec % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

const END_REASON_LABELS: Record<EndReason, string> = {
  timeUp: "Time up",
  playerDestroyed: "Defeated",
};

export function formatEndReason(reason: EndReason): string {
  return END_REASON_LABELS[reason];
}
