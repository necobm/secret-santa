import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";
import { getDb } from "@/db/client";
import { createSession, deleteSession, findSession } from "./accounts";

// Access layer for the Organizer's session. Everything that reads or writes the cookie goes through here.

export const SESSION_COOKIE = "session";

export interface CurrentOrganizer {
  id: number;
  email: string;
}

export async function startSession(organizerId: number) {
  const { token, expiresAt } = createSession(getDb(), organizerId);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

/** This request's Organizer, or null. Read only once per request. */
export const currentOrganizer = cache(async (): Promise<CurrentOrganizer | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  await connection(); // synchronous SQLite query + clock: request time only
  const session = findSession(getDb(), token);
  return session ? { id: session.organizerId, email: session.email } : null;
});

/** For pages and Server Actions that require an Organizer: without a session, go to /sign-in. */
export async function requireOrganizer(): Promise<CurrentOrganizer> {
  const org = await currentOrganizer();
  if (!org) redirect("/sign-in");
  return org;
}

export async function endSession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) deleteSession(getDb(), token);
  store.delete(SESSION_COOKIE);
}
