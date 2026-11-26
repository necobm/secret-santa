# Secret Santa

Organizing Secret Santa (*amigo invisible*) draws: a group of people is randomly assigned who gives a gift to whom.

Code, the database and conversation use the English term; the UI uses the Spanish term in parentheses.

## Language

**Draw** (*Sorteo*):
A Secret Santa event with its group of Participants and, once drawn, its Assignments.
_Avoid_: Event, group, match, game

**Organizer** (*Organizador*):
The person who creates and manages a Draw from their Organizer account. Can see all of its Assignments and is usually also a Participant.
_Avoid_: Admin, creator, owner (every Organizer is equally an admin; there are no roles)

**Participant** (*Participante*):
A person included in a Draw, who gives a gift to someone and receives one. Identified only by their name.
_Avoid_: User, player, member

**Assignment** (*Asignación*):
The relation "Participant A gives to Participant B" within a Draw.
_Avoid_: Pairing, match, couple

**Giver / Recipient** (*Regalador / Destinatario*):
The two roles in an Assignment: who gives and who receives.
_Avoid_: Santa, sender, receiver

**Personal link** (*Enlace personal*):
A Participant's secret URL, through which they see only their own Assignment. The Organizer shares it through whatever channel they prefer, and can replace it with a new one if it is lost or leaked: the old one stops working, while the Assignment, Likes / Dislikes and Seen are kept.
_Avoid_: Token, invitation, access link

**Organizer account** (*Cuenta de organizador*):
The email and password an Organizer uses to sign in and manage their Draws. Created only from the command line (ADR-0003); there is no sign-up. Participants have no account.
_Avoid_: User, profile, login, Organizer link

## Draw

**Chain** (*Cadena*):
The shape a Draw's Assignments must have: a single cycle through every Participant (A→B→C→…→A), with no mutual pairs.
_Avoid_: Round, circle

**Redo the draw** (*Rehacer el sorteo*):
Discard all of a Draw's Assignments and generate a new Chain. It is the only way to change the Participants once drawn.
_Avoid_: Redraw, readjust

**Reset the draw** (*Reiniciar el sorteo*):
Discard all of a Draw's Assignments without generating a new Chain, taking the Draw back to Open. Participants, Personal links and Likes / Dislikes are kept; Seen goes back to pending.
_Avoid_: Undo, cancel

**Verification** (*Verificación*):
A summary confirming that the Assignments form a valid Chain, without showing any names.
_Avoid_: Validation, check

**Reveal** (*Revelar*):
The Organizer's explicit action to see all Assignments with their names. The Organizer's own Assignment is also hidden in their panel until they reveal it, so it is not seen when sharing the screen.
_Avoid_: Show results, unveil

**Budget** (*Presupuesto*):
The suggested amount per gift in euros — a single amount or a range (e.g. 20–30 €) — optional and shared by the whole Draw.
_Avoid_: Limit, maximum price

**Exchange date** (*Fecha de entrega*):
The day the gifts are exchanged.
_Avoid_: Due date, deadline

## Participant

**Likes / Dislikes** (*Le gusta / No le gusta*):
Two free-text fields each Participant writes about themselves to guide their Giver. The Organizer can also edit them.
_Avoid_: Wish list, wishlist, preferences

**Seen** (*Visto*):
Indicates that a Participant has opened their Personal link after the draw.
_Avoid_: Read, confirmed
