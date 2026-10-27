export const ZONA_HORARIA_APLICACION = "America/Santo_Domingo";

const FORMATO_FECHA = /^\d{4}-\d{2}-\d{2}$/;
const FORMATO_HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

function esFechaCalendarioValida(valor) {
  if (!FORMATO_FECHA.test(valor || "")) return false;
  const [anio, mes, dia] = valor.split("-").map(Number);
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  return fecha.getUTCFullYear() === anio &&
    fecha.getUTCMonth() === mes - 1 &&
    fecha.getUTCDate() === dia;
}

function obtenerPartes(valor, opciones) {
  const fecha = valor instanceof Date ? valor : new Date(valor);
  if (Number.isNaN(fecha.getTime())) return null;

  return Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: ZONA_HORARIA_APLICACION,
      ...opciones,
    })
      .formatToParts(fecha)
      .filter((parte) => parte.type !== "literal")
      .map((parte) => [parte.type, parte.value])
  );
}

export function fechaLocalDe(valor) {
  if (!valor) return null;
  if (typeof valor === "string" && FORMATO_FECHA.test(valor)) return valor;
  const partes = obtenerPartes(valor, { year: "numeric", month: "2-digit", day: "2-digit" });
  return partes ? `${partes.year}-${partes.month}-${partes.day}` : null;
}

export function horaLocalDe(valor) {
  if (!valor) return "";
  const partes = obtenerPartes(valor, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  return partes ? `${partes.hour}:${partes.minute}` : "";
}

export function formatearHora12(hora24) {
  if (!FORMATO_HORA.test(hora24 || "")) return "Seleccionar hora";
  const [hora, minuto] = hora24.split(":").map(Number);
  const periodo = hora >= 12 ? "PM" : "AM";
  const hora12 = hora % 12 === 0 ? 12 : hora % 12;
  return `${hora12}:${String(minuto).padStart(2, "0")} ${periodo}`;
}

export function validarDatosEvento({ titulo, fecha, hora, descripcion }) {
  if (!titulo?.trim() || !fecha || !hora) return "Completa título, fecha y hora.";
  if (titulo.trim().length > 100) return "El título no puede superar 100 caracteres.";
  if (!esFechaCalendarioValida(fecha)) return "La fecha seleccionada no es válida.";
  if (!FORMATO_HORA.test(hora)) return "La hora seleccionada no es válida.";
  if ((descripcion || "").trim().length > 500) return "La descripción no puede superar 500 caracteres.";
  return "";
}

export function crearRangoEvento(fecha, hora, duracionMinutos = 60) {
  if (!esFechaCalendarioValida(fecha) || !FORMATO_HORA.test(hora || "")) {
    throw new Error("Fecha u hora no válida");
  }
  if (!Number.isFinite(duracionMinutos) || duracionMinutos <= 0) {
    throw new Error("Duración no válida");
  }
  const inicio = new Date(`${fecha}T${hora}:00-04:00`);
  const fin = new Date(inicio.getTime() + duracionMinutos * 60 * 1000);
  return { inicio: inicio.toISOString(), fin: fin.toISOString() };
}
