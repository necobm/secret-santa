import { describe, expect, it } from "vitest";
import { generarCadena, verificar, type Asignacion } from "./cadena";

const nombres = (n: number) => Array.from({ length: n }, (_, i) => `P${i + 1}`);

/** Generador determinista para tests (LCG). */
function semilla(s: number) {
  return (max: number) => {
    s = (s * 1103515245 + 12345) % 2 ** 31;
    return s % max;
  };
}

describe("generarCadena", () => {
  it.each([3, 4, 5, 8, 13, 50])("con %i Participantes produce una Cadena válida", (n) => {
    for (let s = 1; s <= 50; s++) {
      const cadena = generarCadena(nombres(n), semilla(s));
      expect(cadena).toHaveLength(n);
      expect(verificar(nombres(n), cadena).valida).toBe(true);
    }
  });

  it("con el generador por defecto también es válida", () => {
    expect(verificar(nombres(10), generarCadena(nombres(10))).valida).toBe(true);
  });

  it("es determinista con el mismo generador", () => {
    expect(generarCadena(nombres(6), semilla(7))).toEqual(generarCadena(nombres(6), semilla(7)));
  });

  it("puede producir cualquiera de las Cadenas posibles", () => {
    // Con 4 Participantes hay (4-1)! = 6 Cadenas distintas.
    const vistas = new Set<string>();
    for (let s = 1; s <= 500; s++) {
      const cadena = generarCadena(nombres(4), semilla(s));
      vistas.add(cadena.map((a) => `${a.regalador}>${a.destinatario}`).sort().join(","));
    }
    expect(vistas.size).toBe(6);
  });

  it("exige al menos 3 Participantes", () => {
    expect(() => generarCadena(nombres(2))).toThrow(/al menos 3/);
    expect(() => generarCadena([])).toThrow(/al menos 3/);
  });

  it("rechaza Participantes repetidos", () => {
    expect(() => generarCadena(["A", "B", "A"])).toThrow(/repetido/);
  });
});

describe("verificar", () => {
  const p = ["A", "B", "C", "D"];
  const cadena = (pares: [string, string][]): Asignacion<string>[] =>
    pares.map(([regalador, destinatario]) => ({ regalador, destinatario }));

  it("da por buena una Cadena única", () => {
    const v = verificar(p, cadena([["A", "B"], ["B", "C"], ["C", "D"], ["D", "A"]]));
    expect(v).toEqual({
      total: 4,
      conDestinatario: 4,
      recibenVarios: 0,
      sinRegalo: 0,
      autoregalos: 0,
      parejasMutuas: 0,
      unaSolaCadena: true,
      valida: true,
    });
  });

  it("detecta Participantes sin Destinatario y sin regalo", () => {
    const v = verificar(p, cadena([["A", "B"], ["B", "C"], ["C", "A"]]));
    expect(v).toMatchObject({ conDestinatario: 3, sinRegalo: 1, unaSolaCadena: false, valida: false });
  });

  it("detecta a quien recibe dos regalos", () => {
    const v = verificar(p, cadena([["A", "B"], ["B", "C"], ["C", "B"], ["D", "A"]]));
    expect(v).toMatchObject({ recibenVarios: 1, sinRegalo: 1, valida: false });
  });

  it("detecta autorregalos", () => {
    const v = verificar(p, cadena([["A", "A"], ["B", "C"], ["C", "D"], ["D", "B"]]));
    expect(v).toMatchObject({ autoregalos: 1, unaSolaCadena: false, valida: false });
  });

  it("detecta parejas mutuas aunque todos tengan Destinatario", () => {
    const v = verificar(p, cadena([["A", "B"], ["B", "A"], ["C", "D"], ["D", "C"]]));
    expect(v).toMatchObject({
      conDestinatario: 4,
      recibenVarios: 0,
      sinRegalo: 0,
      parejasMutuas: 2,
      unaSolaCadena: false,
      valida: false,
    });
  });

  it("detecta varias Cadenas sin parejas mutuas", () => {
    const seis = ["A", "B", "C", "D", "E", "F"];
    const v = verificar(seis, cadena([["A", "B"], ["B", "C"], ["C", "A"], ["D", "E"], ["E", "F"], ["F", "D"]]));
    expect(v).toMatchObject({ parejasMutuas: 0, unaSolaCadena: false, valida: false });
  });

  it("no cuenta como Destinatario a quien regala dos veces", () => {
    const v = verificar(p, cadena([["A", "B"], ["A", "C"], ["C", "D"], ["D", "A"]]));
    expect(v).toMatchObject({ conDestinatario: 2, valida: false });
  });

  it("ignora Asignaciones de gente que no es Participante", () => {
    const v = verificar(["A", "B", "C"], cadena([["A", "B"], ["B", "C"], ["C", "A"], ["X", "A"]]));
    expect(v).toMatchObject({ recibenVarios: 1, valida: false });
  });

  it("un Sorteo sin Asignaciones no es válido", () => {
    expect(verificar(p, [])).toMatchObject({ conDestinatario: 0, sinRegalo: 4, valida: false });
  });

  it("menos de 3 Participantes nunca es válido", () => {
    expect(verificar(["A", "B"], cadena([["A", "B"], ["B", "A"]])).valida).toBe(false);
  });
});
