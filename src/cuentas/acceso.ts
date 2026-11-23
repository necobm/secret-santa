import { eq, lte, sql } from "drizzle-orm";
import type { Db } from "@/db/client";
import { intentosAcceso } from "@/db/schema";
import { autenticar, normalizarEmail } from "./cuentas";

// Límite de intentos de entrar (fuerza bruta). Ventana fija por email y por IP, guardada en
// SQLite para que sobreviva a reinicios y la compartan varios procesos.
// El intento se cuenta ANTES de comprobar la contraseña: peticiones en paralelo no se cuelan.

export const VENTANA_MS = 15 * 60 * 1000;
export const LIMITES = { email: 5, ip: 20 } as const;

type Clave = { tipo: keyof typeof LIMITES; valor: string };

const segundos = (d: Date) => Math.floor(d.getTime() / 1000);

/** Suma un intento a cada clave. Devuelve hasta cuándo está bloqueado, o null si no lo está. */
export function contarIntento(db: Db, claves: Clave[], ahora = new Date()): Date | null {
  const ahoraS = segundos(ahora);
  const inicioVentanaS = ahoraS - VENTANA_MS / 1000;
  const enVentana = sql`${intentosAcceso.desde} > ${inicioVentanaS}`;
  let hasta: Date | null = null;

  for (const { tipo, valor } of claves) {
    const fila = db
      .insert(intentosAcceso)
      .values({ clave: `${tipo}:${valor}`, intentos: 1, desde: ahora })
      .onConflictDoUpdate({
        target: intentosAcceso.clave,
        set: {
          intentos: sql`case when ${enVentana} then ${intentosAcceso.intentos} + 1 else 1 end`,
          desde: sql`case when ${enVentana} then ${intentosAcceso.desde} else ${ahoraS} end`,
        },
      })
      .returning()
      .get();
    if (fila.intentos > LIMITES[tipo]) {
      const fin = new Date(fila.desde.getTime() + VENTANA_MS);
      if (!hasta || fin > hasta) hasta = fin;
    }
  }
  return hasta;
}

export function olvidarIntentos(db: Db, clave: Clave) {
  db.delete(intentosAcceso).where(eq(intentosAcceso.clave, `${clave.tipo}:${clave.valor}`)).run();
}

export function borrarIntentosCaducados(db: Db, ahora = new Date()) {
  db.delete(intentosAcceso)
    .where(lte(intentosAcceso.desde, new Date(ahora.getTime() - VENTANA_MS)))
    .run();
}

export type ResultadoAcceso =
  | { ok: true; organizadorId: number }
  | { ok: false; error: "credenciales" }
  | { ok: false; error: "bloqueado"; hasta: Date };

/** `autenticar` con límite de intentos. Un acceso correcto reinicia el contador de ese email. */
export async function intentarAcceso(
  db: Db,
  email: string,
  password: string,
  ip: string | null,
  ahora = new Date(),
): Promise<ResultadoAcceso> {
  borrarIntentosCaducados(db, ahora);
  const claveEmail: Clave = { tipo: "email", valor: normalizarEmail(email) };
  const claves = ip ? [claveEmail, { tipo: "ip" as const, valor: ip }] : [claveEmail];

  const hasta = contarIntento(db, claves, ahora);
  if (hasta) return { ok: false, error: "bloqueado", hasta };

  const id = await autenticar(db, email, password);
  if (id === null) return { ok: false, error: "credenciales" };
  olvidarIntentos(db, claveEmail);
  return { ok: true, organizadorId: id };
}
