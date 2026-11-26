import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireOrganizer } from "@/accounts/session";
import { getDb } from "@/db/client";
import { listDraws } from "@/domain/queries";
import { formatBudget, formatDate } from "@/domain/values";
import { button } from "@/ui/buttons";
import { PlusIcon } from "@/ui/icons";
import { StatusBadge } from "@/ui/pieces";

export const metadata: Metadata = { title: "Mis Sorteos · Amigo Invisible" };

export default function DrawsPage() {
  return (
    <main className="mx-auto flex w-full max-w-[1040px] flex-col gap-7 px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-[40px] font-black">Mis Sorteos</h1>
        <Link href="/draws/new" className={button.primary}>
          <PlusIcon />
          Nuevo Sorteo
        </Link>
      </div>
      <Suspense fallback={<p className="text-muted">Cargando tus Sorteos…</p>}>
        <DrawList />
      </Suspense>
    </main>
  );
}

async function DrawList() {
  const org = await requireOrganizer();
  const draws = await listDraws(getDb(), org.id);

  if (draws.length === 0) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-card border-2 border-dashed border-border p-8">
        <p className="text-xl font-black">Todavía no tienes ningún Sorteo.</p>
        <p className="text-muted">Crea uno, añade a los Participantes y reparte los enlaces.</p>
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-6">
      {draws.map((d) => (
        <li key={d.id}>
          <Link
            href={`/draws/${d.id}`}
            className="flex h-full flex-col overflow-hidden rounded-card border-2 border-border bg-surface shadow-card transition-transform hover:-translate-y-0.5"
          >
            <div className={`relative h-18 overflow-hidden ${d.status === "drawn" ? "bg-accent" : "bg-neutral"}`}>
              {d.status === "drawn" ? (
                <>
                  <div aria-hidden="true" className="absolute -top-8 right-6 size-22 rounded-full bg-shape-1" />
                  <div aria-hidden="true" className="absolute top-8 right-30 size-11 rotate-[20deg] rounded-xl bg-shape-2" />
                </>
              ) : (
                <svg aria-hidden="true" width="80" height="70" viewBox="0 0 80 70" className="absolute top-3.5 right-6">
                  <path d="M40 0 80 70H0Z" fill="#dde1e7" />
                </svg>
              )}
              <span className="absolute top-5 left-5 rounded-full bg-white">
                <StatusBadge status={d.status} />
              </span>
            </div>
            <div className="flex flex-1 flex-col gap-3 p-5">
              <span className="text-2xl font-black">{d.name}</span>
              <div className="flex flex-wrap gap-4 text-[15px] font-bold text-muted">
                <span>{d.participants} Participantes</span>
                <span>{d.exchangeDate ? formatDate(d.exchangeDate, false) : "Sin fecha"}</span>
                {d.budgetCents !== null ? <span>{formatBudget(d)}</span> : null}
              </div>
              {d.status === "drawn" ? (
                <div className="flex flex-col gap-1.5">
                  <div className="h-3 rounded-full bg-neutral">
                    <div className="h-3 rounded-full bg-accent" style={{ width: `${d.participants ? (d.seen / d.participants) * 100 : 0}%` }} />
                  </div>
                  <span className="text-sm font-extrabold text-muted">
                    {d.seen} de {d.participants} han visto su Asignación
                  </span>
                </div>
              ) : (
                <span className="text-sm font-extrabold text-muted">Esperando a que sortees</span>
              )}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
