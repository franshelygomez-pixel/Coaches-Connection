import { describe, expect, it } from "vitest";
import {
  ACCESOS,
  evaluarAcceso,
  normalizarEstado,
  normalizarRol,
  perteneceAlCoach,
} from "./permisos";

describe("permisos de acceso", () => {
  it("normaliza los roles permitidos", () => {
    expect(normalizarRol(" ADMIN ")).toBe("admin");
    expect(normalizarRol("Coach")).toBe("coach");
    expect(normalizarRol("CLIENTE")).toBe("cliente");
  });

  it("rechaza roles desconocidos", () => {
    expect(normalizarRol("supervisor")).toBeNull();
    expect(normalizarRol(null)).toBeNull();
  });

  it("solo autoriza administradores activos", () => {
    expect(evaluarAcceso("admin", "activo")).toBe(ACCESOS.AUTORIZADO);
    expect(evaluarAcceso("admin", "pendiente")).toBe(ACCESOS.PENDIENTE);
    expect(evaluarAcceso("admin", "inactivo")).toBe(ACCESOS.DENEGADO);
    expect(evaluarAcceso("admin", "rechazado")).toBe(ACCESOS.DENEGADO);
  });

  it("solo autoriza entrenadores activos", () => {
    expect(evaluarAcceso("coach", "activo")).toBe(ACCESOS.AUTORIZADO);
    expect(evaluarAcceso("coach", "pendiente")).toBe(ACCESOS.PENDIENTE);
    expect(evaluarAcceso("coach", "inactivo")).toBe(ACCESOS.DENEGADO);
    expect(evaluarAcceso("coach", "rechazado")).toBe(ACCESOS.DENEGADO);
    expect(evaluarAcceso("coach", "")).toBe(ACCESOS.DENEGADO);
  });

  it("solo autoriza clientes con cuenta de portal activa", () => {
    expect(evaluarAcceso("cliente", "activo")).toBe(ACCESOS.AUTORIZADO);
    expect(evaluarAcceso("cliente", "inactivo")).toBe(ACCESOS.DENEGADO);
  });

  it("normaliza los estados", () => {
    expect(normalizarEstado(" ACTIVO ")).toBe("activo");
  });
});

describe("propiedad de registros", () => {
  it("acepta las formas coachId y coach_id", () => {
    expect(perteneceAlCoach({ coachId: "coach-1" }, "coach-1")).toBe(true);
    expect(perteneceAlCoach({ coach_id: "coach-1" }, "coach-1")).toBe(true);
  });

  it("rechaza registros de otro entrenador o incompletos", () => {
    expect(perteneceAlCoach({ coachId: "coach-2" }, "coach-1")).toBe(false);
    expect(perteneceAlCoach({}, "coach-1")).toBe(false);
    expect(perteneceAlCoach(null, "coach-1")).toBe(false);
  });
});
