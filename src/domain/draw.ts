import { and, eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import { assignments, draws, participants } from "@/db/schema";
import { generateChain, MIN_PARTICIPANTS, verify, type Random, type Verification } from "./chain";
import { DomainError } from "./errors";

export { DomainError } from "./errors";

export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

/** Loads the Draw; when an Organizer is given, requires it to be theirs (otherwise "not found"). */
export async function loadDraw(tx: Tx, drawId: number, organizerId?: number) {
  const draw = await tx
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

async function participantIds(tx: Tx, drawId: number) {
  const rows = await tx
    .select({ id: participants.id })
    .from(participants)
    .where(eq(participants.drawId, drawId))
    .all();
  return rows.map((p) => p.id);
}

async function saveChain(tx: Tx, drawId: number, random?: Random) {
  const ids = await participantIds(tx, drawId);
  if (ids.length < MIN_PARTICIPANTS) throw new DomainError("too-few-participants");
  const chain = generateChain(ids, random);
  await tx
    .insert(assignments)
    .values(chain.map((a) => ({ drawId, giverId: a.giver, recipientId: a.recipient })))
    .run();
}

/** Redo within an already open transaction (also used when adding and removing Participants). */
export async function redoInTx(tx: Tx, drawId: number, random?: Random) {
  await tx.delete(assignments).where(eq(assignments.drawId, drawId)).run();
  await tx.update(participants).set({ seenAt: null }).where(eq(participants.drawId, drawId)).run();
  await saveChain(tx, drawId, random);
}

/** Open → Drawn: generates the Chain. */
export async function runDraw(db: Db, drawId: number, options: { organizerId?: number; random?: Random } = {}) {
  await db.transaction(async (tx) => {
    const draw = await loadDraw(tx, drawId, options.organizerId);
    if (draw.status !== "open") throw new DomainError("draw-already-drawn");
    await saveChain(tx, drawId, options.random);
    await tx.update(draws).set({ status: "drawn" }).where(eq(draws.id, drawId)).run();
  });
}

/**
 * Redo the draw: discards all Assignments and generates a new Chain with the current
 * Participants. Keeps Personal links and likes; Seen goes back to pending.
 */
export async function redoDraw(db: Db, drawId: number, options: { organizerId?: number; random?: Random } = {}) {
  await db.transaction(async (tx) => {
    const draw = await loadDraw(tx, drawId, options.organizerId);
    if (draw.status !== "drawn") throw new DomainError("draw-not-drawn");
    await redoInTx(tx, drawId, options.random);
  });
}

/**
 * Reset the draw: Drawn → Open. Discards all Assignments without generating a new Chain.
 * Keeps Participants, Personal links and likes; Seen goes back to pending.
 */
export async function resetDraw(db: Db, drawId: number, options: { organizerId?: number } = {}) {
  await db.transaction(async (tx) => {
    const draw = await loadDraw(tx, drawId, options.organizerId);
    if (draw.status !== "drawn") throw new DomainError("draw-not-drawn");
    await tx.delete(assignments).where(eq(assignments.drawId, drawId)).run();
    await tx.update(participants).set({ seenAt: null }).where(eq(participants.drawId, drawId)).run();
    await tx.update(draws).set({ status: "open" }).where(eq(draws.id, drawId)).run();
  });
}

/** Verification of the Draw as stored. */
export async function verifyDraw(db: Db, drawId: number, organizerId?: number): Promise<Verification> {
  return db.transaction(async (tx) => {
    await loadDraw(tx, drawId, organizerId);
    return verifyInTx(tx, drawId);
  });
}

export async function verifyInTx(tx: Tx, drawId: number): Promise<Verification> {
  const ids = await participantIds(tx, drawId);
  const rows = await tx
    .select({ giver: assignments.giverId, recipient: assignments.recipientId })
    .from(assignments)
    .where(eq(assignments.drawId, drawId))
    .all();
  return verify(ids, rows);
}
