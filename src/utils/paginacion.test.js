import { describe, expect, it } from "vitest";
import { calcularTotalPaginas, obtenerRangoPagina } from "./paginacion";

describe("paginacion", () => {
  it("calcula las paginas para 1000 clientes", () => {
    expect(calcularTotalPaginas(1000, 25)).toBe(40);
  });

  it("calcula el rango de la primera pagina", () => {
    expect(obtenerRangoPagina(1, 20)).toEqual({ desde: 0, hasta: 19 });
  });

  it("calcula el rango de paginas posteriores", () => {
    expect(obtenerRangoPagina(3, 20)).toEqual({ desde: 40, hasta: 59 });
  });
});
