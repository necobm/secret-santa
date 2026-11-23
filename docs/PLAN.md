# Plan

Modelo del dominio en `GLOSSARY.md`; decisiones en `docs/adr/`.

## Fases

1. **Diseño del frontend con Claude Design** — antes de escribir código de UI, diseñar las pantallas en Claude Design y fijar el **design spec** (tokens de color/tipografía/espaciado, componentes y pantallas). El frontend se implementa a partir de ese spec, no al revés.
   Canvas (v2 "estilo concurso", **aprobado** 2026-11-20): https://claude.ai/artifact/HojtqxiWmoPVp4Gpe9jjrT
   Pantallas mínimas:
   - Registro / login del Organizador
   - Lista de Sorteos del Organizador
   - Crear Sorteo (nombre, Presupuesto, Fecha de entrega, casilla "no participo")
   - Panel del Sorteo — estado Abierto (Participantes, copiar Enlaces personales, sortear)
   - Panel del Sorteo — estado Sorteado (Verificación, Visto/pendiente, tu Asignación, Revelar, Rehacer el sorteo, borrar)
   - Página del Enlace personal — antes del sorteo ("todavía no se ha sorteado") y después (Destinatario + sus Le gusta / No le gusta); edición de los propios gustos
2. **Esqueleto** — Next.js + SQLite (ADR-0002), esquema y migraciones. **Hecho** 2026-11-20.
   - Next.js 16 (App Router, `output: "standalone"`), Tailwind 4 con los tokens del spec en `src/app/globals.css`, Nunito.
   - Drizzle ORM + better-sqlite3: esquema en `src/db/schema.ts`, migraciones SQL en `drizzle/` (`npm run db:generate` / `npm run db:migrate`), BD en `DATABASE_PATH` (por defecto `data/secret-santa.db`).
   - Las restricciones que puede garantizar la BD (nombre único sin mayúsculas, un solo Participante-Organizador, sin autorregalo, nadie recibe dos veces) están en el esquema con tests en `src/db/schema.test.ts`. La Cadena única es cosa del dominio (fase 3).
   - Ojo: con `cacheComponents`, llamar a `connection()` antes de consultar SQLite en Server Components.
3. **Dominio** — generación de la Cadena y Verificación, con tests. **Hecho** 2026-11-20.
   - `src/dominio/cadena.ts`: `generarCadena` (baraja con `crypto.randomInt` y cierra el anillo: todas las Cadenas equiprobables) y `verificar` (solo recuentos, sin nombres).
   - `src/dominio/sorteo.ts`: `sortear`, `rehacerSorteo` y `verificarSorteo`, transaccionales, con `ErrorDeDominio` y códigos.
4. **Cuenta de organizador** — registro y login con email y contraseña (sin recuperación, ADR-0001). **Hecho** 2026-11-20.
   - `src/cuentas/cuentas.ts`: registro, `autenticar`, sesiones en BD (tabla `sesiones`, solo el hash SHA-256 del token; 30 días). Contraseñas con scrypt de Node (`password.ts`).
   - `src/cuentas/sesion.ts` (server-only): cookie httpOnly `sesion`, `organizadorActual()` (React `cache`) y `requerirOrganizador()`. Toda Server Action del Organizador debe llamar a `requerirOrganizador()`.
   - `src/proxy.ts`: redirección optimista de `/sorteos/*` a `/entrar` si no hay cookie.
   - Pantalla `/entrar` (pestañas Entrar / Crear cuenta) según el design spec; `/sorteos` provisional; `/` redirige a `/sorteos`.
   - Pendiente: límite de intentos de login (fuerza bruta).
5. **Implementación de pantallas** según el design spec de la fase 1. **Hecho** 2026-11-20.
   - Rutas: `/sorteos` (Mis Sorteos), `/sorteos/nuevo`, `/sorteos/[id]` (panel Abierto / Sorteado), `/p/[token]` (Enlace personal, `noindex`).
   - Dominio nuevo: `gestion.ts` (crear/editar/borrar Sorteo, añadir/quitar/renombrar Participante), `consultas.ts` (listados, panel, revelar, Enlace personal, gustos, Visto), `valores.ts` (validación y formato), `errores.ts`.
   - UI base en `src/ui/` (botones con relieve como variantes explícitas, tarjetas, insignias, avatares, `Confirmar` con `<dialog>`).
   - Visto se marca desde el cliente (`MarcarVisto`) para que ni el prefetch de Next ni las vistas previas de WhatsApp cuenten como Visto.
   - Probado con un flujo completo en Chrome (Playwright, script fuera del repo): 19 pasos sin errores.
   - Decidido: con el Sorteo Sorteado, añadir o quitar un Participante rehace el sorteo en la misma operación, tras confirmar ("cambiarán todas las Asignaciones").
   - Decidido: rehacer puede repetir la Cadena anterior (no se fuerza una distinta).
6. **Despliegue** en el hosting compartido (Node.js vía Passenger). Copiar `public/`, `.next/static/` y `drizzle/` junto a `.next/standalone/` y aplicar migraciones al arrancar o con un script.
