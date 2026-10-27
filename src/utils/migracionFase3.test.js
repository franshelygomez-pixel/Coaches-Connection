import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  new URL("../../supabase/fase3_procesos.sql", import.meta.url),
  "utf8"
);
const correccion = readFileSync(
  new URL("../../supabase/correccion_fase3_invitaciones.sql", import.meta.url),
  "utf8"
);

describe("migración SQL de la Fase 3", () => {
  it("conserva delimitadores de funciones balanceados", () => {
    expect((sql.match(/\$\$/g) || []).length % 2).toBe(0);
    expect(sql.trimEnd().endsWith("commit;")).toBe(true);
  });

  it("incluye todos los procesos acordados", () => {
    for (const fragmento of [
      "public.cuentas_clientes",
      "public.invitaciones_clientes",
      "public.sesiones_entrenamiento",
      "public.historial_rutinas",
      "public.consentimientos_datos",
      "public.crear_invitacion_cliente",
      "public.cambiar_estado_portal_cliente",
      "public.crear_sesion_entrenamiento",
      "public.registrar_consentimiento_cliente",
    ]) {
      expect(sql).toContain(fragmento);
    }
  });

  it("activa RLS y evita escritura directa en las tablas nuevas", () => {
    expect(sql).toContain("alter table public.sesiones_entrenamiento enable row level security");
    expect(sql).toContain("revoke insert, update, delete on public.cuentas_clientes");
    expect(sql).not.toContain("service_role");
  });

  it("califica las columnas de invitaciones que también son parámetros de salida", () => {
    expect(sql).toContain("i.estado = 'pendiente' and i.vence_en <= now()");
    expect(sql).not.toContain("where estado = 'pendiente' and vence_en <= now()");
  });

  it("incluye un parche transaccional para las instalaciones existentes", () => {
    expect((correccion.match(/\$\$/g) || []).length % 2).toBe(0);
    expect(correccion).toContain("public.crear_invitacion_cliente");
    expect(correccion).toContain("public.crear_invitacion_admin");
    expect(correccion).toContain("i.vence_en <= now()");
    expect(correccion).toContain("'1.3.1'");
    expect(correccion.trimEnd().endsWith("commit;")).toBe(true);
  });
});
