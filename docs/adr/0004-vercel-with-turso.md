# Vercel with Turso (libSQL)

Supersedes ADR-0002. The app is deployed on Vercel instead of the shared hosting. Vercel runs the app as serverless functions: the filesystem is read-only except `/tmp`, which is ephemeral and private to each instance, so a SQLite file on disk would lose data and differ between instances. We keep SQLite as the dialect but move the database to Turso, a hosted libSQL (SQLite-compatible) service, accessed with `@libsql/client` and `drizzle-orm/libsql`.

The same driver opens a local SQLite file, so development and tests need no server: `TURSO_DATABASE_URL` picks the database (`libsql://…` with `TURSO_AUTH_TOKEN` in production, `file:data/secret-santa.db` by default, `:memory:` in tests).

## Considered Options

- **SQLite file on Vercel (`/tmp`)**: rejected, data would not persist nor be shared between instances.
- **Postgres (Neon, via the Vercel Marketplace)**: rejected because it means rewriting the schema with `pg-core` and regenerating the migrations, with no benefit at this volume.
- **Keeping the file-based SQLite on a host with a persistent disk (VPS, Fly.io volume)**: rejected because we want Vercel.

## Consequences

- Every query is asynchronous (libSQL is reached over the network), so the domain and account functions return promises and transactions take an `async` callback.
- Drizzle wraps driver errors in `DrizzleQueryError`: the SQLite message (`UNIQUE`, `CHECK`, `no such table`) is in `error.cause`.
- Migrations run on every Vercel deployment (`vercel-build` script), against the database configured for that environment. Preview deployments use the production database unless they are given their own `TURSO_*` variables.
- Scripts (`db:migrate`, `organizer:create`) run from a developer's machine with the production `TURSO_*` variables; no shell access to the server is needed.
- Sign-in attempt limits and sessions already live in the database, so they keep working across instances.
- Backups are Turso's (point-in-time restore on its side) instead of copying a file.
