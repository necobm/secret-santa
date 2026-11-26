import { randomBytes } from "node:crypto";
import { and, eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import { draws, participants } from "@/db/schema";
import type { Random } from "./chain";
import { loadDraw, redoInTx, type Tx } from "./draw";
import { DomainError } from "./errors";
import { budget, drawName, exchangeDate, participantName } from "./values";

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

function findByNormalizedName(tx: Tx, drawId: number, normalizedName: string) {
  return tx
    .select({ id: participants.id })
    .from(participants)
    .where(and(eq(participants.drawId, drawId), eq(participants.normalizedName, normalizedName)))
    .get();
}

function insertParticipant(tx: Tx, drawId: number, input: string, isOrganizer = false) {
  const { name, normalizedName } = participantName(input);
  if (findByNormalizedName(tx, drawId, normalizedName)) throw new DomainError("duplicate-name");
  return tx
    .insert(participants)
    .values({ drawId, name, normalizedName, token: newToken(), isOrganizer })
    .returning({ id: participants.id })
    .get().id;
}

/** Creates an open Draw. With `organizerName`, the Organizer also joins as a Participant. */
export function createDraw(db: Db, organizerId: number, input: DrawInput & { organizerName: string | null }) {
  const values = validateInput(input);
  return db.transaction((tx) => {
    const drawId = tx
      .insert(draws)
      .values({ organizerId, ...values })
      .returning({ id: draws.id })
      .get().id;
    if (input.organizerName !== null) insertParticipant(tx, drawId, input.organizerName, true);
    return drawId;
  });
}

export function editDraw(db: Db, organizerId: number, drawId: number, input: DrawInput) {
  const values = validateInput(input);
  db.transaction((tx) => {
    loadDraw(tx, drawId, organizerId);
    tx.update(draws).set(values).where(eq(draws.id, drawId)).run();
  });
}

export function deleteDraw(db: Db, organizerId: number, drawId: number) {
  db.transaction((tx) => {
    loadDraw(tx, drawId, organizerId);
    tx.delete(draws).where(eq(draws.id, drawId)).run();
  });
}

/** If the Draw is already drawn, adding redoes the draw in the same operation. */
export function addParticipant(db: Db, organizerId: number, drawId: number, name: string, random?: Random) {
  return db.transaction((tx) => {
    const draw = loadDraw(tx, drawId, organizerId);
    const id = insertParticipant(tx, drawId, name);
    if (draw.status === "drawn") redoInTx(tx, drawId, random);
    return id;
  });
}

function loadParticipant(tx: Tx, drawId: number, participantId: number) {
  const p = tx
    .select()
    .from(participants)
    .where(and(eq(participants.id, participantId), eq(participants.drawId, drawId)))
    .get();
  if (!p) throw new DomainError("participant-not-found");
  return p;
}

/** If the Draw is already drawn, removing redoes the draw (and fails if fewer than 3 would remain). */
export function removeParticipant(
  db: Db,
  organizerId: number,
  drawId: number,
  participantId: number,
  random?: Random,
) {
  db.transaction((tx) => {
    const draw = loadDraw(tx, drawId, organizerId);
    loadParticipant(tx, drawId, participantId);
    tx.delete(participants).where(eq(participants.id, participantId)).run();
    if (draw.status === "drawn") redoInTx(tx, drawId, random);
  });
}

/** Renaming does not touch the Chain, so it is always allowed. */
export function renameParticipant(
  db: Db,
  organizerId: number,
  drawId: number,
  participantId: number,
  name: string,
) {
  db.transaction((tx) => {
    loadDraw(tx, drawId, organizerId);
    loadParticipant(tx, drawId, participantId);
    const values = participantName(name);
    const duplicate = findByNormalizedName(tx, drawId, values.normalizedName);
    if (duplicate && duplicate.id !== participantId) throw new DomainError("duplicate-name");
    tx.update(participants).set(values).where(eq(participants.id, participantId)).run();
  });
}
