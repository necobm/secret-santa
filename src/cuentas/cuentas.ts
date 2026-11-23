import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, lte } from "drizzle-orm";
import type { Db } from "@/db/client";
import { organizadores, sesiones } from "@/db/schema";
import { hashPassword, verifyPassword } from "./password";

// Cuenta de organizador (ADR-0001): email + contraseña, sin verificación ni recuperación.

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 200;
export const DURACION_SESION_MS = 30 * 24 * 60 * 60 * 1000;

export type ErrorRegistro = "email-invalido" | "password-corta" | "password-larga" | "email-en-uso";

export function normalizarEmail(email: string) {
  return email.trim().toLowerCase();
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function registrarOrganizador(
  db: Db,
  email: string,
  password: string,
): Promise<{ ok: true; organizadorId: number } | { ok: false; error: ErrorRegistro }> {
  const normalizado = normalizarEmail(email);
  if (!EMAIL_RE.test(normalizado) || normalizado.length > 254) return { ok: false, error: "email-invalido" };
  if (password.length < PASSWORD_MIN) return { ok: false, error: "password-corta" };
  if (password.length > PASSWORD_MAX) return { ok: false, error: "password-larga" };

  const passwordHash = await hashPassword(password);
  const fila = db
    .insert(organizadores)
    .values({ email: normalizado, passwordHash })
    .onConflictDoNothing({ target: organizadores.email })
    .returning({ id: organizadores.id })
    .get();
  if (!fila) return { ok: false, error: "email-en-uso" };
  return { ok: true, organizadorId: fila.id };
}

// Hash de una contraseña cualquiera para que un email inexistente tarde lo mismo que uno existente.
let hashFicticio: Promise<string> | undefined;

/** Devuelve el id del Organizador si email y contraseña coinciden; si no, null. */
export async function autenticar(db: Db, email: string, password: string): Promise<number | null> {
  if (password.length > PASSWORD_MAX) return null;
  const org = db
    .select({ id: organizadores.id, passwordHash: organizadores.passwordHash })
    .from(organizadores)
    .where(eq(organizadores.email, normalizarEmail(email)))
    .get();
  if (!org) {
    hashFicticio ??= hashPassword("contraseña-ficticia");
    await verifyPassword(password, await hashFicticio);
    return null;
  }
  return (await verifyPassword(password, org.passwordHash)) ? org.id : null;
}

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

/** Crea una sesión y devuelve el token que va en la cookie. */
export function crearSesion(db: Db, organizadorId: number, ahora = new Date()) {
  const token = randomBytes(32).toString("base64url");
  const expiraEn = new Date(ahora.getTime() + DURACION_SESION_MS);
  db.insert(sesiones).values({ tokenHash: hashToken(token), organizadorId, expiraEn }).run();
  return { token, expiraEn };
}

export function buscarSesion(db: Db, token: string, ahora = new Date()) {
  return (
    db
      .select({ organizadorId: organizadores.id, email: organizadores.email, expiraEn: sesiones.expiraEn })
      .from(sesiones)
      .innerJoin(organizadores, eq(organizadores.id, sesiones.organizadorId))
      .where(and(eq(sesiones.tokenHash, hashToken(token)), gt(sesiones.expiraEn, ahora)))
      .get() ?? null
  );
}

export function cerrarSesion(db: Db, token: string) {
  db.delete(sesiones).where(eq(sesiones.tokenHash, hashToken(token))).run();
}

export function borrarSesionesCaducadas(db: Db, ahora = new Date()) {
  db.delete(sesiones).where(lte(sesiones.expiraEn, ahora)).run();
}
