import { NextResponse, type NextRequest } from "next/server";

// Comprobación optimista: sin cookie de sesión no hay nada que ver en el área del Organizador.
// La comprobación de verdad (sesión válida en BD) está en requerirOrganizador() y en cada Server Action.
// El nombre de la cookie debe coincidir con COOKIE_SESION de src/cuentas/sesion.ts.
export function proxy(request: NextRequest) {
  if (!request.cookies.has("sesion")) {
    return NextResponse.redirect(new URL("/entrar", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/sorteos/:path*"],
};
