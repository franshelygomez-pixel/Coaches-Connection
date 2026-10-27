import { describe, expect, it } from "vitest";
import { traducirErrorSupabase, validarConfiguracionSupabase, versionCumple } from "./supabaseClient";

describe("configuracion publica de Supabase", () => {
  it("acepta una URL y una clave publica con formato utilizable", () => {
    expect(validarConfiguracionSupabase(
      "https://proyecto-real.supabase.co",
      "sb_publishable_clave_publica_de_prueba"
    )).toBe(true);
  });

  it("rechaza campos vacios, ejemplos o URL invalidas", () => {
    expect(validarConfiguracionSupabase("", "")).toBe(false);
    expect(validarConfiguracionSupabase("https://TU-PROYECTO.supabase.co", "TU_CLAVE_PUBLICA_ANON")).toBe(false);
    expect(validarConfiguracionSupabase("no-es-url", "sb_publishable_clave_publica_de_prueba")).toBe(false);
  });
});

describe("mensajes de Supabase", () => {
  it("distingue credenciales incorrectas", () => {
    expect(traducirErrorSupabase({ message: "Invalid login credentials" }, "login"))
      .toBe("Correo o contraseña incorrectos.");
  });

  it("explica los errores de RLS", () => {
    expect(traducirErrorSupabase({ message: "new row violates row-level security policy" }))
      .toContain("supabase/setup.sql");
  });

  it("informa cuando falta confirmar el correo", () => {
    expect(traducirErrorSupabase({ message: "Email not confirmed" }, "login"))
      .toContain("confirmar tu correo");
  });

  it("explica cuando falta instalar el backend", () => {
    expect(traducirErrorSupabase({
      message: "Could not find the function public.estado_backend",
      code: "backend_not_configured",
    }))
      .toContain("supabase/setup.sql");
  });

  it("explica cuando falta instalar la Fase 4", () => {
    expect(traducirErrorSupabase({ code: "backend_outdated" }))
      .toContain("fase4_reportes_notificaciones.sql");
  });

  it("explica la ambigüedad corregida de las invitaciones", () => {
    expect(traducirErrorSupabase({ code: "42702", message: "column reference vence_en is ambiguous" }))
      .toContain("correccion_fase3_invitaciones.sql");
  });

  it("explica una invitación administrativa inválida", () => {
    expect(traducirErrorSupabase({ code: "invalid_admin_invitation" }))
      .toContain("invitación administrativa");
  });

  it("explica una invitación de cliente inválida", () => {
    expect(traducirErrorSupabase({ code: "invalid_client_invitation" }))
      .toContain("invitación del cliente");
  });
});

describe("version del backend", () => {
  it("acepta la version requerida o una superior", () => {
    expect(versionCumple("1.4.0", "1.4.0")).toBe(true);
    expect(versionCumple("1.5.0", "1.4.0")).toBe(true);
  });

  it("rechaza una version anterior", () => {
    expect(versionCumple("1.3.1", "1.4.0")).toBe(false);
  });
});
