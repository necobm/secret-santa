import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { openDb, type Db } from "@/db/client";
import { runMigrations } from "@/db/migrate";
import { draws, organizers, participants } from "@/db/schema";
import { runDraw, verifyDraw } from "./draw";
import {
  addParticipant,
  createDraw,
  deleteDraw,
  editParticipant,
  editDraw,
  removeParticipant,
} from "./management";
import {
  drawPanel,
  listDraws,
  markOrganizerSeen,
  markSeen,
  revealAssignments,
  saveLikes,
  viewLink,
} from "./queries";
import { formatBudget, formatDate } from "./values";

let db: Db;
let ana: number;
let other: number;

const code = (c: string) => expect.objectContaining({ code: c });
const input = { name: "Navidad", budget: "30", budgetMax: "", exchangeDate: "2026-12-24" };

async function drawWith(...names: string[]) {
  const id = await createDraw(db, ana, { ...input, organizerName: names[0] ?? null });
  for (const n of names.slice(1)) await addParticipant(db, ana, id, n);
  return id;
}
const byName = async (name: string) =>
  (await db.select().from(participants).where(eq(participants.name, name)).get())!;
const tokenOf = async (name: string) => (await byName(name)).token;
const drawById = async (id: number) => (await db.select().from(draws).where(eq(draws.id, id)).get())!;
const allParticipants = () => db.select().from(participants).all();

beforeEach(async () => {
  db = openDb({ url: ":memory:" });
  await runMigrations(db);
  const organizer = async (email: string) =>
    (await db.insert(organizers).values({ email, passwordHash: "x" }).returning().get())!.id;
  ana = await organizer("ana@e.com");
  other = await organizer("otro@e.com");
});

describe("createDraw", () => {
  it("creates an open Draw with the Organizer as a Participant", async () => {
    const id = await createDraw(db, ana, { ...input, name: "  Navidad   familia ", organizerName: "Ana" });
    const d = await drawById(id);
    expect(d).toMatchObject({ name: "Navidad familia", status: "open", budgetCents: 3000, exchangeDate: "2026-12-24" });
    expect(await allParticipants()).toMatchObject([{ name: "Ana", isOrganizer: true }]);
  });

  it("with 'I'm not participating' it does not add the Organizer", async () => {
    await createDraw(db, ana, { ...input, organizerName: null });
    expect(await allParticipants()).toHaveLength(0);
  });

  it("Budget and Exchange date are optional and accept a decimal comma", async () => {
    const a = await createDraw(db, ana, { name: "A", budget: "", budgetMax: "", exchangeDate: "", organizerName: null });
    const b = await createDraw(db, ana, { name: "B", budget: "25,50 €", budgetMax: "", exchangeDate: "", organizerName: null });
    const [da, dbRow] = [await drawById(a), await drawById(b)];
    expect(da).toMatchObject({ budgetCents: null, budgetMaxCents: null, exchangeDate: null });
    expect(dbRow).toMatchObject({ budgetCents: 2550, budgetMaxCents: null });
  });

  it.each([
    ["20", "30", 2000, 3000],
    ["", "30", 3000, null],
    ["30", "30", 3000, null],
  ])("Budget from %o to %o is stored as %o–%o", async (budget, budgetMax, cents, maxCents) => {
    const id = await createDraw(db, ana, { ...input, budget, budgetMax, organizerName: null });
    const d = await drawById(id);
    expect(d).toMatchObject({ budgetCents: cents, budgetMaxCents: maxCents });
  });

  it.each([
    [{ name: "  " }, "invalid-draw-name"],
    [{ budget: "-5" }, "invalid-budget"],
    [{ budget: "mucho" }, "invalid-budget"],
    [{ budget: "20", budgetMax: "mucho" }, "invalid-budget"],
    [{ budget: "30", budgetMax: "20" }, "invalid-budget-range"],
    [{ exchangeDate: "2026-02-30" }, "invalid-date"],
    [{ exchangeDate: "24/12/2026" }, "invalid-date"],
  ])("validates input %o", async (change, error) => {
    await expect(createDraw(db, ana, { ...input, ...change, organizerName: null })).rejects.toThrow(code(error));
  });
});

