import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requerirOrganizador } from "@/cuentas/sesion";
import { getDb } from "@/db/client";
import { listarSorteos } from "@/dominio/consultas";
import { formatearFecha, formatearPresupuesto } from "@/dominio/valores";
import { boton } from "@/ui/botones";
import { IconoMas } from "@/ui/iconos";
import { InsigniaEstado } from "@/ui/piezas";

export const metadata: Metadata = { title: "Mis Sorteos · Amigo Invisible" };

export default function PaginaSorteos() {
  return (
    <main className="mx-auto flex w-full max-w-[1040px] flex-col gap-7 px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-[40px] font-black">Mis Sorteos</h1>
        <Link href="/sorteos/nuevo" className={boton.primario}>
          <IconoMas />
          Nuevo Sorteo
        </Link>
      </div>
      <Suspense fallback={<p className="text-muted">Cargando tus Sorteos…</p>}>
        <Lista />
      </Suspense>
    </main>
  );
}

async function Lista() {
  const org = await requerirOrganizador();
  const sorteos = listarSorteos(getDb(), org.id);

  if (sorteos.length === 0) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-tarjeta border-2 border-dashed border-borde p-8">
        <p className="text-xl font-black">Todavía no tienes ningún Sorteo.</p>
        <p className="text-muted">Crea uno, añade a los Participantes y reparte los enlaces.</p>
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-6">
      {sorteos.map((s) => (
        <li key={s.id}>
          <Link
            href={`/sorteos/${s.id}`}
            className="flex h-full flex-col overflow-hidden rounded-tarjeta border-2 border-borde bg-surface shadow-tarjeta transition-transform hover:-translate-y-0.5"
          >
            <div className={`relative h-18 overflow-hidden ${s.estado === "sorteado" ? "bg-accent" : "bg-neutro"}`}>
              {s.estado === "sorteado" ? (
                <>
                  <div aria-hidden="true" className="absolute -top-8 right-6 size-22 rounded-full bg-forma-1" />
                  <div aria-hidden="true" className="absolute top-8 right-30 size-11 rotate-[20deg] rounded-xl bg-forma-2" />
                </>
              ) : (
                <svg aria-hidden="true" width="80" height="70" viewBox="0 0 80 70" className="absolute top-3.5 right-6">
                  <path d="M40 0 80 70H0Z" fill="#dde1e7" />
                </svg>
              )}
              <span className="absolute top-5 left-5 rounded-full bg-white">
                <InsigniaEstado estado={s.estado} />
              </span>
            </div>
            <div className="flex flex-1 flex-col gap-3 p-5">
              <span className="text-2xl font-black">{s.nombre}</span>
              <div className="flex flex-wrap gap-4 text-[15px] font-bold text-muted">
                <span>{s.participantes} Participantes</span>
                <span>{s.fechaEntrega ? formatearFecha(s.fechaEntrega, false) : "Sin fecha"}</span>
                {s.presupuestoCentimos !== null ? <span>{formatearPresupuesto(s.presupuestoCentimos)}</span> : null}
              </div>
              {s.estado === "sorteado" ? (
                <div className="flex flex-col gap-1.5">
                  <div className="h-3 rounded-full bg-neutro">
                    <div className="h-3 rounded-full bg-accent" style={{ width: `${s.participantes ? (s.vistos / s.participantes) * 100 : 0}%` }} />
                  </div>
                  <span className="text-sm font-extrabold text-muted">
                    {s.vistos} de {s.participantes} han visto su Asignación
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
