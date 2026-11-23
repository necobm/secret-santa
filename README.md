# Amigo Invisible

App for organizing Secret Santa (*amigo invisible*) draws. Domain vocabulary in `GLOSSARY.md`, decisions in `docs/adr/`, phases in `docs/PLAN.md`.

## Development

```bash
npm install
npm run db:migrate   # creates/updates data/secret-santa.db
npm run dev
npm test
```

To change the schema: edit `src/db/schema.ts`, then run `npm run db:generate` and `npm run db:migrate`.
