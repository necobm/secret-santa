"use client";

import { useActionState, useState } from "react";
import { BotonPrimario } from "@/ui/botones";
import { Campo, campo, MensajeError } from "@/ui/piezas";
import { crearSorteoAccion } from "../acciones";

export function FormularioNuevoSorteo() {
  const [estado, accion, pendiente] = useActionState(crearSorteoAccion, {});
  const [participo, setParticipo] = useState(true);

  return (
    <form action={accion} className="flex flex-col gap-5 rounded-tarjeta border-2 border-borde bg-surface p-7 shadow-tarjeta">
      <Campo id="nombre" etiqueta="Nombre del Sorteo">
        <input id="nombre" name="nombre" required maxLength={80} placeholder="Navidad familia 2026" defaultValue={estado.campos?.nombre} className={campo} />
      </Campo>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
        <Campo id="presupuesto" etiqueta={<>Presupuesto <span className="font-semibold text-muted">(opcional)</span></>}>
          <div className="relative">
            <input id="presupuesto" name="presupuesto" inputMode="decimal" placeholder="30" defaultValue={estado.campos?.presupuesto} className={`${campo} pr-10`} />
            <span aria-hidden="true" className="absolute top-1/2 right-4 -translate-y-1/2 font-black text-muted">€</span>
          </div>
        </Campo>
        <Campo id="fecha" etiqueta={<>Fecha de entrega <span className="font-semibold text-muted">(opcional)</span></>}>
          <input id="fecha" name="fecha" type="date" defaultValue={estado.campos?.fecha} className={campo} />
        </Campo>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl bg-bg p-4">
        {participo ? (
          <Campo id="tuNombre" etiqueta="Tu nombre como Participante" ayuda="Así te verán los demás. Tu Asignación aparecerá en el panel.">
            <input id="tuNombre" name="tuNombre" required maxLength={40} defaultValue={estado.campos?.tuNombre} className={campo} />
          </Campo>
        ) : null}
        <label htmlFor="noParticipo" className="flex min-h-11 cursor-pointer items-center gap-3 text-base font-extrabold">
          <input
            id="noParticipo"
            name="noParticipo"
            type="checkbox"
            checked={!participo}
            onChange={(e) => setParticipo(!e.target.checked)}
            className="size-6 accent-accent"
          />
          No participo, solo organizo
        </label>
      </div>

      <MensajeError>{estado.error}</MensajeError>
      <BotonPrimario type="submit" disabled={pendiente} className="h-14 text-[19px]">
        {pendiente ? "Creando…" : "¡Crear Sorteo!"}
      </BotonPrimario>
    </form>
  );
}
