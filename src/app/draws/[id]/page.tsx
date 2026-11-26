import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requireOrganizer } from "@/accounts/session";
import { getDb } from "@/db/client";
import { DomainError } from "@/domain/errors";
import { drawPanel, type LikesStatus, type Panel } from "@/domain/queries";
import { formatBudget, formatDate } from "@/domain/values";
import { button } from "@/ui/buttons";
import { Confirm } from "@/ui/confirm";
import { CheckIcon, CrossIcon } from "@/ui/icons";
import { MarkSeen } from "@/ui/mark-seen";
import { Avatar, Card, GreenCard, Heading2, SeenBadge, StatusBadge } from "@/ui/pieces";
import {
  addParticipantAction,
  deleteDrawAction,
  editDrawAction,
  markMySeenAction,
  redoDrawAction,
  removeParticipantAction,
  renameParticipantAction,
  revealAction,
  runDrawAction,
} from "../actions";
import { AddForm, CopyLink, DrawButton, EditDetails, Rename, Reveal } from "./client";

export const metadata: Metadata = { title: "Sorteo · Amigo Invisible" };

export default function DrawPage({ params }: PageProps<"/draws/[id]">) {
  return (
    <main className="mx-auto flex w-full max-w-[1040px] flex-col gap-6 px-4 py-8">
      <Link href="/draws" className="text-[15px] font-black text-accent">
        ← Mis Sorteos
      </Link>
      <Suspense fallback={<p className="text-muted">Cargando el Sorteo…</p>}>
        <PanelContent params={params} />
      </Suspense>
    </main>
  );
}

async function PanelContent({ params }: { params: PageProps<"/draws/[id]">["params"] }) {
  const [{ id }, org] = await Promise.all([params, requireOrganizer()]);
  const drawId = Number(id);
  if (!Number.isInteger(drawId)) notFound();

  let panel: Panel;
  try {
    panel = drawPanel(getDb(), org.id, drawId);
  } catch (e) {
    if (e instanceof DomainError) notFound();
    throw e;
  }

  return (
    <>
      <Header panel={panel} />
      {panel.draw.status === "drawn" ? <DrawnPanel panel={panel} /> : <OpenPanel panel={panel} />}
    </>
  );
}

function Header({ panel: { draw } }: { panel: Panel }) {
  const budget = draw.budgetCents === null ? "" : String(draw.budgetCents / 100).replace(".", ",");
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-[40px] leading-tight font-black">{draw.name}</h1>
        <StatusBadge status={draw.status} />
      </div>
      <div className="flex flex-wrap gap-5 text-base font-bold text-muted">
        <span>
          Presupuesto:{" "}
          <strong className="font-black text-ink">
            {draw.budgetCents === null ? "sin presupuesto" : formatBudget(draw.budgetCents)}
          </strong>
        </span>
        <span>
          Fecha de entrega:{" "}
          <strong className="font-black text-ink">{draw.exchangeDate ? formatDate(draw.exchangeDate) : "sin fecha"}</strong>
        </span>
        <EditDetails
          action={editDrawAction.bind(null, draw.id)}
          name={draw.name}
          budget={budget}
          date={draw.exchangeDate ?? ""}
        />
      </div>
    </div>
  );
}

const likesLabel: Record<LikesStatus, string> = {
  complete: "Gustos rellenados",
  "likes-only": "Solo Le gusta",
  "dislikes-only": "Solo No le gusta",
  empty: "Sin gustos todavía",
};

