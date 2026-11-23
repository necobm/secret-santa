import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requerirOrganizador } from "@/cuentas/sesion";
import { getDb } from "@/db/client";
import { panelSorteo, type EstadoGustos, type Panel } from "@/dominio/consultas";
import { ErrorDeDominio } from "@/dominio/errores";
import { formatearFecha, formatearPresupuesto } from "@/dominio/valores";
import { boton } from "@/ui/botones";
import { Confirmar } from "@/ui/confirmar";
import { IconoCheck, IconoCruz } from "@/ui/iconos";
import { MarcarVisto } from "@/ui/marcar-visto";
import { Avatar, InsigniaEstado, InsigniaVisto, Tarjeta, TarjetaVerde, Titulo2 } from "@/ui/piezas";
import {
  anadirParticipanteAccion,
  borrarSorteoAccion,
  editarSorteoAccion,
  marcarMiVistoAccion,
  quitarParticipanteAccion,
  rehacerAccion,
  renombrarParticipanteAccion,
  revelarAccion,
  sortearAccion,
} from "../acciones";
import {
  BotonSortear,
  CopiarEnlace,
  EditarDatos,
  FormularioAnadir,
  Renombrar,
  Revelar,
} from "./clientes";

export const metadata: Metadata = { title: "Sorteo · Amigo Invisible" };

export default function PaginaSorteo({ params }: PageProps<"/sorteos/[id]">) {
  return (
    <main className="mx-auto flex w-full max-w-[1040px] flex-col gap-6 px-4 py-8">
      <Link href="/sorteos" className="text-[15px] font-black text-accent">
        ← Mis Sorteos
      </Link>
      <Suspense fallback={<p className="text-muted">Cargando el Sorteo…</p>}>
        <ContenidoPanel params={params} />
      </Suspense>
    </main>
  );
}

async function ContenidoPanel({ params }: { params: PageProps<"/sorteos/[id]">["params"] }) {
  const [{ id }, org] = await Promise.all([params, requerirOrganizador()]);
  const sorteoId = Number(id);
  if (!Number.isInteger(sorteoId)) notFound();

  let panel: Panel;
  try {
    panel = panelSorteo(getDb(), org.id, sorteoId);
  } catch (e) {
    if (e instanceof ErrorDeDominio) notFound();
    throw e;
  }

  return (
    <>
      <Cabecera panel={panel} />
      {panel.sorteo.estado === "sorteado" ? <PanelSorteado panel={panel} /> : <PanelAbierto panel={panel} />}
    </>
  );
}

function Cabecera({ panel: { sorteo } }: { panel: Panel }) {
  const presupuesto = sorteo.presupuestoCentimos === null ? "" : String(sorteo.presupuestoCentimos / 100).replace(".", ",");
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-[40px] leading-tight font-black">{sorteo.nombre}</h1>
        <InsigniaEstado estado={sorteo.estado} />
      </div>
      <div className="flex flex-wrap gap-5 text-base font-bold text-muted">
        <span>
          Presupuesto:{" "}
          <strong className="font-black text-ink">
            {sorteo.presupuestoCentimos === null ? "sin presupuesto" : formatearPresupuesto(sorteo.presupuestoCentimos)}
          </strong>
        </span>
        <span>
          Fecha de entrega:{" "}
          <strong className="font-black text-ink">{sorteo.fechaEntrega ? formatearFecha(sorteo.fechaEntrega) : "sin fecha"}</strong>
        </span>
        <EditarDatos
          accion={editarSorteoAccion.bind(null, sorteo.id)}
          nombre={sorteo.nombre}
          presupuesto={presupuesto}
          fecha={sorteo.fechaEntrega ?? ""}
        />
      </div>
    </div>
  );
}

const textoGustos: Record<EstadoGustos, string> = {
  completos: "Gustos rellenados",
  "solo-le-gusta": "Solo Le gusta",
  "solo-no-le-gusta": "Solo No le gusta",
  vacios: "Sin gustos todavía",
};

