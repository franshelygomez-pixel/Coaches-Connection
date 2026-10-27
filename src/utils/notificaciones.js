export const TIPOS_NOTIFICACION = Object.freeze({
  sistema: "Sistema",
  solicitud: "Solicitud",
  cuenta: "Cuenta",
  sesion: "Sesión",
  asistencia: "Asistencia",
  rutina: "Rutina",
  acceso: "Acceso",
});

export function etiquetaNotificacion(tipo) {
  return TIPOS_NOTIFICACION[tipo] || TIPOS_NOTIFICACION.sistema;
}

export function fechaNotificacion(fecha, ahora = new Date()) {
  const valor = new Date(fecha);
  if (Number.isNaN(valor.getTime())) return "Fecha no disponible";
  const diferenciaMinutos = Math.floor((ahora.getTime() - valor.getTime()) / 60_000);
  if (diferenciaMinutos >= 0 && diferenciaMinutos < 1) return "Ahora";
  if (diferenciaMinutos >= 1 && diferenciaMinutos < 60) return `Hace ${diferenciaMinutos} min`;
  return valor.toLocaleString("es-DO", { dateStyle: "short", timeStyle: "short" });
}
