import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  new URL("../../supabase/fase4_reportes_notificaciones.sql", import.meta.url),
  "utf8"
);

describe("migración SQL de la Fase 4", () => {
  it("es transaccional y conserva delimitadores balanceados", () => {
    expect((sql.match(/\$\$/g) || []).length % 2).toBe(0);
    expect(sql.trimStart().includes("begin;")).toBe(true);
    expect(sql.trimEnd().endsWith("commit;")).toBe(true);
  });

  it("incluye notificaciones y reportes paginados", () => {
    for (const fragmento of [
      "public.notificaciones",
      "public.marcar_notificacion_leida",
      "public.reporte_resumen_operativo",
      "public.reporte_entrenadores_paginado",
      "public.reporte_sesiones_paginado",
      "public.notificar_sesion_cliente",
      "public.notificar_rutina_cliente",
    ]) {
      expect(sql).toContain(fragmento);
    }
  });

  it("protege las escrituras y limita la paginación", () => {
    expect(sql).toContain("alter table public.notificaciones enable row level security");
    expect(sql).toContain("revoke insert, update, delete on public.notificaciones from authenticated");
    expect(sql).toContain("least(greatest(coalesce(p_por_pagina, 20), 1), 100)");
    expect(sql).not.toContain("service_role");
  });

  it("registra la versión 1.4.0 y los índices de escala", () => {
    expect(sql).toContain("'1.4.0'");
    expect(sql).toContain("clientes_coach_estado_nombre_idx");
    expect(sql).toContain("sesiones_coach_inicio_estado_idx");
    expect(sql).toContain("notificaciones_destinatario_estado_fecha_idx");
  });
});
