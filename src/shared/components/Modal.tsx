import { useEffect, useRef, type ReactNode } from "react";
import { Panel } from "./Panel";

interface ModalProps {
  labelledBy: string;
  describedBy?: string;
  onClose: () => void;
  children: ReactNode;
}

// Diálogo modal nativo: showModal() já prende o foco, torna o fundo inerte e devolve o foco ao fechar.
export function Modal({
  labelledBy,
  describedBy,
  onClose,
  children,
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    // Sincroniza o <dialog> nativo (API imperativa) com a montagem do componente.
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    // O showModal() foca o primeiro focável, que pode ser o painel rolável
    // (mobile); o foco inicial vai para o elemento marcado com autoFocus.
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
        // Esc: fecha pelo estado do React em vez do fechamento nativo.
        event.preventDefault();
        onClose();
      }}
    >
      <Panel labelledBy={labelledBy}>{children}</Panel>
    </dialog>
  );
}