function OpenPanel({ panel }: { panel: Panel }) {
  const { draw, participants } = panel;
  return (
    <>
      <div className="flex flex-wrap items-start gap-6">
        <Card className="min-w-0 flex-[999_1_560px] gap-5">
          <div className="flex items-center justify-between gap-3">
            <Heading2>Sala de espera</Heading2>
            <span className="rounded-full bg-ink px-3.5 py-1.5 text-base font-black text-white">
              {participants.length} <span className="font-bold">Participantes</span>
            </span>
          </div>
          <AddForm action={addParticipantAction.bind(null, draw.id)} redoes={false} />
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3.5">
            {participants.map((p, i) => (
              <li key={p.id} className="flex flex-col gap-3 rounded-2xl border-2 border-border bg-surface p-3.5 shadow-[0_4px_0_var(--color-border)]">
                <div className="flex items-center gap-2.5">
                  <Avatar name={p.name} index={i} />
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-lg font-black">
                      {p.name} {p.isOrganizer ? <span className="font-bold text-muted">(tú)</span> : null}
                    </span>
                    <span className="text-[13px] font-bold text-muted">{likesLabel[p.likesStatus]}</span>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <CopyLink token={p.token} />
                  <Rename name={p.name} action={renameParticipantAction.bind(null, draw.id, p.id)} />
                  <Confirm
                    triggerStyle="inline-flex size-11 flex-none cursor-pointer items-center justify-center rounded-field border-2 border-[#f2c4bf] bg-danger-soft text-danger shadow-[0_3px_0_#f2c4bf]"
                    triggerLabel={`Quitar a ${p.name}`}
                    title={`¿Quitar a ${p.name}?`}
                    message="Su Enlace personal dejará de funcionar."
                    confirmText="Quitar"
                    action={removeParticipantAction.bind(null, draw.id, p.id)}
                  >
                    <CrossIcon />
                  </Confirm>
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <aside className="flex flex-[1_1_280px] flex-col gap-5">
          <GreenCard>
            <h2 className="text-[28px] font-black">¿Listos?</h2>
            <p className="leading-normal font-bold text-accent-soft">
              Se forma una Cadena única: nadie se regala a sí mismo ni hay parejas mutuas. Después, para añadir o quitar a
              alguien habrá que rehacer el sorteo.
            </p>
            <DrawButton key={participants.length} action={runDrawAction.bind(null, draw.id)} />
            <span className="text-sm font-extrabold text-accent-soft">Mínimo 3 Participantes.</span>
          </GreenCard>
          <div className="flex flex-col gap-1.5 rounded-card border-2 border-[#cfe6da] bg-accent-soft p-4.5 leading-normal font-bold">
            <strong className="font-black text-accent">Reparte ya los enlaces</strong>
            <span>Cada uno puede abrir el suyo antes del sorteo y rellenar qué le gusta y qué no.</span>
          </div>
        </aside>
      </div>
      <div className="flex justify-end">
        <DeleteDraw drawId={draw.id} name={draw.name} />
      </div>
    </>
  );
}

function DrawnPanel({ panel }: { panel: Panel }) {
  const { draw, participants, myAssignment, verification: v } = panel;
  const seen = participants.filter((p) => p.seen).length;
  const checks = [
    { ok: v.receivingSeveral === 0 && v.withoutGift === 0, label: "Nadie recibe dos regalos" },
    { ok: v.selfGifts === 0, label: "Nadie se regala a sí mismo" },
    { ok: v.singleChain && v.mutualPairs === 0, label: "Una sola Cadena, sin parejas mutuas" },
  ];

  return (
    <>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-6">
        {myAssignment ? (
          <GreenCard>
            <MarkSeen action={markMySeenAction.bind(null, draw.id)} />
            <span className="text-[13px] font-black tracking-[0.1em] text-[#cfe6da] uppercase">Tu Asignación</span>
            <p className="text-4xl leading-tight font-black">Regalas a {myAssignment.recipient}</p>
            <div className="flex flex-col gap-2.5 rounded-[14px] bg-shape-2 p-3.5 leading-normal font-bold">
              <div><strong className="font-black">Le gusta:</strong> {myAssignment.likes || "aún no lo ha contado."}</div>
              <div><strong className="font-black">No le gusta:</strong> {myAssignment.dislikes || "aún no lo ha contado."}</div>
            </div>
          </GreenCard>
        ) : null}

        <Card>
          <Heading2>Verificación</Heading2>
          <div className={`flex items-center gap-4 rounded-2xl p-4 ${v.valid ? "bg-accent-soft text-accent" : "bg-danger-soft text-danger"}`}>
            <span className="text-[52px] leading-none font-black">
              {v.withRecipient}/{v.total}
            </span>
            <span className="text-[17px] leading-tight font-black">
              {v.valid ? "Cadena válida" : "Algo no cuadra"}
              <br />
              <span className="font-bold">{v.valid ? "todos tienen Destinatario" : "rehaz el sorteo"}</span>
            </span>
          </div>
          <ul className="flex flex-col gap-2.5 font-bold">
            {checks.map((c) => (
              <li key={c.label} className="flex items-center gap-2.5">
                <span className={`inline-flex size-6.5 flex-none items-center justify-center rounded-full text-white ${c.ok ? "bg-accent" : "bg-danger"}`}>
                  {c.ok ? <CheckIcon /> : <CrossIcon />}
                </span>
                {c.label}
              </li>
            ))}
          </ul>
          <p className="text-sm font-bold text-muted">La Verificación no muestra nombres.</p>
        </Card>
      </div>

      <Card className="gap-4.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Heading2>Participantes</Heading2>
          <div className="flex flex-[0_1_320px] items-center gap-2.5">
            <div className="h-3.5 flex-1 rounded-full bg-neutral">
              <div className="h-3.5 rounded-full bg-accent" style={{ width: `${(seen / participants.length) * 100}%` }} />
            </div>
            <span className="text-[15px] font-black">
              {seen}/{participants.length} lo han visto
            </span>
          </div>
        </div>
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3.5">
          {participants.map((p, i) => (
            <li key={p.id} className="flex flex-col gap-3 rounded-2xl border-2 border-border p-3.5 shadow-[0_4px_0_var(--color-border)]">
              <div className="flex min-w-0 items-center gap-2.5">
                <Avatar name={p.name} index={i} />
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate text-[17px] font-black">
                    {p.name} {p.isOrganizer ? <span className="font-bold text-muted">(tú)</span> : null}
                  </span>
                  <SeenBadge seen={p.seen} />
                </div>
              </div>
              <div className="flex gap-1.5">
                <CopyLink token={p.token} />
                <Rename name={p.name} action={renameParticipantAction.bind(null, draw.id, p.id)} />
                <Confirm
                  triggerStyle="inline-flex size-11 flex-none cursor-pointer items-center justify-center rounded-field border-2 border-[#f2c4bf] bg-danger-soft text-danger shadow-[0_3px_0_#f2c4bf]"
                  triggerLabel={`Quitar a ${p.name}`}
                  title={`¿Quitar a ${p.name}?`}
                  message="El sorteo ya está hecho: al quitarle se rehará y cambiarán todas las Asignaciones. Su Enlace personal dejará de funcionar."
                  confirmText="Quitar y rehacer"
                  action={removeParticipantAction.bind(null, draw.id, p.id)}
                >
                  <CrossIcon />
                </Confirm>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <Heading2>Revelar Asignaciones</Heading2>
        <Reveal action={revealAction.bind(null, draw.id)} />
      </Card>

      <Card>
        <div className="flex flex-col gap-2">
          <Heading2>¿Cambia el grupo?</Heading2>
          <p className="leading-normal font-bold text-muted">
            Añadir o quitar Participantes rehace el sorteo: cambian todas las Asignaciones y Visto vuelve a cero. Los enlaces
            y los gustos se conservan.
          </p>
        </div>
        <AddForm action={addParticipantAction.bind(null, draw.id)} redoes />
        <div className="flex flex-wrap gap-2.5">
          <Confirm
            triggerStyle={button.secondary}
            title="¿Rehacer el sorteo?"
            message="Cambiarán todas las Asignaciones y todos tendrán que volver a mirar su enlace."
            confirmText="Rehacer"
            confirmStyle={button.primary}
            action={redoDrawAction.bind(null, draw.id)}
          >
            Rehacer el sorteo
          </Confirm>
          <DeleteDraw drawId={draw.id} name={draw.name} />
        </div>
      </Card>
    </>
  );
}

function DeleteDraw({ drawId, name }: { drawId: number; name: string }) {
  return (
    <Confirm
      triggerStyle={button.danger}
      title={`¿Borrar «${name}»?`}
      message="Se borran los Participantes, sus gustos y las Asignaciones. Los enlaces dejarán de funcionar. No se puede deshacer."
      confirmText="Borrar para siempre"
      action={deleteDrawAction.bind(null, drawId)}
    >
      Borrar Sorteo
    </Confirm>
  );
}
