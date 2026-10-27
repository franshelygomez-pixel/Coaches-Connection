const crearAsignador = (prefijo) => {
  const equivalencias = new Map();
  return (valor) => {
    const clave = `${valor ?? ""}`.trim().toLocaleLowerCase("es");
    if (!clave) return `${prefijo}-SIN-DATO`;
    if (!equivalencias.has(clave)) {
      equivalencias.set(clave, `${prefijo}-${String(equivalencias.size + 1).padStart(3, "0")}`);
    }
    return equivalencias.get(clave);
  };
};

export function anonimizarEntrenadores(filas = []) {
  const aliasEntrenador = crearAsignador("ENT");
  return filas.map((fila) => ({
    nombre: aliasEntrenador(fila.coach_id || fila.email || fila.nombre),
    estado: fila.estado ?? "",
    clientes_total: fila.clientes_total ?? 0,
    rutinas_total: fila.rutinas_total ?? 0,
    sesiones_total: fila.sesiones_total ?? 0,
    sesiones_completadas: fila.sesiones_completadas ?? 0,
    asistencias: fila.asistencias ?? 0,
    ausencias: fila.ausencias ?? 0,
  }));
}

export function anonimizarSesiones(filas = []) {
  const aliasCliente = crearAsignador("CLI");
  const aliasEntrenador = crearAsignador("ENT");
  return filas.map((fila) => ({
    inicio: fila.inicio ?? "",
    cliente: aliasCliente(fila.cliente_id || fila.cliente),
    entrenador: aliasEntrenador(fila.coach_id || fila.entrenador),
    titulo: fila.titulo ?? "",
    rutina: fila.rutina ?? "",
    estado: fila.estado ?? "",
    asistencia: fila.asistencia ?? "",
  }));
}
