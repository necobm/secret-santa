import type { Metadata } from "next";
import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = { title: "Entrar · Amigo Invisible" };

export default function SignInPage() {
  return (
    <main className="relative flex flex-1 flex-col items-center gap-7 overflow-hidden bg-accent px-4 py-14">
      <div aria-hidden="true" className="absolute top-20 -left-15 size-60 rounded-full bg-shape-1" />
      <div aria-hidden="true" className="absolute top-15 right-[8%] size-30 rotate-[20deg] rounded-[28px] bg-shape-2" />
      <svg aria-hidden="true" width="200" height="180" viewBox="0 0 200 180" className="absolute -right-8 bottom-10">
        <path d="M100 0 200 180H0Z" className="fill-shape-1" />
      </svg>
      <div aria-hidden="true" className="absolute -bottom-12 left-[10%] size-40 rounded-full border-[18px] border-shape-2" />

      <div className="relative flex flex-col items-center gap-2.5 text-center text-white">
        <div className="flex size-18 items-center justify-center rounded-[20px] bg-white shadow-[0_6px_0_var(--color-accent-shade)]">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-accent">
            <rect x="3" y="8" width="18" height="4" rx="1" />
            <path d="M12 8v13M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7M7.5 8a2.5 2.5 0 0 1 0-5C10 3 12 8 12 8s2-5 4.5-5a2.5 2.5 0 0 1 0 5" />
          </svg>
        </div>
        <h1 className="text-[52px] leading-tight font-black">Amigo Invisible</h1>
        <p className="text-lg font-bold text-accent-soft">Monta el sorteo. Cada Participante solo necesita su enlace.</p>
      </div>

      <SignInForm />

      <p className="relative max-w-[440px] text-center text-[15px] font-bold text-accent-soft">
        ¿Te han pasado un enlace de Participante? No necesitas cuenta: ábrelo directamente.
      </p>
    </main>
  );
}