function PanelAbierto({ panel }: { panel: Panel }) {
  const { sorteo, participantes } = panel;
  return (
    <>
      <div className="flex flex-wrap items-start gap-6">
        <Tarjeta className="min-w-0 flex-[999_1_560px] gap-5">
          <div className="flex items-center justify-between gap-3">
            <Titulo2>Sala de espera</Titulo2>
            <span className="rounded-full bg-ink px-3.5 py-1.5 text-base font-black text-white">
              {participantes.length} <span className="font-bold">Participantes</span>
            </span>
          </div>
          <FormularioAnadir accion={anadirParticipanteAccion.bind(null, sorteo.id)} rehace={false} />
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3.5">
            {participantes.map((p, i) => (
              <li key={p.id} className="flex flex-col gap-3 rounded-2xl border-2 border-borde bg-surface p-3.5 shadow-[0_4px_0_var(--color-borde)]">
                <div className="flex items-center gap-2.5">
                  <Avatar nombre={p.nombre} indice={i} />
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-lg font-black">
                      {p.nombre} {p.esOrganizador ? <span className="font-bold text-muted">(tú)</span> : null}
                    </span>
                    <span className="text-[13px] font-bold text-muted">{textoGustos[p.gustos]}</span>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <CopiarEnlace token={p.token} />
                  <Renombrar nombre={p.nombre} accion={renombrarParticipanteAccion.bind(null, sorteo.id, p.id)} />
                  <Confirmar
                    estiloDisparador="inline-flex size-11 flex-none cursor-pointer items-center justify-center rounded-campo border-2 border-[#f2c4bf] bg-danger-soft text-danger shadow-[0_3px_0_#f2c4bf]"
                    etiquetaDisparador={`Quitar a ${p.nombre}`}
                    titulo={`¿Quitar a ${p.nombre}?`}
                    mensaje="Su Enlace personal dejará de funcionar."
                    textoConfirmar="Quitar"
                    accion={quitarParticipanteAccion.bind(null, sorteo.id, p.id)}
                  >
                    <IconoCruz />
                  </Confirmar>
                </div>
              </li>
            ))}
          </ul>
        </Tarjeta>

        <aside className="flex flex-[1_1_280px] flex-col gap-5">
          <TarjetaVerde>
            <h2 className="text-[28px] font-black">¿Listos?</h2>
            <p className="leading-normal font-bold text-accent-soft">
              Se forma una Cadena única: nadie se regala a sí mismo ni hay parejas mutuas. Después, para añadir o quitar a
              alguien habrá que rehacer el sorteo.
            </p>
            <BotonSortear key={participantes.length} accion={sortearAccion.bind(null, sorteo.id)} />
            <span className="text-sm font-extrabold text-accent-soft">Mínimo 3 Participantes.</span>
          </TarjetaVerde>
          <div className="flex flex-col gap-1.5 rounded-tarjeta border-2 border-[#cfe6da] bg-accent-soft p-4.5 leading-normal font-bold">
            <strong className="font-black text-accent">Reparte ya los enlaces</strong>
            <span>Cada uno puede abrir el suyo antes del sorteo y rellenar qué le gusta y qué no.</span>
          </div>
        </aside>
      </div>
      <div className="flex justify-end">
        <BorrarSorteo sorteoId={sorteo.id} nombre={sorteo.nombre} />
      </div>
    </>
  );
}

