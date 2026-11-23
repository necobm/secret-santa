"use server";

import { redirect } from "next/navigation";
import { autenticar, PASSWORD_MIN, registrarOrganizador, type ErrorRegistro } from "@/cuentas/cuentas";
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

export async function entrar(_: EstadoAcceso, fd: FormData): Promise<EstadoAcceso> {
  const email = texto(fd, "email");
  const id = await autenticar(getDb(), email, texto(fd, "password"));
  if (id === null) return { error: "Email o contraseña incorrectos.", email };
  await iniciarSesion(id);
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
