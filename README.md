# Secret Santa

App for organizing Secret Santa (*amigo invisible*) draws. Domain vocabulary in `GLOSSARY.md`, decisions in `docs/adr/`, phases in `docs/PLAN.md`.

## Development

```bash
npm install
npm run db:migrate   # creates/updates data/secret-santa.db
npm run organizer:create -- you@example.com   # asks for the password
npm run dev
npm test
```

To change the schema: edit `src/db/schema.ts`, then run `npm run db:generate` and `npm run db:migrate`.

## Database

libSQL via `@libsql/client` (ADR-0004). `TURSO_DATABASE_URL` picks the database; see `.env.example`. Next and the `db:migrate` / `organizer:create` scripts read `.env.local` if it exists; a variable set in the shell takes precedence.

- Local: a SQLite file, `file:data/secret-santa.db` by default. No server or token needed.
- Production: Turso (`libsql://…` plus `TURSO_AUTH_TOKEN`).

## Deployment (Vercel)

1. Create the database: `turso db create secret-santa`, then get its URL (`turso db show secret-santa --url`) and a token (`turso db tokens create secret-santa`).
2. In Vercel, set `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`. Vercel runs `npm run vercel-build`, which applies the migrations before `next build`.
3. Create Organizers from your machine against production:

   ```bash
   TURSO_DATABASE_URL=libsql://… TURSO_AUTH_TOKEN=… npm run organizer:create -- you@example.com
   ```

There is no sign-up in the app: Organizer accounts are created only with `npm run organizer:create` (ADR-0003).
