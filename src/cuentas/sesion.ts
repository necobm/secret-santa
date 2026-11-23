import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";
import { getDb } from "@/db/client";
import { buscarSesion, cerrarSesion, crearSesion } from "./cuentas";

// Capa de acceso a la sesión del Organizador. Todo lo que lea o escriba la cookie pasa por aquí.

export const COOKIE_SESION = "sesion";
const COOKIE = COOKIE_SESION;

export interface OrganizadorActual {
  id: number;
  email: string;
}

export async function iniciarSesion(organizadorId: number) {
  const { token, expiraEn } = crearSesion(getDb(), organizadorId);
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiraEn,
  });
}

/** El Organizador de esta petición, o null. Se lee una sola vez por petición. */
export const organizadorActual = cache(async (): Promise<OrganizadorActual | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  await connection(); // consulta síncrona a SQLite + reloj: solo en tiempo de petición
  const sesion = buscarSesion(getDb(), token);
  return sesion ? { id: sesion.organizadorId, email: sesion.email } : null;
});

/** Para páginas y Server Actions que exigen Organizador: si no hay sesión, a /entrar. */
export async function requerirOrganizador(): Promise<OrganizadorActual> {
  const org = await organizadorActual();
  if (!org) redirect("/entrar");
  return org;
}

export async function terminarSesion() {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (token) cerrarSesion(getDb(), token);
  store.delete(COOKIE);
}
