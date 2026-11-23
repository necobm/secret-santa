"use client";

import { useRef, useState, useTransition, type ReactNode } from "react";
import { boton } from "./botones";

interface Props {
  /** Contenido del botón que abre la confirmación. */
  children: ReactNode;
  /** Clases del botón que abre la confirmación (p. ej. `boton.peligro`). */
  estiloDisparador: string;
  etiquetaDisparador?: string;
  titulo: string;
  mensaje: ReactNode;
  textoConfirmar: string;
  estiloConfirmar?: string;
  accion: () => Promise<{ error?: string } | void>;
}

/** Botón que pide confirmación en un <dialog> antes de ejecutar una acción. */
export function Confirmar({
  children,
  estiloDisparador,
  etiquetaDisparador,
  titulo,
  mensaje,
  textoConfirmar,
  estiloConfirmar = boton.peligro,
  accion,
}: Props) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState<string>();
  const [pendiente, iniciar] = useTransition();

  const confirmar = () =>
    iniciar(async () => {
      const r = await accion();
      if (r?.error) setError(r.error);
      else dialogo.current?.close();
    });

  return (
    <>
      <button
        type="button"
        aria-label={etiquetaDisparador}
        className={estiloDisparador}
        onClick={() => {
          setError(undefined);
          dialogo.current?.showModal();
        }}
      >
        {children}
      </button>
      <dialog
        ref={dialogo}
        className="m-auto w-[min(440px,calc(100vw-32px))] rounded-tarjeta bg-surface p-0 text-ink shadow-[0_8px_0_var(--color-borde)] backdrop:bg-ink/50"
      >
        <div className="flex flex-col gap-4 p-6">
          <h2 className="text-2xl font-black">{titulo}</h2>
          <div className="text-base font-semibold text-muted">{mensaje}</div>
          {error ? <p className="text-sm font-bold text-danger">{error}</p> : null}
          <div className="flex flex-wrap gap-2.5">
            <button type="button" className={estiloConfirmar} disabled={pendiente} onClick={confirmar}>
              {pendiente ? "Un momento…" : textoConfirmar}
            </button>
            <button type="button" className={boton.secundario} onClick={() => dialogo.current?.close()}>
              Cancelar
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
