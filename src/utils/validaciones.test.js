import { describe, expect, it } from "vitest";
import {
  formatearCedula,
  normalizarCorreo,
  validarCedulaDominicana,
} from "./validaciones";

describe("validaciones", () => {
  it("formatea una cedula mientras se escribe", () => {
    expect(formatearCedula("00100000009")).toBe("001-0000000-9");
  });

  it("rechaza cedulas incompletas", () => {
    expect(validarCedulaDominicana("001-123")).toBe(false);
  });

  it("comprueba el digito verificador", () => {
    expect(validarCedulaDominicana("001-0000000-9")).toBe(true);
    expect(validarCedulaDominicana("001-0000000-8")).toBe(false);
  });

  it("normaliza el correo", () => {
    expect(normalizarCorreo("  USUARIO@EJEMPLO.COM ")).toBe("usuario@ejemplo.com");
  });
});
