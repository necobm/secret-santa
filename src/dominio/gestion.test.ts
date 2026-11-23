import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { openDb, type Db } from "@/db/client";
import { runMigrations } from "@/db/migrate";
import { organizadores, participantes, sorteos } from "@/db/schema";
import {
  guardarGustos,
  listarSorteos,
  marcarVisto,
  marcarVistoOrganizador,
  panelSorteo,
  revelarAsignaciones,
  verEnlace,
} from "./consultas";
import {
  anadirParticipante,
  borrarSorteo,
  crearSorteo,
  editarSorteo,
  quitarParticipante,
  renombrarParticipante,
} from "./gestion";
import { sortear, verificarSorteo } from "./sorteo";
import { formatearFecha, formatearPresupuesto } from "./valores";

let db: Db;
let ana: number;
let otro: number;

const codigo = (c: string) => expect.objectContaining({ codigo: c });
const datos = { nombre: "Navidad", presupuesto: "30", fechaEntrega: "2026-12-24" };

function sorteoCon(...nombres: string[]) {
  const id = crearSorteo(db, ana, { ...datos, nombreOrganizador: nombres[0] ?? null });
  for (const n of nombres.slice(1)) anadirParticipante(db, ana, id, n);
  return id;
}
const tokenDe = (nombre: string) =>
  db.select().from(participantes).where(eq(participantes.nombre, nombre)).get()!.token;

beforeEach(() => {
  db = openDb(":memory:");
  runMigrations(db);
  ana = db.insert(organizadores).values({ email: "ana@e.com", passwordHash: "x" }).returning().get().id;
  otro = db.insert(organizadores).values({ email: "otro@e.com", passwordHash: "x" }).returning().get().id;
});

describe("crearSorteo", () => {
  it("crea un Sorteo Abierto con el Organizador como Participante", () => {
    const id = crearSorteo(db, ana, { ...datos, nombre: "  Navidad   familia ", nombreOrganizador: "Ana" });
    const s = db.select().from(sorteos).where(eq(sorteos.id, id)).get()!;
    expect(s).toMatchObject({ nombre: "Navidad familia", estado: "abierto", presupuestoCentimos: 3000, fechaEntrega: "2026-12-24" });
    expect(db.select().from(participantes).all()).toMatchObject([{ nombre: "Ana", esOrganizador: true }]);
  });

  it("con 'no participo' no añade al Organizador", () => {
    crearSorteo(db, ana, { ...datos, nombreOrganizador: null });
    expect(db.select().from(participantes).all()).toHaveLength(0);
  });

  it("Presupuesto y Fecha de entrega son opcionales y admiten coma decimal", () => {
    const a = crearSorteo(db, ana, { nombre: "A", presupuesto: "", fechaEntrega: "", nombreOrganizador: null });
    const b = crearSorteo(db, ana, { nombre: "B", presupuesto: "25,50 €", fechaEntrega: "", nombreOrganizador: null });
    const [sa, sb] = [a, b].map((id) => db.select().from(sorteos).where(eq(sorteos.id, id)).get()!);
    expect(sa).toMatchObject({ presupuestoCentimos: null, fechaEntrega: null });
    expect(sb.presupuestoCentimos).toBe(2550);
  });

  it.each([
    [{ nombre: "  " }, "nombre-sorteo-invalido"],
    [{ presupuesto: "-5" }, "presupuesto-invalido"],
    [{ presupuesto: "mucho" }, "presupuesto-invalido"],
    [{ fechaEntrega: "2026-02-30" }, "fecha-invalida"],
    [{ fechaEntrega: "24/12/2026" }, "fecha-invalida"],
  ])("valida los datos %o", (cambio, error) => {
    expect(() => crearSorteo(db, ana, { ...datos, ...cambio, nombreOrganizador: null })).toThrow(codigo(error));
  });
});

