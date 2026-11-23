"use client";

import { useActionState } from "react";
import { MAX_GUSTOS } from "@/dominio/valores";
import { BotonPrimario } from "@/ui/botones";
import { areaTexto, MensajeError } from "@/ui/piezas";
import type { ResultadoGustos } from "./acciones";

export function FormularioGustos({
  accion,
  leGusta,
  noLeGusta,
}: {
  accion: (estado: ResultadoGustos, fd: FormData) => Promise<ResultadoGustos>;
  leGusta: string;
  noLeGusta: string;
}) {
  const [estado, enviar, pendiente] = useActionState(accion, {});
  return (
    <form action={enviar} className="flex flex-col gap-3.5 rounded-tarjeta bg-surface p-4.5 shadow-[0_6px_0_var(--color-accent-relieve)]">
      <h2 className="text-[22px] font-black">Tus gustos</h2>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="leGusta" className="text-[15px] font-black text-accent">Te gusta</label>
        <textarea id="leGusta" name="leGusta" rows={3} maxLength={MAX_GUSTOS} defaultValue={leGusta} placeholder="Libros de viajes, té, juegos de mesa…" className={areaTexto} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="noLeGusta" className="text-[15px] font-black text-danger">No te gusta</label>
        <textarea id="noLeGusta" name="noLeGusta" rows={3} maxLength={MAX_GUSTOS} defaultValue={noLeGusta} placeholder="Velas aromáticas, tazas…" className={areaTexto} />
      </div>
      <span className="text-[13px] font-bold text-muted">
        Solo lo verá quien te regale y quien organiza. Puedes cambiarlo cuando quieras.
      </span>
      <MensajeError>{estado.error}</MensajeError>
      {estado.guardado && !pendiente ? (
        <p aria-live="polite" className="text-sm font-black text-accent">¡Guardado!</p>
      ) : null}
      <BotonPrimario type="submit" disabled={pendiente} className="h-14 text-[19px]">
        {pendiente ? "Guardando…" : "Guardar"}
      </BotonPrimario>
    </form>
  );
}
