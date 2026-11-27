"use client";

import { useActionState, useId, useRef, useState, useTransition } from "react";
import { DarkButton, IconButton, PrimaryButton, SecondaryButton, WhiteButton } from "@/ui/buttons";
import { LinkIcon, PencilIcon } from "@/ui/icons";
import { MAX_LIKES, MAX_NAME } from "@/domain/values";
import { BudgetInputs, ErrorMessage, Field, input, Notice, textArea } from "@/ui/pieces";
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

/**
 * Opens a <dialog> with a Participant's Personal link: see it, copy it, or replace it with a
 * new one (the old one stops working, for when it is lost or leaked).
 */
export function LinkOptions({
  name,
  token,
  action,
}: {
  name: string;
  token: string;
  action: () => Promise<Result>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [origin, setOrigin] = useState("");
  const [step, setStep] = useState<"view" | "confirm" | "regenerated">("view");
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const { copied, copy } = useCopy(token);

  const open = () => {
    setOrigin(window.location.origin);
    setStep("view");
    setError(undefined);
    dialog.current?.showModal();
  };
  const regenerate = () =>
    startTransition(async () => {
      const r = await action();
      setError(r.error);
      setStep(r.error ? "view" : "regenerated");
    });

  return (
    <>
      <IconButton aria-label={`Enlace personal de ${name}`} onClick={open}>
        <LinkIcon />
      </IconButton>
      <dialog ref={dialog} className="m-auto w-[min(480px,calc(100vw-32px))] rounded-card bg-surface p-0 text-ink backdrop:bg-ink/50">
        <div className="flex flex-col gap-4 p-6">
          <h2 className="text-2xl font-black">Enlace personal de {name}</h2>
          <p className="rounded-field border-2 border-border bg-bg px-3.5 py-3 font-mono text-sm break-all select-all">
            {origin ? `${origin}/p/${token}` : null}
          </p>
          {step === "regenerated" ? (
            <p aria-live="polite" className="rounded-xl bg-accent-soft px-3 py-2 text-sm font-bold text-accent">
              Enlace nuevo generado. El anterior ya no funciona: envíale este.
            </p>
          ) : null}
          {step === "confirm" ? (
            <Notice>
              <strong className="text-lg font-black">¿Generar un enlace nuevo?</strong>
              <span className="font-bold">
                El enlace actual dejará de funcionar al momento. Su Asignación y sus gustos se conservan.
              </span>
              <div className="flex flex-wrap gap-2.5">
                <DarkButton disabled={pending} onClick={regenerate}>
                  {pending ? "Generando…" : "Sí, generar"}
                </DarkButton>
                <SecondaryButton onClick={() => setStep("view")}>Cancelar</SecondaryButton>
              </div>
            </Notice>
          ) : null}
          <ErrorMessage>{error}</ErrorMessage>
          <div className="flex flex-wrap gap-2.5">
            <PrimaryButton onClick={copy}>
              <span aria-live="polite">{copied ? "¡Copiado!" : "Copiar enlace"}</span>
            </PrimaryButton>
            {step !== "confirm" ? (
              <SecondaryButton onClick={() => setStep("confirm")}>Generar enlace nuevo</SecondaryButton>
            ) : null}
            <SecondaryButton onClick={() => dialog.current?.close()}>Cerrar</SecondaryButton>
          </div>
        </div>
      </dialog>
    </>
  );
}

/**
 * The Organizer's own Assignment, hidden by default so it is not seen when sharing the screen.
 * It counts as Seen the first time it is revealed.
 */
export function MyAssignment({
  recipient,
  likes,
  dislikes,
  markSeen,
}: {
  recipient: string;
  likes: string;
  dislikes: string;
  markSeen: () => Promise<void>;
}) {
  const [shown, setShown] = useState(false);
  const marked = useRef(false);

  const reveal = () => {
    setShown(true);
    if (!marked.current) {
      marked.current = true;
      void markSeen();
    }
  };

  if (!shown) {
    return (
      <>
        <p className="text-2xl leading-tight font-black">Tu Asignación está oculta</p>
        <p className="leading-normal font-bold text-accent-soft">
          Para que nadie la vea si compartes pantalla. Revélala solo cuando estés a solas.
        </p>
        <WhiteButton className="self-start" onClick={reveal}>Revelar</WhiteButton>
      </>
    );
  }
  return (
    <>
      <p className="text-4xl leading-tight font-black">Regalas a {recipient}</p>
      <div className="flex flex-col gap-2.5 rounded-[14px] bg-shape-2 p-3.5 leading-normal font-bold">
        <div><strong className="font-black">Le gusta:</strong> {likes || "aún no lo ha contado."}</div>
        <div><strong className="font-black">No le gusta:</strong> {dislikes || "aún no lo ha contado."}</div>
      </div>
      <WhiteButton className="self-start" onClick={() => setShown(false)}>Ocultar</WhiteButton>
    </>
  );
}

/** Opens a <dialog> to edit a Participant's name and Likes / Dislikes. */
export function EditParticipant({
  participant: { name, likes, dislikes },
  action,
}: {
  participant: { name: string; likes: string; dislikes: string };
  action: FormAction;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const fieldId = useId();
  const [state, submit, pending] = useActionState(async (prev: Result, fd: FormData) => {
    const r = await action(prev, fd);
    if (!r.error) dialog.current?.close();
    return r;
  }, {});

  return (
    <>
      <IconButton aria-label={`Editar a ${name}`} onClick={() => dialog.current?.showModal()}>
        <PencilIcon />
      </IconButton>
      <dialog ref={dialog} className="m-auto w-[min(480px,calc(100vw-32px))] rounded-card bg-surface p-0 text-ink backdrop:bg-ink/50">
        <form action={submit} className="flex flex-col gap-4 p-6">
          <h2 className="text-2xl font-black">Editar Participante</h2>
          <Field id={`${fieldId}-name`} label="Nombre" help="Cambiar el nombre no cambia ninguna Asignación.">
            <input id={`${fieldId}-name`} name="name" required maxLength={MAX_NAME} defaultValue={state.fields?.name ?? name} className={input} />
          </Field>
          <Field id={`${fieldId}-likes`} label={<span className="text-accent">Le gusta</span>}>
            <textarea id={`${fieldId}-likes`} name="likes" rows={3} maxLength={MAX_LIKES} defaultValue={state.fields?.likes ?? likes} className={textArea} />
          </Field>
          <Field id={`${fieldId}-dislikes`} label={<span className="text-danger">No le gusta</span>}>
            <textarea id={`${fieldId}-dislikes`} name="dislikes" rows={3} maxLength={MAX_LIKES} defaultValue={state.fields?.dislikes ?? dislikes} className={textArea} />
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
