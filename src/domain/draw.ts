import { and, eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import { assignments, draws, participants } from "@/db/schema";
import { generateChain, MIN_PARTICIPANTS, verify, type Random, type Verification } from "./chain";
import { DomainError } from "./errors";

export { DomainError } from "./errors";

export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

/** Loads the Draw; when an Organizer is given, requires it to be theirs (otherwise "not found"). */
export function loadDraw(tx: Tx, drawId: number, organizerId?: number) {
  const draw = tx
    .select()
    .from(draws)
    .where(
      organizerId === undefined
        ? eq(draws.id, drawId)
        : and(eq(draws.id, drawId), eq(draws.organizerId, organizerId)),
    )
    .get();
  if (!draw) throw new DomainError("draw-not-found");
  return draw;
}

function participantIds(tx: Tx, drawId: number) {
  return tx
    .select({ id: participants.id })
    .from(participants)
    .where(eq(participants.drawId, drawId))
    .all()
    .map((p) => p.id);
}

function saveChain(tx: Tx, drawId: number, random?: Random) {
  const ids = participantIds(tx, drawId);
  if (ids.length < MIN_PARTICIPANTS) throw new DomainError("too-few-participants");
  const chain = generateChain(ids, random);
  tx.insert(assignments)
    .values(chain.map((a) => ({ drawId, giverId: a.giver, recipientId: a.recipient })))
    .run();
}

/** Redo within an already open transaction (also used when adding and removing Participants). */
export function redoInTx(tx: Tx, drawId: number, random?: Random) {
  tx.delete(assignments).where(eq(assignments.drawId, drawId)).run();
  tx.update(participants).set({ seenAt: null }).where(eq(participants.drawId, drawId)).run();
  saveChain(tx, drawId, random);
}

/** Open → Drawn: generates the Chain. */
export function runDraw(db: Db, drawId: number, options: { organizerId?: number; random?: Random } = {}) {
  db.transaction((tx) => {
    const draw = loadDraw(tx, drawId, options.organizerId);
    if (draw.status !== "open") throw new DomainError("draw-already-drawn");
    saveChain(tx, drawId, options.random);
    tx.update(draws).set({ status: "drawn" }).where(eq(draws.id, drawId)).run();
  });
}

/**
 * Redo the draw: discards all Assignments and generates a new Chain with the current
 * Participants. Keeps Personal links and likes; Seen goes back to pending.
 */
export function redoDraw(db: Db, drawId: number, options: { organizerId?: number; random?: Random } = {}) {
  db.transaction((tx) => {
    const draw = loadDraw(tx, drawId, options.organizerId);
    if (draw.status !== "drawn") throw new DomainError("draw-not-drawn");
    redoInTx(tx, drawId, options.random);
  });
}

/** Verification of the Draw as stored. */
export function verifyDraw(db: Db, drawId: number, organizerId?: number): Verification {
  return db.transaction((tx) => {
    loadDraw(tx, drawId, organizerId);
    return verifyInTx(tx, drawId);
  });
}

export function verifyInTx(tx: Tx, drawId: number): Verification {
  const ids = participantIds(tx, drawId);
  const rows = tx
    .select({ giver: assignments.giverId, recipient: assignments.recipientId })
    .from(assignments)
    .where(eq(assignments.drawId, drawId))
    .all();
  return verify(ids, rows);
}
