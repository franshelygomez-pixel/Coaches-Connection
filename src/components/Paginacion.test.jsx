// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import Paginacion from "./Paginacion";

describe("Paginacion", () => {
  it("no muestra controles cuando todos los registros caben en una pagina", () => {
    const { container } = render(
      <Paginacion pagina={1} total={10} porPagina={20} onCambiar={() => {}} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("muestra el estado de pagina y permite navegar", async () => {
    const cambiar = vi.fn();
    const usuario = userEvent.setup();
    render(<Paginacion pagina={2} total={41} porPagina={20} onCambiar={cambiar} />);

    expect(screen.getByRole("navigation", { name: "Paginación" })).toBeInTheDocument();
    expect(screen.getByText("Página 2 de 3")).toBeInTheDocument();

    await usuario.click(screen.getByRole("button", { name: "Anterior" }));
    await usuario.click(screen.getByRole("button", { name: "Siguiente" }));

    expect(cambiar).toHaveBeenNthCalledWith(1, 1);
    expect(cambiar).toHaveBeenNthCalledWith(2, 3);
  });

  it("desactiva el boton que sobrepasaria el limite", () => {
    const { rerender } = render(
      <Paginacion pagina={1} total={41} porPagina={20} onCambiar={() => {}} />
    );
    expect(screen.getByRole("button", { name: "Anterior" })).toBeDisabled();

    rerender(<Paginacion pagina={3} total={41} porPagina={20} onCambiar={() => {}} />);
    expect(screen.getByRole("button", { name: "Siguiente" })).toBeDisabled();
  });
});
