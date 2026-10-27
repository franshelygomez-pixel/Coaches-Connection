export const ROLES_PERMITIDOS = Object.freeze({
  ADMIN: "admin",
  COACH: "coach",
  CLIENTE: "cliente",
});

export const ACCESOS = Object.freeze({
  AUTORIZADO: "autorizado",
  PENDIENTE: "pendiente",
  DENEGADO: "denegado",
  SIN_ROL: "sin-rol",
});

export function normalizarRol(rol) {
  const valor = typeof rol === "string" ? rol.trim().toLowerCase() : "";
  return Object.values(ROLES_PERMITIDOS).includes(valor) ? valor : null;
}

export function normalizarEstado(estado) {
  return typeof estado === "string" ? estado.trim().toLowerCase() : "";
}

export function evaluarAcceso(rol, estado) {
  const rolNormalizado = normalizarRol(rol);
  if (!rolNormalizado) return ACCESOS.SIN_ROL;

  const estadoNormalizado = normalizarEstado(estado);
  if (estadoNormalizado === "activo") return ACCESOS.AUTORIZADO;
  if (estadoNormalizado === "pendiente") return ACCESOS.PENDIENTE;
  return ACCESOS.DENEGADO;
}

export function perteneceAlCoach(registro, coachId) {
  if (!registro || !coachId) return false;
  const propietario = registro.coachId ?? registro.coach_id;
  return Boolean(propietario && propietario === coachId);
}
