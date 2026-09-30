import { useEffect, useRef, type ReactNode } from "react";
import { Panel } from "./Panel";

interface ModalProps {
  labelledBy: string;
  describedBy?: string;
  onClose: () => void;
  children: ReactNode;
}

export function Modal({
  labelledBy,
  describedBy,
  onClose,
  children,
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    // showModal may focus the scroll panel on mobile; choose the primary action.
    dialog.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    return () => dialog.close();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className="modal"
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <Panel labelledBy={labelledBy}>{children}</Panel>
    </dialog>
  );
}
