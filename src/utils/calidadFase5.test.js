import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const leer = (ruta) => readFileSync(new URL(ruta, import.meta.url), "utf8");

describe("artefactos de calidad de la Fase 5", () => {
  it("incluye una prueba de integracion sin claves privilegiadas", () => {
    const script = leer("../../scripts/prueba-integracion-supabase.mjs");
    expect(script).toContain("INTEGRATION_ADMIN_EMAIL");
    expect(script).toContain("RLS del entrenador");
    expect(script).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
  });

  it("incluye verificaciones de RLS y contratos de Supabase", () => {
    const sql = leer("../../supabase/verificar_fase5_calidad.sql");
    expect(sql).toContain("relrowsecurity");
    expect(sql).toContain("notificaciones_leer_propias");
    expect(sql).toContain("has_table_privilege");
    expect(sql).not.toMatch(/\b(insert|update|delete|drop|alter|create)\s+(into|table|policy|function|trigger)/i);
  });

  it("define limites verificables para los archivos compilados", () => {
    const script = leer("../../scripts/verificar-rendimiento.mjs");
    expect(script).toContain("archivoJavaScript: 400 * 1024");
    expect(script).toContain("totalJavaScript: 900 * 1024");
    expect(script).toContain("Viewport adaptable");
  });
});
