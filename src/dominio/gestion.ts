import { randomBytes } from "node:crypto";
import { and, eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import { participantes, sorteos } from "@/db/schema";
import type { Aleatorio } from "./cadena";
import { ErrorDeDominio } from "./errores";
import { cargarSorteo, rehacerEnTx, type Tx } from "./sorteo";
import { fechaEntrega, nombreParticipante, nombreSorteo, presupuestoCentimos } from "./valores";

// Operaciones del Organizador sobre sus Sorteos. Todas exigen que el Sorteo sea suyo.

export interface DatosSorteo {
  nombre: string;
  /** Texto tal cual lo escribe el Organizador ("30", "25,50"); vacío = sin Presupuesto. */
  presupuesto: string;
  /** YYYY-MM-DD; vacío = sin Fecha de entrega. */
  fechaEntrega: string;
}

const nuevoToken = () => randomBytes(18).toString("base64url");

function validarDatos(datos: DatosSorteo) {
  return {
    nombre: nombreSorteo(datos.nombre),
    presupuestoCentimos: presupuestoCentimos(datos.presupuesto),
    fechaEntrega: fechaEntrega(datos.fechaEntrega),
  };
}

function insertarParticipante(tx: Tx, sorteoId: number, entrada: string, esOrganizador = false) {
  const { nombre, nombreNormalizado } = nombreParticipante(entrada);
  const repetido = tx
    .select({ id: participantes.id })
    .from(participantes)
    .where(and(eq(participantes.sorteoId, sorteoId), eq(participantes.nombreNormalizado, nombreNormalizado)))
    .get();
  if (repetido) throw new ErrorDeDominio("nombre-repetido");
  return tx
    .insert(participantes)
    .values({ sorteoId, nombre, nombreNormalizado, token: nuevoToken(), esOrganizador })
    .returning({ id: participantes.id })
    .get().id;
}

/** Crea un Sorteo Abierto. Con `nombreOrganizador`, el Organizador entra también como Participante. */
export function crearSorteo(db: Db, organizadorId: number, datos: DatosSorteo & { nombreOrganizador: string | null }) {
  const valores = validarDatos(datos);
  return db.transaction((tx) => {
    const sorteoId = tx
      .insert(sorteos)
      .values({ organizadorId, ...valores })
      .returning({ id: sorteos.id })
      .get().id;
    if (datos.nombreOrganizador !== null) insertarParticipante(tx, sorteoId, datos.nombreOrganizador, true);
    return sorteoId;
  });
}

export function editarSorteo(db: Db, organizadorId: number, sorteoId: number, datos: DatosSorteo) {
  const valores = validarDatos(datos);
  db.transaction((tx) => {
    cargarSorteo(tx, sorteoId, organizadorId);
    tx.update(sorteos).set(valores).where(eq(sorteos.id, sorteoId)).run();
  });
}

export function borrarSorteo(db: Db, organizadorId: number, sorteoId: number) {
  db.transaction((tx) => {
    cargarSorteo(tx, sorteoId, organizadorId);
    tx.delete(sorteos).where(eq(sorteos.id, sorteoId)).run();
  });
}

/** Si el Sorteo ya está Sorteado, añadir rehace el sorteo en la misma operación. */
export function anadirParticipante(
  db: Db,
  organizadorId: number,
  sorteoId: number,
  nombre: string,
  aleatorio?: Aleatorio,
) {
  return db.transaction((tx) => {
    const sorteo = cargarSorteo(tx, sorteoId, organizadorId);
    const id = insertarParticipante(tx, sorteoId, nombre);
    if (sorteo.estado === "sorteado") rehacerEnTx(tx, sorteoId, aleatorio);
    return id;
  });
}

function cargarParticipante(tx: Tx, sorteoId: number, participanteId: number) {
  const p = tx
    .select()
    .from(participantes)
    .where(and(eq(participantes.id, participanteId), eq(participantes.sorteoId, sorteoId)))
    .get();
  if (!p) throw new ErrorDeDominio("participante-no-encontrado");
  return p;
}

/** Si el Sorteo ya está Sorteado, quitar rehace el sorteo (y falla si quedarían menos de 3). */
export function quitarParticipante(
  db: Db,
  organizadorId: number,
  sorteoId: number,
  participanteId: number,
  aleatorio?: Aleatorio,
) {
  db.transaction((tx) => {
    const sorteo = cargarSorteo(tx, sorteoId, organizadorId);
    cargarParticipante(tx, sorteoId, participanteId);
    tx.delete(participantes).where(eq(participantes.id, participanteId)).run();
    if (sorteo.estado === "sorteado") rehacerEnTx(tx, sorteoId, aleatorio);
  });
}

/** Renombrar no toca la Cadena, así que se permite siempre. */
export function renombrarParticipante(
  db: Db,
  organizadorId: number,
  sorteoId: number,
  participanteId: number,
  nombre: string,
) {
  db.transaction((tx) => {
    cargarSorteo(tx, sorteoId, organizadorId);
    cargarParticipante(tx, sorteoId, participanteId);
    const valores = nombreParticipante(nombre);
    const repetido = tx
      .select({ id: participantes.id })
      .from(participantes)
      .where(and(eq(participantes.sorteoId, sorteoId), eq(participantes.nombreNormalizado, valores.nombreNormalizado)))
      .get();
    if (repetido && repetido.id !== participanteId) throw new ErrorDeDominio("nombre-repetido");
    tx.update(participantes).set(valores).where(eq(participantes.id, participanteId)).run();
  });
}
