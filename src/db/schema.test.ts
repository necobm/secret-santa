import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { openDb, type Db } from "./client";
import { runMigrations } from "./migrate";
import { assignments, draws, organizers, participants } from "./schema";

let db: Db;
let drawId: number;

function newParticipant(name: string, extra: Partial<typeof participants.$inferInsert> = {}) {
  return db
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
}

beforeEach(() => {
  db = openDb(":memory:");
  runMigrations(db);
  const org = db
    .insert(organizers)
    .values({ email: "ana@ejemplo.com", passwordHash: "x" })
    .returning()
    .get();
  drawId = db
    .insert(draws)
    .values({ organizerId: org.id, name: "Navidad" })
    .returning()
    .get().id;
});

describe("schema", () => {
  it("a new Draw is open, with no Budget or Exchange date", () => {
    const d = db.select().from(draws).where(eq(draws.id, drawId)).get();
    expect(d).toMatchObject({ status: "open", budgetCents: null, exchangeDate: null });
  });

  it("rejects two Participants with the same name, case-insensitively", () => {
    newParticipant("María");
    expect(() => newParticipant("MARÍA")).toThrow(/UNIQUE/);
  });

  it("allows the same name in different Draws", () => {
    newParticipant("Bruno");
    const org2 = db.insert(organizers).values({ email: "b@e.com", passwordHash: "x" }).returning().get();
    drawId = db.insert(draws).values({ organizerId: org2.id, name: "Otro" }).returning().get().id;
    expect(() => newParticipant("Bruno")).not.toThrow();
  });

  it("only one Participant per Draw can be the Organizer", () => {
    newParticipant("Ana", { isOrganizer: true });
    newParticipant("Bruno");
    expect(() => newParticipant("Carla", { isOrganizer: true })).toThrow(/UNIQUE/);
  });

  it("nobody gives to themselves", () => {
    const a = newParticipant("Ana");
    expect(() =>
      db.insert(assignments).values({ drawId, giverId: a.id, recipientId: a.id }).run(),
    ).toThrow(/CHECK/);
  });

  it("nobody receives twice or gives twice", () => {
    const [a, b, c] = ["Ana", "Bruno", "Carla"].map((n) => newParticipant(n));
    db.insert(assignments).values({ drawId, giverId: a.id, recipientId: b.id }).run();
    expect(() =>
      db.insert(assignments).values({ drawId, giverId: c.id, recipientId: b.id }).run(),
    ).toThrow(/UNIQUE/);
    expect(() =>
      db.insert(assignments).values({ drawId, giverId: a.id, recipientId: c.id }).run(),
    ).toThrow(/UNIQUE/);
  });

  it("deleting a Draw deletes its Participants and Assignments", () => {
    const [a, b] = ["Ana", "Bruno"].map((n) => newParticipant(n));
    db.insert(assignments).values({ drawId, giverId: a.id, recipientId: b.id }).run();
    db.delete(draws).where(eq(draws.id, drawId)).run();
    expect(db.select().from(participants).all()).toHaveLength(0);
    expect(db.select().from(assignments).all()).toHaveLength(0);
  });

  it("rejects a Budget range whose upper end is not above the lower end", () => {
    for (const set of [{ budgetCents: 3000, budgetMaxCents: 3000 }, { budgetCents: null, budgetMaxCents: 3000 }]) {
      expect(() => db.update(draws).set(set).where(eq(draws.id, drawId)).run()).toThrow(/CHECK/);
    }
  });

  it("rejects a negative Budget", () => {
    expect(() =>
      db.update(draws).set({ budgetCents: -1 }).where(eq(draws.id, drawId)).run(),
    ).toThrow(/CHECK/);
  });
});
