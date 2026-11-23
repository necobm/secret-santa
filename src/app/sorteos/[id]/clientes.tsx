"use client";

import { useActionState, useId, useRef, useState, useTransition } from "react";
import { BotonBlanco, BotonIcono, BotonOscuro, BotonPrimario, BotonSecundario } from "@/ui/botones";
import { IconoLapiz } from "@/ui/iconos";
import { Aviso, Campo, campo, MensajeError } from "@/ui/piezas";
import type { Resultado } from "../acciones";

type AccionFormulario = (estado: Resultado, fd: FormData) => Promise<Resultado>;

const urlEnlace = (token: string) => `${window.location.origin}/p/${token}`;

function useCopiar(token: string) {
  const [copiado, setCopiado] = useState(false);
  const copiar = async () => {
    await navigator.clipboard.writeText(urlEnlace(token));
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1800);
  };
  return { copiado, copiar };
}

export function CopiarEnlace({ token }: { token: string }) {
  const { copiado, copiar } = useCopiar(token);
  return (
    <button
      type="button"
      onClick={copiar}
      className="h-11 flex-1 cursor-pointer rounded-campo border-2 border-borde bg-surface text-sm font-extrabold shadow-[0_3px_0_var(--color-borde)] active:translate-y-[2px] active:shadow-[0_1px_0_var(--color-borde)]"
    >
      <span aria-live="polite">{copiado ? "¡Copiado!" : "Copiar enlace"}</span>
    </button>
  );
}

/** Abre un <dialog> para renombrar a un Participante. */
export function Renombrar({ nombre, accion }: { nombre: string; accion: AccionFormulario }) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const idCampo = useId();
  const [estado, enviar, pendiente] = useActionState(async (prev: Resultado, fd: FormData) => {
    const r = await accion(prev, fd);
    if (!r.error) dialogo.current?.close();
    return r;
  }, {});

  return (
    <>
      <BotonIcono aria-label={`Renombrar a ${nombre}`} onClick={() => dialogo.current?.showModal()}>
        <IconoLapiz />
      </BotonIcono>
      <dialog ref={dialogo} className="m-auto w-[min(440px,calc(100vw-32px))] rounded-tarjeta bg-surface p-0 text-ink backdrop:bg-ink/50">
        <form action={enviar} className="flex flex-col gap-4 p-6">
          <h2 className="text-2xl font-black">Renombrar</h2>
          <Campo id={idCampo} etiqueta="Nombre">
            <input id={idCampo} name="nombre" required maxLength={40} defaultValue={estado.valor ?? nombre} className={campo} />
          </Campo>
          <p className="text-sm text-muted">Cambiar el nombre no cambia ninguna Asignación.</p>
          <MensajeError>{estado.error}</MensajeError>
          <div className="flex flex-wrap gap-2.5">
            <BotonPrimario type="submit" disabled={pendiente}>Guardar</BotonPrimario>
            <BotonSecundario onClick={() => dialogo.current?.close()}>Cancelar</BotonSecundario>
          </div>
        </form>
      </dialog>
    </>
  );
}

/** Formulario para añadir Participantes. Con el Sorteo Sorteado avisa de que se rehará. */
export function FormularioAnadir({ accion, rehace }: { accion: AccionFormulario; rehace: boolean }) {
  const [estado, enviar, pendiente] = useActionState(accion, {});
  return (
    <form action={enviar} className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2.5">
        <label htmlFor="nuevo" className="sr-only">Nombre del nuevo Participante</label>
        <input id="nuevo" name="nombre" required maxLength={40} placeholder="Escribe un nombre…" defaultValue={estado.valor} className={`${campo} min-w-0 flex-[1_1_220px]`} />
        <BotonOscuro type="submit" disabled={pendiente}>{rehace ? "Añadir y rehacer el sorteo" : "Añadir"}</BotonOscuro>
      </div>
      <MensajeError>{estado.error}</MensajeError>
    </form>
  );
}

export function BotonSortear({ accion }: { accion: () => Promise<Resultado> }) {
  const [error, setError] = useState<string>();
  const [pendiente, iniciar] = useTransition();
  return (
    <>
      <BotonBlanco
        disabled={pendiente}
        className="h-15 text-[22px]"
        onClick={() => iniciar(async () => setError((await accion()).error))}
      >
        {pendiente ? "Sorteando…" : "¡Sortear!"}
      </BotonBlanco>
      {error ? <p aria-live="polite" className="rounded-xl bg-white px-3 py-2 text-sm font-bold text-danger">{error}</p> : null}
    </>
  );
}

