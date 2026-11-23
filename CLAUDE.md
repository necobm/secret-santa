@AGENTS.md

# Secret Santa (Amigo Invisible)

- Domain vocabulary: `GLOSSARY.md` (use it in code, UI and conversation; code and UI use the Spanish terms).
- Decisions: `docs/adr/`. Phases and status: `docs/PLAN.md`.
- Approved design (design spec v2): https://claude.ai/artifact/HojtqxiWmoPVp4Gpe9jjrT — the tokens are in `src/app/globals.css`.
- Engram memory: project `secret-santa`.

## Skills

Always load them when the task falls within their scope, before writing code:

- `vercel-react-best-practices` — when writing, reviewing or refactoring any React component, page, layout, data fetching, Server Action or Next.js route handler.
- `vercel-composition-patterns` — when designing or refactoring component APIs (compound components, contexts, too many boolean props).

If a rule from these skills contradicts the documentation for the installed Next version (`node_modules/next/dist/docs/`), the documentation wins.
