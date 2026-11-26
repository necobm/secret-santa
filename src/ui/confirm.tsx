"use client";

import { useRef, useState, useTransition, type ReactNode } from "react";
import { button } from "./buttons";

interface Props {
  /** Content of the button that opens the confirmation. */
  children: ReactNode;
  /** Classes of the button that opens the confirmation (e.g. `button.danger`). */
  triggerStyle: string;
  triggerLabel?: string;
  title: string;
  message: ReactNode;
  confirmText: string;
  confirmStyle?: string;
  action: () => Promise<{ error?: string } | void>;
}

/** A button that asks for confirmation in a <dialog> before running an action. */
export function Confirm({
  children,
  triggerStyle,
  triggerLabel,
  title,
  message,
  confirmText,
  confirmStyle = button.danger,
  action,
}: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  const confirm = () =>
    startTransition(async () => {
      const r = await action();
      if (r?.error) setError(r.error);
      else dialog.current?.close();
    });

  return (
    <>
      <button
        type="button"
        aria-label={triggerLabel}
        className={triggerStyle}
        onClick={() => {
          setError(undefined);
          dialog.current?.showModal();
        }}
      >
        {children}
      </button>
      <dialog
        ref={dialog}
        className="m-auto w-[min(440px,calc(100vw-32px))] rounded-card bg-surface p-0 text-ink shadow-[0_8px_0_var(--color-border)] backdrop:bg-ink/50"
      >
        <div className="flex flex-col gap-4 p-6">
          <h2 className="text-2xl font-black">{title}</h2>
          <div className="text-base font-semibold text-muted">{message}</div>
          {error ? <p className="text-sm font-bold text-danger">{error}</p> : null}
          <div className="flex flex-wrap gap-2.5">
            <button type="button" className={confirmStyle} disabled={pending} onClick={confirm}>
              {pending ? "Un momento…" : confirmText}
            </button>
            <button type="button" className={button.secondary} onClick={() => dialog.current?.close()}>
              Cancelar
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
