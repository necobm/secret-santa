import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { openDb, type Db } from "@/db/client";
import { runMigrations } from "@/db/migrate";
import { assignments, draws, organizers, participants } from "@/db/schema";
import { redoDraw, runDraw, verifyDraw } from "./draw";

let db: Db;
let drawId: number;

function withParticipants(...names: string[]) {
  for (const name of names) {
    db.insert(participants)
      .values({ drawId, name, normalizedName: name.toLocaleLowerCase("es"), token: `t-${name}` })
      .run();
  }
}

const status = () => db.select().from(draws).where(eq(draws.id, drawId)).get()!.status;
const savedChain = () => db.select().from(assignments).where(eq(assignments.drawId, drawId)).all();

beforeEach(() => {
  db = openDb(":memory:");
  runMigrations(db);
  const org = db.insert(organizers).values({ email: "ana@e.com", passwordHash: "x" }).returning().get();
  drawId = db.insert(draws).values({ organizerId: org.id, name: "Navidad" }).returning().get().id;
});

describe("runDraw", () => {
  it("generates a valid Chain and moves the Draw to drawn", () => {
    withParticipants("Ana", "Bruno", "Carla", "Diego");
    runDraw(db, drawId);
    expect(status()).toBe("drawn");
    expect(savedChain()).toHaveLength(4);
    expect(verifyDraw(db, drawId).valid).toBe(true);
  });

  it("requires at least 3 Participants and changes nothing if it fails", () => {
    withParticipants("Ana", "Bruno");
    expect(() => runDraw(db, drawId)).toThrow(expect.objectContaining({ code: "too-few-participants" }));
    expect(status()).toBe("open");
    expect(savedChain()).toHaveLength(0);
  });

  it("cannot draw twice", () => {
    withParticipants("Ana", "Bruno", "Carla");
    runDraw(db, drawId);
    expect(() => runDraw(db, drawId)).toThrow(expect.objectContaining({ code: "draw-already-drawn" }));
  });

  it("fails with a non-existent Draw", () => {
    expect(() => runDraw(db, 999)).toThrow(expect.objectContaining({ code: "draw-not-found" }));
  });
});

describe("redoDraw", () => {
  it("generates a new Chain, keeps links and likes, and resets Seen", () => {
    withParticipants("Ana", "Bruno", "Carla", "Diego", "Elena");
    runDraw(db, drawId);
    db.update(participants)
      .set({ seenAt: new Date(), likes: "café" })
      .where(eq(participants.drawId, drawId))
      .run();
    const before = db.select().from(participants).all();

    redoDraw(db, drawId);

    const after = db.select().from(participants).all();
    expect(after.map((p) => p.token)).toEqual(before.map((p) => p.token));
    expect(after.every((p) => p.likes === "café" && p.seenAt === null)).toBe(true);
    expect(status()).toBe("drawn");
    expect(verifyDraw(db, drawId).valid).toBe(true);
  });

  it("includes anyone added after the draw", () => {
    withParticipants("Ana", "Bruno", "Carla");
    runDraw(db, drawId);
    withParticipants("Diego");
    expect(verifyDraw(db, drawId)).toMatchObject({ valid: false, withRecipient: 3 });

    redoDraw(db, drawId);
    expect(verifyDraw(db, drawId)).toMatchObject({ valid: true, total: 4 });
  });

  it("only a drawn Draw can be redone", () => {
    withParticipants("Ana", "Bruno", "Carla");
    expect(() => redoDraw(db, drawId)).toThrow(expect.objectContaining({ code: "draw-not-drawn" }));
  });

  it("with fewer than 3 Participants left, fails and leaves the Assignments as they were", () => {
    withParticipants("Ana", "Bruno", "Carla");
    runDraw(db, drawId);
    const before = savedChain();
    db.delete(participants).where(eq(participants.name, "Carla")).run();
    const afterDelete = savedChain();

    expect(() => redoDraw(db, drawId)).toThrow(expect.objectContaining({ code: "too-few-participants" }));
    expect(savedChain()).toEqual(afterDelete);
    expect(afterDelete.length).toBeLessThan(before.length);
  });
});

describe("verifyDraw", () => {
  it("an open Draw is not valid", () => {
    withParticipants("Ana", "Bruno", "Carla");
    expect(verifyDraw(db, drawId)).toMatchObject({ valid: false, withRecipient: 0, total: 3 });
  });
});
