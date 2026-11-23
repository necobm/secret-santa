import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { getDb } from "@/db/client";
import { verEnlace } from "@/dominio/consultas";
import { ErrorDeDominio } from "@/dominio/errores";
import { formatearFecha, formatearPresupuesto } from "@/dominio/valores";
import { IconoReloj } from "@/ui/iconos";
import { MarcarVisto } from "@/ui/marcar-visto";
import { Avatar } from "@/ui/piezas";
import { guardarGustosAccion, marcarVistoAccion } from "./acciones";
import { FormularioGustos } from "./gustos";

// Título genérico y sin indexar: las vistas previas de enlaces no deben revelar nada.
export const metadata: Metadata = {
  title: "Tu amigo invisible",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

type Enlace = ReturnType<typeof verEnlace>;

export default function PaginaEnlace({ params }: PageProps<"/p/[token]">) {
  return (
    <main className="relative flex flex-1 justify-center overflow-hidden bg-accent px-4 py-8">
      <div aria-hidden="true" className="absolute -top-10 -right-12 size-42 rounded-full bg-forma-1" />
      <div aria-hidden="true" className="absolute top-25 right-32 size-12 rotate-[22deg] rounded-xl bg-forma-2" />
      <svg aria-hidden="true" width="130" height="112" viewBox="0 0 130 112" className="absolute -bottom-5 -left-8">
        <path d="M65 0 130 112H0Z" className="fill-forma-1" />
      </svg>
      <div className="relative flex w-full max-w-[440px] flex-col gap-4.5">
        <Suspense fallback={<p className="font-bold text-accent-soft">Abriendo tu enlace…</p>}>
          <Contenido params={params} />
        </Suspense>
      </div>
    </main>
  );
}

async function Contenido({ params }: { params: PageProps<"/p/[token]">["params"] }) {
  const { token } = await params;
  await connection();
  let enlace: Enlace;
  try {
    enlace = verEnlace(getDb(), token);
  } catch (e) {
    if (e instanceof ErrorDeDominio) notFound();
    throw e;
  }

  const { sorteo, participante, destinatario } = enlace;
  const datos = [
    sorteo.presupuestoCentimos !== null ? formatearPresupuesto(sorteo.presupuestoCentimos) : null,
    sorteo.fechaEntrega ? formatearFecha(sorteo.fechaEntrega, false) : null,
  ].filter((d): d is string => d !== null);

  return (
    <>
      <div className="flex flex-col gap-0.5 text-white">
        <span className="text-[13px] font-black tracking-[0.1em] text-[#cfe6da] uppercase">{sorteo.nombre}</span>
        <h1 className="text-[40px] leading-tight font-black">¡Hola, {participante.nombre}!</h1>
      </div>

      {destinatario ? (
        <TuDestinatario destinatario={destinatario} datos={datos} token={token} />
      ) : (
        <EsperandoSorteo datos={datos} />
      )}

      <FormularioGustos
        accion={guardarGustosAccion.bind(null, token)}
        leGusta={participante.leGusta}
        noLeGusta={participante.noLeGusta}
      />
    </>
  );
}

function EsperandoSorteo({ datos }: { datos: string[] }) {
  return (
    <div className="flex items-center gap-3.5 rounded-tarjeta bg-surface p-4.5 shadow-[0_6px_0_var(--color-accent-relieve)]">
      <div className="flex size-13 flex-none items-center justify-center rounded-full bg-pendiente-soft text-pendiente">
        <IconoReloj />
      </div>
      <div className="flex flex-col gap-0.5">
        <strong className="text-[19px] font-black">Esperando el sorteo…</strong>
        <span className="text-sm leading-snug font-bold text-muted">
          Vuelve a este enlace cuando se haya sorteado. Mientras, cuenta qué te gusta.
          {datos.length ? ` (${datos.join(" · ")})` : null}
        </span>
      </div>
    </div>
  );
}

function TuDestinatario({
  destinatario,
  datos,
  token,
}: {
  destinatario: NonNullable<Enlace["destinatario"]>;
  datos: string[];
  token: string;
}) {
  return (
    <>
      <section className="flex flex-col items-center gap-3 rounded-[24px] bg-surface px-5 pt-7 pb-5.5 text-center shadow-[0_8px_0_var(--color-accent-relieve)]">
        <MarcarVisto accion={marcarVistoAccion.bind(null, token)} />
        <span className="text-sm font-black tracking-[0.1em] text-muted uppercase">Te ha tocado regalar a…</span>
        <Avatar nombre={destinatario.nombre} indice={2} grande />
        <p className="text-[52px] leading-none font-black break-words text-accent">{destinatario.nombre}</p>
        {datos.length ? (
          <div className="flex flex-wrap justify-center gap-2">
            {datos.map((d) => (
              <span key={d} className="rounded-full bg-neutro px-3 py-1 text-sm font-extrabold">{d}</span>
            ))}
          </div>
        ) : null}
        <div className="mt-1 flex flex-col gap-2.5 self-stretch text-left">
          <div className="flex flex-col gap-0.5 rounded-[14px] bg-accent-soft px-3.5 py-3">
            <strong className="text-[15px] font-black text-accent">Le gusta</strong>
            <span className="leading-snug font-bold whitespace-pre-line">{destinatario.leGusta || "Aún no lo ha contado."}</span>
          </div>
          <div className="flex flex-col gap-0.5 rounded-[14px] bg-danger-soft px-3.5 py-3">
            <strong className="text-[15px] font-black text-danger">No le gusta</strong>
            <span className="leading-snug font-bold whitespace-pre-line">{destinatario.noLeGusta || "Aún no lo ha contado."}</span>
          </div>
        </div>
      </section>
      <p className="text-center leading-normal font-extrabold text-accent-soft">
        Es secreto: no se lo digas a nadie. Si el sorteo se rehace, este enlace te mostrará tu nuevo Destinatario.
      </p>
    </>
  );
}
