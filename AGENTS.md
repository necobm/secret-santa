<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Secret Santa (Amigo Invisible)

This file is the source of truth for agent instructions. `CLAUDE.md` only imports it.

- Domain vocabulary: `GLOSSARY.md`. Use its English terms in code and conversation, and its Spanish terms in the UI.
- Decisions: `docs/adr/`. Phases and status: `docs/PLAN.md`.
- Approved design (design spec v2): https://claude.ai/artifact/HojtqxiWmoPVp4Gpe9jjrT — the tokens are in `src/app/globals.css`.
- Engram memory: project `secret-santa`.

## Language

Everything in the repository is written in **English**, whatever language the developer speaks to you in: identifiers, comments, file and folder names, routes, CSS tokens, database tables and columns, migration names, test names, commit messages and docs.

The only exception is text shown to users (labels, messages, errors, page metadata). The app's users are Spanish, so that text stays in Spanish.

## Skills

Always load them when the task falls within their scope, before writing code:

- `vercel-react-best-practices` — when writing, reviewing or refactoring any React component, page, layout, data fetching, Server Action or Next.js route handler.
- `vercel-composition-patterns` — when designing or refactoring component APIs (compound components, contexts, too many boolean props).

If a rule from these skills contradicts the documentation for the installed Next version (`node_modules/next/dist/docs/`), the documentation wins.
