"use client";
import { useEffect, useRef, type ReactNode } from "react";
import styles from "./Modal.module.css";

export type ModalVariant = "panel" | "narrow" | "map" | "booking";

interface Props {
  open: boolean;
  onClose: () => void;
  /** Accessible name, read out when the dialog opens. */
  label: string;
  variant?: ModalVariant;
  children: ReactNode;
}

/**
 * Full-screen popup built on the native <dialog> element, so focus is trapped,
 * Escape closes it and the page behind is inert.
 */
export function Modal({ open, onClose, label, variant = "panel", children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      document.documentElement.classList.add(styles.lock);
    } else if (!open && dialog.open) {
      dialog.close();
    }
    return () => document.documentElement.classList.remove(styles.lock);
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={`${styles.dialog} ${styles[variant]}`}
      aria-label={label}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      // A click on the dialog element itself (not its content) is a click on the backdrop area.
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {open && (
        <div className={styles.frame} onClick={(e) => e.target === e.currentTarget && onClose()}>
          <div className={styles.card}>
            <button type="button" className={styles.close} onClick={onClose} aria-label="Close">
              <span aria-hidden="true" />
              <span aria-hidden="true" />
            </button>
            <div className={styles.content}>{children}</div>
          </div>
        </div>
      )}
    </dialog>
  );
}