function PanelSorteado({ panel }: { panel: Panel }) {
  const { sorteo, participantes, miAsignacion, verificacion: v } = panel;
  const vistos = participantes.filter((p) => p.visto).length;
  const checks = [
    { ok: v.recibenVarios === 0 && v.sinRegalo === 0, texto: "Nadie recibe dos regalos" },
    { ok: v.autoregalos === 0, texto: "Nadie se regala a sí mismo" },
    { ok: v.unaSolaCadena && v.parejasMutuas === 0, texto: "Una sola Cadena, sin parejas mutuas" },
  ];

  return (
    <>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-6">
        {miAsignacion ? (
          <TarjetaVerde>
            <MarcarVisto accion={marcarMiVistoAccion.bind(null, sorteo.id)} />
            <span className="text-[13px] font-black tracking-[0.1em] text-[#cfe6da] uppercase">Tu Asignación</span>
            <p className="text-4xl leading-tight font-black">Regalas a {miAsignacion.destinatario}</p>
            <div className="flex flex-col gap-2.5 rounded-[14px] bg-forma-2 p-3.5 leading-normal font-bold">
              <div><strong className="font-black">Le gusta:</strong> {miAsignacion.leGusta || "aún no lo ha contado."}</div>
              <div><strong className="font-black">No le gusta:</strong> {miAsignacion.noLeGusta || "aún no lo ha contado."}</div>
            </div>
          </TarjetaVerde>
        ) : null}

        <Tarjeta>
          <Titulo2>Verificación</Titulo2>
          <div className={`flex items-center gap-4 rounded-2xl p-4 ${v.valida ? "bg-accent-soft text-accent" : "bg-danger-soft text-danger"}`}>
            <span className="text-[52px] leading-none font-black">
              {v.conDestinatario}/{v.total}
            </span>
            <span className="text-[17px] leading-tight font-black">
              {v.valida ? "Cadena válida" : "Algo no cuadra"}
              <br />
              <span className="font-bold">{v.valida ? "todos tienen Destinatario" : "rehaz el sorteo"}</span>
            </span>
          </div>
          <ul className="flex flex-col gap-2.5 font-bold">
            {checks.map((c) => (
              <li key={c.texto} className="flex items-center gap-2.5">
                <span className={`inline-flex size-6.5 flex-none items-center justify-center rounded-full text-white ${c.ok ? "bg-accent" : "bg-danger"}`}>
                  {c.ok ? <IconoCheck /> : <IconoCruz />}
                </span>
                {c.texto}
              </li>
            ))}
          </ul>
          <p className="text-sm font-bold text-muted">La Verificación no muestra nombres.</p>
        </Tarjeta>
      </div>

      <Tarjeta className="gap-4.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Titulo2>Participantes</Titulo2>
          <div className="flex flex-[0_1_320px] items-center gap-2.5">
            <div className="h-3.5 flex-1 rounded-full bg-neutro">
              <div className="h-3.5 rounded-full bg-accent" style={{ width: `${(vistos / participantes.length) * 100}%` }} />
            </div>
            <span className="text-[15px] font-black">
              {vistos}/{participantes.length} lo han visto
            </span>
          </div>
        </div>
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3.5">
          {participantes.map((p, i) => (
            <li key={p.id} className="flex flex-col gap-3 rounded-2xl border-2 border-borde p-3.5 shadow-[0_4px_0_var(--color-borde)]">
              <div className="flex min-w-0 items-center gap-2.5">
                <Avatar nombre={p.nombre} indice={i} />
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate text-[17px] font-black">
                    {p.nombre} {p.esOrganizador ? <span className="font-bold text-muted">(tú)</span> : null}
                  </span>
                  <InsigniaVisto visto={p.visto} />
                </div>
              </div>
              <div className="flex gap-1.5">
                <CopiarEnlace token={p.token} />
                <Renombrar nombre={p.nombre} accion={renombrarParticipanteAccion.bind(null, sorteo.id, p.id)} />
                <Confirmar
                  estiloDisparador="inline-flex size-11 flex-none cursor-pointer items-center justify-center rounded-campo border-2 border-[#f2c4bf] bg-danger-soft text-danger shadow-[0_3px_0_#f2c4bf]"
                  etiquetaDisparador={`Quitar a ${p.nombre}`}
                  titulo={`¿Quitar a ${p.nombre}?`}
                  mensaje="El sorteo ya está hecho: al quitarle se rehará y cambiarán todas las Asignaciones. Su Enlace personal dejará de funcionar."
                  textoConfirmar="Quitar y rehacer"
                  accion={quitarParticipanteAccion.bind(null, sorteo.id, p.id)}
                >
                  <IconoCruz />
                </Confirmar>
              </div>
            </li>
          ))}
        </ul>
      </Tarjeta>

      <Tarjeta>
        <Titulo2>Revelar Asignaciones</Titulo2>
        <Revelar accion={revelarAccion.bind(null, sorteo.id)} />
      </Tarjeta>

      <Tarjeta>
        <div className="flex flex-col gap-2">
          <Titulo2>¿Cambia el grupo?</Titulo2>
          <p className="leading-normal font-bold text-muted">
            Añadir o quitar Participantes rehace el sorteo: cambian todas las Asignaciones y Visto vuelve a cero. Los enlaces
            y los gustos se conservan.
          </p>
        </div>
        <FormularioAnadir accion={anadirParticipanteAccion.bind(null, sorteo.id)} rehace />
        <div className="flex flex-wrap gap-2.5">
          <Confirmar
            estiloDisparador={boton.secundario}
            titulo="¿Rehacer el sorteo?"
            mensaje="Cambiarán todas las Asignaciones y todos tendrán que volver a mirar su enlace."
            textoConfirmar="Rehacer"
            estiloConfirmar={boton.primario}
            accion={rehacerAccion.bind(null, sorteo.id)}
          >
            Rehacer el sorteo
          </Confirmar>
          <BorrarSorteo sorteoId={sorteo.id} nombre={sorteo.nombre} />
        </div>
      </Tarjeta>
    </>
  );
}

function BorrarSorteo({ sorteoId, nombre }: { sorteoId: number; nombre: string }) {
  return (
    <Confirmar
      estiloDisparador={boton.peligro}
      titulo={`¿Borrar «${nombre}»?`}
      mensaje="Se borran los Participantes, sus gustos y las Asignaciones. Los enlaces dejarán de funcionar. No se puede deshacer."
      textoConfirmar="Borrar para siempre"
      accion={borrarSorteoAccion.bind(null, sorteoId)}
    >
      Borrar Sorteo
    </Confirmar>
  );
}
