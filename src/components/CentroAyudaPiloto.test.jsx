// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import CentroAyudaPiloto from "./CentroAyudaPiloto";

describe("CentroAyudaPiloto", () => {
  it("muestra la guía correspondiente al entrenador", () => {
    render(<CentroAyudaPiloto rol="coach" />);

    expect(screen.getByRole("heading", { name: "Centro de ayuda" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Guía del entrenador" })).toBeInTheDocument();
    expect(screen.getAllByText(/registra la asistencia/i)).toHaveLength(1);
  });

  it("adapta la guía para el administrador", () => {
    render(<CentroAyudaPiloto rol="admin" />);

    expect(screen.getByRole("heading", { name: "Guía del administrador" })).toBeInTheDocument();
    expect(screen.getByText(/Invita a entrenadores y administradores/i)).toBeInTheDocument();
  });

  it("permite imprimir la guía", async () => {
    const imprimir = vi.spyOn(window, "print").mockImplementation(() => {});
    const usuario = userEvent.setup();
    render(<CentroAyudaPiloto rol="cliente" />);

    await usuario.click(screen.getByRole("button", { name: "Imprimir guía" }));

    expect(imprimir).toHaveBeenCalledOnce();
    imprimir.mockRestore();
  });
});