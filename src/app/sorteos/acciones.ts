"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { requerirOrganizador } from "@/cuentas/sesion";
import { getDb } from "@/db/client";
import { marcarVistoOrganizador, revelarAsignaciones } from "@/dominio/consultas";
import { ErrorDeDominio } from "@/dominio/errores";
import {
  anadirParticipante,
  borrarSorteo,
  crearSorteo,
  editarSorteo,
  quitarParticipante,
  renombrarParticipante,
} from "@/dominio/gestion";
import { rehacerSorteo, sortear } from "@/dominio/sorteo";

// Cada acción es un endpoint público: verifica la sesión y que el Sorteo sea del Organizador
// (las funciones de dominio reciben su id y lo comprueban).

export interface Resultado {
  error?: string;
  /** Valor a conservar en el formulario cuando hay error. */
  valor?: string;
  /** Varios valores a conservar (formularios con más de un campo). */
  campos?: Record<string, string>;
}

const texto = (fd: FormData, campo: string) => {
  const v = fd.get(campo);
  return typeof v === "string" ? v : "";
};

async function ejecutar(operacion: (organizadorId: number) => void, valor?: string): Promise<Resultado> {
  const org = await requerirOrganizador();
  try {
    operacion(org.id);
  } catch (e) {
    if (e instanceof ErrorDeDominio) return { error: e.message, valor };
    throw e;
  }
  refresh();
  return {};
}

export async function crearSorteoAccion(_: Resultado, fd: FormData): Promise<Resultado> {
  const org = await requerirOrganizador();
  const campos = {
    nombre: texto(fd, "nombre"),
    presupuesto: texto(fd, "presupuesto"),
    fecha: texto(fd, "fecha"),
    tuNombre: texto(fd, "tuNombre"),
  };
  let id: number;
  try {
    id = crearSorteo(getDb(), org.id, {
      nombre: campos.nombre,
      presupuesto: campos.presupuesto,
      fechaEntrega: campos.fecha,
      nombreOrganizador: fd.get("noParticipo") ? null : campos.tuNombre,
    });
  } catch (e) {
    if (e instanceof ErrorDeDominio) return { error: e.message, campos };
    throw e;
  }
  redirect(`/sorteos/${id}`);
}

export async function editarSorteoAccion(sorteoId: number, _: Resultado, fd: FormData) {
  return ejecutar((org) =>
    editarSorteo(getDb(), org, sorteoId, {
      nombre: texto(fd, "nombre"),
      presupuesto: texto(fd, "presupuesto"),
      fechaEntrega: texto(fd, "fecha"),
    }),
  );
}

export async function borrarSorteoAccion(sorteoId: number) {
  const r = await ejecutar((org) => borrarSorteo(getDb(), org, sorteoId));
  if (r.error) return r;
  redirect("/sorteos");
}

export async function anadirParticipanteAccion(sorteoId: number, _: Resultado, fd: FormData) {
  const nombre = texto(fd, "nombre");
  return ejecutar((org) => anadirParticipante(getDb(), org, sorteoId, nombre), nombre);
}

export async function quitarParticipanteAccion(sorteoId: number, participanteId: number) {
  return ejecutar((org) => quitarParticipante(getDb(), org, sorteoId, participanteId));
}

export async function renombrarParticipanteAccion(sorteoId: number, participanteId: number, _: Resultado, fd: FormData) {
  const nombre = texto(fd, "nombre");
  return ejecutar((org) => renombrarParticipante(getDb(), org, sorteoId, participanteId, nombre), nombre);
}

export async function sortearAccion(sorteoId: number) {
  return ejecutar((org) => sortear(getDb(), sorteoId, { organizadorId: org }));
}

export async function rehacerAccion(sorteoId: number) {
  return ejecutar((org) => rehacerSorteo(getDb(), sorteoId, { organizadorId: org }));
}

export async function revelarAccion(sorteoId: number) {
  const org = await requerirOrganizador();
  return revelarAsignaciones(getDb(), org.id, sorteoId);
}

export async function marcarMiVistoAccion(sorteoId: number) {
  const org = await requerirOrganizador();
  marcarVistoOrganizador(getDb(), org.id, sorteoId);
}
