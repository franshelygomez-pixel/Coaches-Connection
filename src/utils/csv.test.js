import { describe, expect, it } from "vitest";
import { generarCSV } from "./csv";

const columnas = [
  { clave: "nombre", etiqueta: "Nombre" },
  { clave: "estado", etiqueta: "Estado" },
];

describe("generarCSV", () => {
  it("crea encabezados y filas", () => {
    expect(generarCSV(columnas, [{ nombre: "Ana", estado: "Activo" }]))
      .toBe("Nombre,Estado\r\nAna,Activo");
  });

  it("protege comas y comillas", () => {
    expect(generarCSV(columnas, [{ nombre: 'Pérez, "Juan"', estado: "Activo" }]))
      .toContain('"Pérez, ""Juan"""');
  });

  it("acepta valores vacios", () => {
    expect(generarCSV(columnas, [{ nombre: null, estado: undefined }]))
      .toBe("Nombre,Estado\r\n,");
  });

  it("neutraliza valores que una hoja de calculo interpretaria como formulas", () => {
    const csv = generarCSV(
      [{ clave: "nombre", etiqueta: "Nombre" }],
      [{ nombre: "=HYPERLINK(\"https://ejemplo.test\")" }]
    );
    expect(csv).toContain("'=HYPERLINK");
  });
});