describe("Participants", () => {
  it("rejects duplicate names case-insensitively, accents included", async () => {
    const id = await drawWith("María");
    await expect(addParticipant(db, ana, id, "  MARÍA ")).rejects.toThrow(code("duplicate-name"));
  });

  it("each Participant has a different Personal link", async () => {
    await drawWith("Ana", "Bruno", "Carla");
    const tokens = (await allParticipants()).map((p) => p.token);
    expect(new Set(tokens).size).toBe(3);
  });

  it("adding to a drawn Draw redoes the draw", async () => {
    const id = await drawWith("Ana", "Bruno", "Carla");
    await runDraw(db, id);
    await markSeen(db, await tokenOf("Bruno"));
    await addParticipant(db, ana, id, "Diego");
    expect(await verifyDraw(db, id)).toMatchObject({ valid: true, total: 4 });
    expect((await allParticipants()).every((p) => p.seenAt === null)).toBe(true);
  });

  it("removing from a drawn Draw redoes the draw", async () => {
    const id = await drawWith("Ana", "Bruno", "Carla", "Diego");
    await runDraw(db, id);
    await removeParticipant(db, ana, id, (await byName("Diego")).id);
    expect(await verifyDraw(db, id)).toMatchObject({ valid: true, total: 3 });
  });

  it("does not allow removing if a drawn Draw would drop below 3, and changes nothing", async () => {
    const id = await drawWith("Ana", "Bruno", "Carla");
    await runDraw(db, id);
    await expect(removeParticipant(db, ana, id, (await byName("Carla")).id)).rejects.toThrow(code("too-few-participants"));
    expect(await allParticipants()).toHaveLength(3);
    expect((await verifyDraw(db, id)).valid).toBe(true);
  });

  it("renaming does not touch the Chain", async () => {
    const id = await drawWith("Ana", "Bruno", "Carla");
    await runDraw(db, id);
    const before = await revealAssignments(db, ana, id);
    await editParticipant(db, ana, id, (await byName("Bruno")).id, { name: "Bruno G.", likes: "", dislikes: "" });
    const after = await revealAssignments(db, ana, id);
    expect(after.map((a) => a.from.replace("Bruno G.", "Bruno"))).toEqual(before.map((a) => a.from));
  });

  it("renaming to a name in use fails, but changing only the case is allowed", async () => {
    const id = await drawWith("Ana", "Bruno");
    const bruno = await byName("Bruno");
    const rename = (name: string) => editParticipant(db, ana, id, bruno.id, { name, likes: "", dislikes: "" });
    await expect(rename("ana")).rejects.toThrow(code("duplicate-name"));
    await expect(rename("BRUNO")).resolves.toBeUndefined();
    expect((await byName("BRUNO")).id).toBe(bruno.id);
  });

  it("the Organizer edits a Participant's Likes / Dislikes, which the Participant then sees", async () => {
    await drawWith("Ana", "Bruno");
    const bruno = await byName("Bruno");
    await editParticipant(db, ana, bruno.drawId, bruno.id, {
      name: "Bruno",
      likes: "  Café ",
      dislikes: "Calcetines",
    });
    expect((await viewLink(db, await tokenOf("Bruno"))).participant).toEqual({ name: "Bruno", likes: "Café", dislikes: "Calcetines" });
  });

  it("Likes / Dislikes edited by the Organizer are limited in length", async () => {
    const id = await drawWith("Ana", "Bruno");
    const bruno = await byName("Bruno");
    const edit = editParticipant(db, ana, id, bruno.id, { name: "Bruno", likes: "x".repeat(501), dislikes: "" });
    await expect(edit).rejects.toThrow(code("text-too-long"));
  });
});

describe("Draw ownership", () => {
  it("another Organizer cannot see or touch the Draw", async () => {
    const id = await drawWith("Ana", "Bruno", "Carla");
    const notTheirs = code("draw-not-found");
    await expect(drawPanel(db, other, id)).rejects.toThrow(notTheirs);
    await expect(addParticipant(db, other, id, "Intruso")).rejects.toThrow(notTheirs);
    await expect(editDraw(db, other, id, input)).rejects.toThrow(notTheirs);
    await expect(deleteDraw(db, other, id)).rejects.toThrow(notTheirs);
    await expect(runDraw(db, id, { organizerId: other })).rejects.toThrow(notTheirs);
    await expect(revealAssignments(db, other, id)).rejects.toThrow(notTheirs);
  });

  it("cannot remove a Participant from another Draw", async () => {
    const a = await drawWith("Ana", "Bruno");
    const b = await createDraw(db, ana, { ...input, organizerName: null });
    await expect(removeParticipant(db, ana, b, (await byName("Bruno")).id)).rejects.toThrow(code("participant-not-found"));
    expect((await drawPanel(db, ana, a)).participants).toHaveLength(2);
  });
});

