// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { registrarConCorreo } from "../supabaseClient";
import Registro from "./Registro";

vi.mock("../supabaseClient", () => ({
  registrarConCorreo: vi.fn(),
  traducirErrorSupabase: vi.fn((error) => error?.message || "No se pudo completar la operación."),
  formatearCedula: vi.fn((valor) => valor),
  validarCedulaDominicana: vi.fn(() => true),
}));

describe("Registro", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    registrarConCorreo.mockResolvedValue({ data: { session: null }, error: null });
  });

  it("muestra el formulario correspondiente al rol elegido", async () => {
    const usuario = userEvent.setup();
    render(<Registro onVolver={() => {}} />);

    await usuario.click(screen.getByRole("button", { name: "Cliente" }));

    expect(screen.getByLabelText("Código de invitación de cliente")).toBeInTheDocument();
    expect(screen.queryByLabelText("Nombre")).not.toBeInTheDocument();
  });

  it("crea una cuenta de cliente solamente con invitacion valida", async () => {
    const usuario = userEvent.setup();
    render(<Registro onVolver={() => {}} />);

    await usuario.click(screen.getByRole("button", { name: "Cliente" }));
    await usuario.type(screen.getByLabelText("Código de invitación de cliente"), "CLI-ABC123");
    await usuario.type(screen.getByLabelText("Correo electrónico"), "cliente@ejemplo.com");
    await usuario.type(screen.getByLabelText("Contraseña"), "ClaveSegura123");
    await usuario.click(screen.getByRole("button", { name: "CREAR CUENTA" }));

    expect(registrarConCorreo).toHaveBeenCalledWith(expect.objectContaining({
      email: "cliente@ejemplo.com",
      rol: "cliente",
      codigoInvitacionCliente: "CLI-ABC123",
    }));
    expect(screen.getByRole("status")).toHaveTextContent("Confirma tu correo");
  });

  it("rechaza el formulario de entrenador incompleto", async () => {
    const usuario = userEvent.setup();
    render(<Registro onVolver={() => {}} />);

    await usuario.click(screen.getByRole("button", { name: "CREAR CUENTA" }));

    expect(screen.getByRole("alert")).toHaveTextContent("campos obligatorios");
    expect(registrarConCorreo).not.toHaveBeenCalled();
  });

  it("no presenta violaciones automaticas de accesibilidad en la vista inicial", async () => {
    const { container } = render(<Registro onVolver={() => {}} />);
    const resultado = await axe.run(container, {
      rules: { "color-contrast": { enabled: false } },
    });
    expect(resultado.violations).toEqual([]);
  });
});