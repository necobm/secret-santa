import Link from "next/link";
import { Suspense } from "react";
import { organizadorActual } from "@/cuentas/sesion";
import { IconoRegalo } from "@/ui/iconos";
import { salir } from "../entrar/acciones";

export default function LayoutOrganizador({ children }: LayoutProps<"/sorteos">) {
  return (
    <>
      <header className="bg-accent text-white">
        <div className="mx-auto flex min-h-17 max-w-[1040px] flex-wrap items-center justify-between gap-3 px-4">
          <Link href="/sorteos" className="flex items-center gap-2.5 text-[22px] font-black">
            <IconoRegalo tam={26} />
            Amigo Invisible
          </Link>
          {/* La sesión se lee aquí dentro, para no bloquear el resto de la página. */}
          <Suspense fallback={null}>
            <Cuenta />
          </Suspense>
        </div>
      </header>
      {children}
    </>
  );
}

async function Cuenta() {
  const org = await organizadorActual();
  if (!org) return null;
  return (
    <form action={salir} className="flex items-center gap-4 text-[15px] font-bold">
      <span className="max-w-[50vw] truncate">{org.email}</span>
      <button type="submit" className="cursor-pointer font-black underline-offset-4 hover:underline">
        Salir
      </button>
    </form>
  );
}
