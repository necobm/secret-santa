import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import type { Db } from "@/db/client";
import { asignaciones, participantes, sorteos } from "@/db/schema";
import type { Verificacion } from "./cadena";
import { ErrorDeDominio } from "./errores";
import { cargarSorteo, verificarEnTx, type Tx } from "./sorteo";
import { gustos } from "./valores";

// Lecturas para las pantallas. Ninguna devuelve Asignaciones ajenas salvo `revelarAsignaciones`.

export type EstadoGustos = "completos" | "solo-le-gusta" | "solo-no-le-gusta" | "vacios";

const estadoGustos = (leGusta: string, noLeGusta: string): EstadoGustos =>
  leGusta && noLeGusta ? "completos" : leGusta ? "solo-le-gusta" : noLeGusta ? "solo-no-le-gusta" : "vacios";

export function listarSorteos(db: Db, organizadorId: number) {
  return db
    .select({
      id: sorteos.id,
      nombre: sorteos.nombre,
      estado: sorteos.estado,
      presupuestoCentimos: sorteos.presupuestoCentimos,
      fechaEntrega: sorteos.fechaEntrega,
      participantes: sql<number>`count(${participantes.id})`,
      vistos: sql<number>`count(${participantes.vistoEn})`,
    })
    .from(sorteos)
    .leftJoin(participantes, eq(participantes.sorteoId, sorteos.id))
    .where(eq(sorteos.organizadorId, organizadorId))
    .groupBy(sorteos.id)
    .orderBy(desc(sorteos.creadoEn), desc(sorteos.id))
    .all();
}

export interface Panel {
  sorteo: typeof sorteos.$inferSelect;
  participantes: {
    id: number;
    nombre: string;
    token: string;
    esOrganizador: boolean;
    gustos: EstadoGustos;
    visto: boolean;
  }[];
  /** La Asignación del propio Organizador, si participa y ya está sorteado. */
  miAsignacion: { destinatario: string; leGusta: string; noLeGusta: string } | null;
  verificacion: Verificacion;
}

export function panelSorteo(db: Db, organizadorId: number, sorteoId: number): Panel {
  return db.transaction((tx) => {
    const sorteo = cargarSorteo(tx, sorteoId, organizadorId);
    const filas = tx
      .select()
      .from(participantes)
      .where(eq(participantes.sorteoId, sorteoId))
      .orderBy(desc(participantes.esOrganizador), participantes.creadoEn, participantes.id)
      .all();

    const yo = filas.find((p) => p.esOrganizador);
    const destino = alias(participantes, "destino");
    const mia = yo
      ? tx
          .select({ destinatario: destino.nombre, leGusta: destino.leGusta, noLeGusta: destino.noLeGusta })
          .from(asignaciones)
          .innerJoin(destino, eq(destino.id, asignaciones.destinatarioId))
          .where(and(eq(asignaciones.sorteoId, sorteoId), eq(asignaciones.regaladorId, yo.id)))
          .get()
      : undefined;

    return {
      sorteo,
      participantes: filas.map((p) => ({
        id: p.id,
        nombre: p.nombre,
        token: p.token,
        esOrganizador: p.esOrganizador,
        gustos: estadoGustos(p.leGusta, p.noLeGusta),
        visto: p.vistoEn !== null,
      })),
      miAsignacion: mia ?? null,
      verificacion: verificarEnTx(tx, sorteoId),
    };
  });
}

/** Todas las Asignaciones con nombres, en el orden de la Cadena. Solo tras confirmar "Revelar". */
export function revelarAsignaciones(db: Db, organizadorId: number, sorteoId: number) {
  return db.transaction((tx) => {
    cargarSorteo(tx, sorteoId, organizadorId);
    const regalador = alias(participantes, "regalador");
    const destinatario = alias(participantes, "destinatario");
    const filas = tx
      .select({
        deId: asignaciones.regaladorId,
        paraId: asignaciones.destinatarioId,
        de: regalador.nombre,
        para: destinatario.nombre,
        deEsOrganizador: regalador.esOrganizador,
      })
      .from(asignaciones)
      .innerJoin(regalador, eq(regalador.id, asignaciones.regaladorId))
      .innerJoin(destinatario, eq(destinatario.id, asignaciones.destinatarioId))
      .where(eq(asignaciones.sorteoId, sorteoId))
      .all();
    if (filas.length === 0) return [];

    // Recorre la Cadena empezando por el Organizador si participa.
    const porRegalador = new Map(filas.map((f) => [f.deId, f]));
    const inicio = filas.find((f) => f.deEsOrganizador) ?? filas[0];
    const orden: { de: string; para: string }[] = [];
    let actual: (typeof filas)[number] | undefined = inicio;
    while (actual && orden.length < filas.length) {
      orden.push({ de: actual.de, para: actual.para });
      actual = porRegalador.get(actual.paraId);
      if (actual === inicio) break;
    }
    return orden;
  });
}

/** Marca como Visto la Asignación del Organizador (cuando la ve en su panel). */
export function marcarVistoOrganizador(db: Db, organizadorId: number, sorteoId: number) {
  db.transaction((tx) => {
    const sorteo = cargarSorteo(tx, sorteoId, organizadorId);
    if (sorteo.estado !== "sorteado") return;
    tx.update(participantes)
      .set({ vistoEn: new Date() })
      .where(and(eq(participantes.sorteoId, sorteoId), eq(participantes.esOrganizador, true), isNull(participantes.vistoEn)))
      .run();
  });
}

// --- Enlace personal ---

function participantePorToken(db: Db | Tx, token: string) {
  const p = db.select().from(participantes).where(eq(participantes.token, token)).get();
  if (!p) throw new ErrorDeDominio("enlace-no-encontrado");
  return p;
}

/** Lo que ve un Participante con su Enlace personal. */
export function verEnlace(db: Db, token: string) {
  return db.transaction((tx) => {
    const yo = participantePorToken(tx, token);
    const sorteo = tx.select().from(sorteos).where(eq(sorteos.id, yo.sorteoId)).get()!;
    const destino = alias(participantes, "destino");
    const destinatario =
      sorteo.estado === "sorteado"
        ? (tx
            .select({ nombre: destino.nombre, leGusta: destino.leGusta, noLeGusta: destino.noLeGusta })
            .from(asignaciones)
            .innerJoin(destino, eq(destino.id, asignaciones.destinatarioId))
            .where(eq(asignaciones.regaladorId, yo.id))
            .get() ?? null)
        : null;
    return {
      sorteo: {
        nombre: sorteo.nombre,
        estado: sorteo.estado,
        presupuestoCentimos: sorteo.presupuestoCentimos,
        fechaEntrega: sorteo.fechaEntrega,
      },
      participante: { nombre: yo.nombre, leGusta: yo.leGusta, noLeGusta: yo.noLeGusta },
      destinatario,
    };
  });
}

/** El Participante ha visto su Asignación actual (solo cuenta la primera vez). */
export function marcarVisto(db: Db, token: string) {
  const yo = participantePorToken(db, token);
  const tiene = db.select().from(asignaciones).where(eq(asignaciones.regaladorId, yo.id)).get();
  if (!tiene || yo.vistoEn) return;
  db.update(participantes).set({ vistoEn: new Date() }).where(eq(participantes.id, yo.id)).run();
}

export function guardarGustos(db: Db, token: string, leGusta: string, noLeGusta: string) {
  const yo = participantePorToken(db, token);
  db.update(participantes)
    .set({ leGusta: gustos(leGusta), noLeGusta: gustos(noLeGusta) })
    .where(eq(participantes.id, yo.id))
    .run();
}
