import { createClient } from "@supabase/supabase-js";
import { normalizarCorreo } from "./utils/validaciones";
import { normalizarRol } from "./utils/permisos";

export { formatearCedula, validarCedulaDominicana } from "./utils/validaciones";

const MODO_PRUEBA = import.meta.env.MODE === "test";
const URL_CONFIGURADA = import.meta.env.VITE_SUPABASE_URL || "";
const CLAVE_CONFIGURADA = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
export const VERSION_BACKEND_REQUERIDA = "1.4.0";

export function validarConfiguracionSupabase(url, clave) {
  const urlLimpia = `${url || ""}`.trim();
  const claveLimpia = `${clave || ""}`.trim();
  if (!urlLimpia || !claveLimpia || /tu-proyecto|tu_clave|pendiente/i.test(`${urlLimpia} ${claveLimpia}`)) {
    return false;
  }
  try {
    const direccion = new URL(urlLimpia);
    return ["http:", "https:"].includes(direccion.protocol) && Boolean(direccion.hostname) && claveLimpia.length >= 20;
  } catch {
    return false;
  }
}

export const CONFIGURACION_SUPABASE_VALIDA = MODO_PRUEBA
  || validarConfiguracionSupabase(URL_CONFIGURADA, CLAVE_CONFIGURADA);

const SUPABASE_URL = CONFIGURACION_SUPABASE_VALIDA
  ? (URL_CONFIGURADA || "https://pruebas.supabase.co")
  : "https://configuracion-pendiente.supabase.co";
const SUPABASE_ANON_KEY = CONFIGURACION_SUPABASE_VALIDA
  ? (CLAVE_CONFIGURADA || "clave-publica-de-pruebas")
  : "clave-publica-pendiente-fase-seis";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

const CAMPOS_PERFIL = [
  "id", "nombre", "apellido", "email", "rol", "estado", "codigo",
  "creado_en", "telefono", "tipo_documento", "documento", "direccion",
].join(",");

function generarCodigoUsuario(rol) {
  const caracteres = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  const sufijo = Array.from(bytes, (valor) => caracteres[valor % caracteres.length]).join("");
  return `${rol === "admin" ? "ADMIN" : "COACH"}-${sufijo}`;
}