/** Editar nombre, Presupuesto y Fecha de entrega del Sorteo. */
export function EditarDatos({
  accion,
  nombre,
  presupuesto,
  fecha,
}: {
  accion: AccionFormulario;
  nombre: string;
  presupuesto: string;
  fecha: string;
}) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const [estado, enviar, pendiente] = useActionState(async (prev: Resultado, fd: FormData) => {
    const r = await accion(prev, fd);
    if (!r.error) dialogo.current?.close();
    return r;
  }, {});
  return (
    <>
      <button type="button" onClick={() => dialogo.current?.showModal()} className="cursor-pointer font-black text-accent">
        Editar
      </button>
      <dialog ref={dialogo} className="m-auto w-[min(480px,calc(100vw-32px))] rounded-tarjeta bg-surface p-0 text-ink backdrop:bg-ink/50">
        <form action={enviar} className="flex flex-col gap-4 p-6">
          <h2 className="text-2xl font-black">Datos del Sorteo</h2>
          <Campo id="editar-nombre" etiqueta="Nombre del Sorteo">
            <input id="editar-nombre" name="nombre" required maxLength={80} defaultValue={nombre} className={campo} />
          </Campo>
          <Campo id="editar-presupuesto" etiqueta="Presupuesto (€, opcional)">
            <input id="editar-presupuesto" name="presupuesto" inputMode="decimal" defaultValue={presupuesto} className={campo} />
          </Campo>
          <Campo id="editar-fecha" etiqueta="Fecha de entrega (opcional)">
            <input id="editar-fecha" name="fecha" type="date" defaultValue={fecha} className={campo} />
          </Campo>
          <MensajeError>{estado.error}</MensajeError>
          <div className="flex flex-wrap gap-2.5">
            <BotonPrimario type="submit" disabled={pendiente}>Guardar</BotonPrimario>
            <BotonSecundario onClick={() => dialogo.current?.close()}>Cancelar</BotonSecundario>
          </div>
        </form>
      </dialog>
    </>
  );
}

type Fase = { tipo: "oculto" } | { tipo: "confirmar" } | { tipo: "revelado"; cadena: { de: string; para: string }[] };

export function Revelar({ accion }: { accion: () => Promise<{ de: string; para: string }[]> }) {
  const [fase, setFase] = useState<Fase>({ tipo: "oculto" });
  const [pendiente, iniciar] = useTransition();

  if (fase.tipo === "oculto") {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex-[1_1_320px] font-bold text-muted">
          Muestra quién regala a quién, con nombres. Úsalo solo si necesitas comprobar algo a mano.
        </p>
        <BotonOscuro onClick={() => setFase({ tipo: "confirmar" })}>Revelar</BotonOscuro>
      </div>
    );
  }
  if (fase.tipo === "confirmar") {
    return (
      <Aviso>
        <strong className="text-lg font-black">¡Ojo! Verás también quién te regala a ti.</strong>
        <span className="font-bold">Se te estropeará la sorpresa. ¿Seguro?</span>
        <div className="flex flex-wrap gap-2.5">
          <BotonOscuro
            disabled={pendiente}
            onClick={() => iniciar(async () => setFase({ tipo: "revelado", cadena: await accion() }))}
          >
            {pendiente ? "Revelando…" : "Sí, revelar"}
          </BotonOscuro>
          <BotonSecundario onClick={() => setFase({ tipo: "oculto" })}>Cancelar</BotonSecundario>
        </div>
      </Aviso>
    );
  }
  return (
    <div className="flex flex-col gap-3.5">
      <ol className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-2.5">
        {fase.cadena.map((a) => (
          <li key={a.de} className="flex items-center gap-2.5 rounded-[14px] border-2 border-borde px-3.5 py-3 text-[17px] font-extrabold">
            <span>{a.de}</span>
            <span aria-label="regala a" className="font-black text-accent">→</span>
            <span className="font-black">{a.para}</span>
          </li>
        ))}
      </ol>
      <BotonSecundario className="self-start" onClick={() => setFase({ tipo: "oculto" })}>Ocultar</BotonSecundario>
    </div>
  );
}

