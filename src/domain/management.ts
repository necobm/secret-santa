import { randomBytes } from "node:crypto";
import { and, eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import { draws, participants } from "@/db/schema";
import type { Random } from "./chain";
import { loadDraw, redoInTx, type Tx } from "./draw";
import { DomainError } from "./errors";
import { budget, drawName, exchangeDate, likesText, participantName } from "./values";

// The Organizer's operations on their Draws. All of them require the Draw to be theirs.

export interface DrawInput {
  name: string;
  /** Text as the Organizer types it ("30", "25,50"); empty = no Budget. */
  budget: string;
  /** Upper end of a Budget range, same format; empty = a single amount. */
  budgetMax: string;
  /** YYYY-MM-DD; empty = no Exchange date. */
  exchangeDate: string;
}

const newToken = () => randomBytes(18).toString("base64url");

function validateInput(input: DrawInput) {
  return {
    name: drawName(input.name),
    ...budget(input.budget, input.budgetMax),
    exchangeDate: exchangeDate(input.exchangeDate),
  };
}

async function findByNormalizedName(tx: Tx, drawId: number, normalizedName: string) {
  return tx
    .select({ id: participants.id })
    .from(participants)
    .where(and(eq(participants.drawId, drawId), eq(participants.normalizedName, normalizedName)))
    .get();
}

async function insertParticipant(tx: Tx, drawId: number, input: string, isOrganizer = false) {
  const { name, normalizedName } = participantName(input);
  if (await findByNormalizedName(tx, drawId, normalizedName)) throw new DomainError("duplicate-name");
  const row = await tx
    .insert(participants)
    .values({ drawId, name, normalizedName, token: newToken(), isOrganizer })
    .returning({ id: participants.id })
    .get();
  return row!.id;
}

/** Creates an open Draw. With `organizerName`, the Organizer also joins as a Participant. */
export async function createDraw(db: Db, organizerId: number, input: DrawInput & { organizerName: string | null }) {
  const values = validateInput(input);
  return db.transaction(async (tx) => {
    const row = await tx
      .insert(draws)
      .values({ organizerId, ...values })
      .returning({ id: draws.id })
      .get();
    const drawId = row!.id;
    if (input.organizerName !== null) await insertParticipant(tx, drawId, input.organizerName, true);
    return drawId;
  });
}

export async function editDraw(db: Db, organizerId: number, drawId: number, input: DrawInput) {
  const values = validateInput(input);
  await db.transaction(async (tx) => {
    await loadDraw(tx, drawId, organizerId);
    await tx.update(draws).set(values).where(eq(draws.id, drawId)).run();
  });
}

export async function deleteDraw(db: Db, organizerId: number, drawId: number) {
  await db.transaction(async (tx) => {
    await loadDraw(tx, drawId, organizerId);
    await tx.delete(draws).where(eq(draws.id, drawId)).run();
  });
}

/** If the Draw is already drawn, adding redoes the draw in the same operation. */
export async function addParticipant(db: Db, organizerId: number, drawId: number, name: string, random?: Random) {
  return db.transaction(async (tx) => {
    const draw = await loadDraw(tx, drawId, organizerId);
    const id = await insertParticipant(tx, drawId, name);
    if (draw.status === "drawn") await redoInTx(tx, drawId, random);
    return id;
  });
}

async function loadParticipant(tx: Tx, drawId: number, participantId: number) {
  const p = await tx
    .select()
    .from(participants)
    .where(and(eq(participants.id, participantId), eq(participants.drawId, drawId)))
    .get();
  if (!p) throw new DomainError("participant-not-found");
  return p;
}

/** If the Draw is already drawn, removing redoes the draw (and fails if fewer than 3 would remain). */
export async function removeParticipant(
  db: Db,
  organizerId: number,
  drawId: number,
  participantId: number,
  random?: Random,
) {
  await db.transaction(async (tx) => {
    const draw = await loadDraw(tx, drawId, organizerId);
    await loadParticipant(tx, drawId, participantId);
    await tx.delete(participants).where(eq(participants.id, participantId)).run();
    if (draw.status === "drawn") await redoInTx(tx, drawId, random);
  });
}

export interface ParticipantInput {
  name: string;
  likes: string;
  dislikes: string;
}

/** The Organizer edits a Participant's name and Likes / Dislikes. It does not touch the Chain, so it is always allowed. */
export async function editParticipant(
  db: Db,
  organizerId: number,
  drawId: number,
  participantId: number,
  input: ParticipantInput,
) {
  await db.transaction(async (tx) => {
    await loadDraw(tx, drawId, organizerId);
    await loadParticipant(tx, drawId, participantId);
    const values = participantName(input.name);
    const duplicate = await findByNormalizedName(tx, drawId, values.normalizedName);
    if (duplicate && duplicate.id !== participantId) throw new DomainError("duplicate-name");
    await tx
      .update(participants)
      .set({ ...values, likes: likesText(input.likes), dislikes: likesText(input.dislikes) })
      .where(eq(participants.id, participantId))
      .run();
  });
}
