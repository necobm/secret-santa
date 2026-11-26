import { beforeEach, describe, expect, it } from "vitest";
import { openDb, type Db } from "@/db/client";
import { runMigrations } from "@/db/migrate";
import { signInAttempts } from "@/db/schema";
import { attemptSignIn, LIMITS, WINDOW_MS } from "./access";
import { createOrganizer } from "./accounts";

let db: Db;
let organizerId: number;
const T0 = new Date("2026-12-01T10:00:00Z");
const plus = (ms: number) => new Date(T0.getTime() + ms);

beforeEach(async () => {
  db = openDb({ url: ":memory:" });
  await runMigrations(db);
  const r = await createOrganizer(db, "ana@ejemplo.com", "secreto123");
  if (!r.ok) throw new Error(r.error);
  organizerId = r.organizerId;
});

async function fail(times: number, email = "ana@ejemplo.com", ip: string | null = null, now = T0) {
  for (let i = 0; i < times; i++) await attemptSignIn(db, email, "wrong-password", ip, now);
}

describe("attemptSignIn", () => {
  it("lets you in with the right credentials", async () => {
    expect(await attemptSignIn(db, "ana@ejemplo.com", "secreto123", "1.1.1.1", T0)).toEqual({
      ok: true,
      organizerId,
    });
  });

  it("tells wrong credentials apart from a block", async () => {
    expect(await attemptSignIn(db, "ana@ejemplo.com", "wrong-password", null, T0)).toEqual({
      ok: false,
      error: "credentials",
    });
  });

  it("blocks the email past the limit, even with the right password", async () => {
    await fail(LIMITS.email);
    expect(await attemptSignIn(db, "ANA@ejemplo.com", "secreto123", null, plus(1000))).toEqual({
      ok: false,
      error: "blocked",
      until: plus(WINDOW_MS),
    });
  });

  it("unblocks when the window ends", async () => {
    await fail(LIMITS.email + 3);
    const r = await attemptSignIn(db, "ana@ejemplo.com", "secreto123", null, plus(WINDOW_MS));
    expect(r).toEqual({ ok: true, organizerId });
  });

  it("a successful sign-in resets the email's counter", async () => {
    await fail(LIMITS.email - 1);
    await attemptSignIn(db, "ana@ejemplo.com", "secreto123", null, T0);
    await fail(LIMITS.email - 1);
    expect((await attemptSignIn(db, "ana@ejemplo.com", "secreto123", null, T0)).ok).toBe(true);
  });

  it("blocks an IP that tries many different emails", async () => {
    for (let i = 0; i < LIMITS.ip; i++) await fail(1, `x${i}@ejemplo.com`, "6.6.6.6");
    const r = await attemptSignIn(db, "ana@ejemplo.com", "secreto123", "6.6.6.6", T0);
    expect(r).toMatchObject({ ok: false, error: "blocked" });
    expect((await attemptSignIn(db, "ana@ejemplo.com", "secreto123", "7.7.7.7", T0)).ok).toBe(true);
  });

  it("counts parallel attempts before checking the password", async () => {
    const rs = await Promise.all(
      Array.from({ length: LIMITS.email + 5 }, () => attemptSignIn(db, "ana@ejemplo.com", "wrong", null, T0)),
    );
    expect(rs.filter((r) => !r.ok && r.error === "credentials")).toHaveLength(LIMITS.email);
  });

  it("deletes expired counters", async () => {
    await fail(2, "otro@ejemplo.com");
    await attemptSignIn(db, "ana@ejemplo.com", "secreto123", null, plus(WINDOW_MS));
    expect(await db.select().from(signInAttempts).all()).toHaveLength(0);
  });
});
