const escaparCelda = (valor) => {
  const texto = valor == null ? "" : String(valor);
  // Evita que Excel y otras hojas de cálculo interpreten datos como fórmulas.
  const seguro = /^[=+\-@\t\r]/.test(texto) ? `'${texto}` : texto;
  return /[",\n\r]/.test(seguro) ? `"${seguro.replace(/"/g, '""')}"` : seguro;
};

export function generarCSV(columnas, filas) {
  const encabezado = columnas.map((columna) => escaparCelda(columna.etiqueta)).join(",");
  const contenido = filas.map((fila) =>
    columnas.map((columna) => escaparCelda(fila[columna.clave])).join(",")
  );
  return [encabezado, ...contenido].join("\r\n");
}

export function descargarCSV(nombreArchivo, columnas, filas) {
  const contenido = `\uFEFF${generarCSV(columnas, filas)}`;
  const archivo = new Blob([contenido], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(archivo);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombreArchivo;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  URL.revokeObjectURL(url);
}
