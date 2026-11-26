"use client";

import { useActionState, useId, useRef, useState, useTransition } from "react";
import { DarkButton, IconButton, PrimaryButton, SecondaryButton, WhiteButton } from "@/ui/buttons";
import { PencilIcon } from "@/ui/icons";
import { BudgetInputs, ErrorMessage, Field, input, Notice } from "@/ui/pieces";
import type { Result } from "../actions";

type FormAction = (state: Result, fd: FormData) => Promise<Result>;

const linkUrl = (token: string) => `${window.location.origin}/p/${token}`;

function useCopy(token: string) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(linkUrl(token));
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return { copied, copy };
}

export function CopyLink({ token }: { token: string }) {
  const { copied, copy } = useCopy(token);
  return (
    <button
      type="button"
      onClick={copy}
      className="h-11 flex-1 cursor-pointer rounded-field border-2 border-border bg-surface text-sm font-extrabold shadow-[0_3px_0_var(--color-border)] active:translate-y-[2px] active:shadow-[0_1px_0_var(--color-border)]"
    >
      <span aria-live="polite">{copied ? "¡Copiado!" : "Copiar enlace"}</span>
    </button>
  );
}

/** Opens a <dialog> to rename a Participant. */
export function Rename({ name, action }: { name: string; action: FormAction }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const fieldId = useId();
  const [state, submit, pending] = useActionState(async (prev: Result, fd: FormData) => {
    const r = await action(prev, fd);
    if (!r.error) dialog.current?.close();
    return r;
  }, {});

  return (
    <>
      <IconButton aria-label={`Renombrar a ${name}`} onClick={() => dialog.current?.showModal()}>
        <PencilIcon />
      </IconButton>
      <dialog ref={dialog} className="m-auto w-[min(440px,calc(100vw-32px))] rounded-card bg-surface p-0 text-ink backdrop:bg-ink/50">
        <form action={submit} className="flex flex-col gap-4 p-6">
          <h2 className="text-2xl font-black">Renombrar</h2>
          <Field id={fieldId} label="Nombre">
            <input id={fieldId} name="name" required maxLength={40} defaultValue={state.value ?? name} className={input} />
          </Field>
          <p className="text-sm text-muted">Cambiar el nombre no cambia ninguna Asignación.</p>
          <ErrorMessage>{state.error}</ErrorMessage>
          <div className="flex flex-wrap gap-2.5">
            <PrimaryButton type="submit" disabled={pending}>Guardar</PrimaryButton>
            <SecondaryButton onClick={() => dialog.current?.close()}>Cancelar</SecondaryButton>
          </div>
        </form>
      </dialog>
    </>
  );
}

/** Form to add Participants. With the Draw already drawn, it warns that the draw will be redone. */
export function AddForm({ action, redoes }: { action: FormAction; redoes: boolean }) {
  const [state, submit, pending] = useActionState(action, {});
  return (
    <form action={submit} className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2.5">
        <label htmlFor="new-participant" className="sr-only">Nombre del nuevo Participante</label>
        <input id="new-participant" name="name" required maxLength={40} placeholder="Escribe un nombre…" defaultValue={state.value} className={`${input} min-w-0 flex-[1_1_220px]`} />
        <DarkButton type="submit" disabled={pending}>{redoes ? "Añadir y rehacer el sorteo" : "Añadir"}</DarkButton>
      </div>
      <ErrorMessage>{state.error}</ErrorMessage>
    </form>
  );
}

export function DrawButton({ action }: { action: () => Promise<Result> }) {
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  return (
    <>
      <WhiteButton
        disabled={pending}
        className="h-15 text-[22px]"
        onClick={() => startTransition(async () => setError((await action()).error))}
      >
        {pending ? "Sorteando…" : "¡Sortear!"}
      </WhiteButton>
      {error ? <p aria-live="polite" className="rounded-xl bg-white px-3 py-2 text-sm font-bold text-danger">{error}</p> : null}
    </>
  );
}

