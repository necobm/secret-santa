"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { attemptSignIn } from "@/accounts/access";
import { endSession, startSession } from "@/accounts/session";
import { getDb } from "@/db/client";

export interface SignInState {
  error?: string;
  email?: string;
}

const text = (fd: FormData, field: string) => {
  const v = fd.get(field);
  return typeof v === "string" ? v : "";
};

/** Client IP as reported by the proxy (Passenger/Apache). Spoofable without a proxy: the email limit does not depend on it. */
async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip")?.trim() || null;
}

export async function signIn(_: SignInState, fd: FormData): Promise<SignInState> {
  const email = text(fd, "email");
  const r = await attemptSignIn(getDb(), email, text(fd, "password"), await clientIp());
  if (!r.ok) {
    if (r.error === "credentials") return { error: "Email o contraseña incorrectos.", email };
    const minutes = Math.max(1, Math.ceil((r.until.getTime() - Date.now()) / 60_000));
    return {
      error: `Demasiados intentos. Vuelve a probar dentro de ${minutes} ${minutes === 1 ? "minuto" : "minutos"}.`,
      email,
    };
  }
  await startSession(r.organizerId);
  redirect("/draws");
}

export async function signOut() {
  await endSession();
  redirect("/sign-in");
}
