import Link from "next/link";
import { boton } from "@/ui/botones";
import { FormasDeFondo } from "@/ui/piezas";

export default function NoEncontrado() {
  return (
    <main className="relative flex flex-1 flex-col items-center justify-center gap-6 overflow-hidden bg-accent px-4 py-16 text-center text-white">
      <FormasDeFondo />
      <h1 className="relative text-5xl font-black">Aquí no hay nada</h1>
      <p className="relative max-w-md text-lg font-bold text-accent-soft">
        El enlace no es válido o el Sorteo se ha borrado. Si te lo pasaron, pide a quien organiza que te lo vuelva a enviar.
      </p>
      <Link href="/sorteos" className={`relative ${boton.blanco}`}>
        Ir a Mis Sorteos
      </Link>
    </main>
  );
}
