import { beforeEach, describe, expect, it } from "vitest";
import { openDb, type Db } from "@/db/client";
import { runMigrations } from "@/db/migrate";
import { intentosAcceso } from "@/db/schema";
import { intentarAcceso, LIMITES, VENTANA_MS } from "./acceso";
import { registrarOrganizador } from "./cuentas";

let db: Db;
let organizadorId: number;
const T0 = new Date("2026-12-01T10:00:00Z");
const mas = (ms: number) => new Date(T0.getTime() + ms);

beforeEach(async () => {
  db = openDb(":memory:");
  runMigrations(db);
  const r = await registrarOrganizador(db, "ana@ejemplo.com", "secreto123");
  if (!r.ok) throw new Error(r.error);
  organizadorId = r.organizadorId;
});

async function fallar(veces: number, email = "ana@ejemplo.com", ip: string | null = null, ahora = T0) {
  for (let i = 0; i < veces; i++) await intentarAcceso(db, email, "mala-clave", ip, ahora);
}

describe("intentarAcceso", () => {
  it("deja entrar con las credenciales correctas", async () => {
    expect(await intentarAcceso(db, "ana@ejemplo.com", "secreto123", "1.1.1.1", T0)).toEqual({
      ok: true,
      organizadorId,
    });
  });

  it("distingue credenciales incorrectas de bloqueo", async () => {
    expect(await intentarAcceso(db, "ana@ejemplo.com", "mala-clave", null, T0)).toEqual({
      ok: false,
      error: "credenciales",
    });
  });

  it("bloquea el email tras superar el límite, incluso con la contraseña correcta", async () => {
    await fallar(LIMITES.email);
    expect(await intentarAcceso(db, "ANA@ejemplo.com", "secreto123", null, mas(1000))).toEqual({
      ok: false,
      error: "bloqueado",
      hasta: mas(VENTANA_MS),
    });
  });

  it("desbloquea al terminar la ventana", async () => {
    await fallar(LIMITES.email + 3);
    const r = await intentarAcceso(db, "ana@ejemplo.com", "secreto123", null, mas(VENTANA_MS));
    expect(r).toEqual({ ok: true, organizadorId });
  });

  it("un acceso correcto reinicia el contador del email", async () => {
    await fallar(LIMITES.email - 1);
    await intentarAcceso(db, "ana@ejemplo.com", "secreto123", null, T0);
    await fallar(LIMITES.email - 1);
    expect((await intentarAcceso(db, "ana@ejemplo.com", "secreto123", null, T0)).ok).toBe(true);
  });

  it("bloquea una IP que prueba muchos emails distintos", async () => {
    for (let i = 0; i < LIMITES.ip; i++) await fallar(1, `x${i}@ejemplo.com`, "6.6.6.6");
    const r = await intentarAcceso(db, "ana@ejemplo.com", "secreto123", "6.6.6.6", T0);
    expect(r).toMatchObject({ ok: false, error: "bloqueado" });
    expect((await intentarAcceso(db, "ana@ejemplo.com", "secreto123", "7.7.7.7", T0)).ok).toBe(true);
  });

  it("cuenta los intentos en paralelo antes de comprobar la contraseña", async () => {
    const rs = await Promise.all(
      Array.from({ length: LIMITES.email + 5 }, () => intentarAcceso(db, "ana@ejemplo.com", "mala", null, T0)),
    );
    expect(rs.filter((r) => !r.ok && r.error === "credenciales")).toHaveLength(LIMITES.email);
  });

  it("borra los contadores caducados", async () => {
    await fallar(2, "otro@ejemplo.com");
    await intentarAcceso(db, "ana@ejemplo.com", "secreto123", null, mas(VENTANA_MS));
    expect(db.select().from(intentosAcceso).all()).toHaveLength(0);
  });
});
