import { describe, expect, it } from "vitest";
import {
  invitacionEstaVigente,
  motivoDecisionValido,
  normalizarCodigoCliente,
  normalizarCodigoInvitacion,
  obtenerRolSolicitado,
} from "./seguridad";

describe("seguridad administrativa", () => {
  it("normaliza los códigos de invitación", () => {
    expect(normalizarCodigoInvitacion(" ab 12 cd ")).toBe("AB12CD");
  });

  it("limita el código a 24 caracteres", () => {
    expect(normalizarCodigoInvitacion("a".repeat(30))).toHaveLength(24);
  });

  it("normaliza códigos de invitación del portal", () => {
    expect(normalizarCodigoCliente("cli-ab12 cd34")).toBe("CLI-AB12CD34");
    expect(normalizarCodigoCliente("ABCD")).toBe("CLI-ABCD");
    expect(normalizarCodigoCliente("")).toBe("");
  });

  it("prioriza el rol solicitado", () => {
    expect(obtenerRolSolicitado({ rol: "coach", rol_solicitado: "admin" })).toBe("admin");
    expect(obtenerRolSolicitado({ rol: "coach" })).toBe("coach");
  });

  it("exige un motivo descriptivo", () => {
    expect(motivoDecisionValido("No")).toBe(false);
    expect(motivoDecisionValido("Documentación incompleta")).toBe(true);
  });

  it("distingue invitaciones vigentes y vencidas", () => {
    const ahora = new Date("2026-09-05T12:00:00Z");
    expect(invitacionEstaVigente({ estado: "pendiente", vence_en: "2026-09-06T12:00:00Z" }, ahora)).toBe(true);
    expect(invitacionEstaVigente({ estado: "pendiente", vence_en: "2026-09-04T12:00:00Z" }, ahora)).toBe(false);
    expect(invitacionEstaVigente({ estado: "revocada", vence_en: "2026-09-06T12:00:00Z" }, ahora)).toBe(false);
  });
});