export function traducirErrorSupabase(error, contexto = "operacion") {
  const mensaje = `${error?.message || ""}`.toLowerCase();
  const codigo = `${error?.code || ""}`.toLowerCase();

  if (codigo === "backend_not_configured" || mensaje.includes("estado_backend")) {
    return "Supabase no tiene instalada la configuración requerida. Ejecuta completo supabase/setup.sql.";
  }
  if (codigo === "backend_outdated") {
    return "La base de datos necesita la Fase 4. Ejecuta supabase/fase4_reportes_notificaciones.sql.";
  }
  if (codigo === "42702" || mensaje.includes("ambiguous") || mensaje.includes("vence_en is ambiguous")) {
    return "La función de invitaciones necesita la corrección 1.3.1. Ejecuta supabase/correccion_fase3_invitaciones.sql.";
  }
  if (codigo === "pgrst202" || (mensaje.includes("crear_invitacion_cliente") && mensaje.includes("schema cache"))) {
    return "Supabase no encuentra la función de invitaciones. Ejecuta supabase/correccion_fase3_invitaciones.sql.";
  }
  if (mensaje.includes("reporte_resumen_operativo") || mensaje.includes("reporte_sesiones_paginado") || mensaje.includes("notificaciones") && mensaje.includes("schema cache")) {
    return "Supabase no tiene instalada la Fase 4. Ejecuta supabase/fase4_reportes_notificaciones.sql.";
  }
  if (mensaje.includes("solo un entrenador activo")) {
    return "Tu cuenta debe tener el rol COACH y el estado ACTIVO para generar invitaciones.";
  }
  if (mensaje.includes("no pertenece al entrenador")) {
    return "Ese cliente no está asignado a la cuenta del entrenador que inició sesión.";
  }
  if (mensaje.includes("no tiene un correo valido")) {
    return "El cliente necesita un correo electrónico válido antes de generar la invitación.";
  }
  if (mensaje.includes("ya tiene acceso al portal")) {
    return "El cliente ya tiene una cuenta de acceso al portal.";
  }
  if (codigo === "invalid_admin_invitation" || mensaje.includes("invitacion_admin_invalida")) {
    return "La invitación administrativa no es válida, no corresponde al correo o ya venció.";
  }
  if (codigo === "invalid_client_invitation" || mensaje.includes("invitacion_cliente_invalida")) {
    return "La invitación del cliente no es válida, no corresponde al correo o ya venció.";
  }
  if (mensaje.includes("invalid login credentials")) return "Correo o contraseña incorrectos.";
  if (mensaje.includes("email not confirmed")) return "Debes confirmar tu correo antes de iniciar sesión.";
  if (mensaje.includes("user already registered") || mensaje.includes("already") || codigo === "23505") {
    return "El correo o documento ya está registrado.";
  }
  if (mensaje.includes("password")) return "La contraseña no cumple los requisitos de seguridad.";
  if (mensaje.includes("rate limit") || error?.status === 429) return "Se realizaron demasiados intentos. Espera unos minutos.";
  if (mensaje.includes("row-level security") || mensaje.includes("permission denied") || codigo === "42501") {
    return "La base de datos rechazó la operación. Ejecuta el archivo supabase/setup.sql.";
  }
  if (mensaje.includes("failed to fetch") || mensaje.includes("network")) return "No se pudo conectar con Supabase.";
  if (contexto === "registro") return "No se pudo crear la solicitud. Revisa la configuración de Supabase.";
  if (contexto === "perfil") return "No se pudo cargar tu perfil de usuario.";
  return "No se pudo completar la operación.";
}

export function versionCumple(actual, requerida = VERSION_BACKEND_REQUERIDA) {
  const convertir = (version) => `${version || ""}`.split(".").map((parte) => Number(parte) || 0);
  const a = convertir(actual);
  const r = convertir(requerida);
  const longitud = Math.max(a.length, r.length);
  for (let indice = 0; indice < longitud; indice += 1) {
    if ((a[indice] || 0) > (r[indice] || 0)) return true;
    if ((a[indice] || 0) < (r[indice] || 0)) return false;
  }
  return true;
}

export async function verificarConfiguracionBackend() {
  const { data, error } = await supabase.rpc("estado_backend");

  if (error || !data?.configurado) {
    return {
      data: null,
      error: {
        message: error?.message || "Backend not configured",
        code: "backend_not_configured",
        cause: error || null,
      },
    };
  }

  if (!versionCumple(data.version)) {
    return {
      data: null,
      error: {
        message: `Backend ${data.version || "sin versión"}; se requiere ${VERSION_BACKEND_REQUERIDA}`,
        code: "backend_outdated",
      },
    };
  }

  return { data, error: null };
}

async function consultarPerfil(userId) {
  return supabase
    .from("usuarios")
    .select(CAMPOS_PERFIL)
    .eq("id", userId)
    .maybeSingle();
}

async function consultarPerfilCliente() {
  const { data, error } = await supabase.rpc("obtener_mi_perfil_cliente");
  return { data: data || null, error };
}

export async function obtenerOCrearPerfil(user) {
  if (!user?.id) {
    return { data: null, error: { message: "Usuario no válido" } };
  }

  const perfilExistente = await consultarPerfil(user.id);
  if (perfilExistente.error || perfilExistente.data) return perfilExistente;

  const perfilCliente = await consultarPerfilCliente();
  if (perfilCliente.data) return perfilCliente;
  if (perfilCliente.error) return perfilCliente;

  // Repara las cuentas creadas antes de instalar el trigger de setup.sql.
  const { error: errorReparacion } = await supabase.rpc("reparar_mi_perfil");
  if (errorReparacion) return { data: null, error: errorReparacion };
  const perfilReparado = await consultarPerfil(user.id);
  if (perfilReparado.error || perfilReparado.data) return perfilReparado;
  return consultarPerfilCliente();
}

