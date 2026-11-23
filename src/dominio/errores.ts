export const MENSAJES = {
  "sorteo-no-encontrado": "El Sorteo no existe.",
  "sorteo-ya-sorteado": "El Sorteo ya está sorteado.",
  "sorteo-no-sorteado": "Solo se puede rehacer un Sorteo ya sorteado.",
  "pocos-participantes": "Hacen falta al menos 3 Participantes.",
  "participante-no-encontrado": "Ese Participante no existe.",
  "enlace-no-encontrado": "Este enlace no es válido.",
  "nombre-invalido": "Escribe un nombre (máximo 40 caracteres).",
  "nombre-sorteo-invalido": "Escribe un nombre para el Sorteo (máximo 80 caracteres).",
  "nombre-repetido": "Ya hay un Participante con ese nombre.",
  "presupuesto-invalido": "El Presupuesto debe ser una cantidad en euros, por ejemplo 30 o 25,50.",
  "fecha-invalida": "La Fecha de entrega no es válida.",
  "texto-largo": "El texto es demasiado largo (máximo 500 caracteres).",
} as const;

export type CodigoError = keyof typeof MENSAJES;

export class ErrorDeDominio extends Error {
  constructor(readonly codigo: CodigoError) {
    super(MENSAJES[codigo]);
    this.name = "ErrorDeDominio";
  }
}
