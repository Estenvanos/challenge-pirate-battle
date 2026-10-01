import { useLayoutEffect, useRef, type ReactNode } from "react";
import { Panel } from "./Panel";

interface ModalProps {
  labelledBy: string;
  describedBy?: string;
  wide?: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function Modal({
  labelledBy,
  describedBy,
  wide = false,
  onClose,
  children,
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Syncs the native modal <dialog>. Layout cleanup runs while the dialog is
  // still attached, so close() returns focus to the element that opened it.
  useLayoutEffect(() => {
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
      className={wide ? "modal modal--wide" : "modal"}
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
