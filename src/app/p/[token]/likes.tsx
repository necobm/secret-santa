"use client";

import { useActionState } from "react";
import { MAX_LIKES } from "@/domain/values";
import { PrimaryButton } from "@/ui/buttons";
import { ErrorMessage, textArea } from "@/ui/pieces";
import type { LikesResult } from "./actions";

export function LikesForm({
  action,
  likes,
  dislikes,
}: {
  action: (state: LikesResult, fd: FormData) => Promise<LikesResult>;
  likes: string;
  dislikes: string;
}) {
  const [state, submit, pending] = useActionState(action, {});
  return (
    <form action={submit} className="flex flex-col gap-3.5 rounded-card bg-surface p-4.5 shadow-[0_6px_0_var(--color-accent-shade)]">
      <h2 className="text-[22px] font-black">Tus gustos</h2>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="likes" className="text-[15px] font-black text-accent">Te gusta</label>
        <textarea id="likes" name="likes" rows={3} maxLength={MAX_LIKES} defaultValue={likes} placeholder="Libros de viajes, té, juegos de mesa…" className={textArea} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="dislikes" className="text-[15px] font-black text-danger">No te gusta</label>
        <textarea id="dislikes" name="dislikes" rows={3} maxLength={MAX_LIKES} defaultValue={dislikes} placeholder="Velas aromáticas, tazas…" className={textArea} />
      </div>
      <span className="text-[13px] font-bold text-muted">
        Solo lo verá quien te regale y quien organiza. Puedes cambiarlo cuando quieras.
      </span>
      <ErrorMessage>{state.error}</ErrorMessage>
      {state.saved && !pending ? (
        <p aria-live="polite" className="text-sm font-black text-accent">¡Guardado!</p>
      ) : null}
      <PrimaryButton type="submit" disabled={pending} className="h-14 text-[19px]">
        {pending ? "Guardando…" : "Guardar"}
      </PrimaryButton>
    </form>
  );
}
