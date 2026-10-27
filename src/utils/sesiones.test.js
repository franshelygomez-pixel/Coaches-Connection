import { describe, expect, it } from "vitest";
import {
  construirRecordatorioSesion,
  construirRangoSesion,
  consentimientoActual,
  crearSesionConRecordatorio,
  resumirAsistencia,
  validarResultadoSesion,
  validarSesion,
} from "./sesiones";

describe("sesiones de entrenamiento", () => {
  it("valida los datos obligatorios", () => {
    expect(validarSesion({})).toBe("Selecciona un cliente.");
    expect(validarSesion({ clienteId: "1", titulo: "A", fecha: "2026-09-05", hora: "08:00", duracionMinutos: 60 }))
      .toBe("El título debe tener al menos 3 caracteres.");
  });

  it("acepta una sesión completa", () => {
    expect(validarSesion({ clienteId: "1", titulo: "Fuerza general", fecha: "2026-09-05", hora: "08:00", duracionMinutos: 60 })).toBe("");
  });

  it("construye un rango con la duración indicada", () => {
    const { inicio, fin } = construirRangoSesion("2026-09-05", "08:00", 60);
    expect(new Date(fin).getTime() - new Date(inicio).getTime()).toBe(3_600_000);
  });

  it("construye el evento recordatorio con los datos de la sesión", () => {
    expect(construirRecordatorioSesion({
      coachId: "coach-1",
      clienteId: "cliente-1",
      titulo: " Evaluación semanal ",
      inicio: "2026-09-07T12:00:00.000Z",
      fin: "2026-09-07T13:00:00.000Z",
      fecha: "2026-09-07",
      observaciones: " Llevar registro de asistencia. ",
    })).toEqual({
      coach_id: "coach-1",
      cliente_id: "cliente-1",
      titulo: "Evaluación semanal",
      descripcion: "Recordatorio automático de sesión. Llevar registro de asistencia.",
      inicio: "2026-09-07T12:00:00.000Z",
      fin: "2026-09-07T13:00:00.000Z",
      fecha: "2026-09-07",
    });
  });

  it("crea la sesión y su recordatorio en el calendario", async () => {
    const llamadas = [];
    const clienteSupabase = {
      rpc: async (nombre, parametros) => {
        llamadas.push(["rpc", nombre, parametros]);
        return { data: "sesion-1", error: null };
      },
      from: (tabla) => ({
        insert: async (datos) => {
          llamadas.push(["insert", tabla, datos]);
          return { error: null };
        },
      }),
    };
    const datos = {
      coachId: "coach-1", clienteId: "cliente-1", rutinaId: "rutina-1",
      titulo: "Sesión guiada", inicio: "2026-09-07T12:00:00.000Z",
      fin: "2026-09-07T13:00:00.000Z", fecha: "2026-09-07",
      observaciones: "",
    };

    const resultado = await crearSesionConRecordatorio(clienteSupabase, datos);

    expect(resultado).toEqual({
      sesionId: "sesion-1", errorSesion: null, errorRecordatorio: null,
      recordatorioCreado: true,
    });
    expect(llamadas[0][0]).toBe("rpc");
    expect(llamadas[1][0]).toBe("insert");
    expect(llamadas[1][1]).toBe("eventos");
    expect(llamadas[1][2].fecha).toBe("2026-09-07");
  });

  it("no intenta crear el recordatorio cuando falla la sesión", async () => {
    let intentoInsertar = false;
    const errorSesion = { message: "conflicto de horario" };
    const clienteSupabase = {
      rpc: async () => ({ data: null, error: errorSesion }),
      from: () => {
        intentoInsertar = true;
        return { insert: async () => ({ error: null }) };
      },
    };

    const resultado = await crearSesionConRecordatorio(clienteSupabase, {
      coachId: "coach-1", clienteId: "cliente-1", rutinaId: "",
      titulo: "Sesión", inicio: "2026-09-07T12:00:00.000Z",
      fin: "2026-09-07T13:00:00.000Z", fecha: "2026-09-07", observaciones: "",
    });

    expect(resultado.errorSesion).toBe(errorSesion);
    expect(resultado.recordatorioCreado).toBe(false);
    expect(intentoInsertar).toBe(false);
  });

  it("conserva la sesión y avisa cuando falla el recordatorio", async () => {
    const errorRecordatorio = { message: "eventos bloqueados" };
    const clienteSupabase = {
      rpc: async () => ({ data: "sesion-2", error: null }),
      from: () => ({ insert: async () => ({ error: errorRecordatorio }) }),
    };

    const resultado = await crearSesionConRecordatorio(clienteSupabase, {
      coachId: "coach-1", clienteId: "cliente-1", rutinaId: "",
      titulo: "Sesión", inicio: "2026-09-07T12:00:00.000Z",
      fin: "2026-09-07T13:00:00.000Z", fecha: "2026-09-07", observaciones: "",
    });

    expect(resultado.sesionId).toBe("sesion-2");
    expect(resultado.errorRecordatorio).toBe(errorRecordatorio);
    expect(resultado.recordatorioCreado).toBe(false);
  });

  it("exige asistencia al completar", () => {
    expect(validarResultadoSesion("completada", "pendiente")).toContain("asistencia");
    expect(validarResultadoSesion("completada", "presente")).toBe("");
    expect(validarResultadoSesion("programada", "presente")).toContain("pendiente");
  });

  it("resume la asistencia sin dividir entre cero", () => {
    expect(resumirAsistencia([])).toEqual({
      total: 0, programadas: 0, presentes: 0, ausentes: 0,
      justificadas: 0, porcentajeAsistencia: 0,
    });
    expect(resumirAsistencia([
      { estado: "completada", asistencia: "presente" },
      { estado: "completada", asistencia: "ausente" },
      { estado: "programada", asistencia: "pendiente" },
    ]).porcentajeAsistencia).toBe(50);
  });

  it("obtiene el consentimiento más reciente", () => {
    const actual = consentimientoActual([
      { id: "1", tipo: "tratamiento_datos", creado_en: "2026-01-01" },
      { id: "2", tipo: "tratamiento_datos", creado_en: "2026-02-01" },
    ], "tratamiento_datos");
    expect(actual.id).toBe("2");
  });
});
