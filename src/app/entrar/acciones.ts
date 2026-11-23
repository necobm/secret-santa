"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { intentarAcceso } from "@/cuentas/acceso";
import { PASSWORD_MIN, registrarOrganizador, type ErrorRegistro } from "@/cuentas/cuentas";
import { iniciarSesion, terminarSesion } from "@/cuentas/sesion";
import { getDb } from "@/db/client";

export interface EstadoAcceso {
  error?: string;
  email?: string;
}

const texto = (fd: FormData, campo: string) => {
  const v = fd.get(campo);
  return typeof v === "string" ? v : "";
};

/** IP del cliente según el proxy (Passenger/Apache). Falsificable sin proxy: el límite por email no depende de ella. */
async function ipCliente() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip")?.trim() || null;
}

export async function entrar(_: EstadoAcceso, fd: FormData): Promise<EstadoAcceso> {
  const email = texto(fd, "email");
  const r = await intentarAcceso(getDb(), email, texto(fd, "password"), await ipCliente());
  if (!r.ok) {
    if (r.error === "credenciales") return { error: "Email o contraseña incorrectos.", email };
    const minutos = Math.max(1, Math.ceil((r.hasta.getTime() - Date.now()) / 60_000));
    return {
      error: `Demasiados intentos. Vuelve a probar dentro de ${minutos} ${minutos === 1 ? "minuto" : "minutos"}.`,
      email,
    };
  }
  await iniciarSesion(r.organizadorId);
  redirect("/sorteos");
}

const MENSAJES: Record<ErrorRegistro, string> = {
  "email-invalido": "Ese email no parece válido.",
  "password-corta": `La contraseña necesita al menos ${PASSWORD_MIN} caracteres.`,
  "password-larga": "La contraseña es demasiado larga.",
  "email-en-uso": "Ya hay una cuenta con ese email.",
};

export async function registrarse(_: EstadoAcceso, fd: FormData): Promise<EstadoAcceso> {
  const email = texto(fd, "email");
  const password = texto(fd, "password");
  if (password !== texto(fd, "password2")) return { error: "Las contraseñas no coinciden.", email };

  const r = await registrarOrganizador(getDb(), email, password);
  if (!r.ok) return { error: MENSAJES[r.error], email };
  await iniciarSesion(r.organizadorId);
  redirect("/sorteos");
}

export async function salir() {
  await terminarSesion();
  redirect("/entrar");
}
