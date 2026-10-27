import { describe, expect, it } from "vitest";
import {
  normalizarRespuestaPaginada,
  periodoMensualInicial,
  tarjetasResumen,
  validarPeriodoReporte,
} from "./reportes";

describe("utilidades de reportes", () => {
  it("construye el periodo del mes actual", () => {
    expect(periodoMensualInicial(new Date("2026-09-05T12:00:00")))
      .toEqual({ desde: "2026-09-01", hasta: "2026-09-05" });
  });

  it("valida el orden y la longitud del periodo", () => {
    expect(validarPeriodoReporte("2026-09-05", "2026-09-01")).toContain("anterior");
    expect(validarPeriodoReporte("2025-01-01", "2026-12-31")).toContain("367");
    expect(validarPeriodoReporte("2026-09-01", "2026-09-30")).toBe("");
  });

  it("normaliza respuestas paginadas incompletas", () => {
    expect(normalizarRespuestaPaginada(null)).toEqual({
      items: [], total: 0, pagina: 1, porPagina: 20,
    });
  });

  it("construye indicadores sin valores indefinidos", () => {
    expect(tarjetasResumen({ sesiones_total: 7, porcentaje_asistencia: 80 }))
      .toEqual(expect.arrayContaining([
        { etiqueta: "Sesiones", valor: 7 },
        { etiqueta: "Asistencia registrada", valor: "80%" },
      ]));
  });
});
