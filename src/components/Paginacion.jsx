import { calcularTotalPaginas } from "../utils/paginacion";

export default function Paginacion({ pagina, total, porPagina, onCambiar }) {
  const totalPaginas = calcularTotalPaginas(total, porPagina);
  if (totalPaginas <= 1) return null;

  return (
    <nav aria-label="Paginación" className="paginacion">
      <button type="button" disabled={pagina <= 1} onClick={() => onCambiar(pagina - 1)}>
        Anterior
      </button>
      <span>Página {pagina} de {totalPaginas}</span>
      <button type="button" disabled={pagina >= totalPaginas} onClick={() => onCambiar(pagina + 1)}>
        Siguiente
      </button>
    </nav>
  );
}
