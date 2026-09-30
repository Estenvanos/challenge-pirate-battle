import type { ReactNode } from "react";

interface PanelProps {
  children: ReactNode;
  wide?: boolean;
  labelledBy?: string;
}

export function Panel({ children, wide = false, labelledBy }: PanelProps) {
  return (
    <section
      className={wide ? "panel panel--wide" : "panel"}
      aria-labelledby={labelledBy}
    >
      <div className="panel__content">{children}</div>
    </section>
  );
}
