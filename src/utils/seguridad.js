export function normalizarCodigoInvitacion(valor) {
  return `${valor || ""}`.replace(/\s/g, "").toUpperCase().slice(0, 24);
}

export function normalizarCodigoCliente(valor) {
  const limpio = `${valor || ""}`.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const cuerpo = limpio.startsWith("CLI") ? limpio.slice(3) : limpio;
  return cuerpo ? `CLI-${cuerpo.slice(0, 16)}` : "";
}

export function obtenerRolSolicitado(usuario) {
  return usuario?.rol_solicitado || usuario?.rol || "coach";
}

export function motivoDecisionValido(motivo) {
  return typeof motivo === "string" && motivo.trim().length >= 3;
}

export function invitacionEstaVigente(invitacion, ahora = new Date()) {
  if (!invitacion || invitacion.estado !== "pendiente" || !invitacion.vence_en) return false;
  return new Date(invitacion.vence_en).getTime() > ahora.getTime();
}
