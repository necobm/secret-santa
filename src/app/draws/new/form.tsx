"use client";

import { useActionState, useState } from "react";
import { PrimaryButton } from "@/ui/buttons";
import { ErrorMessage, Field, input } from "@/ui/pieces";
import { createDrawAction } from "../actions";

export function NewDrawForm() {
  const [state, action, pending] = useActionState(createDrawAction, {});
  const [participating, setParticipating] = useState(true);

  return (
    <form action={action} className="flex flex-col gap-5 rounded-card border-2 border-border bg-surface p-7 shadow-card">
      <Field id="name" label="Nombre del Sorteo">
        <input id="name" name="name" required maxLength={80} placeholder="Navidad familia 2026" defaultValue={state.fields?.name} className={input} />
      </Field>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
        <Field id="budget" label={<>Presupuesto <span className="font-semibold text-muted">(opcional)</span></>}>
          <div className="relative">
            <input id="budget" name="budget" inputMode="decimal" placeholder="30" defaultValue={state.fields?.budget} className={`${input} pr-10`} />
            <span aria-hidden="true" className="absolute top-1/2 right-4 -translate-y-1/2 font-black text-muted">€</span>
          </div>
        </Field>
        <Field id="date" label={<>Fecha de entrega <span className="font-semibold text-muted">(opcional)</span></>}>
          <input id="date" name="date" type="date" defaultValue={state.fields?.date} className={input} />
        </Field>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl bg-bg p-4">
        {participating ? (
          <Field id="yourName" label="Tu nombre como Participante" help="Así te verán los demás. Tu Asignación aparecerá en el panel.">
            <input id="yourName" name="yourName" required maxLength={40} defaultValue={state.fields?.yourName} className={input} />
          </Field>
        ) : null}
        <label htmlFor="notParticipating" className="flex min-h-11 cursor-pointer items-center gap-3 text-base font-extrabold">
          <input
            id="notParticipating"
            name="notParticipating"
            type="checkbox"
            checked={!participating}
            onChange={(e) => setParticipating(!e.target.checked)}
            className="size-6 accent-accent"
          />
          No participo, solo organizo
        </label>
      </div>

      <ErrorMessage>{state.error}</ErrorMessage>
      <PrimaryButton type="submit" disabled={pending} className="h-14 text-[19px]">
        {pending ? "Creando…" : "¡Crear Sorteo!"}
      </PrimaryButton>
    </form>
  );
}
