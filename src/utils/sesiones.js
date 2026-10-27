export const ESTADOS_SESION = Object.freeze({
  PROGRAMADA: "programada",
  COMPLETADA: "completada",
  CANCELADA: "cancelada",
});

export const ESTADOS_ASISTENCIA = Object.freeze({
  PENDIENTE: "pendiente",
  PRESENTE: "presente",
  AUSENTE: "ausente",
  JUSTIFICADA: "justificada",
});

export function validarSesion({ clienteId, titulo, fecha, hora, duracionMinutos }) {
  if (!clienteId) return "Selecciona un cliente.";
  if (`${titulo || ""}`.trim().length < 3) return "El título debe tener al menos 3 caracteres.";
  if (!fecha || !hora) return "Selecciona la fecha y la hora.";
  const duracion = Number(duracionMinutos);
  if (!Number.isFinite(duracion) || duracion < 15 || duracion > 480) {
    return "La duración debe estar entre 15 minutos y 8 horas.";
  }
  const inicio = new Date(`${fecha}T${hora}:00`);
  if (Number.isNaN(inicio.getTime())) return "La fecha o la hora no es válida.";
  return "";
}

export function construirRangoSesion(fecha, hora, duracionMinutos) {
  const inicio = new Date(`${fecha}T${hora}:00`);
  const fin = new Date(inicio.getTime() + Number(duracionMinutos) * 60_000);
  return { inicio: inicio.toISOString(), fin: fin.toISOString() };
}

export function construirRecordatorioSesion({
  coachId,
  clienteId,
  titulo,
  inicio,
  fin,
  fecha,
  observaciones,
}) {
  const detalle = `${observaciones || ""}`.trim();
  return {
    coach_id: coachId,
    cliente_id: clienteId,
    titulo: `${titulo || "Sesión de entrenamiento"}`.trim(),
    descripcion: detalle
      ? `Recordatorio automático de sesión. ${detalle}`
      : "Recordatorio automático creado desde Sesiones y asistencia.",
    inicio,
    fin,
    fecha,
  };
}

export async function crearSesionConRecordatorio(clienteSupabase, datos) {
  const resultadoSesion = await clienteSupabase.rpc("crear_sesion_entrenamiento", {
    p_cliente_id: datos.clienteId,
    p_inicio: datos.inicio,
    p_fin: datos.fin,
    p_titulo: datos.titulo.trim(),
    p_rutina_id: datos.rutinaId || null,
    p_observaciones: datos.observaciones.trim() || null,
  });

  if (resultadoSesion.error) {
    return {
      sesionId: null,
      errorSesion: resultadoSesion.error,
      errorRecordatorio: null,
      recordatorioCreado: false,
    };
  }

  const recordatorio = construirRecordatorioSesion(datos);
  const resultadoRecordatorio = await clienteSupabase.from("eventos").insert(recordatorio);

  return {
    sesionId: resultadoSesion.data,
    errorSesion: null,
    errorRecordatorio: resultadoRecordatorio.error || null,
    recordatorioCreado: !resultadoRecordatorio.error,
  };
}

export function validarResultadoSesion(estado, asistencia) {
  if (!Object.values(ESTADOS_SESION).includes(estado)) return "Estado de sesión no permitido.";
  if (!Object.values(ESTADOS_ASISTENCIA).includes(asistencia)) return "Asistencia no permitida.";
  if (estado === ESTADOS_SESION.PROGRAMADA && asistencia !== ESTADOS_ASISTENCIA.PENDIENTE) {
    return "Una sesión programada debe mantener la asistencia pendiente.";
  }
  if (estado === ESTADOS_SESION.COMPLETADA && asistencia === ESTADOS_ASISTENCIA.PENDIENTE) {
    return "Indica la asistencia antes de completar la sesión.";
  }
  return "";
}

export function resumirAsistencia(sesiones = []) {
  const totalCerradas = sesiones.filter((sesion) => sesion.estado !== ESTADOS_SESION.PROGRAMADA).length;
  const presentes = sesiones.filter((sesion) => sesion.asistencia === ESTADOS_ASISTENCIA.PRESENTE).length;
  return {
    total: sesiones.length,
    programadas: sesiones.filter((sesion) => sesion.estado === ESTADOS_SESION.PROGRAMADA).length,
    presentes,
    ausentes: sesiones.filter((sesion) => sesion.asistencia === ESTADOS_ASISTENCIA.AUSENTE).length,
    justificadas: sesiones.filter((sesion) => sesion.asistencia === ESTADOS_ASISTENCIA.JUSTIFICADA).length,
    porcentajeAsistencia: totalCerradas ? Math.round((presentes / totalCerradas) * 100) : 0,
  };
}

export function consentimientoActual(registros = [], tipo) {
  return registros
    .filter((registro) => registro.tipo === tipo)
    .slice()
    .sort((a, b) => `${b.creado_en || ""}`.localeCompare(`${a.creado_en || ""}`))[0] || null;
}
