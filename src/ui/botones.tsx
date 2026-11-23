import type { ComponentProps } from "react";

// Botones con relieve del design spec: sombra sólida debajo que se "hunde" al pulsar.
// Variantes explícitas en vez de props booleanas; para enlaces, usar las clases de `boton`.

const base =
  "inline-flex h-13 cursor-pointer items-center justify-center gap-2 rounded-boton px-5 text-[17px] font-black transition-transform active:translate-y-[3px] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:translate-y-0";

export const boton = {
  primario: `${base} bg-accent text-white shadow-boton active:shadow-[0_2px_0_var(--color-accent-relieve)]`,
  secundario: `${base} border-2 border-borde bg-surface text-ink shadow-boton-neutro active:shadow-[0_2px_0_var(--color-borde)]`,
  peligro: `${base} bg-danger text-white shadow-boton-danger active:shadow-[0_2px_0_var(--color-danger-relieve)]`,
  oscuro: `${base} bg-ink text-white shadow-[0_5px_0_#000] active:shadow-[0_2px_0_#000]`,
  /** Sobre fondo verde. */
  blanco: `${base} bg-white text-accent shadow-boton active:shadow-[0_2px_0_var(--color-accent-relieve)]`,
} as const;

type Props = ComponentProps<"button">;
const con = (estilo: string) =>
  function Boton({ className = "", type = "button", ...props }: Props) {
    return <button type={type} className={`${estilo} ${className}`} {...props} />;
  };

export const BotonPrimario = con(boton.primario);
export const BotonSecundario = con(boton.secundario);
export const BotonPeligro = con(boton.peligro);
export const BotonOscuro = con(boton.oscuro);
export const BotonBlanco = con(boton.blanco);

/** Botón cuadrado con solo un icono (lleva siempre aria-label). */
export function BotonIcono({ className = "", ...props }: Props & { "aria-label": string }) {
  return (
    <button
      type="button"
      className={`inline-flex size-11 flex-none cursor-pointer items-center justify-center rounded-campo border-2 border-borde bg-surface text-muted shadow-[0_3px_0_var(--color-borde)] active:translate-y-[2px] active:shadow-[0_1px_0_var(--color-borde)] ${className}`}
      {...props}
    />
  );
}
