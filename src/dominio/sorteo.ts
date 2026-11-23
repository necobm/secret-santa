import { and, eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import { asignaciones, participantes, sorteos } from "@/db/schema";
import { generarCadena, MIN_PARTICIPANTES, verificar, type Aleatorio, type Verificacion } from "./cadena";
import { ErrorDeDominio } from "./errores";

export { ErrorDeDominio } from "./errores";

export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

/** Carga el Sorteo; si se indica Organizador, exige que sea suyo (si no, "no encontrado"). */
export function cargarSorteo(tx: Tx, sorteoId: number, organizadorId?: number) {
  const sorteo = tx
    .select()
    .from(sorteos)
    .where(
      organizadorId === undefined
        ? eq(sorteos.id, sorteoId)
        : and(eq(sorteos.id, sorteoId), eq(sorteos.organizadorId, organizadorId)),
    )
    .get();
  if (!sorteo) throw new ErrorDeDominio("sorteo-no-encontrado");
  return sorteo;
}

function idsParticipantes(tx: Tx, sorteoId: number) {
  return tx
    .select({ id: participantes.id })
    .from(participantes)
    .where(eq(participantes.sorteoId, sorteoId))
    .all()
    .map((p) => p.id);
}

function guardarCadena(tx: Tx, sorteoId: number, aleatorio?: Aleatorio) {
  const ids = idsParticipantes(tx, sorteoId);
  if (ids.length < MIN_PARTICIPANTES) throw new ErrorDeDominio("pocos-participantes");
  const cadena = generarCadena(ids, aleatorio);
  tx.insert(asignaciones)
    .values(cadena.map((a) => ({ sorteoId, regaladorId: a.regalador, destinatarioId: a.destinatario })))
    .run();
}

/** Rehacer dentro de una transacción ya abierta (lo usan también añadir y quitar Participantes). */
export function rehacerEnTx(tx: Tx, sorteoId: number, aleatorio?: Aleatorio) {
  tx.delete(asignaciones).where(eq(asignaciones.sorteoId, sorteoId)).run();
  tx.update(participantes).set({ vistoEn: null }).where(eq(participantes.sorteoId, sorteoId)).run();
  guardarCadena(tx, sorteoId, aleatorio);
}

/** Abierto → Sorteado: genera la Cadena. */
export function sortear(db: Db, sorteoId: number, opciones: { organizadorId?: number; aleatorio?: Aleatorio } = {}) {
  db.transaction((tx) => {
    const sorteo = cargarSorteo(tx, sorteoId, opciones.organizadorId);
    if (sorteo.estado !== "abierto") throw new ErrorDeDominio("sorteo-ya-sorteado");
    guardarCadena(tx, sorteoId, opciones.aleatorio);
    tx.update(sorteos).set({ estado: "sorteado" }).where(eq(sorteos.id, sorteoId)).run();
  });
}

/**
 * Rehacer el sorteo: descarta todas las Asignaciones y genera una Cadena nueva con
 * los Participantes actuales. Conserva Enlaces personales y gustos; Visto vuelve a cero.
 */
export function rehacerSorteo(
  db: Db,
  sorteoId: number,
  opciones: { organizadorId?: number; aleatorio?: Aleatorio } = {},
) {
  db.transaction((tx) => {
    const sorteo = cargarSorteo(tx, sorteoId, opciones.organizadorId);
    if (sorteo.estado !== "sorteado") throw new ErrorDeDominio("sorteo-no-sorteado");
    rehacerEnTx(tx, sorteoId, opciones.aleatorio);
  });
}

/** Verificación del Sorteo tal y como está guardado. */
export function verificarSorteo(db: Db, sorteoId: number, organizadorId?: number): Verificacion {
  return db.transaction((tx) => {
    cargarSorteo(tx, sorteoId, organizadorId);
    return verificarEnTx(tx, sorteoId);
  });
}

export function verificarEnTx(tx: Tx, sorteoId: number): Verificacion {
  const ids = idsParticipantes(tx, sorteoId);
  const filas = tx
    .select({ regalador: asignaciones.regaladorId, destinatario: asignaciones.destinatarioId })
    .from(asignaciones)
    .where(eq(asignaciones.sorteoId, sorteoId))
    .all();
  return verificar(ids, filas);
}