export async function registrarConCorreo({
  nombre,
  apellido,
  email,
  password,
  rol,
  telefono,
  tipoDocumento,
  documento,
  direccion,
  codigoInvitacionAdmin,
  codigoInvitacionCliente,
}) {
  // Evita crear una cuenta solamente en Authentication cuando el esquema,
  // el trigger o la funcion de perfiles todavia no han sido instalados.
  const diagnostico = await verificarConfiguracionBackend();
  if (diagnostico.error) return diagnostico;

  const correoNormalizado = normalizarCorreo(email);
  const rolNormalizado = normalizarRol(rol);
  if (!rolNormalizado) {
    return { data: null, error: { message: "Rol no permitido", code: "invalid_role" } };
  }


  if (rolNormalizado === "admin") {
    const { data: invitacionValida, error: errorInvitacion } = await supabase.rpc(
      "validar_invitacion_admin",
      {
        p_email: correoNormalizado,
        p_codigo: codigoInvitacionAdmin?.trim() || "",
      }
    );
    if (errorInvitacion || !invitacionValida) {
      return {
        data: null,
        error: {
          message: errorInvitacion?.message || "INVITACION_ADMIN_INVALIDA",
          code: "invalid_admin_invitation",
        },
      };
    }
  }

  if (rolNormalizado === "cliente") {
    const { data: invitacionValida, error: errorInvitacion } = await supabase.rpc(
      "validar_invitacion_cliente",
      {
        p_email: correoNormalizado,
        p_codigo: codigoInvitacionCliente?.trim() || "",
      }
    );
    if (errorInvitacion || !invitacionValida) {
      return {
        data: null,
        error: {
          message: errorInvitacion?.message || "INVITACION_CLIENTE_INVALIDA",
          code: "invalid_client_invitation",
        },
      };
    }
  }

  const perfilAplicacion = {
    nombre: nombre?.trim() || "",
    apellido: apellido?.trim() || "",
    email: correoNormalizado,
    rol: rolNormalizado,
    codigo: rolNormalizado === "cliente" ? null : generarCodigoUsuario(rolNormalizado),
    telefono: telefono || null,
    tipo_documento: tipoDocumento || null,
    documento: documento || null,
    direccion: direccion?.trim() || null,
    codigo_invitacion_admin: rolNormalizado === "admin"
      ? codigoInvitacionAdmin?.trim().toUpperCase() || null
      : null,
    codigo_invitacion_cliente: rolNormalizado === "cliente"
      ? codigoInvitacionCliente?.trim().toUpperCase() || null
      : null,
  };

  const { data, error } = await supabase.auth.signUp({
    email: correoNormalizado,
    password,
    options: {
      data: {
        full_name: `${nombre || "Cliente"} ${apellido || ""}`.trim(),
        perfil_aplicacion: perfilAplicacion,
      },
    },
  });

  if (error) return { data: null, error };

  if (!data.user?.id || data.user.identities?.length === 0) {
    return {
      data: null,
      error: { message: "User already registered", code: "user_already_exists" },
    };
  }

  return { data, error: null };
}

export async function iniciarSesionConCorreo(email, password) {
  const diagnostico = await verificarConfiguracionBackend();
  if (diagnostico.error) return diagnostico;

  return supabase.auth.signInWithPassword({
    email: normalizarCorreo(email),
    password,
  });
}

export async function enviarRecuperacionContrasena(email) {
  return supabase.auth.resetPasswordForEmail(normalizarCorreo(email), {
    redirectTo: window.location.origin,
  });
}

export async function actualizarContrasena(password) {
  return supabase.auth.updateUser({ password });
}

export async function cerrarSesion() {
  return supabase.auth.signOut();
}
