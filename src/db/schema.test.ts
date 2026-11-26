import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { openDb, type Db } from "./client";
import { runMigrations } from "./migrate";
import { assignments, draws, organizers, participants } from "./schema";

let db: Db;

/** Drizzle wraps the driver's error; the SQLite message (UNIQUE, CHECK…) is in `cause`. */
const sqliteError = (message: RegExp) =>
  expect.objectContaining({ cause: expect.objectContaining({ message: expect.stringMatching(message) }) });
let drawId: number;

async function newParticipant(name: string, extra: Partial<typeof participants.$inferInsert> = {}) {
  const row = await db
    .insert(participants)
    .values({
      drawId,
      name,
      normalizedName: name.toLocaleLowerCase("es"),
      token: `tok-${name}-${Math.random()}`,
      ...extra,
    })
    .returning()
    .get();
  return row!;
}

beforeEach(async () => {
  db = openDb({ url: ":memory:" });
  await runMigrations(db);
  const org = (await db
    .insert(organizers)
    .values({ email: "ana@ejemplo.com", passwordHash: "x" })
    .returning()
    .get())!;
  drawId = (await db
    .insert(draws)
    .values({ organizerId: org.id, name: "Navidad" })
    .returning()
    .get())!.id;
});

describe("schema", () => {
  it("a new Draw is open, with no Budget or Exchange date", async () => {
    const d = await db.select().from(draws).where(eq(draws.id, drawId)).get();
    expect(d).toMatchObject({ status: "open", budgetCents: null, exchangeDate: null });
  });

  it("rejects two Participants with the same name, case-insensitively", async () => {
    await newParticipant("María");
    await expect(newParticipant("MARÍA")).rejects.toThrow(sqliteError(/UNIQUE/));
  });

  it("allows the same name in different Draws", async () => {
    await newParticipant("Bruno");
    const org2 = (await db.insert(organizers).values({ email: "b@e.com", passwordHash: "x" }).returning().get())!;
    drawId = (await db.insert(draws).values({ organizerId: org2.id, name: "Otro" }).returning().get())!.id;
    await expect(newParticipant("Bruno")).resolves.toMatchObject({ name: "Bruno" });
  });

  it("only one Participant per Draw can be the Organizer", async () => {
    await newParticipant("Ana", { isOrganizer: true });
    await newParticipant("Bruno");
    await expect(newParticipant("Carla", { isOrganizer: true })).rejects.toThrow(sqliteError(/UNIQUE/));
  });

  it("nobody gives to themselves", async () => {
    const a = await newParticipant("Ana");
    await expect(
      db.insert(assignments).values({ drawId, giverId: a.id, recipientId: a.id }).run(),
    ).rejects.toThrow(sqliteError(/CHECK/));
  });

  it("nobody receives twice or gives twice", async () => {
    const [a, b, c] = [await newParticipant("Ana"), await newParticipant("Bruno"), await newParticipant("Carla")];
    await db.insert(assignments).values({ drawId, giverId: a.id, recipientId: b.id }).run();
    await expect(
      db.insert(assignments).values({ drawId, giverId: c.id, recipientId: b.id }).run(),
    ).rejects.toThrow(sqliteError(/UNIQUE/));
    await expect(
      db.insert(assignments).values({ drawId, giverId: a.id, recipientId: c.id }).run(),
    ).rejects.toThrow(sqliteError(/UNIQUE/));
  });

  it("deleting a Draw deletes its Participants and Assignments", async () => {
    const [a, b] = [await newParticipant("Ana"), await newParticipant("Bruno")];
    await db.insert(assignments).values({ drawId, giverId: a.id, recipientId: b.id }).run();
    await db.delete(draws).where(eq(draws.id, drawId)).run();
    expect(await db.select().from(participants).all()).toHaveLength(0);
    expect(await db.select().from(assignments).all()).toHaveLength(0);
  });

  it("rejects a Budget range whose upper end is not above the lower end", async () => {
    for (const set of [{ budgetCents: 3000, budgetMaxCents: 3000 }, { budgetCents: null, budgetMaxCents: 3000 }]) {
      await expect(db.update(draws).set(set).where(eq(draws.id, drawId)).run()).rejects.toThrow(sqliteError(/CHECK/));
    }
  });

  it("rejects a negative Budget", async () => {
    await expect(
      db.update(draws).set({ budgetCents: -1 }).where(eq(draws.id, drawId)).run(),
    ).rejects.toThrow(sqliteError(/CHECK/));
  });
});
