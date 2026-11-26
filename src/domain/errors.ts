// Codes are English; messages are shown to users, so they stay Spanish.
export const MESSAGES = {
  "draw-not-found": "El Sorteo no existe.",
  "draw-already-drawn": "El Sorteo ya está sorteado.",
  "draw-not-drawn": "El Sorteo todavía no está sorteado.",
  "too-few-participants": "Hacen falta al menos 3 Participantes.",
  "participant-not-found": "Ese Participante no existe.",
  "link-not-found": "Este enlace no es válido.",
  "invalid-name": "Escribe un nombre (máximo 40 caracteres).",
  "invalid-draw-name": "Escribe un nombre para el Sorteo (máximo 80 caracteres).",
  "duplicate-name": "Ya hay un Participante con ese nombre.",
  "invalid-budget": "El Presupuesto debe ser una cantidad en euros, por ejemplo 30 o 25,50.",
  "invalid-budget-range": "En un rango de Presupuesto, la primera cantidad debe ser menor que la segunda.",
  "invalid-date": "La Fecha de entrega no es válida.",
  "text-too-long": "El texto es demasiado largo (máximo 500 caracteres).",
} as const;

export type ErrorCode = keyof typeof MESSAGES;

export class DomainError extends Error {
  constructor(readonly code: ErrorCode) {
    super(MESSAGES[code]);
    this.name = "DomainError";
  }
}
