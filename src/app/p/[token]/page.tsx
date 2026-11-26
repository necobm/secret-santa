import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { getDb } from "@/db/client";
import { DomainError } from "@/domain/errors";
import { viewLink } from "@/domain/queries";
import { formatBudget, formatDate } from "@/domain/values";
import { HourglassIcon } from "@/ui/icons";
import { MarkSeen } from "@/ui/mark-seen";
import { Avatar } from "@/ui/pieces";
import { markSeenAction, saveLikesAction } from "./actions";
import { LikesForm } from "./likes";

// Generic title and no indexing: link previews must not reveal anything.
export const metadata: Metadata = {
  title: "Tu amigo invisible",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

type Link = ReturnType<typeof viewLink>;

export default function PersonalLinkPage({ params }: PageProps<"/p/[token]">) {
  return (
    <main className="relative flex flex-1 justify-center overflow-hidden bg-accent px-4 py-8">
      <div aria-hidden="true" className="absolute -top-10 -right-12 size-42 rounded-full bg-shape-1" />
      <div aria-hidden="true" className="absolute top-25 right-32 size-12 rotate-[22deg] rounded-xl bg-shape-2" />
      <svg aria-hidden="true" width="130" height="112" viewBox="0 0 130 112" className="absolute -bottom-5 -left-8">
        <path d="M65 0 130 112H0Z" className="fill-shape-1" />
      </svg>
      <div className="relative flex w-full max-w-[440px] flex-col gap-4.5">
        <Suspense fallback={<p className="font-bold text-accent-soft">Abriendo tu enlace…</p>}>
          <Content params={params} />
        </Suspense>
      </div>
    </main>
  );
}

async function Content({ params }: { params: PageProps<"/p/[token]">["params"] }) {
  const { token } = await params;
  await connection();
  let link: Link;
  try {
    link = viewLink(getDb(), token);
  } catch (e) {
    if (e instanceof DomainError) notFound();
    throw e;
  }

  const { draw, participant, recipient } = link;
  const details = [
    draw.budgetCents !== null ? formatBudget(draw.budgetCents) : null,
    draw.exchangeDate ? formatDate(draw.exchangeDate, false) : null,
  ].filter((d): d is string => d !== null);

  return (
    <>
      <div className="flex flex-col gap-0.5 text-white">
        <span className="text-[13px] font-black tracking-[0.1em] text-[#cfe6da] uppercase">{draw.name}</span>
        <h1 className="text-[40px] leading-tight font-black">¡Hola, {participant.name}!</h1>
      </div>

      {recipient ? (
        <YourRecipient recipient={recipient} details={details} token={token} />
      ) : (
        <WaitingForDraw details={details} />
      )}

      <LikesForm
        action={saveLikesAction.bind(null, token)}
        likes={participant.likes}
        dislikes={participant.dislikes}
      />
    </>
  );
}

function WaitingForDraw({ details }: { details: string[] }) {
  return (
    <div className="flex items-center gap-3.5 rounded-card bg-surface p-4.5 shadow-[0_6px_0_var(--color-accent-shade)]">
      <div className="flex size-13 flex-none items-center justify-center rounded-full bg-pending-soft text-pending">
        <HourglassIcon />
      </div>
      <div className="flex flex-col gap-0.5">
        <strong className="text-[19px] font-black">Esperando el sorteo…</strong>
        <span className="text-sm leading-snug font-bold text-muted">
          Vuelve a este enlace cuando se haya sorteado. Mientras, cuenta qué te gusta.
          {details.length ? ` (${details.join(" · ")})` : null}
        </span>
      </div>
    </div>
  );
}

function YourRecipient({
  recipient,
  details,
  token,
}: {
  recipient: NonNullable<Link["recipient"]>;
  details: string[];
  token: string;
}) {
  return (
    <>
      <section className="flex flex-col items-center gap-3 rounded-[24px] bg-surface px-5 pt-7 pb-5.5 text-center shadow-[0_8px_0_var(--color-accent-shade)]">
        <MarkSeen action={markSeenAction.bind(null, token)} />
        <span className="text-sm font-black tracking-[0.1em] text-muted uppercase">Te ha tocado regalar a…</span>
        <Avatar name={recipient.name} index={2} large />
        <p className="text-[52px] leading-none font-black break-words text-accent">{recipient.name}</p>
        {details.length ? (
          <div className="flex flex-wrap justify-center gap-2">
            {details.map((d) => (
              <span key={d} className="rounded-full bg-neutral px-3 py-1 text-sm font-extrabold">{d}</span>
            ))}
          </div>
        ) : null}
        <div className="mt-1 flex flex-col gap-2.5 self-stretch text-left">
          <div className="flex flex-col gap-0.5 rounded-[14px] bg-accent-soft px-3.5 py-3">
            <strong className="text-[15px] font-black text-accent">Le gusta</strong>
            <span className="leading-snug font-bold whitespace-pre-line">{recipient.likes || "Aún no lo ha contado."}</span>
          </div>
          <div className="flex flex-col gap-0.5 rounded-[14px] bg-danger-soft px-3.5 py-3">
            <strong className="text-[15px] font-black text-danger">No le gusta</strong>
            <span className="leading-snug font-bold whitespace-pre-line">{recipient.dislikes || "Aún no lo ha contado."}</span>
          </div>
        </div>
      </section>
      <p className="text-center leading-normal font-extrabold text-accent-soft">
        Es secreto: no se lo digas a nadie. Si el sorteo se rehace, este enlace te mostrará tu nuevo Destinatario.
      </p>
    </>
  );
}
