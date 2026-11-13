import { diaSemana, fechaHoy, horasDisponibles, sumarDias, validarHorarioLaboral } from "./horario";

export const PERIODOS_PLAN = [
  { dias: 7, etiqueta: "1 semana" },
  { dias: 14, etiqueta: "2 semanas" },
  { dias: 30, etiqueta: "1 mes" },
  { dias: 60, etiqueta: "2 meses" },
  { dias: 90, etiqueta: "3 meses" },
];

export const DIAS_PLAN = [
  { numero: 1, etiqueta: "Lun" },
  { numero: 2, etiqueta: "Mar" },
  { numero: 3, etiqueta: "Mié" },
  { numero: 4, etiqueta: "Jue" },
  { numero: 5, etiqueta: "Vie" },
  { numero: 6, etiqueta: "Sáb" },
];

export const DURACIONES_SESION = [30, 45, 60, 90];

export const MAX_DIAS_PLAN = 120;

export const planInicial = () => ({
  desde: fechaHoy(),
  periodo: 30,
  fin: sumarDias(fechaHoy(), 29),
  dias: [],
  hora: "",
  duracion: 60,
});

// Fechas (AAAA-MM-DD) del plan: desde `desde`, durante `periodo` días, solo los días elegidos.
// Si la hora ya pasó el día de hoy, esa fecha se omite.
export function generarFechasPlan({ desde, fin, dias, hora }) {
  const fechas = [];
  for (let i = 0; i < MAX_DIAS_PLAN; i += 1) {
    const fecha = sumarDias(desde, i);
    if (fecha > fin) break;
    if (!dias.includes(diaSemana(fecha))) continue;
    if (hora && new Date(`${fecha}T${hora}:00`).getTime() <= Date.now()) continue;
    fechas.push(fecha);
  }
  return fechas;
}

// Horas de inicio válidas para todos los días elegidos (los sábados cierran antes).
export function horasComunes(dias, duracion) {
  const dia = dias.length ? dias : [1];
  const listas = dia.map((numero) => {
    const fecha = sumarDias("2026-01-05", numero - 1); // 2026-01-05 es lunes
    return horasDisponibles(fecha, duracion, 30);
  });
  return listas.reduce((comunes, lista) => comunes.filter((hora) => lista.includes(hora)));
}

export function validarPlan(plan) {
  if (!plan.desde || plan.desde < fechaHoy()) return "La fecha de inicio no puede ser anterior a hoy.";
  if (!plan.fin || plan.fin < plan.desde) return "La fecha de fin no puede ser anterior al inicio.";
  if (plan.fin > sumarDias(plan.desde, MAX_DIAS_PLAN - 1)) return "El plan no puede durar más de 4 meses.";
  if (plan.dias.length === 0) return "Selecciona al menos un día de entrenamiento.";
  if (!plan.hora) return "Selecciona la hora de entrenamiento.";
  const fechas = generarFechasPlan(plan);
  if (fechas.length === 0) return "Con esos días no se genera ninguna sesión en el periodo elegido.";
  for (const fecha of fechas) {
    const error = validarHorarioLaboral(fecha, plan.hora, plan.duracion);
    if (error) return error;
  }
  return "";
}