describe("queries", () => {
  it("listDraws counts Participants and Seen, only for the Organizer", async () => {
    const id = await drawWith("Ana", "Bruno", "Carla");
    await createDraw(db, other, { ...input, organizerName: "X" });
    await runDraw(db, id);
    await markSeen(db, await tokenOf("Bruno"));
    expect(await listDraws(db, ana)).toMatchObject([{ id, status: "drawn", participants: 3, seen: 1 }]);
  });

  it("the panel shows the Organizer's Assignment but not the others", async () => {
    const id = await drawWith("Ana", "Bruno", "Carla");
    expect((await drawPanel(db, ana, id)).myAssignment).toBeNull();
    await runDraw(db, id);
    const panel = await drawPanel(db, ana, id);
    expect(["Bruno", "Carla"]).toContain(panel.myAssignment?.recipient);
    expect(panel.verification.valid).toBe(true);
    expect(panel.participants[0]).toMatchObject({ name: "Ana", isOrganizer: true, likesStatus: "empty", seen: false });
    expect(JSON.stringify(panel.participants)).not.toMatch(/recipient/);
  });

  it("markOrganizerSeen marks only the Organizer, and only once drawn", async () => {
    const id = await drawWith("Ana", "Bruno", "Carla");
    await markOrganizerSeen(db, ana, id);
    expect((await drawPanel(db, ana, id)).participants[0].seen).toBe(false);
    await runDraw(db, id);
    await markOrganizerSeen(db, ana, id);
    expect((await drawPanel(db, ana, id)).participants.map((p) => p.seen)).toEqual([true, false, false]);
  });

  it("reveal walks the Chain starting from the Organizer", async () => {
    const id = await drawWith("Ana", "Bruno", "Carla", "Diego");
    await runDraw(db, id);
    const r = await revealAssignments(db, ana, id);
    expect(r).toHaveLength(4);
    expect(r[0].from).toBe("Ana");
    r.forEach((a, i) => expect(r[(i + 1) % r.length].from).toBe(a.to));
  });
});

describe("Personal link", () => {
  it("before the draw there is no Recipient", async () => {
    await drawWith("Ana", "Bruno", "Carla");
    expect(await viewLink(db, await tokenOf("Bruno"))).toMatchObject({
      draw: { name: "Navidad", status: "open", budgetCents: 3000 },
      participant: { name: "Bruno" },
      recipient: null,
    });
  });

  it("after the draw it shows the Recipient with their likes", async () => {
    const id = await drawWith("Ana", "Bruno", "Carla");
    for (const n of ["Ana", "Bruno", "Carla"]) await saveLikes(db, await tokenOf(n), `le gusta ${n}`, `no ${n}`);
    await runDraw(db, id);
    const { recipient } = await viewLink(db, await tokenOf("Bruno"));
    expect(recipient?.name).not.toBe("Bruno");
    expect(recipient).toMatchObject({ likes: `le gusta ${recipient!.name}`, dislikes: `no ${recipient!.name}` });
  });

  it("an unknown link fails", async () => {
    await expect(viewLink(db, "nope")).rejects.toThrow(code("link-not-found"));
  });

  it("markSeen only counts once there is an Assignment", async () => {
    const id = await drawWith("Ana", "Bruno", "Carla");
    await markSeen(db, await tokenOf("Bruno"));
    expect((await drawPanel(db, ana, id)).participants[1].seen).toBe(false);
    await runDraw(db, id);
    await markSeen(db, await tokenOf("Bruno"));
    expect((await drawPanel(db, ana, id)).participants[1].seen).toBe(true);
  });

  it("saveLikes limits the length", async () => {
    await drawWith("Ana");
    await expect(saveLikes(db, await tokenOf("Ana"), "x".repeat(501), "")).rejects.toThrow(code("text-too-long"));
  });
});

describe("formatting", () => {
  it("budget and date", () => {
    expect(formatBudget({ budgetCents: 3000, budgetMaxCents: null })).toBe("30 €");
    expect(formatBudget({ budgetCents: 2550, budgetMaxCents: null })).toBe("25,50 €");
    expect(formatBudget({ budgetCents: 2000, budgetMaxCents: 2550 })).toBe("20–25,50 €");
    expect(formatBudget({ budgetCents: null, budgetMaxCents: null })).toBeNull();
    expect(formatDate("2026-12-24")).toBe("24 dic 2026");
    expect(formatDate("2026-12-24", false)).toBe("24 dic");
  });
});