describe("Participantes", () => {
  it("rechaza nombres repetidos sin distinguir mayúsculas, también con tildes", () => {
    const id = sorteoCon("María");
    expect(() => anadirParticipante(db, ana, id, "  MARÍA ")).toThrow(codigo("nombre-repetido"));
  });

  it("cada Participante tiene un Enlace personal distinto", () => {
    sorteoCon("Ana", "Bruno", "Carla");
    const tokens = db.select().from(participantes).all().map((p) => p.token);
    expect(new Set(tokens).size).toBe(3);
  });

  it("añadir con el Sorteo Sorteado rehace el sorteo", () => {
    const id = sorteoCon("Ana", "Bruno", "Carla");
    sortear(db, id);
    marcarVisto(db, tokenDe("Bruno"));
    anadirParticipante(db, ana, id, "Diego");
    expect(verificarSorteo(db, id)).toMatchObject({ valida: true, total: 4 });
    expect(db.select().from(participantes).all().every((p) => p.vistoEn === null)).toBe(true);
  });

  it("quitar con el Sorteo Sorteado rehace el sorteo", () => {
    const id = sorteoCon("Ana", "Bruno", "Carla", "Diego");
    sortear(db, id);
    const diego = db.select().from(participantes).where(eq(participantes.nombre, "Diego")).get()!;
    quitarParticipante(db, ana, id, diego.id);
    expect(verificarSorteo(db, id)).toMatchObject({ valida: true, total: 3 });
  });

  it("no deja quitar si un Sorteo Sorteado quedaría con menos de 3, y no cambia nada", () => {
    const id = sorteoCon("Ana", "Bruno", "Carla");
    sortear(db, id);
    const carla = db.select().from(participantes).where(eq(participantes.nombre, "Carla")).get()!;
    expect(() => quitarParticipante(db, ana, id, carla.id)).toThrow(codigo("pocos-participantes"));
    expect(db.select().from(participantes).all()).toHaveLength(3);
    expect(verificarSorteo(db, id).valida).toBe(true);
  });

  it("renombrar no toca la Cadena", () => {
    const id = sorteoCon("Ana", "Bruno", "Carla");
    sortear(db, id);
    const antes = revelarAsignaciones(db, ana, id);
    const bruno = db.select().from(participantes).where(eq(participantes.nombre, "Bruno")).get()!;
    renombrarParticipante(db, ana, id, bruno.id, "Bruno G.");
    const despues = revelarAsignaciones(db, ana, id);
    expect(despues.map((a) => a.de.replace("Bruno G.", "Bruno"))).toEqual(antes.map((a) => a.de));
  });

  it("renombrar a un nombre ya usado falla, pero cambiar solo mayúsculas se permite", () => {
    const id = sorteoCon("Ana", "Bruno");
    const bruno = db.select().from(participantes).where(eq(participantes.nombre, "Bruno")).get()!;
    expect(() => renombrarParticipante(db, ana, id, bruno.id, "ana")).toThrow(codigo("nombre-repetido"));
    expect(() => renombrarParticipante(db, ana, id, bruno.id, "BRUNO")).not.toThrow();
  });
});

describe("propiedad del Sorteo", () => {
  it("otro Organizador no puede ver ni tocar el Sorteo", () => {
    const id = sorteoCon("Ana", "Bruno", "Carla");
    const ajeno = codigo("sorteo-no-encontrado");
    expect(() => panelSorteo(db, otro, id)).toThrow(ajeno);
    expect(() => anadirParticipante(db, otro, id, "Intruso")).toThrow(ajeno);
    expect(() => editarSorteo(db, otro, id, datos)).toThrow(ajeno);
    expect(() => borrarSorteo(db, otro, id)).toThrow(ajeno);
    expect(() => sortear(db, id, { organizadorId: otro })).toThrow(ajeno);
    expect(() => revelarAsignaciones(db, otro, id)).toThrow(ajeno);
  });

  it("no se puede quitar un Participante de otro Sorteo", () => {
    const a = sorteoCon("Ana", "Bruno");
    const b = crearSorteo(db, ana, { ...datos, nombreOrganizador: null });
    const bruno = db.select().from(participantes).where(eq(participantes.nombre, "Bruno")).get()!;
    expect(() => quitarParticipante(db, ana, b, bruno.id)).toThrow(codigo("participante-no-encontrado"));
    expect(panelSorteo(db, ana, a).participantes).toHaveLength(2);
  });
});

