// Horario de atención del gimnasio (hora de República Dominicana, UTC-4 todo el año).
//   Lunes a viernes: 5:00 a. m. a 10:00 p. m.
//   Sábados:         6:00 a. m. a  5:00 p. m.
//   Domingos:        cerrado
export const ZONA_HORARIA = "America/Santo_Domingo";
export const DESPLAZAMIENTO_ZONA = "-04:00";

export const TEXTO_HORARIO = "Lunes a viernes de 5:00 a. m. a 10:00 p. m. y sábados de 6:00 a. m. a 5:00 p. m.";

// Día de la semana (0 = domingo) de una fecha "AAAA-MM-DD", sin depender de la zona del navegador.
export const diaSemana = (fecha) => {
  const [anio, mes, dia] = `${fecha}`.split("-").map(Number);
  return new Date(Date.UTC(anio, mes - 1, dia)).getUTCDay();
};

// Ventana de atención en minutos desde la medianoche, o null si ese día está cerrado.
export const ventanaDeFecha = (fecha) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(`${fecha}`)) return null;
  const dia = diaSemana(fecha);
  if (dia === 0) return null;
  if (dia === 6) return { desde: 6 * 60, hasta: 17 * 60 };
  return { desde: 5 * 60, hasta: 22 * 60 };
};

export const minutosDeHora = (hora) => {
  const [h, m] = `${hora}`.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};

export const horaDeMinutos = (minutos) =>
  `${String(Math.floor(minutos / 60)).padStart(2, "0")}:${String(minutos % 60).padStart(2, "0")}`;

export const formatearHora12 = (hora) => {
  const minutos = typeof hora === "number" ? hora : minutosDeHora(hora);
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  const sufijo = h >= 12 ? "p. m." : "a. m.";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${sufijo}`;
};

// Horas de inicio que caben completas dentro del horario, cada `paso` minutos.
export const horasDisponibles = (fecha, duracionMinutos = 60, paso = 30) => {
  const ventana = ventanaDeFecha(fecha);
  if (!ventana) return [];
  const horas = [];
  for (let minuto = ventana.desde; minuto + duracionMinutos <= ventana.hasta; minuto += paso) {
    horas.push(horaDeMinutos(minuto));
  }
  return horas;
};

// Devuelve un mensaje de error, o "" si el rango está dentro del horario de atención.
export const validarHorarioLaboral = (fecha, horaInicio, duracionMinutos = 60) => {
  const ventana = ventanaDeFecha(fecha);
  if (!ventana) return "Los domingos el gimnasio está cerrado. Elige un día de lunes a sábado.";
  const inicio = minutosDeHora(horaInicio);
  const fin = inicio + Number(duracionMinutos || 60);
  if (inicio < ventana.desde || fin > ventana.hasta) {
    return `Fuera del horario de atención. Ese día es de ${formatearHora12(ventana.desde)} a ${formatearHora12(ventana.hasta)}.`;
  }
  return "";
};

// Minutos desde la medianoche (hora local de la aplicación) de un instante ISO en una fecha dada.
export const minutosEnDia = (iso, fecha) =>
  Math.round((Date.parse(iso) - Date.parse(`${fecha}T00:00:00${DESPLAZAMIENTO_ZONA}`)) / 60000);

export const fechaHoy = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: ZONA_HORARIA, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

export const sumarDias = (fecha, dias) => {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  return new Date(Date.UTC(anio, mes - 1, dia + dias)).toISOString().slice(0, 10);
};
