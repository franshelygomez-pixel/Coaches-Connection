import { beforeEach, describe, expect, it, vi } from "vitest";

const dobles = vi.hoisted(() => ({
  rpc: vi.fn(),
  signUp: vi.fn(),
  signInWithPassword: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    rpc: dobles.rpc,
    auth: {
      signUp: dobles.signUp,
      signInWithPassword: dobles.signInWithPassword,
    },
  })),
}));

import {
  iniciarSesionConCorreo,
  registrarConCorreo,
  verificarConfiguracionBackend,
} from "./supabaseClient";

describe("contrato de integracion con Supabase", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dobles.rpc.mockResolvedValue({
      data: { version: "1.4.0", aplicacion: "Coaches Connection", configurado: true },
      error: null,
    });
  });

  it("acepta el contrato de backend instalado", async () => {
    const resultado = await verificarConfiguracionBackend();

    expect(dobles.rpc).toHaveBeenCalledWith("estado_backend");
    expect(resultado.error).toBeNull();
    expect(resultado.data.version).toBe("1.4.0");
  });

  it("crea la solicitud del entrenador con metadatos controlados", async () => {
    dobles.signUp.mockResolvedValue({
      data: { user: { id: "usuario-1", identities: [{ id: "identidad-1" }] }, session: null },
      error: null,
    });

    const resultado = await registrarConCorreo({
      nombre: "Ana",
      apellido: "Pérez",
      email: " ANA@EJEMPLO.COM ",
      password: "ClaveSegura123",
      rol: "coach",
      telefono: "8095551234",
      tipoDocumento: "pasaporte",
      documento: "P123456",
      direccion: "La Vega",
    });

    expect(resultado.error).toBeNull();
    expect(dobles.signUp).toHaveBeenCalledWith(expect.objectContaining({
      email: "ana@ejemplo.com",
      password: "ClaveSegura123",
      options: {
        data: expect.objectContaining({
          perfil_aplicacion: expect.objectContaining({
            rol: "coach",
            email: "ana@ejemplo.com",
          }),
        }),
      },
    }));
  });

  it("impide registrar un administrador sin invitacion valida", async () => {
    dobles.rpc.mockImplementation(async (nombre) => {
      if (nombre === "estado_backend") {
        return { data: { version: "1.4.0", configurado: true }, error: null };
      }
      if (nombre === "validar_invitacion_admin") {
        return { data: false, error: null };
      }
      return { data: null, error: null };
    });

    const resultado = await registrarConCorreo({
      nombre: "Admin",
      apellido: "Prueba",
      email: "admin@ejemplo.com",
      password: "ClaveSegura123",
      rol: "admin",
      codigoInvitacionAdmin: "CODIGO-INVALIDO",
    });

    expect(resultado.error.code).toBe("invalid_admin_invitation");
    expect(dobles.signUp).not.toHaveBeenCalled();
  });

  it("verifica el backend antes de enviar el inicio de sesion", async () => {
    dobles.signInWithPassword.mockResolvedValue({ data: { session: {} }, error: null });

    await iniciarSesionConCorreo(" COACH@EJEMPLO.COM ", "ClaveSegura123");

    expect(dobles.rpc).toHaveBeenCalledWith("estado_backend");
    expect(dobles.signInWithPassword).toHaveBeenCalledWith({
      email: "coach@ejemplo.com",
      password: "ClaveSegura123",
    });
  });
});