describe("consultas", () => {
  it("listarSorteos cuenta Participantes y Vistos, solo del Organizador", () => {
    const id = sorteoCon("Ana", "Bruno", "Carla");
    crearSorteo(db, otro, { ...datos, nombreOrganizador: "X" });
    sortear(db, id);
    marcarVisto(db, tokenDe("Bruno"));
    expect(listarSorteos(db, ana)).toMatchObject([{ id, estado: "sorteado", participantes: 3, vistos: 1 }]);
  });

  it("el panel muestra la Asignación del Organizador pero no las demás", () => {
    const id = sorteoCon("Ana", "Bruno", "Carla");
    expect(panelSorteo(db, ana, id).miAsignacion).toBeNull();
    sortear(db, id);
    const panel = panelSorteo(db, ana, id);
    expect(["Bruno", "Carla"]).toContain(panel.miAsignacion?.destinatario);
    expect(panel.verificacion.valida).toBe(true);
    expect(panel.participantes[0]).toMatchObject({ nombre: "Ana", esOrganizador: true, gustos: "vacios", visto: false });
    expect(JSON.stringify(panel.participantes)).not.toMatch(/destinatario/);
  });

  it("marcarVistoOrganizador marca solo al Organizador y solo si está sorteado", () => {
    const id = sorteoCon("Ana", "Bruno", "Carla");
    marcarVistoOrganizador(db, ana, id);
    expect(panelSorteo(db, ana, id).participantes[0].visto).toBe(false);
    sortear(db, id);
    marcarVistoOrganizador(db, ana, id);
    expect(panelSorteo(db, ana, id).participantes.map((p) => p.visto)).toEqual([true, false, false]);
  });

  it("revelar recorre la Cadena empezando por el Organizador", () => {
    const id = sorteoCon("Ana", "Bruno", "Carla", "Diego");
    sortear(db, id);
    const r = revelarAsignaciones(db, ana, id);
    expect(r).toHaveLength(4);
    expect(r[0].de).toBe("Ana");
    r.forEach((a, i) => expect(r[(i + 1) % r.length].de).toBe(a.para));
  });
});

describe("Enlace personal", () => {
  it("antes del sorteo no hay Destinatario", () => {
    sorteoCon("Ana", "Bruno", "Carla");
    expect(verEnlace(db, tokenDe("Bruno"))).toMatchObject({
      sorteo: { nombre: "Navidad", estado: "abierto", presupuestoCentimos: 3000 },
      participante: { nombre: "Bruno" },
      destinatario: null,
    });
  });

  it("después del sorteo muestra el Destinatario con sus gustos", () => {
    const id = sorteoCon("Ana", "Bruno", "Carla");
    for (const n of ["Ana", "Bruno", "Carla"]) guardarGustos(db, tokenDe(n), `le gusta ${n}`, `no ${n}`);
    sortear(db, id);
    const { destinatario } = verEnlace(db, tokenDe("Bruno"));
    expect(destinatario?.nombre).not.toBe("Bruno");
    expect(destinatario).toMatchObject({ leGusta: `le gusta ${destinatario!.nombre}`, noLeGusta: `no ${destinatario!.nombre}` });
  });

  it("un enlace desconocido falla", () => {
    expect(() => verEnlace(db, "nope")).toThrow(codigo("enlace-no-encontrado"));
  });

  it("marcarVisto solo cuenta cuando ya hay Asignación", () => {
    const id = sorteoCon("Ana", "Bruno", "Carla");
    marcarVisto(db, tokenDe("Bruno"));
    expect(panelSorteo(db, ana, id).participantes[1].visto).toBe(false);
    sortear(db, id);
    marcarVisto(db, tokenDe("Bruno"));
    expect(panelSorteo(db, ana, id).participantes[1].visto).toBe(true);
  });

  it("guardarGustos limita la longitud", () => {
    sorteoCon("Ana");
    expect(() => guardarGustos(db, tokenDe("Ana"), "x".repeat(501), "")).toThrow(codigo("texto-largo"));
  });
});

describe("formato", () => {
  it("presupuesto y fecha", () => {
    expect(formatearPresupuesto(3000)).toBe("30 €");
    expect(formatearPresupuesto(2550)).toBe("25,50 €");
    expect(formatearFecha("2026-12-24")).toBe("24 dic 2026");
    expect(formatearFecha("2026-12-24", false)).toBe("24 dic");
  });
});
