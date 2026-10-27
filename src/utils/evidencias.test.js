import { describe, expect, it } from "vitest";
import { anonimizarEntrenadores, anonimizarSesiones } from "./evidencias";

describe("evidencias anonimizadas", () => {
  it("elimina nombres, correos e identificadores del reporte de entrenadores", () => {
    const resultado = anonimizarEntrenadores([
      {
        coach_id: "uuid-secreto",
        nombre: "Persona Real",
        email: "persona@ejemplo.com",
        estado: "activo",
        clientes_total: 8,
      },
    ]);
    expect(resultado).toEqual([expect.objectContaining({ nombre: "ENT-001", estado: "activo", clientes_total: 8 })]);
    expect(JSON.stringify(resultado)).not.toContain("Persona Real");
    expect(JSON.stringify(resultado)).not.toContain("persona@ejemplo.com");
    expect(JSON.stringify(resultado)).not.toContain("uuid-secreto");
  });

  it("mantiene un alias consistente dentro de una exportacion", () => {
    const resultado = anonimizarEntrenadores([
      { coach_id: "uno", nombre: "A" },
      { coach_id: "uno", nombre: "A" },
      { coach_id: "dos", nombre: "B" },
    ]);
    expect(resultado.map((fila) => fila.nombre)).toEqual(["ENT-001", "ENT-001", "ENT-002"]);
  });

  it("seudonimiza clientes y entrenadores en las sesiones", () => {
    const resultado = anonimizarSesiones([
      {
        id: "sesion-privada",
        cliente: "Cliente Real",
        entrenador: "Coach Real",
        inicio: "2026-09-01T10:00:00Z",
        estado: "completada",
      },
    ]);
    expect(resultado[0]).toEqual(expect.objectContaining({ cliente: "CLI-001", entrenador: "ENT-001" }));
    expect(JSON.stringify(resultado)).not.toContain("Cliente Real");
    expect(JSON.stringify(resultado)).not.toContain("Coach Real");
    expect(JSON.stringify(resultado)).not.toContain("sesion-privada");
  });
});
