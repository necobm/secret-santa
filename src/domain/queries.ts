import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import type { Db } from "@/db/client";
import { assignments, draws, participants } from "@/db/schema";
import type { Verification } from "./chain";
import { loadDraw, verifyInTx, type Tx } from "./draw";
import { DomainError } from "./errors";
import { likesText } from "./values";

// Reads for the screens. None returns other people's Assignments except `revealAssignments`.

export type LikesStatus = "complete" | "likes-only" | "dislikes-only" | "empty";

const likesStatus = (likes: string, dislikes: string): LikesStatus =>
  likes && dislikes ? "complete" : likes ? "likes-only" : dislikes ? "dislikes-only" : "empty";

export function listDraws(db: Db, organizerId: number) {
  return db
    .select({
      id: draws.id,
      name: draws.name,
      status: draws.status,
      budgetCents: draws.budgetCents,
      budgetMaxCents: draws.budgetMaxCents,
      exchangeDate: draws.exchangeDate,
      participants: sql<number>`count(${participants.id})`,
      seen: sql<number>`count(${participants.seenAt})`,
    })
    .from(draws)
    .leftJoin(participants, eq(participants.drawId, draws.id))
    .where(eq(draws.organizerId, organizerId))
    .groupBy(draws.id)
    .orderBy(desc(draws.createdAt), desc(draws.id))
    .all();
}

export interface Panel {
  draw: typeof draws.$inferSelect;
  participants: {
    id: number;
    name: string;
    token: string;
    isOrganizer: boolean;
    likesStatus: LikesStatus;
    seen: boolean;
  }[];
  /** The Organizer's own Assignment, if they take part and the Draw is drawn. */
  myAssignment: { recipient: string; likes: string; dislikes: string } | null;
  verification: Verification;
}

export function drawPanel(db: Db, organizerId: number, drawId: number): Panel {
  return db.transaction((tx) => {
    const draw = loadDraw(tx, drawId, organizerId);
    const rows = tx
      .select()
      .from(participants)
      .where(eq(participants.drawId, drawId))
      .orderBy(desc(participants.isOrganizer), participants.createdAt, participants.id)
      .all();

    const me = rows.find((p) => p.isOrganizer);
    const target = alias(participants, "target");
    const mine = me
      ? tx
          .select({ recipient: target.name, likes: target.likes, dislikes: target.dislikes })
          .from(assignments)
          .innerJoin(target, eq(target.id, assignments.recipientId))
          .where(and(eq(assignments.drawId, drawId), eq(assignments.giverId, me.id)))
          .get()
      : undefined;

    return {
      draw,
      participants: rows.map((p) => ({
        id: p.id,
        name: p.name,
        token: p.token,
        isOrganizer: p.isOrganizer,
        likesStatus: likesStatus(p.likes, p.dislikes),
        seen: p.seenAt !== null,
      })),
      myAssignment: mine ?? null,
      verification: verifyInTx(tx, drawId),
    };
  });
}

/** Every Assignment with names, in Chain order. Only after confirming "Reveal". */
export function revealAssignments(db: Db, organizerId: number, drawId: number) {
  return db.transaction((tx) => {
    loadDraw(tx, drawId, organizerId);
    const giver = alias(participants, "giver");
    const recipient = alias(participants, "recipient");
    const rows = tx
      .select({
        fromId: assignments.giverId,
        toId: assignments.recipientId,
        from: giver.name,
        to: recipient.name,
        fromIsOrganizer: giver.isOrganizer,
      })
      .from(assignments)
      .innerJoin(giver, eq(giver.id, assignments.giverId))
      .innerJoin(recipient, eq(recipient.id, assignments.recipientId))
      .where(eq(assignments.drawId, drawId))
      .all();
    if (rows.length === 0) return [];

    // Walk the Chain starting from the Organizer, if they take part.
    const byGiver = new Map(rows.map((r) => [r.fromId, r]));
    const start = rows.find((r) => r.fromIsOrganizer) ?? rows[0];
    const order: { from: string; to: string }[] = [];
    let current: (typeof rows)[number] | undefined = start;
    while (current && order.length < rows.length) {
      order.push({ from: current.from, to: current.to });
      current = byGiver.get(current.toId);
      if (current === start) break;
    }
    return order;
  });
}

/** Marks the Organizer's Assignment as Seen (when they view it in their panel). */
export function markOrganizerSeen(db: Db, organizerId: number, drawId: number) {
  db.transaction((tx) => {
    const draw = loadDraw(tx, drawId, organizerId);
    if (draw.status !== "drawn") return;
    tx.update(participants)
      .set({ seenAt: new Date() })
      .where(and(eq(participants.drawId, drawId), eq(participants.isOrganizer, true), isNull(participants.seenAt)))
      .run();
  });
}

// --- Personal link ---

function participantByToken(db: Db | Tx, token: string) {
  const p = db.select().from(participants).where(eq(participants.token, token)).get();
  if (!p) throw new DomainError("link-not-found");
  return p;
}

/** What a Participant sees through their Personal link. */
export function viewLink(db: Db, token: string) {
  return db.transaction((tx) => {
    const me = participantByToken(tx, token);
    const draw = tx.select().from(draws).where(eq(draws.id, me.drawId)).get()!;
    const target = alias(participants, "target");
    const recipient =
      draw.status === "drawn"
        ? (tx
            .select({ name: target.name, likes: target.likes, dislikes: target.dislikes })
            .from(assignments)
            .innerJoin(target, eq(target.id, assignments.recipientId))
            .where(eq(assignments.giverId, me.id))
            .get() ?? null)
        : null;
    return {
      draw: {
        name: draw.name,
        status: draw.status,
        budgetCents: draw.budgetCents,
        budgetMaxCents: draw.budgetMaxCents,
        exchangeDate: draw.exchangeDate,
      },
      participant: { name: me.name, likes: me.likes, dislikes: me.dislikes },
      recipient,
    };
  });
}

/** The Participant has seen their current Assignment (only the first time counts). */
export function markSeen(db: Db, token: string) {
  const me = participantByToken(db, token);
  const has = db.select().from(assignments).where(eq(assignments.giverId, me.id)).get();
  if (!has || me.seenAt) return;
  db.update(participants).set({ seenAt: new Date() }).where(eq(participants.id, me.id)).run();
}

export function saveLikes(db: Db, token: string, likes: string, dislikes: string) {
  const me = participantByToken(db, token);
  db.update(participants)
    .set({ likes: likesText(likes), dislikes: likesText(dislikes) })
    .where(eq(participants.id, me.id))
    .run();
}
