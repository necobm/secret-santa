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
  editDraw,
  removeParticipant,
  renameParticipant,
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

function drawWith(...names: string[]) {
  const id = createDraw(db, ana, { ...input, organizerName: names[0] ?? null });
  for (const n of names.slice(1)) addParticipant(db, ana, id, n);
  return id;
}
const byName = (name: string) => db.select().from(participants).where(eq(participants.name, name)).get()!;
const tokenOf = (name: string) => byName(name).token;

beforeEach(() => {
  db = openDb(":memory:");
  runMigrations(db);
  ana = db.insert(organizers).values({ email: "ana@e.com", passwordHash: "x" }).returning().get().id;
  other = db.insert(organizers).values({ email: "otro@e.com", passwordHash: "x" }).returning().get().id;
});

describe("createDraw", () => {
  it("creates an open Draw with the Organizer as a Participant", () => {
    const id = createDraw(db, ana, { ...input, name: "  Navidad   familia ", organizerName: "Ana" });
    const d = db.select().from(draws).where(eq(draws.id, id)).get()!;
    expect(d).toMatchObject({ name: "Navidad familia", status: "open", budgetCents: 3000, exchangeDate: "2026-12-24" });
    expect(db.select().from(participants).all()).toMatchObject([{ name: "Ana", isOrganizer: true }]);
  });

  it("with 'I'm not participating' it does not add the Organizer", () => {
    createDraw(db, ana, { ...input, organizerName: null });
    expect(db.select().from(participants).all()).toHaveLength(0);
  });

  it("Budget and Exchange date are optional and accept a decimal comma", () => {
    const a = createDraw(db, ana, { name: "A", budget: "", budgetMax: "", exchangeDate: "", organizerName: null });
    const b = createDraw(db, ana, { name: "B", budget: "25,50 €", budgetMax: "", exchangeDate: "", organizerName: null });
    const [da, dbRow] = [a, b].map((id) => db.select().from(draws).where(eq(draws.id, id)).get()!);
    expect(da).toMatchObject({ budgetCents: null, budgetMaxCents: null, exchangeDate: null });
    expect(dbRow).toMatchObject({ budgetCents: 2550, budgetMaxCents: null });
  });

  it.each([
    ["20", "30", 2000, 3000],
    ["", "30", 3000, null],
    ["30", "30", 3000, null],
  ])("Budget from %o to %o is stored as %o–%o", (budget, budgetMax, cents, maxCents) => {
    const id = createDraw(db, ana, { ...input, budget, budgetMax, organizerName: null });
    const d = db.select().from(draws).where(eq(draws.id, id)).get()!;
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
  ])("validates input %o", (change, error) => {
    expect(() => createDraw(db, ana, { ...input, ...change, organizerName: null })).toThrow(code(error));
  });
});

describe("Participants", () => {
  it("rejects duplicate names case-insensitively, accents included", () => {
    const id = drawWith("María");
    expect(() => addParticipant(db, ana, id, "  MARÍA ")).toThrow(code("duplicate-name"));
  });

  it("each Participant has a different Personal link", () => {
    drawWith("Ana", "Bruno", "Carla");
    const tokens = db.select().from(participants).all().map((p) => p.token);
    expect(new Set(tokens).size).toBe(3);
  });

  it("adding to a drawn Draw redoes the draw", () => {
    const id = drawWith("Ana", "Bruno", "Carla");
    runDraw(db, id);
    markSeen(db, tokenOf("Bruno"));
    addParticipant(db, ana, id, "Diego");
    expect(verifyDraw(db, id)).toMatchObject({ valid: true, total: 4 });
    expect(db.select().from(participants).all().every((p) => p.seenAt === null)).toBe(true);
  });

  it("removing from a drawn Draw redoes the draw", () => {
    const id = drawWith("Ana", "Bruno", "Carla", "Diego");
    runDraw(db, id);
    removeParticipant(db, ana, id, byName("Diego").id);
    expect(verifyDraw(db, id)).toMatchObject({ valid: true, total: 3 });
  });

  it("does not allow removing if a drawn Draw would drop below 3, and changes nothing", () => {
    const id = drawWith("Ana", "Bruno", "Carla");
    runDraw(db, id);
    expect(() => removeParticipant(db, ana, id, byName("Carla").id)).toThrow(code("too-few-participants"));
    expect(db.select().from(participants).all()).toHaveLength(3);
    expect(verifyDraw(db, id).valid).toBe(true);
  });

  it("renaming does not touch the Chain", () => {
    const id = drawWith("Ana", "Bruno", "Carla");
    runDraw(db, id);
    const before = revealAssignments(db, ana, id);
    renameParticipant(db, ana, id, byName("Bruno").id, "Bruno G.");
    const after = revealAssignments(db, ana, id);
    expect(after.map((a) => a.from.replace("Bruno G.", "Bruno"))).toEqual(before.map((a) => a.from));
  });

  it("renaming to a name in use fails, but changing only the case is allowed", () => {
    const id = drawWith("Ana", "Bruno");
    const bruno = byName("Bruno");
    expect(() => renameParticipant(db, ana, id, bruno.id, "ana")).toThrow(code("duplicate-name"));
    expect(() => renameParticipant(db, ana, id, bruno.id, "BRUNO")).not.toThrow();
  });
});

