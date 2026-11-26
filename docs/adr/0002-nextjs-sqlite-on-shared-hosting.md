# Next.js + SQLite on shared hosting with Node.js

**Superseded by ADR-0004** (Vercel with Turso).

The app is deployed on shared hosting that supports Node.js apps (Passenger), so we use Next.js with SQLite in a single file on the server, with no separate database service. SQLite is a "for now" choice: it fits the hosting and the expected volume, and does not rule out moving to Postgres later.

## Considered Options

- **PHP (Laravel) + SQLite**: works on any shared hosting, but rejected because this hosting supports Node.js and TypeScript is preferred.
- **Postgres**: rejected for now because the shared hosting does not offer it easily.

## Consequences

- We assume a single Node process with write access to the SQLite file. If the hosting starts several processes or restarts on an ephemeral filesystem, this decision must be revisited.
- The database file must live outside the public directory and be included in backups.
