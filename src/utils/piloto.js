import { ROLES_PERMITIDOS, normalizarRol } from "./permisos";

export const VERSION_APLICACION = "1.6.0";
export const VERSION_BACKEND_PILOTO = "1.4.0";

export const CHECKLIST_PILOTO = Object.freeze([
  { id: "autorizacion", titulo: "Autorización institucional archivada", evidencia: "Carta firmada o comunicación institucional" },
  { id: "consentimientos", titulo: "Consentimientos informados preparados", evidencia: "Formularios sin respuestas de ejemplo" },
  { id: "cuentas", titulo: "Cuentas de prueba activas por rol", evidencia: "Administrador, entrenador y cliente de prueba" },
  { id: "backend", titulo: "Backend 1.4.0 o superior verificado", evidencia: "Resultado del verificador SQL de la Fase 5" },
  { id: "calidad", titulo: "Control automático aprobado", evidencia: "Salida de npm run check" },
  { id: "navegadores", titulo: "Compatibilidad manual comprobada", evidencia: "Chrome, Edge, Firefox y vista móvil" },
  { id: "respaldo", titulo: "Plan de respaldo y recuperación confirmado", evidencia: "Responsable, fecha y procedimiento" },
  { id: "participantes", titulo: "Participantes y calendario definidos", evidencia: "Lista codificada y cronograma del piloto" },
  { id: "instrumentos", titulo: "Instrumentos listos para aplicar", evidencia: "SUS, aceptación, observación e incidencias" },
  { id: "privacidad", titulo: "Procedimiento de anonimización revisado", evidencia: "Guía de evidencias y carpeta restringida" },
]);

const GUIAS = Object.freeze({
  [ROLES_PERMITIDOS.ADMIN]: {
    titulo: "Guía del administrador",
    descripcion: "Supervisa solicitudes, usuarios, reportes, seguridad y evidencias del piloto.",
    pasos: [
      "Revisa las solicitudes pendientes y confirma el rol solicitado.",
      "Activa o rechaza cuentas dejando un motivo institucional claro.",
      "Consulta los reportes por periodo y exporta evidencia anónima para la tesis.",
      "Revisa la auditoría y documenta cualquier incidencia sin copiar datos sensibles.",
    ],
  },
  [ROLES_PERMITIDOS.COACH]: {
    titulo: "Guía del entrenador",
    descripcion: "Gestiona clientes, rutinas, sesiones, asistencia y accesos al portal.",
    pasos: [
      "Registra únicamente clientes que hayan autorizado el tratamiento de sus datos.",
      "Crea rutinas y asígnalas al cliente correspondiente.",
      "Programa sesiones y registra el resultado de asistencia después de realizarlas.",
      "Usa los reportes de tu cuenta y evita compartir datos de otros participantes.",
    ],
  },
  [ROLES_PERMITIDOS.CLIENTE]: {
    titulo: "Guía del cliente",
    descripcion: "Consulta tu rutina, sesiones, seguimiento, privacidad y notificaciones.",
    pasos: [
      "Revisa que tu información básica corresponda a tu cuenta.",
      "Consulta la rutina y las sesiones asignadas por tu entrenador.",
      "Lee el consentimiento antes de aceptarlo o revocarlo.",
      "Reporta al responsable del piloto cualquier dato incorrecto o acceso inesperado.",
    ],
  },
});

export function obtenerGuiaRol(rol) {
  return GUIAS[normalizarRol(rol)] || {
    titulo: "Guía de acceso",
    descripcion: "Tu cuenta todavía no tiene un rol reconocido.",
    pasos: ["Contacta al administrador institucional para revisar el perfil."],
  };
}

export function calcularAvancePiloto(completados = []) {
  const idsValidos = new Set(CHECKLIST_PILOTO.map((item) => item.id));
  const completadosValidos = new Set(
    (Array.isArray(completados) ? completados : []).filter((id) => idsValidos.has(id))
  );
  const total = CHECKLIST_PILOTO.length;
  const cantidad = completadosValidos.size;
  return {
    cantidad,
    total,
    porcentaje: total === 0 ? 0 : Math.round((cantidad / total) * 100),
  };
}
