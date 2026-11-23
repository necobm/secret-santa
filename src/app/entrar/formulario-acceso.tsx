"use client";

import { useActionState, useState } from "react";
import { entrar, registrarse, type EstadoAcceso } from "./acciones";

type Modo = "entrar" | "registro";

const pestana =
  "h-12 rounded-campo text-base cursor-pointer aria-selected:bg-surface aria-selected:font-black aria-selected:text-ink aria-selected:shadow-[0_3px_0_#d5d9e0] font-extrabold text-muted";
const campo =
  "h-13 rounded-campo border-2 border-borde px-4 text-[17px] font-bold outline-offset-2 focus:border-accent";
const etiqueta = "text-[15px] font-extrabold";

export function FormularioAcceso() {
  const [modo, setModo] = useState<Modo>("entrar");

  return (
    <div className="relative flex w-full max-w-[440px] flex-col gap-5 rounded-[24px] bg-surface p-7 shadow-[0_8px_0_var(--color-accent-relieve)]">
      <div role="tablist" aria-label="Acceso" className="grid grid-cols-2 gap-1.5 rounded-2xl bg-neutro p-1.5">
        <button type="button" role="tab" aria-selected={modo === "entrar"} onClick={() => setModo("entrar")} className={pestana}>
          Entrar
        </button>
        <button type="button" role="tab" aria-selected={modo === "registro"} onClick={() => setModo("registro")} className={pestana}>
          Crear cuenta
        </button>
      </div>
      {modo === "entrar" ? <Formulario key="entrar" accion={entrar} cta="¡Entrar!" /> : <Formulario key="registro" accion={registrarse} cta="¡Crear cuenta!" repetir />}
    </div>
  );
}

function Formulario({
  accion,
  cta,
  repetir = false,
}: {
  accion: (estado: EstadoAcceso, fd: FormData) => Promise<EstadoAcceso>;
  cta: string;
  repetir?: boolean;
}) {
  const [estado, formAction, pendiente] = useActionState(accion, {});

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className={etiqueta}>Email</label>
        <input id="email" name="email" type="email" autoComplete="email" required defaultValue={estado.email} placeholder="tu@email.com" className={campo} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className={etiqueta}>Contraseña</label>
        <input id="password" name="password" type="password" required autoComplete={repetir ? "new-password" : "current-password"} className={campo} />
      </div>
      {repetir ? (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="password2" className={etiqueta}>Repite la contraseña</label>
          <input id="password2" name="password2" type="password" required autoComplete="new-password" className={campo} />
        </div>
      ) : null}

      <p className="flex gap-2.5 rounded-[14px] bg-pendiente-soft p-3.5 text-sm leading-snug font-bold text-pendiente">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="flex-none">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v4M12 16h.01" />
        </svg>
        No hay recuperación de contraseña. Si la olvidas, pierdes tus Sorteos: guárdala en tu gestor de contraseñas.
      </p>

      <p aria-live="polite" className="text-sm font-bold text-danger empty:hidden">{estado.error}</p>

      <button
        type="submit"
        disabled={pendiente}
        className="h-14 cursor-pointer rounded-boton bg-accent text-[19px] font-black text-white shadow-boton active:translate-y-[3px] active:shadow-[0_2px_0_var(--color-accent-relieve)] disabled:opacity-70"
      >
        {pendiente ? "Un momento…" : cta}
      </button>
    </form>
  );
}
