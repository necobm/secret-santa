import { beforeEach, describe, expect, it } from "vitest";
import { openDb, type Db } from "@/db/client";
import { runMigrations } from "@/db/migrate";
import { organizadores, sesiones } from "@/db/schema";
import {
  autenticar,
  borrarSesionesCaducadas,
  buscarSesion,
  cerrarSesion,
  crearSesion,
  DURACION_SESION_MS,
  registrarOrganizador,
} from "./cuentas";
import { hashPassword, verifyPassword } from "./password";

let db: Db;

beforeEach(() => {
  db = openDb(":memory:");
  runMigrations(db);
});

describe("password", () => {
  it("verifica la contraseña correcta y rechaza otra", async () => {
    const h = await hashPassword("turrón123");
    expect(h).not.toContain("turrón123");
    expect(await verifyPassword("turrón123", h)).toBe(true);
    expect(await verifyPassword("turron123", h)).toBe(false);
  });

  it("usa una sal distinta cada vez", async () => {
    expect(await hashPassword("abcdefgh")).not.toBe(await hashPassword("abcdefgh"));
  });

  it("rechaza un hash con formato desconocido", async () => {
    expect(await verifyPassword("x", "md5$abc")).toBe(false);
  });
});

describe("registrarOrganizador", () => {
  it("crea la Cuenta de organizador con el email normalizado", async () => {
    const r = await registrarOrganizador(db, "  Ana@Ejemplo.COM ", "secreto123");
    expect(r.ok).toBe(true);
    expect(db.select().from(organizadores).get()?.email).toBe("ana@ejemplo.com");
  });

  it.each([
    ["no-es-un-email", "secreto123", "email-invalido"],
    ["ana@ejemplo.com", "corta", "password-corta"],
    ["ana@ejemplo.com", "x".repeat(201), "password-larga"],
  ])("rechaza %s / contraseña inválida", async (email, password, error) => {
    expect(await registrarOrganizador(db, email, password)).toEqual({ ok: false, error });
  });

  it("no permite repetir email sin distinguir mayúsculas", async () => {
    await registrarOrganizador(db, "ana@ejemplo.com", "secreto123");
    expect(await registrarOrganizador(db, "ANA@ejemplo.com", "otro12345")).toEqual({
      ok: false,
      error: "email-en-uso",
    });
  });
});

describe("autenticar", () => {
  it("devuelve el id con las credenciales correctas, sin importar mayúsculas del email", async () => {
    const r = await registrarOrganizador(db, "ana@ejemplo.com", "secreto123");
    expect(await autenticar(db, "Ana@Ejemplo.com", "secreto123")).toBe(r.ok && r.organizadorId);
  });

  it("devuelve null con contraseña incorrecta o email desconocido", async () => {
    await registrarOrganizador(db, "ana@ejemplo.com", "secreto123");
    expect(await autenticar(db, "ana@ejemplo.com", "secreto124")).toBeNull();
    expect(await autenticar(db, "nadie@ejemplo.com", "secreto123")).toBeNull();
  });
});

describe("sesiones", () => {
  async function organizador() {
    const r = await registrarOrganizador(db, "ana@ejemplo.com", "secreto123");
    if (!r.ok) throw new Error(r.error);
    return r.organizadorId;
  }

  it("encuentra la sesión por su token y no guarda el token en claro", async () => {
    const id = await organizador();
    const { token } = crearSesion(db, id);
    expect(buscarSesion(db, token)).toMatchObject({ organizadorId: id, email: "ana@ejemplo.com" });
    expect(db.select().from(sesiones).get()?.tokenHash).not.toBe(token);
  });

  it("no encuentra un token desconocido", () => {
    expect(buscarSesion(db, "inventado")).toBeNull();
  });

  it("caduca a los 30 días", async () => {
    const id = await organizador();
    const ahora = new Date("2026-12-01T00:00:00Z");
    const { token } = crearSesion(db, id, ahora);
    expect(buscarSesion(db, token, new Date(ahora.getTime() + DURACION_SESION_MS - 1))).not.toBeNull();
    expect(buscarSesion(db, token, new Date(ahora.getTime() + DURACION_SESION_MS))).toBeNull();

    borrarSesionesCaducadas(db, new Date(ahora.getTime() + DURACION_SESION_MS));
    expect(db.select().from(sesiones).all()).toHaveLength(0);
  });

  it("cerrar sesión la invalida", async () => {
    const { token } = crearSesion(db, await organizador());
    cerrarSesion(db, token);
    expect(buscarSesion(db, token)).toBeNull();
  });
});
