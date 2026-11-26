import { eq, lte, sql } from "drizzle-orm";
import type { Db } from "@/db/client";
import { signInAttempts } from "@/db/schema";
import { authenticate, normalizeEmail } from "./accounts";

// Sign-in attempt limit (brute force). Fixed window per email and per IP, stored in SQLite
// so it survives restarts and is shared by several processes.
// The attempt is counted BEFORE the password is checked, so parallel requests cannot slip through.

export const WINDOW_MS = 15 * 60 * 1000;
export const LIMITS = { email: 5, ip: 20 } as const;

type Key = { kind: keyof typeof LIMITS; value: string };

const seconds = (d: Date) => Math.floor(d.getTime() / 1000);
const keyId = (k: Key) => `${k.kind}:${k.value}`;

/** Adds one attempt to each key. Returns when the block ends, or null if not blocked. */
export function countAttempt(db: Db, keys: Key[], now = new Date()): Date | null {
  const nowS = seconds(now);
  const windowStartS = nowS - WINDOW_MS / 1000;
  const inWindow = sql`${signInAttempts.windowStart} > ${windowStartS}`;
  let blockedUntil: Date | null = null;

  for (const key of keys) {
    const row = db
      .insert(signInAttempts)
      .values({ key: keyId(key), count: 1, windowStart: now })
      .onConflictDoUpdate({
        target: signInAttempts.key,
        set: {
          count: sql`case when ${inWindow} then ${signInAttempts.count} + 1 else 1 end`,
          windowStart: sql`case when ${inWindow} then ${signInAttempts.windowStart} else ${nowS} end`,
        },
      })
      .returning()
      .get();
    if (row.count > LIMITS[key.kind]) {
      const end = new Date(row.windowStart.getTime() + WINDOW_MS);
      if (!blockedUntil || end > blockedUntil) blockedUntil = end;
    }
  }
  return blockedUntil;
}

export function forgetAttempts(db: Db, key: Key) {
  db.delete(signInAttempts).where(eq(signInAttempts.key, keyId(key))).run();
}

export function deleteExpiredAttempts(db: Db, now = new Date()) {
  db.delete(signInAttempts)
    .where(lte(signInAttempts.windowStart, new Date(now.getTime() - WINDOW_MS)))
    .run();
}

export type SignInResult =
  | { ok: true; organizerId: number }
  | { ok: false; error: "credentials" }
  | { ok: false; error: "blocked"; until: Date };

/** `authenticate` with an attempt limit. A successful sign-in resets that email's counter. */
export async function attemptSignIn(
  db: Db,
  email: string,
  password: string,
  ip: string | null,
  now = new Date(),
): Promise<SignInResult> {
  deleteExpiredAttempts(db, now);
  const emailKey: Key = { kind: "email", value: normalizeEmail(email) };
  const keys = ip ? [emailKey, { kind: "ip" as const, value: ip }] : [emailKey];

  const until = countAttempt(db, keys, now);
  if (until) return { ok: false, error: "blocked", until };

  const id = await authenticate(db, email, password);
  if (id === null) return { ok: false, error: "credentials" };
  forgetAttempts(db, emailKey);
  return { ok: true, organizerId: id };
}
