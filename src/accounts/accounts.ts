import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, lte } from "drizzle-orm";
import type { Db } from "@/db/client";
import { organizers, sessions } from "@/db/schema";
import { hashPassword, verifyPassword } from "./password";

// Organizer account (ADR-0001, ADR-0003): email + password, no verification or recovery.
// Accounts are created only from the command line (scripts/create-organizer.ts).

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 200;
export const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

export type CreateOrganizerError = "invalid-email" | "password-too-short" | "password-too-long" | "email-in-use";

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function createOrganizer(
  db: Db,
  email: string,
  password: string,
): Promise<{ ok: true; organizerId: number } | { ok: false; error: CreateOrganizerError }> {
  const normalized = normalizeEmail(email);
  if (!EMAIL_RE.test(normalized) || normalized.length > 254) return { ok: false, error: "invalid-email" };
  if (password.length < PASSWORD_MIN) return { ok: false, error: "password-too-short" };
  if (password.length > PASSWORD_MAX) return { ok: false, error: "password-too-long" };

  const passwordHash = await hashPassword(password);
  const row = await db
    .insert(organizers)
    .values({ email: normalized, passwordHash })
    .onConflictDoNothing({ target: organizers.email })
    .returning({ id: organizers.id })
    .get();
  if (!row) return { ok: false, error: "email-in-use" };
  return { ok: true, organizerId: row.id };
}

// Hash of an arbitrary password, so an unknown email takes as long as a known one.
let dummyHash: Promise<string> | undefined;

/** Returns the Organizer's id if email and password match; otherwise null. */
export async function authenticate(db: Db, email: string, password: string): Promise<number | null> {
  if (password.length > PASSWORD_MAX) return null;
  const org = await db
    .select({ id: organizers.id, passwordHash: organizers.passwordHash })
    .from(organizers)
    .where(eq(organizers.email, normalizeEmail(email)))
    .get();
  if (!org) {
    dummyHash ??= hashPassword("dummy-password");
    await verifyPassword(password, await dummyHash);
    return null;
  }
  return (await verifyPassword(password, org.passwordHash)) ? org.id : null;
}

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

/** Creates a session and returns the token that goes in the cookie. */
export async function createSession(db: Db, organizerId: number, now = new Date()) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(now.getTime() + SESSION_DURATION_MS);
  await db.insert(sessions).values({ tokenHash: hashToken(token), organizerId, expiresAt }).run();
  return { token, expiresAt };
}

export async function findSession(db: Db, token: string, now = new Date()) {
  return (
    (await db
      .select({ organizerId: organizers.id, email: organizers.email, expiresAt: sessions.expiresAt })
      .from(sessions)
      .innerJoin(organizers, eq(organizers.id, sessions.organizerId))
      .where(and(eq(sessions.tokenHash, hashToken(token)), gt(sessions.expiresAt, now)))
      .get()) ?? null
  );
}

export async function deleteSession(db: Db, token: string) {
  await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token))).run();
}

export async function deleteExpiredSessions(db: Db, now = new Date()) {
  await db.delete(sessions).where(lte(sessions.expiresAt, now)).run();
}
