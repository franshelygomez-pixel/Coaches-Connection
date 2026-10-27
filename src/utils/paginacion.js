export function calcularTotalPaginas(total, porPagina) {
  if (porPagina <= 0) return 1;
  return Math.max(1, Math.ceil(Math.max(0, total) / porPagina));
}

export function obtenerRangoPagina(pagina, porPagina) {
  const paginaSegura = Math.max(1, pagina);
  const cantidadSegura = Math.max(1, porPagina);
  const desde = (paginaSegura - 1) * cantidadSegura;
  return { desde, hasta: desde + cantidadSegura - 1 };
}