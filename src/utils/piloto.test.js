import { describe, expect, it } from "vitest";
import {
  calcularAvancePiloto,
  CHECKLIST_PILOTO,
  obtenerGuiaRol,
  VERSION_APLICACION,
  VERSION_BACKEND_PILOTO,
} from "./piloto";

describe("preparacion del piloto", () => {
  it("publica versiones coherentes con la Fase 6", () => {
    expect(VERSION_APLICACION).toBe("1.6.0");
    expect(VERSION_BACKEND_PILOTO).toBe("1.4.0");
  });

  it("entrega una guia diferente para cada rol", () => {
    expect(obtenerGuiaRol("admin").titulo).toContain("administrador");
    expect(obtenerGuiaRol("coach").titulo).toContain("entrenador");
    expect(obtenerGuiaRol("cliente").titulo).toContain("cliente");
  });

  it("calcula el progreso sin contar ids repetidos o desconocidos", () => {
    const avance = calcularAvancePiloto([
      CHECKLIST_PILOTO[0].id,
      CHECKLIST_PILOTO[0].id,
      CHECKLIST_PILOTO[1].id,
      "control-inexistente",
    ]);
    expect(avance.cantidad).toBe(2);
    expect(avance.total).toBe(CHECKLIST_PILOTO.length);
    expect(avance.porcentaje).toBe(20);
  });

  it("devuelve cero para una lista invalida", () => {
    expect(calcularAvancePiloto(null).cantidad).toBe(0);
  });
});
