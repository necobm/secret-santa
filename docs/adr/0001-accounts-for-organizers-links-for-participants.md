# Accounts for Organizers, secret links for Participants

The Organizer signs in with email and password, because they manage Draws on an ongoing basis and must always be able to sign back in. Participants do not register: they access the app only through their Personal link, which the Organizer shares through whatever channel they prefer. This way nobody but the Organizer has to sign up, and the system does not need to store Participants' emails.

## Considered Options

- **Everyone has an account**: rejected because it forces every Participant to register just to see one name.
- **Nobody has an account (including the Organizer, with an Organizer link)**: rejected because the link cannot be recovered if lost.

## Consequences

- The first version has no password recovery and no email verification, so no emails need to be sent. If the Organizer forgets their password, they lose access to their Draws. This is accepted deliberately to keep the first version free of an email service.
