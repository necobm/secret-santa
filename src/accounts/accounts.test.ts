import { beforeEach, describe, expect, it } from "vitest";
import { openDb, type Db } from "@/db/client";
import { runMigrations } from "@/db/migrate";
import { organizers, sessions } from "@/db/schema";
import {
  authenticate,
  createSession,
  deleteExpiredSessions,
  deleteSession,
  findSession,
  createOrganizer,
  SESSION_DURATION_MS,
} from "./accounts";
import { hashPassword, verifyPassword } from "./password";

let db: Db;

beforeEach(() => {
  db = openDb(":memory:");
  runMigrations(db);
});

describe("password", () => {
  it("verifies the right password and rejects another", async () => {
    const h = await hashPassword("turrón123");
    expect(h).not.toContain("turrón123");
    expect(await verifyPassword("turrón123", h)).toBe(true);
    expect(await verifyPassword("turron123", h)).toBe(false);
  });

  it("uses a different salt every time", async () => {
    expect(await hashPassword("abcdefgh")).not.toBe(await hashPassword("abcdefgh"));
  });

  it("rejects a hash in an unknown format", async () => {
    expect(await verifyPassword("x", "md5$abc")).toBe(false);
  });
});

describe("createOrganizer", () => {
  it("creates the Organizer account with the normalized email", async () => {
    const r = await createOrganizer(db, "  Ana@Ejemplo.COM ", "secreto123");
    expect(r.ok).toBe(true);
    expect(db.select().from(organizers).get()?.email).toBe("ana@ejemplo.com");
  });

  it.each([
    ["no-es-un-email", "secreto123", "invalid-email"],
    ["ana@ejemplo.com", "corta", "password-too-short"],
    ["ana@ejemplo.com", "x".repeat(201), "password-too-long"],
  ])("rejects %s / invalid password", async (email, password, error) => {
    expect(await createOrganizer(db, email, password)).toEqual({ ok: false, error });
  });

  it("does not allow repeating an email, case-insensitively", async () => {
    await createOrganizer(db, "ana@ejemplo.com", "secreto123");
    expect(await createOrganizer(db, "ANA@ejemplo.com", "otro12345")).toEqual({
      ok: false,
      error: "email-in-use",
    });
  });
});

describe("authenticate", () => {
  it("returns the id with the right credentials, whatever the email's case", async () => {
    const r = await createOrganizer(db, "ana@ejemplo.com", "secreto123");
    expect(await authenticate(db, "Ana@Ejemplo.com", "secreto123")).toBe(r.ok && r.organizerId);
  });

  it("returns null with a wrong password or an unknown email", async () => {
    await createOrganizer(db, "ana@ejemplo.com", "secreto123");
    expect(await authenticate(db, "ana@ejemplo.com", "secreto124")).toBeNull();
    expect(await authenticate(db, "nadie@ejemplo.com", "secreto123")).toBeNull();
  });
});

describe("sessions", () => {
  async function organizer() {
    const r = await createOrganizer(db, "ana@ejemplo.com", "secreto123");
    if (!r.ok) throw new Error(r.error);
    return r.organizerId;
  }

  it("finds the session by its token and does not store the token in plain text", async () => {
    const id = await organizer();
    const { token } = createSession(db, id);
    expect(findSession(db, token)).toMatchObject({ organizerId: id, email: "ana@ejemplo.com" });
    expect(db.select().from(sessions).get()?.tokenHash).not.toBe(token);
  });

  it("does not find an unknown token", () => {
    expect(findSession(db, "made-up")).toBeNull();
  });

  it("expires after 30 days", async () => {
    const id = await organizer();
    const now = new Date("2026-12-01T00:00:00Z");
    const { token } = createSession(db, id, now);
    expect(findSession(db, token, new Date(now.getTime() + SESSION_DURATION_MS - 1))).not.toBeNull();
    expect(findSession(db, token, new Date(now.getTime() + SESSION_DURATION_MS))).toBeNull();

    deleteExpiredSessions(db, new Date(now.getTime() + SESSION_DURATION_MS));
    expect(db.select().from(sessions).all()).toHaveLength(0);
  });

  it("signing out invalidates the session", async () => {
    const { token } = createSession(db, await organizer());
    deleteSession(db, token);
    expect(findSession(db, token)).toBeNull();
  });
});
