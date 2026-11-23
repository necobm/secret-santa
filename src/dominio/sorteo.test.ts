import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { openDb, type Db } from "@/db/client";
import { runMigrations } from "@/db/migrate";
import { asignaciones, organizadores, participantes, sorteos } from "@/db/schema";
import { rehacerSorteo, sortear, verificarSorteo } from "./sorteo";

let db: Db;
let sorteoId: number;

function conParticipantes(...nombres: string[]) {
  for (const nombre of nombres) {
    db.insert(participantes)
      .values({ sorteoId, nombre, nombreNormalizado: nombre.toLocaleLowerCase("es"), token: `t-${nombre}` })
      .run();
  }
}

const estado = () => db.select().from(sorteos).where(eq(sorteos.id, sorteoId)).get()!.estado;
const cadenaGuardada = () =>
  db.select().from(asignaciones).where(eq(asignaciones.sorteoId, sorteoId)).all();

beforeEach(() => {
  db = openDb(":memory:");
  runMigrations(db);
  const org = db.insert(organizadores).values({ email: "ana@e.com", passwordHash: "x" }).returning().get();
  sorteoId = db.insert(sorteos).values({ organizadorId: org.id, nombre: "Navidad" }).returning().get().id;
});

describe("sortear", () => {
  it("genera una Cadena válida y pasa el Sorteo a Sorteado", () => {
    conParticipantes("Ana", "Bruno", "Carla", "Diego");
    sortear(db, sorteoId);
    expect(estado()).toBe("sorteado");
    expect(cadenaGuardada()).toHaveLength(4);
    expect(verificarSorteo(db, sorteoId).valida).toBe(true);
  });

  it("exige al menos 3 Participantes y no cambia nada si falla", () => {
    conParticipantes("Ana", "Bruno");
    expect(() => sortear(db, sorteoId)).toThrow(expect.objectContaining({ codigo: "pocos-participantes" }));
    expect(estado()).toBe("abierto");
    expect(cadenaGuardada()).toHaveLength(0);
  });

  it("no se puede sortear dos veces", () => {
    conParticipantes("Ana", "Bruno", "Carla");
    sortear(db, sorteoId);
    expect(() => sortear(db, sorteoId)).toThrow(expect.objectContaining({ codigo: "sorteo-ya-sorteado" }));
  });

  it("falla con un Sorteo inexistente", () => {
    expect(() => sortear(db, 999)).toThrow(expect.objectContaining({ codigo: "sorteo-no-encontrado" }));
  });
});

describe("rehacerSorteo", () => {
  it("genera una Cadena nueva, conserva enlaces y gustos y pone Visto a cero", () => {
    conParticipantes("Ana", "Bruno", "Carla", "Diego", "Elena");
    sortear(db, sorteoId);
    db.update(participantes)
      .set({ vistoEn: new Date(), leGusta: "café" })
      .where(eq(participantes.sorteoId, sorteoId))
      .run();
    const antes = db.select().from(participantes).all();

    rehacerSorteo(db, sorteoId);

    const despues = db.select().from(participantes).all();
    expect(despues.map((p) => p.token)).toEqual(antes.map((p) => p.token));
    expect(despues.every((p) => p.leGusta === "café" && p.vistoEn === null)).toBe(true);
    expect(estado()).toBe("sorteado");
    expect(verificarSorteo(db, sorteoId).valida).toBe(true);
  });

  it("incluye a quien se haya añadido después de sortear", () => {
    conParticipantes("Ana", "Bruno", "Carla");
    sortear(db, sorteoId);
    conParticipantes("Diego");
    expect(verificarSorteo(db, sorteoId)).toMatchObject({ valida: false, conDestinatario: 3 });

    rehacerSorteo(db, sorteoId);
    expect(verificarSorteo(db, sorteoId)).toMatchObject({ valida: true, total: 4 });
  });

  it("solo se puede rehacer un Sorteo sorteado", () => {
    conParticipantes("Ana", "Bruno", "Carla");
    expect(() => rehacerSorteo(db, sorteoId)).toThrow(expect.objectContaining({ codigo: "sorteo-no-sorteado" }));
  });

  it("si quedan menos de 3 Participantes, falla y deja las Asignaciones como estaban", () => {
    conParticipantes("Ana", "Bruno", "Carla");
    sortear(db, sorteoId);
    const antes = cadenaGuardada();
    db.delete(participantes).where(eq(participantes.nombre, "Carla")).run();
    const trasBorrar = cadenaGuardada();

    expect(() => rehacerSorteo(db, sorteoId)).toThrow(expect.objectContaining({ codigo: "pocos-participantes" }));
    expect(cadenaGuardada()).toEqual(trasBorrar);
    expect(trasBorrar.length).toBeLessThan(antes.length);
  });
});

describe("verificarSorteo", () => {
  it("un Sorteo Abierto no es válido", () => {
    conParticipantes("Ana", "Bruno", "Carla");
    expect(verificarSorteo(db, sorteoId)).toMatchObject({ valida: false, conDestinatario: 0, total: 3 });
  });
});
