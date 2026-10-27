// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  enviarRecuperacionContrasena,
  iniciarSesionConCorreo,
} from "../supabaseClient";
import Login from "./Login";

vi.mock("../supabaseClient", () => ({
  iniciarSesionConCorreo: vi.fn(),
  enviarRecuperacionContrasena: vi.fn(),
  registrarConCorreo: vi.fn(),
  traducirErrorSupabase: vi.fn((error) => error?.message || "No se pudo completar la operación."),
  formatearCedula: vi.fn((valor) => valor),
  validarCedulaDominicana: vi.fn(() => true),
}));

describe("Login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    iniciarSesionConCorreo.mockResolvedValue({ data: null, error: null });
    enviarRecuperacionContrasena.mockResolvedValue({ data: null, error: null });
  });

  it("valida los campos obligatorios antes de consultar Supabase", async () => {
    const usuario = userEvent.setup();
    render(<Login />);

    await usuario.click(screen.getByRole("button", { name: "INICIAR SESION" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Completa todos los campos");
    expect(iniciarSesionConCorreo).not.toHaveBeenCalled();
  });

  it("envia las credenciales ingresadas", async () => {
    const usuario = userEvent.setup();
    render(<Login />);

    await usuario.type(screen.getByLabelText("Correo electrónico"), "coach@ejemplo.com");
    await usuario.type(screen.getByLabelText("Contraseña"), "ClaveSegura123");
    await usuario.click(screen.getByRole("button", { name: "INICIAR SESION" }));

    expect(iniciarSesionConCorreo).toHaveBeenCalledWith("coach@ejemplo.com", "ClaveSegura123");
  });

  it("solicita el correo antes de recuperar la contraseña", async () => {
    const usuario = userEvent.setup();
    render(<Login />);

    await usuario.click(screen.getByRole("button", { name: "¿Olvidaste tu contraseña?" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Escribe tu correo");
    expect(enviarRecuperacionContrasena).not.toHaveBeenCalled();
  });

  it("no presenta violaciones automaticas de accesibilidad en la vista inicial", async () => {
    const { container } = render(<Login />);
    const resultado = await axe.run(container, {
      rules: { "color-contrast": { enabled: false } },
    });
    expect(resultado.violations).toEqual([]);
  });
});
