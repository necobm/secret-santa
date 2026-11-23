"use server";

import { refresh } from "next/cache";
import { getDb } from "@/db/client";
import { guardarGustos, marcarVisto } from "@/dominio/consultas";
import { ErrorDeDominio } from "@/dominio/errores";

// Acciones del Participante: su Enlace personal (el token) es la única credencial.

export interface ResultadoGustos {
  error?: string;
  guardado?: boolean;
}

const texto = (fd: FormData, campo: string) => {
  const v = fd.get(campo);
  return typeof v === "string" ? v : "";
};

export async function guardarGustosAccion(token: string, _: ResultadoGustos, fd: FormData): Promise<ResultadoGustos> {
  try {
    guardarGustos(getDb(), token, texto(fd, "leGusta"), texto(fd, "noLeGusta"));
  } catch (e) {
    if (e instanceof ErrorDeDominio) return { error: e.message };
    throw e;
  }
  refresh();
  return { guardado: true };
}

export async function marcarVistoAccion(token: string) {
  try {
    marcarVisto(getDb(), token);
  } catch (e) {
    if (!(e instanceof ErrorDeDominio)) throw e;
  }
}
