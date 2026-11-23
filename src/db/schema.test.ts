import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { openDb, type Db } from "./client";
import { runMigrations } from "./migrate";
import { asignaciones, organizadores, participantes, sorteos } from "./schema";

let db: Db;
let sorteoId: number;

function nuevoParticipante(nombre: string, extra: Partial<typeof participantes.$inferInsert> = {}) {
  return db
    .insert(participantes)
    .values({
      sorteoId,
      nombre,
      nombreNormalizado: nombre.toLocaleLowerCase("es"),
      token: `tok-${nombre}-${Math.random()}`,
      ...extra,
    })
    .returning()
    .get();
}

beforeEach(() => {
  db = openDb(":memory:");
  runMigrations(db);
  const org = db
    .insert(organizadores)
    .values({ email: "ana@ejemplo.com", passwordHash: "x" })
    .returning()
    .get();
  sorteoId = db
    .insert(sorteos)
    .values({ organizadorId: org.id, nombre: "Navidad" })
    .returning()
    .get().id;
});

describe("esquema", () => {
  it("un Sorteo nuevo está Abierto y sin Presupuesto ni Fecha de entrega", () => {
    const s = db.select().from(sorteos).where(eq(sorteos.id, sorteoId)).get();
    expect(s).toMatchObject({ estado: "abierto", presupuestoCentimos: null, fechaEntrega: null });
  });

  it("rechaza dos Participantes con el mismo nombre sin distinguir mayúsculas", () => {
    nuevoParticipante("María");
    expect(() => nuevoParticipante("MARÍA")).toThrow(/UNIQUE/);
  });

  it("permite el mismo nombre en Sorteos distintos", () => {
    nuevoParticipante("Bruno");
    const org2 = db.insert(organizadores).values({ email: "b@e.com", passwordHash: "x" }).returning().get();
    sorteoId = db.insert(sorteos).values({ organizadorId: org2.id, nombre: "Otro" }).returning().get().id;
    expect(() => nuevoParticipante("Bruno")).not.toThrow();
  });

  it("solo un Participante por Sorteo puede ser el Organizador", () => {
    nuevoParticipante("Ana", { esOrganizador: true });
    nuevoParticipante("Bruno");
    expect(() => nuevoParticipante("Carla", { esOrganizador: true })).toThrow(/UNIQUE/);
  });

  it("nadie se regala a sí mismo", () => {
    const a = nuevoParticipante("Ana");
    expect(() =>
      db.insert(asignaciones).values({ sorteoId, regaladorId: a.id, destinatarioId: a.id }).run(),
    ).toThrow(/CHECK/);
  });

  it("nadie recibe dos regalos ni regala dos veces", () => {
    const [a, b, c] = ["Ana", "Bruno", "Carla"].map((n) => nuevoParticipante(n));
    db.insert(asignaciones).values({ sorteoId, regaladorId: a.id, destinatarioId: b.id }).run();
    expect(() =>
      db.insert(asignaciones).values({ sorteoId, regaladorId: c.id, destinatarioId: b.id }).run(),
    ).toThrow(/UNIQUE/);
    expect(() =>
      db.insert(asignaciones).values({ sorteoId, regaladorId: a.id, destinatarioId: c.id }).run(),
    ).toThrow(/UNIQUE/);
  });

  it("borrar un Sorteo borra sus Participantes y Asignaciones", () => {
    const [a, b] = ["Ana", "Bruno"].map((n) => nuevoParticipante(n));
    db.insert(asignaciones).values({ sorteoId, regaladorId: a.id, destinatarioId: b.id }).run();
    db.delete(sorteos).where(eq(sorteos.id, sorteoId)).run();
    expect(db.select().from(participantes).all()).toHaveLength(0);
    expect(db.select().from(asignaciones).all()).toHaveLength(0);
  });

  it("rechaza un Presupuesto negativo", () => {
    expect(() =>
      db.update(sorteos).set({ presupuestoCentimos: -1 }).where(eq(sorteos.id, sorteoId)).run(),
    ).toThrow(/CHECK/);
  });
});
