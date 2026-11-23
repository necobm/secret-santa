import { ErrorDeDominio } from "./errores";

export const MAX_NOMBRE = 40;
export const MAX_NOMBRE_SORTEO = 80;
export const MAX_GUSTOS = 500;

const limpiar = (s: string) => s.trim().replace(/\s+/g, " ");

/** Nombre de Participante: sin espacios sobrantes; la forma normalizada decide si se repite. */
export function nombreParticipante(entrada: string) {
  const nombre = limpiar(entrada);
  if (!nombre || nombre.length > MAX_NOMBRE) throw new ErrorDeDominio("nombre-invalido");
  return { nombre, nombreNormalizado: nombre.toLocaleLowerCase("es") };
}

export function nombreSorteo(entrada: string) {
  const nombre = limpiar(entrada);
  if (!nombre || nombre.length > MAX_NOMBRE_SORTEO) throw new ErrorDeDominio("nombre-sorteo-invalido");
  return nombre;
}

/** "30", "25,50", "25.5 €" → céntimos. Vacío → null. */
export function presupuestoCentimos(entrada: string): number | null {
  const s = entrada.replace("€", "").trim().replace(",", ".");
  if (!s) return null;
  if (!/^\d{1,6}(\.\d{1,2})?$/.test(s)) throw new ErrorDeDominio("presupuesto-invalido");
  return Math.round(Number(s) * 100);
}

/** YYYY-MM-DD válida. Vacío → null. */
export function fechaEntrega(entrada: string): string | null {
  const s = entrada.trim();
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) throw new ErrorDeDominio("fecha-invalida");
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  if (d.getUTCFullYear() !== +m[1] || d.getUTCMonth() !== +m[2] - 1 || d.getUTCDate() !== +m[3]) {
    throw new ErrorDeDominio("fecha-invalida");
  }
  return s;
}

export function gustos(entrada: string) {
  const s = entrada.trim();
  if (s.length > MAX_GUSTOS) throw new ErrorDeDominio("texto-largo");
  return s;
}

/** 3000 → "30 €", 2550 → "25,50 €". */
export function formatearPresupuesto(centimos: number) {
  const euros = centimos / 100;
  return `${euros.toLocaleString("es-ES", { minimumFractionDigits: centimos % 100 ? 2 : 0, maximumFractionDigits: 2 })} €`;
}

/** "2026-12-24" → "24 dic 2026". */
export function formatearFecha(fecha: string, conAnio = true) {
  const [a, m, d] = fecha.split("-").map(Number);
  const mes = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"][m - 1];
  return conAnio ? `${d} ${mes} ${a}` : `${d} ${mes}`;
}
