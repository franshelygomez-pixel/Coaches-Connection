import { describe, expect, it } from "vitest";
import { etiquetaNotificacion, fechaNotificacion } from "./notificaciones";

describe("utilidades de notificaciones", () => {
  it("traduce los tipos conocidos", () => {
    expect(etiquetaNotificacion("sesion")).toBe("Sesión");
    expect(etiquetaNotificacion("desconocido")).toBe("Sistema");
  });

  it("muestra fechas recientes de forma legible", () => {
    const ahora = new Date("2026-09-05T12:30:00Z");
    expect(fechaNotificacion("2026-09-05T12:20:00Z", ahora)).toBe("Hace 10 min");
    expect(fechaNotificacion("valor-invalido", ahora)).toBe("Fecha no disponible");
  });
});
