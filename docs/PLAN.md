# Plan

Domain model in `GLOSSARY.md`; decisions in `docs/adr/`.

## Phases

1. **Frontend design with Claude Design** — before writing any UI code, design the screens in Claude Design and settle the **design spec** (color/typography/spacing tokens, components and screens). The frontend is implemented from that spec, not the other way around.
   Canvas (v2 "game show style", **approved** 2026-11-20): https://claude.ai/artifact/HojtqxiWmoPVp4Gpe9jjrT
   Minimum screens:
   - Organizer sign-up / sign-in
   - Organizer's list of Draws
   - Create Draw (name, Budget, Exchange date, "I'm not participating" checkbox)
   - Draw panel — Open state (Participants, copy Personal links, draw)
   - Draw panel — Drawn state (Verification, Seen/pending, your Assignment, Reveal, Redo the draw, delete)
   - Personal link page — before the draw ("not drawn yet") and after (Recipient + their Likes / Dislikes); editing one's own likes
2. **Skeleton** — Next.js + SQLite (ADR-0002), schema and migrations. **Done** 2026-11-20.
   - Next.js 16 (App Router, `output: "standalone"`), Tailwind 4 with the spec's tokens in `src/app/globals.css`, Nunito.
   - Drizzle ORM + better-sqlite3: schema in `src/db/schema.ts`, SQL migrations in `drizzle/` (`npm run db:generate` / `npm run db:migrate`), DB at `DATABASE_PATH` (defaults to `data/secret-santa.db`).
   - The constraints the DB can guarantee (case-insensitive unique name, a single Organizer-Participant, no self-gifting, nobody receives twice) live in the schema, with tests in `src/db/schema.test.ts`. The single Chain is the domain's job (phase 3).
   - Watch out: with `cacheComponents`, call `connection()` before querying SQLite in Server Components.
3. **Domain** — Chain generation and Verification, with tests. **Done** 2026-11-20.
   - `src/dominio/cadena.ts`: `generarCadena` (shuffles with `crypto.randomInt` and closes the ring: all Chains are equally likely) and `verificar` (counts only, no names).
   - `src/dominio/sorteo.ts`: `sortear`, `rehacerSorteo` and `verificarSorteo`, transactional, with `ErrorDeDominio` and error codes.
4. **Organizer account** — sign-up and sign-in with email and password (no recovery, ADR-0001). **Done** 2026-11-20.
   - `src/cuentas/cuentas.ts`: sign-up, `autenticar`, sessions in the DB (`sesiones` table, storing only the SHA-256 hash of the token; 30 days). Passwords with Node's scrypt (`password.ts`).
   - `src/cuentas/sesion.ts` (server-only): httpOnly `sesion` cookie, `organizadorActual()` (React `cache`) and `requerirOrganizador()`. Every Organizer Server Action must call `requerirOrganizador()`.
   - `src/proxy.ts`: optimistic redirect from `/sorteos/*` to `/entrar` when there is no cookie.
   - `/entrar` screen (Sign in / Create account tabs) per the design spec; provisional `/sorteos`; `/` redirects to `/sorteos`.
   - Login attempt limit (brute force), added 2026-11-23: `src/cuentas/acceso.ts`, fixed 15-minute window, 5 attempts per email and 20 per IP, stored in the `intentos_acceso` table. The attempt is counted before the password is checked, so parallel requests cannot bypass it; a successful login resets the email counter. The IP comes from `X-Forwarded-For` (spoofable without a proxy; the email limit does not depend on it).
5. **Screen implementation** per the phase 1 design spec. **Done** 2026-11-20.
   - Routes: `/sorteos` (My Draws), `/sorteos/nuevo`, `/sorteos/[id]` (Open / Drawn panel), `/p/[token]` (Personal link, `noindex`).
   - New domain modules: `gestion.ts` (create/edit/delete Draw, add/remove/rename Participant), `consultas.ts` (listings, panel, reveal, Personal link, likes, Seen), `valores.ts` (validation and formatting), `errores.ts`.
   - Base UI in `src/ui/` (raised buttons as explicit variants, cards, badges, avatars, `Confirmar` with `<dialog>`).
   - Seen is marked from the client (`MarcarVisto`) so that neither Next's prefetch nor WhatsApp link previews count as Seen.
   - Tested with a full flow in Chrome (Playwright, script outside the repo): 19 steps with no errors.
   - Decided: once the Draw is Drawn, adding or removing a Participant redoes the draw in the same operation, after confirmation ("all Assignments will change").
   - Decided: redoing may repeat the previous Chain (a different one is not forced).
6. **Deployment** to the shared hosting (Node.js via Passenger). Copy `public/`, `.next/static/` and `drizzle/` next to `.next/standalone/` and apply migrations on startup or with a script.
