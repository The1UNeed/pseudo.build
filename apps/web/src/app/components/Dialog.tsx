"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

const FOCUSABLE_SELECTOR =
  'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';

interface DialogProps {
  labelledBy: string;
  onClose: () => void;
  className?: string;
  children: ReactNode;
}

/**
 * Modal dialog on the native <dialog> element. Mounting it opens it with showModal(), which
 * traps focus and makes the page behind it inert. Escape calls onClose. Focus starts on the
 * element marked data-autofocus (or the first focusable one) and returns to the opener on unmount.
 */
export function Dialog({ labelledBy, onClose, className = "", children }: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  // Read during render, before any child autofocus runs, so this is the element that opened the dialog.
  const [opener] = useState(() =>
    typeof document === "undefined" ? null : (document.activeElement as HTMLElement | null),
  );

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    const initialFocus =
      dialog.querySelector<HTMLElement>("[data-autofocus]") ??
      dialog.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    initialFocus?.focus();
    return () => opener?.focus();
  }, [opener]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={labelledBy}
      className={`app-dialog ${className}`}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClose={onClose}
      onKeyDown={(event) => {
        if (event.key === "Escape" && !event.nativeEvent.isComposing) {
          event.preventDefault();
          event.stopPropagation();
          onClose();
        }
      }}
    >
      {children}
    </dialog>
  );
}
