import type { ComponentProps, ReactNode } from "react";
import type { DrawStatus } from "@/db/schema";

export function Card({ className = "", ...props }: ComponentProps<"section">) {
  return (
    <section
      className={`flex flex-col gap-4 rounded-card border-2 border-border bg-surface p-6 shadow-card ${className}`}
      {...props}
    />
  );
}

/** Green card with shapes: the "big moments" (your Assignment, running the draw). */
export function GreenCard({ className = "", children, ...props }: ComponentProps<"section">) {
  return (
    <section
      className={`relative flex flex-col gap-3.5 overflow-hidden rounded-card bg-accent p-6 text-white shadow-[0_6px_0_var(--color-accent-shade)] ${className}`}
      {...props}
    >
      <div aria-hidden="true" className="absolute -top-10 -right-10 size-35 rounded-full bg-shape-1" />
      <div aria-hidden="true" className="absolute top-8 right-24 size-10 rotate-[20deg] rounded-[10px] bg-shape-2" />
      <div className="relative flex flex-col gap-3.5">{children}</div>
    </section>
  );
}

export function Heading2({ children }: { children: ReactNode }) {
  return <h2 className="text-2xl font-black">{children}</h2>;
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <span className="text-[13px] font-black tracking-[0.1em] uppercase">{children}</span>;
}

const badge = "inline-flex self-start rounded-full px-3 py-1 text-[13px] font-black tracking-[0.06em] uppercase";

export function StatusBadge({ status }: { status: DrawStatus }) {
  return status === "drawn" ? (
    <span className={`${badge} bg-accent-soft text-accent`}>Sorteado</span>
  ) : (
    <span className={`${badge} bg-neutral text-ink`}>Abierto</span>
  );
}

export function SeenBadge({ seen }: { seen: boolean }) {
  return seen ? (
    <span className={`${badge} bg-accent-soft px-2.5 py-0.5 text-xs text-accent`}>Visto</span>
  ) : (
    <span className={`${badge} bg-pending-soft px-2.5 py-0.5 text-xs text-pending`}>Pendiente</span>
  );
}

const avatarColors = ["bg-accent", "bg-danger", "bg-pending", "bg-ink"];

export function Avatar({ name, index, large = false }: { name: string; index: number; large?: boolean }) {
  const size = large ? "size-24 text-5xl shadow-[0_6px_0_rgba(0,0,0,0.25)]" : "size-11 text-xl";
  return (
    <span
      aria-hidden="true"
      className={`inline-flex flex-none items-center justify-center rounded-full font-black text-white ${size} ${avatarColors[index % avatarColors.length]}`}
    >
      {name.charAt(0).toLocaleUpperCase("es")}
    </span>
  );
}

export const input =
  "h-13 w-full rounded-field border-2 border-border bg-surface px-4 text-[17px] font-bold text-ink outline-offset-2 focus:border-accent";
export const textArea =
  "w-full rounded-field border-2 border-border bg-surface px-3.5 py-3 text-[17px] leading-snug font-bold text-ink outline-offset-2 focus:border-accent";

export function Field({ label, id, children, help }: { label: ReactNode; id: string; children: ReactNode; help?: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[15px] font-extrabold">
        {label}
      </label>
      {children}
      {help ? <span className="text-sm text-muted">{help}</span> : null}
    </div>
  );
}

export function ErrorMessage({ children }: { children?: ReactNode }) {
  return (
    <p aria-live="polite" className="text-sm font-bold text-danger empty:hidden">
      {children}
    </p>
  );
}

export function Notice({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`flex flex-col gap-3 rounded-2xl border-2 border-[#f3dfa8] bg-pending-soft p-4 text-pending ${className}`}>
      {children}
    </div>
  );
}

/** Decorative shapes for screens with a green background. */
export function BackgroundShapes() {
  return (
    <>
      <div aria-hidden="true" className="absolute top-20 -left-15 size-60 rounded-full bg-shape-1" />
      <div aria-hidden="true" className="absolute top-15 right-[8%] size-30 rotate-[20deg] rounded-[28px] bg-shape-2" />
      <svg aria-hidden="true" width="200" height="180" viewBox="0 0 200 180" className="absolute -right-8 bottom-10">
        <path d="M100 0 200 180H0Z" className="fill-shape-1" />
      </svg>
      <div aria-hidden="true" className="absolute -bottom-12 left-[10%] size-40 rounded-full border-[18px] border-shape-2" />
    </>
  );
}