/** Edit the Draw's name, Budget and Exchange date. */
export function EditDetails({
  action,
  name,
  budget,
  budgetMax,
  date,
}: {
  action: FormAction;
  name: string;
  budget: string;
  budgetMax: string;
  date: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [state, submit, pending] = useActionState(async (prev: Result, fd: FormData) => {
    const r = await action(prev, fd);
    if (!r.error) dialog.current?.close();
    return r;
  }, {});
  return (
    <>
      <button type="button" onClick={() => dialog.current?.showModal()} className="cursor-pointer font-black text-accent">
        Editar
      </button>
      <dialog ref={dialog} className="m-auto w-[min(480px,calc(100vw-32px))] rounded-card bg-surface p-0 text-ink backdrop:bg-ink/50">
        <form action={submit} className="flex flex-col gap-4 p-6">
          <h2 className="text-2xl font-black">Datos del Sorteo</h2>
          <Field id="edit-name" label="Nombre del Sorteo">
            <input id="edit-name" name="name" required maxLength={80} defaultValue={name} className={input} />
          </Field>
          <Field id="edit-budget" label="Presupuesto (opcional)" help="Una cantidad, o rellena las dos para un rango.">
            <BudgetInputs id="edit-budget" budget={budget} budgetMax={budgetMax} />
          </Field>
          <Field id="edit-date" label="Fecha de entrega (opcional)">
            <input id="edit-date" name="date" type="date" defaultValue={date} className={input} />
          </Field>
          <ErrorMessage>{state.error}</ErrorMessage>
          <div className="flex flex-wrap gap-2.5">
            <PrimaryButton type="submit" disabled={pending}>Guardar</PrimaryButton>
            <SecondaryButton onClick={() => dialog.current?.close()}>Cancelar</SecondaryButton>
          </div>
        </form>
      </dialog>
    </>
  );
}

type Chain = { from: string; to: string }[];
type Phase = { kind: "hidden" } | { kind: "confirm" } | { kind: "revealed"; chain: Chain };

export function Reveal({ action }: { action: () => Promise<Chain> }) {
  const [phase, setPhase] = useState<Phase>({ kind: "hidden" });
  const [pending, startTransition] = useTransition();

  if (phase.kind === "hidden") {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex-[1_1_320px] font-bold text-muted">
          Muestra quién regala a quién, con nombres. Úsalo solo si necesitas comprobar algo a mano.
        </p>
        <DarkButton onClick={() => setPhase({ kind: "confirm" })}>Revelar</DarkButton>
      </div>
    );
  }
  if (phase.kind === "confirm") {
    return (
      <Notice>
        <strong className="text-lg font-black">¡Ojo! Verás también quién te regala a ti.</strong>
        <span className="font-bold">Se te estropeará la sorpresa. ¿Seguro?</span>
        <div className="flex flex-wrap gap-2.5">
          <DarkButton
            disabled={pending}
            onClick={() => startTransition(async () => setPhase({ kind: "revealed", chain: await action() }))}
          >
            {pending ? "Revelando…" : "Sí, revelar"}
          </DarkButton>
          <SecondaryButton onClick={() => setPhase({ kind: "hidden" })}>Cancelar</SecondaryButton>
        </div>
      </Notice>
    );
  }
  return (
    <div className="flex flex-col gap-3.5">
      <ol className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-2.5">
        {phase.chain.map((a) => (
          <li key={a.from} className="flex items-center gap-2.5 rounded-[14px] border-2 border-border px-3.5 py-3 text-[17px] font-extrabold">
            <span>{a.from}</span>
            <span aria-label="regala a" className="font-black text-accent">→</span>
            <span className="font-black">{a.to}</span>
          </li>
        ))}
      </ol>
      <SecondaryButton className="self-start" onClick={() => setPhase({ kind: "hidden" })}>Ocultar</SecondaryButton>
    </div>
  );
}
