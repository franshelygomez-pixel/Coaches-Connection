// Enlace "Agregar a Google Calendar" (plantilla pública de Google): no requiere conectar
// ninguna cuenta ni credenciales. La persona lo abre y confirma en su propio Google Calendar.
const formatoGoogle = (iso) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

export const enlaceGoogleCalendar = ({ titulo, inicio, fin, detalle = "" }) => {
  const final = fin || new Date(Date.parse(inicio) + 60 * 60 * 1000).toISOString();
  const parametros = new URLSearchParams({
    action: "TEMPLATE",
    text: titulo || "Sesión de entrenamiento",
    dates: `${formatoGoogle(inicio)}/${formatoGoogle(final)}`,
    details: detalle,
    location: "Fittrainer",
    ctz: "America/Santo_Domingo",
  });
  return `https://calendar.google.com/calendar/render?${parametros.toString()}`;
};

// Texto de la rutina del día para la descripción del evento.
export const detalleDeRutina = (rutina, ejercicios = []) => {
  if (!rutina?.nombre) return "Sesión de entrenamiento en Fittrainer.";
  const lineas = [`Rutina: ${rutina.nombre}${rutina.nivel ? ` (${rutina.nivel})` : ""}`];
  ejercicios.forEach((item, indice) => {
    const partes = [
      item.series ? `${item.series} series` : "",
      item.repeticiones ? `${item.repeticiones} repeticiones` : "",
      item.descanso ? `descanso ${item.descanso}` : "",
    ].filter(Boolean).join(", ");
    lineas.push(`${indice + 1}. ${item.ejercicio || `Ejercicio ${indice + 1}`}${partes ? `: ${partes}` : ""}`);
  });
  return lineas.join("\n");
};