describe("Draw ownership", () => {
  it("another Organizer cannot see or touch the Draw", () => {
    const id = drawWith("Ana", "Bruno", "Carla");
    const notTheirs = code("draw-not-found");
    expect(() => drawPanel(db, other, id)).toThrow(notTheirs);
    expect(() => addParticipant(db, other, id, "Intruso")).toThrow(notTheirs);
    expect(() => editDraw(db, other, id, input)).toThrow(notTheirs);
    expect(() => deleteDraw(db, other, id)).toThrow(notTheirs);
    expect(() => runDraw(db, id, { organizerId: other })).toThrow(notTheirs);
    expect(() => revealAssignments(db, other, id)).toThrow(notTheirs);
  });

  it("cannot remove a Participant from another Draw", () => {
    const a = drawWith("Ana", "Bruno");
    const b = createDraw(db, ana, { ...input, organizerName: null });
    expect(() => removeParticipant(db, ana, b, byName("Bruno").id)).toThrow(code("participant-not-found"));
    expect(drawPanel(db, ana, a).participants).toHaveLength(2);
  });
});

describe("queries", () => {
  it("listDraws counts Participants and Seen, only for the Organizer", () => {
    const id = drawWith("Ana", "Bruno", "Carla");
    createDraw(db, other, { ...input, organizerName: "X" });
    runDraw(db, id);
    markSeen(db, tokenOf("Bruno"));
    expect(listDraws(db, ana)).toMatchObject([{ id, status: "drawn", participants: 3, seen: 1 }]);
  });

  it("the panel shows the Organizer's Assignment but not the others", () => {
    const id = drawWith("Ana", "Bruno", "Carla");
    expect(drawPanel(db, ana, id).myAssignment).toBeNull();
    runDraw(db, id);
    const panel = drawPanel(db, ana, id);
    expect(["Bruno", "Carla"]).toContain(panel.myAssignment?.recipient);
    expect(panel.verification.valid).toBe(true);
    expect(panel.participants[0]).toMatchObject({ name: "Ana", isOrganizer: true, likesStatus: "empty", seen: false });
    expect(JSON.stringify(panel.participants)).not.toMatch(/recipient/);
  });

  it("markOrganizerSeen marks only the Organizer, and only once drawn", () => {
    const id = drawWith("Ana", "Bruno", "Carla");
    markOrganizerSeen(db, ana, id);
    expect(drawPanel(db, ana, id).participants[0].seen).toBe(false);
    runDraw(db, id);
    markOrganizerSeen(db, ana, id);
    expect(drawPanel(db, ana, id).participants.map((p) => p.seen)).toEqual([true, false, false]);
  });

  it("reveal walks the Chain starting from the Organizer", () => {
    const id = drawWith("Ana", "Bruno", "Carla", "Diego");
    runDraw(db, id);
    const r = revealAssignments(db, ana, id);
    expect(r).toHaveLength(4);
    expect(r[0].from).toBe("Ana");
    r.forEach((a, i) => expect(r[(i + 1) % r.length].from).toBe(a.to));
  });
});

describe("Personal link", () => {
  it("before the draw there is no Recipient", () => {
    drawWith("Ana", "Bruno", "Carla");
    expect(viewLink(db, tokenOf("Bruno"))).toMatchObject({
      draw: { name: "Navidad", status: "open", budgetCents: 3000 },
      participant: { name: "Bruno" },
      recipient: null,
    });
  });

  it("after the draw it shows the Recipient with their likes", () => {
    const id = drawWith("Ana", "Bruno", "Carla");
    for (const n of ["Ana", "Bruno", "Carla"]) saveLikes(db, tokenOf(n), `le gusta ${n}`, `no ${n}`);
    runDraw(db, id);
    const { recipient } = viewLink(db, tokenOf("Bruno"));
    expect(recipient?.name).not.toBe("Bruno");
    expect(recipient).toMatchObject({ likes: `le gusta ${recipient!.name}`, dislikes: `no ${recipient!.name}` });
  });

  it("an unknown link fails", () => {
    expect(() => viewLink(db, "nope")).toThrow(code("link-not-found"));
  });

  it("markSeen only counts once there is an Assignment", () => {
    const id = drawWith("Ana", "Bruno", "Carla");
    markSeen(db, tokenOf("Bruno"));
    expect(drawPanel(db, ana, id).participants[1].seen).toBe(false);
    runDraw(db, id);
    markSeen(db, tokenOf("Bruno"));
    expect(drawPanel(db, ana, id).participants[1].seen).toBe(true);
  });

  it("saveLikes limits the length", () => {
    drawWith("Ana");
    expect(() => saveLikes(db, tokenOf("Ana"), "x".repeat(501), "")).toThrow(code("text-too-long"));
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
