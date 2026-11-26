import type { Metadata } from "next";
import Link from "next/link";
import { NewDrawForm } from "./form";

export const metadata: Metadata = { title: "Nuevo Sorteo · Amigo Invisible" };

export default function NewDrawPage() {
  return (
    <main className="mx-auto flex w-full max-w-[580px] flex-col gap-6 px-4 py-10">
      <Link href="/draws" className="text-[15px] font-black text-accent">
        ← Mis Sorteos
      </Link>
      <h1 className="text-[40px] font-black">Nuevo Sorteo</h1>
      <NewDrawForm />
    </main>
  );
}
