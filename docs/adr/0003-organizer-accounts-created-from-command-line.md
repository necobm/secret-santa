# Organizer accounts are created only from the command line

Amends ADR-0001. The app has no sign-up: only a few trusted people organize Draws, so there is no reason to let anyone on the internet create an account. Organizer accounts are created by whoever runs the server, with `npm run organizer:create -- <email>`, which asks for the password without echoing it. The web app only offers sign-in.

## Considered Options

- **Public sign-up (the original behaviour)**: rejected because anyone could create an account and use the app.
- **Sign-up with an invitation code**: rejected as unnecessary for so few Organizers; it adds a secret to manage and a screen to maintain.
- **An admin screen in the app to create Organizers**: rejected for now; it needs a role model (admins vs. Organizers) that the app does not otherwise need.

## Consequences

- Every Organizer is equally an admin: there are no roles.
- Creating an account requires access to the database. Since ADR-0004 that means running the script from a developer's machine with the production `TURSO_*` variables; no shell on the server is needed.
- There is still no password recovery from the web. Since accounts are managed from the command line, a password-reset command would be the natural way to add it later.
