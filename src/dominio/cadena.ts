import { randomInt } from "node:crypto";

export const MIN_PARTICIPANTES = 3;

export interface Asignacion<Id> {
  regalador: Id;
  destinatario: Id;
}

/** Devuelve un entero aleatorio en [0, max). */
export type Aleatorio = (max: number) => number;

const aleatorioSeguro: Aleatorio = (max) => randomInt(max);

/**
 * Genera una Cadena: un único ciclo A→B→C→…→A que pasa por todos los Participantes.
 * Barajar y cerrar el anillo da la misma probabilidad a cada Cadena posible.
 */
export function generarCadena<Id>(
  participantes: readonly Id[],
  aleatorio: Aleatorio = aleatorioSeguro,
): Asignacion<Id>[] {
  if (participantes.length < MIN_PARTICIPANTES) {
    throw new Error(`Hacen falta al menos ${MIN_PARTICIPANTES} Participantes`);
  }
  if (new Set(participantes).size !== participantes.length) {
    throw new Error("Hay un Participante repetido");
  }

  const orden = [...participantes];
  for (let i = orden.length - 1; i > 0; i--) {
    const j = aleatorio(i + 1);
    [orden[i], orden[j]] = [orden[j], orden[i]];
  }

  return orden.map((regalador, i) => ({
    regalador,
    destinatario: orden[(i + 1) % orden.length],
  }));
}

/** Resumen de la Verificación: solo recuentos, nunca nombres. */
export interface Verificacion {
  total: number;
  /** Participantes que regalan exactamente a un Destinatario. */
  conDestinatario: number;
  /** Participantes que reciben más de un regalo. */
  recibenVarios: number;
  /** Participantes que no reciben ningún regalo. */
  sinRegalo: number;
  autoregalos: number;
  parejasMutuas: number;
  unaSolaCadena: boolean;
  valida: boolean;
}

export function verificar<Id>(
  participantes: readonly Id[],
  asignaciones: readonly Asignacion<Id>[],
): Verificacion {
  const total = participantes.length;
  const destinatariosDe = new Map<Id, Id[]>(participantes.map((p) => [p, []]));
  const regalosA = new Map<Id, number>(participantes.map((p) => [p, 0]));

  let autoregalos = 0;
  for (const { regalador, destinatario } of asignaciones) {
    if (regalador === destinatario) autoregalos++;
    destinatariosDe.get(regalador)?.push(destinatario);
    regalosA.set(destinatario, (regalosA.get(destinatario) ?? 0) + 1);
  }

  const conDestinatario = participantes.filter((p) => destinatariosDe.get(p)!.length === 1).length;
  const recibenVarios = [...regalosA.values()].filter((n) => n > 1).length;
  const sinRegalo = participantes.filter((p) => regalosA.get(p) === 0).length;

  let parejasMutuas = 0;
  for (const p of participantes) {
    const [d] = destinatariosDe.get(p)!;
    if (d !== undefined && d !== p && destinatariosDe.get(d)?.includes(p)) parejasMutuas++;
  }
  parejasMutuas /= 2;

  const unaSolaCadena = esUnaSolaCadena(participantes, destinatariosDe);
  const valida =
    total >= MIN_PARTICIPANTES &&
    asignaciones.length === total &&
    conDestinatario === total &&
    recibenVarios === 0 &&
    sinRegalo === 0 &&
    autoregalos === 0 &&
    parejasMutuas === 0 &&
    unaSolaCadena;

  return { total, conDestinatario, recibenVarios, sinRegalo, autoregalos, parejasMutuas, unaSolaCadena, valida };
}

function esUnaSolaCadena<Id>(participantes: readonly Id[], destinatariosDe: Map<Id, Id[]>) {
  if (participantes.length === 0) return false;
  const inicio = participantes[0];
  const visitados = new Set<Id>();
  let actual: Id | undefined = inicio;
  while (actual !== undefined && !visitados.has(actual)) {
    visitados.add(actual);
    const siguientes: Id[] = destinatariosDe.get(actual) ?? [];
    if (siguientes.length !== 1) return false;
    actual = siguientes[0];
  }
  return actual === inicio && visitados.size === participantes.length;
}
