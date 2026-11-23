import type { ComponentProps, ReactNode } from "react";
import type { EstadoSorteo } from "@/db/schema";

export function Tarjeta({ className = "", ...props }: ComponentProps<"section">) {
  return (
    <section
      className={`flex flex-col gap-4 rounded-tarjeta border-2 border-borde bg-surface p-6 shadow-tarjeta ${className}`}
      {...props}
    />
  );
}

/** Tarjeta verde con formas: los "grandes momentos" (tu Asignación, sortear). */
export function TarjetaVerde({ className = "", children, ...props }: ComponentProps<"section">) {
  return (
    <section
      className={`relative flex flex-col gap-3.5 overflow-hidden rounded-tarjeta bg-accent p-6 text-white shadow-[0_6px_0_var(--color-accent-relieve)] ${className}`}
      {...props}
    >
      <div aria-hidden="true" className="absolute -top-10 -right-10 size-35 rounded-full bg-forma-1" />
      <div aria-hidden="true" className="absolute top-8 right-24 size-10 rotate-[20deg] rounded-[10px] bg-forma-2" />
      <div className="relative flex flex-col gap-3.5">{children}</div>
    </section>
  );
}

export function Titulo2({ children }: { children: ReactNode }) {
  return <h2 className="text-2xl font-black">{children}</h2>;
}

export function Etiqueta({ children }: { children: ReactNode }) {
  return <span className="text-[13px] font-black tracking-[0.1em] uppercase">{children}</span>;
}

const insignia = "inline-flex self-start rounded-full px-3 py-1 text-[13px] font-black tracking-[0.06em] uppercase";

export function InsigniaEstado({ estado }: { estado: EstadoSorteo }) {
  return estado === "sorteado" ? (
    <span className={`${insignia} bg-accent-soft text-accent`}>Sorteado</span>
  ) : (
    <span className={`${insignia} bg-neutro text-ink`}>Abierto</span>
  );
}

export function InsigniaVisto({ visto }: { visto: boolean }) {
  return visto ? (
    <span className={`${insignia} bg-accent-soft px-2.5 py-0.5 text-xs text-accent`}>Visto</span>
  ) : (
    <span className={`${insignia} bg-pendiente-soft px-2.5 py-0.5 text-xs text-pendiente`}>Pendiente</span>
  );
}

const coloresAvatar = ["bg-accent", "bg-danger", "bg-pendiente", "bg-ink"];

export function Avatar({ nombre, indice, grande = false }: { nombre: string; indice: number; grande?: boolean }) {
  const tam = grande ? "size-24 text-5xl shadow-[0_6px_0_rgba(0,0,0,0.25)]" : "size-11 text-xl";
  return (
    <span
      aria-hidden="true"
      className={`inline-flex flex-none items-center justify-center rounded-full font-black text-white ${tam} ${coloresAvatar[indice % coloresAvatar.length]}`}
    >
      {nombre.charAt(0).toLocaleUpperCase("es")}
    </span>
  );
}

export const campo =
  "h-13 w-full rounded-campo border-2 border-borde bg-surface px-4 text-[17px] font-bold text-ink outline-offset-2 focus:border-accent";
export const areaTexto =
  "w-full rounded-campo border-2 border-borde bg-surface px-3.5 py-3 text-[17px] leading-snug font-bold text-ink outline-offset-2 focus:border-accent";

export function Campo({ etiqueta, id, children, ayuda }: { etiqueta: ReactNode; id: string; children: ReactNode; ayuda?: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[15px] font-extrabold">
        {etiqueta}
      </label>
      {children}
      {ayuda ? <span className="text-sm text-muted">{ayuda}</span> : null}
    </div>
  );
}

export function MensajeError({ children }: { children?: ReactNode }) {
  return (
    <p aria-live="polite" className="text-sm font-bold text-danger empty:hidden">
      {children}
    </p>
  );
}

export function Aviso({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`flex flex-col gap-3 rounded-2xl border-2 border-[#f3dfa8] bg-pendiente-soft p-4 text-pendiente ${className}`}>
      {children}
    </div>
  );
}

/** Formas decorativas para pantallas con fondo verde. */
export function FormasDeFondo() {
  return (
    <>
      <div aria-hidden="true" className="absolute top-20 -left-15 size-60 rounded-full bg-forma-1" />
      <div aria-hidden="true" className="absolute top-15 right-[8%] size-30 rotate-[20deg] rounded-[28px] bg-forma-2" />
      <svg aria-hidden="true" width="200" height="180" viewBox="0 0 200 180" className="absolute -right-8 bottom-10">
        <path d="M100 0 200 180H0Z" className="fill-forma-1" />
      </svg>
      <div aria-hidden="true" className="absolute -bottom-12 left-[10%] size-40 rounded-full border-[18px] border-forma-2" />
    </>
  );
}
