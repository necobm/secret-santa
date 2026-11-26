import Link from "next/link";
import { button } from "@/ui/buttons";
import { BackgroundShapes } from "@/ui/pieces";

export default function NotFound() {
  return (
    <main className="relative flex flex-1 flex-col items-center justify-center gap-6 overflow-hidden bg-accent px-4 py-16 text-center text-white">
      <BackgroundShapes />
      <h1 className="relative text-5xl font-black">Aquí no hay nada</h1>
      <p className="relative max-w-md text-lg font-bold text-accent-soft">
        El enlace no es válido o el Sorteo se ha borrado. Si te lo pasaron, pide a quien organiza que te lo vuelva a enviar.
      </p>
      <Link href="/draws" className={`relative ${button.white}`}>
        Ir a Mis Sorteos
      </Link>
    </main>
  );
}
