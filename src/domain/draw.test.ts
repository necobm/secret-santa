import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { openDb, type Db } from "@/db/client";
import { runMigrations } from "@/db/migrate";
import { assignments, draws, organizers, participants } from "@/db/schema";
import { redoDraw, runDraw, verifyDraw } from "./draw";

let db: Db;
let drawId: number;

async function withParticipants(...names: string[]) {
  for (const name of names) {
    await db
      .insert(participants)
      .values({ drawId, name, normalizedName: name.toLocaleLowerCase("es"), token: `t-${name}` })
      .run();
  }
}

const status = async () => (await db.select().from(draws).where(eq(draws.id, drawId)).get())!.status;
const savedChain = () => db.select().from(assignments).where(eq(assignments.drawId, drawId)).all();

beforeEach(async () => {
  db = openDb({ url: ":memory:" });
  await runMigrations(db);
  const org = (await db.insert(organizers).values({ email: "ana@e.com", passwordHash: "x" }).returning().get())!;
  drawId = (await db.insert(draws).values({ organizerId: org.id, name: "Navidad" }).returning().get())!.id;
});

describe("runDraw", () => {
  it("generates a valid Chain and moves the Draw to drawn", async () => {
    await withParticipants("Ana", "Bruno", "Carla", "Diego");
    await runDraw(db, drawId);
    expect(await status()).toBe("drawn");
    expect(await savedChain()).toHaveLength(4);
    expect((await verifyDraw(db, drawId)).valid).toBe(true);
  });

  it("requires at least 3 Participants and changes nothing if it fails", async () => {
    await withParticipants("Ana", "Bruno");
    await expect(runDraw(db, drawId)).rejects.toThrow(expect.objectContaining({ code: "too-few-participants" }));
    expect(await status()).toBe("open");
    expect(await savedChain()).toHaveLength(0);
  });

  it("cannot draw twice", async () => {
    await withParticipants("Ana", "Bruno", "Carla");
    await runDraw(db, drawId);
    await expect(runDraw(db, drawId)).rejects.toThrow(expect.objectContaining({ code: "draw-already-drawn" }));
  });

  it("fails with a non-existent Draw", async () => {
    await expect(runDraw(db, 999)).rejects.toThrow(expect.objectContaining({ code: "draw-not-found" }));
  });
});

describe("redoDraw", () => {
  it("generates a new Chain, keeps links and likes, and resets Seen", async () => {
    await withParticipants("Ana", "Bruno", "Carla", "Diego", "Elena");
    await runDraw(db, drawId);
    await db
      .update(participants)
      .set({ seenAt: new Date(), likes: "café" })
      .where(eq(participants.drawId, drawId))
      .run();
    const before = await db.select().from(participants).all();

    await redoDraw(db, drawId);

    const after = await db.select().from(participants).all();
    expect(after.map((p) => p.token)).toEqual(before.map((p) => p.token));
    expect(after.every((p) => p.likes === "café" && p.seenAt === null)).toBe(true);
    expect(await status()).toBe("drawn");
    expect((await verifyDraw(db, drawId)).valid).toBe(true);
  });

  it("includes anyone added after the draw", async () => {
    await withParticipants("Ana", "Bruno", "Carla");
    await runDraw(db, drawId);
    await withParticipants("Diego");
    expect(await verifyDraw(db, drawId)).toMatchObject({ valid: false, withRecipient: 3 });

    await redoDraw(db, drawId);
    expect(await verifyDraw(db, drawId)).toMatchObject({ valid: true, total: 4 });
  });

  it("only a drawn Draw can be redone", async () => {
    await withParticipants("Ana", "Bruno", "Carla");
    await expect(redoDraw(db, drawId)).rejects.toThrow(expect.objectContaining({ code: "draw-not-drawn" }));
  });

  it("with fewer than 3 Participants left, fails and leaves the Assignments as they were", async () => {
    await withParticipants("Ana", "Bruno", "Carla");
    await runDraw(db, drawId);
    const before = await savedChain();
    await db.delete(participants).where(eq(participants.name, "Carla")).run();
    const afterDelete = await savedChain();

    await expect(redoDraw(db, drawId)).rejects.toThrow(expect.objectContaining({ code: "too-few-participants" }));
    expect(await savedChain()).toEqual(afterDelete);
    expect(afterDelete.length).toBeLessThan(before.length);
  });
});

describe("verifyDraw", () => {
  it("an open Draw is not valid", async () => {
    await withParticipants("Ana", "Bruno", "Carla");
    expect(await verifyDraw(db, drawId)).toMatchObject({ valid: false, withRecipient: 0, total: 3 });
  });
});
