import { describe, expect, it } from "vitest";
import {
  crearRangoEvento,
  fechaLocalDe,
  formatearHora12,
  horaLocalDe,
  validarDatosEvento,
} from "./agenda";

describe("fechas de la agenda", () => {
  it("crea una sesión de una hora en Santo Domingo", () => {
    expect(crearRangoEvento("2026-09-03", "10:30")).toEqual({
      inicio: "2026-09-03T14:30:00.000Z",
      fin: "2026-09-03T15:30:00.000Z",
    });
  });

  it("obtiene la fecha y hora de Santo Domingo", () => {
    expect(fechaLocalDe("2026-09-03T03:30:00.000Z")).toBe("2026-09-02");
    expect(horaLocalDe("2026-09-03T14:30:00.000Z")).toBe("10:30");
  });

  it("formatea horas de 24 a 12 horas", () => {
    expect(formatearHora12("00:00")).toBe("12:00 AM");
    expect(formatearHora12("13:30")).toBe("1:30 PM");
  });
});

describe("validación de eventos", () => {
  const eventoValido = {
    titulo: "Sesión de entrenamiento",
    fecha: "2026-09-03",
    hora: "10:30",
    descripcion: "Seguimiento programado",
  };

  it("acepta un evento completo", () => {
    expect(validarDatosEvento(eventoValido)).toBe("");
  });

  it("rechaza campos obligatorios vacíos", () => {
    expect(validarDatosEvento({ ...eventoValido, titulo: "" }))
      .toBe("Completa título, fecha y hora.");
  });

  it("rechaza una hora inválida", () => {
    expect(validarDatosEvento({ ...eventoValido, hora: "29:90" }))
      .toBe("La hora seleccionada no es válida.");
  });

  it("rechaza una fecha inexistente", () => {
    expect(validarDatosEvento({ ...eventoValido, fecha: "2026-02-30" }))
      .toBe("La fecha seleccionada no es válida.");
  });

  it("limita título y descripción", () => {
    expect(validarDatosEvento({ ...eventoValido, titulo: "A".repeat(101) }))
      .toBe("El título no puede superar 100 caracteres.");
    expect(validarDatosEvento({ ...eventoValido, descripcion: "A".repeat(501) }))
      .toBe("La descripción no puede superar 500 caracteres.");
  });
});
