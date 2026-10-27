export const DIAS_MAXIMOS_REPORTE = 367;

export function fechaLocalISO(fecha = new Date()) {
  const desplazamiento = fecha.getTimezoneOffset() * 60_000;
  return new Date(fecha.getTime() - desplazamiento).toISOString().slice(0, 10);
}

export function periodoMensualInicial(fecha = new Date()) {
  const hasta = fechaLocalISO(fecha);
  return { desde: `${hasta.slice(0, 7)}-01`, hasta };
}

export function validarPeriodoReporte(desde, hasta) {
  if (!desde || !hasta) return "Selecciona la fecha inicial y la fecha final.";
  const inicio = new Date(`${desde}T00:00:00`);
  const fin = new Date(`${hasta}T00:00:00`);
  if (Number.isNaN(inicio.getTime()) || Number.isNaN(fin.getTime())) {
    return "El periodo seleccionado no es válido.";
  }
  if (fin < inicio) return "La fecha final no puede ser anterior a la fecha inicial.";
  const dias = Math.floor((fin.getTime() - inicio.getTime()) / 86_400_000) + 1;
  if (dias > DIAS_MAXIMOS_REPORTE) {
    return `El reporte no puede superar ${DIAS_MAXIMOS_REPORTE} días.`;
  }
  return "";
}

export function normalizarRespuestaPaginada(respuesta) {
  return {
    items: Array.isArray(respuesta?.items) ? respuesta.items : [],
    total: Number(respuesta?.total) || 0,
    pagina: Math.max(Number(respuesta?.pagina) || 1, 1),
    porPagina: Math.max(Number(respuesta?.por_pagina) || 20, 1),
  };
}

export function tarjetasResumen(resumen = {}) {
  return [
    { etiqueta: "Clientes", valor: Number(resumen.clientes_total) || 0 },
    { etiqueta: "Sesiones", valor: Number(resumen.sesiones_total) || 0 },
    { etiqueta: "Completadas", valor: Number(resumen.sesiones_completadas) || 0 },
    { etiqueta: "Asistencias", valor: Number(resumen.asistencias) || 0 },
    { etiqueta: "Ausencias", valor: Number(resumen.ausencias) || 0 },
    { etiqueta: "Asistencia registrada", valor: `${Number(resumen.porcentaje_asistencia) || 0}%` },
  ];
}
