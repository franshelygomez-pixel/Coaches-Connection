import { createClient } from "@supabase/supabase-js";

// ============================================================
// Variables de entorno (Vite): crea un archivo .env en la raíz
// VITE_SUPABASE_URL=https://xxxxx.supabase.co
// VITE_SUPABASE_ANON_KEY=xxxxx
// ============================================================
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export const ADMIN_CODE = "SF-ADMIN-2026";

function generarCodigoCoach() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let codigo = "COACH-";
  for (let i = 0; i < 4; i++) codigo += chars[Math.floor(Math.random() * chars.length)];
  return codigo;
}

/**
 * Valida el dígito verificador real de una cédula dominicana (11 dígitos).
 * Algoritmo público usado por la cédula de identidad dominicana (la JCE
 * no ofrece una API pública para consultarla). Detecta cédulas mal
 * escritas o inventadas; no confirma que la persona exista en el
 * registro civil.
 */
export function validarCedulaDominicana(cedula) {
  const limpio = (cedula || "").replace(/\D/g, "");
  if (limpio.length !== 11) return false;

  const pesos = [1, 2, 1, 2, 1, 2, 1, 2, 1, 2];
  let suma = 0;
  for (let i = 0; i < 10; i++) {
    let producto = parseInt(limpio[i], 10) * pesos[i];
    if (producto >= 10) producto -= 9;
    suma += producto;
  }
  const digitoVerificador = (10 - (suma % 10)) % 10;
  return digitoVerificador === parseInt(limpio[10], 10);
}

/** Formatea una cédula mientras se escribe: 001-1234567-8 */
export function formatearCedula(valor) {
  const limpio = (valor || "").replace(/\D/g, "").slice(0, 11);
  const p1 = limpio.slice(0, 3);
  const p2 = limpio.slice(3, 10);
  const p3 = limpio.slice(10, 11);
  let resultado = p1;
  if (p2) resultado += `-${p2}`;
  if (p3) resultado += `-${p3}`;
  return resultado;
}

/**
 * Verifica si ya existe un usuario con ese correo en la tabla `usuarios`.
 */
export async function correoYaRegistrado(email) {
  const { data } = await supabase
    .from("usuarios")
    .select("id")
    .ilike("email", email)
    .maybeSingle();
  return !!data;
}

/**
 * Registro por correo/contraseña para coach o admin.
 * rol: "coach" | "admin"
 * Si rol === "admin", `codigoAdmin` debe coincidir con ADMIN_CODE.
 * telefono/tipoDocumento/documento/direccion son obligatorios para coach
 * (la validación de formato ya se hizo en el formulario antes de llamar esto).
 */
export async function registrarConCorreo({
  nombre, apellido, email, password, rol, codigoAdmin,
  telefono, tipoDocumento, documento, direccion,
}) {
  if (rol === "admin" && codigoAdmin !== ADMIN_CODE) {
    return { error: { message: "El código de administrador no es válido" } };
  }

  const yaExiste = await correoYaRegistrado(email);
  if (yaExiste) {
    return { error: { message: "Este correo ya está registrado en el sistema" } };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: `${nombre} ${apellido || ""}`.trim() } },
  });
  if (error) return { error };

  const userId = data.user?.id;
  if (!userId) return { error: { message: "No se pudo crear la cuenta" } };

  const filaUsuario = {
    id: userId,
    nombre,
    apellido: apellido || "",
    email,
    rol,
    estado: rol === "admin" ? "activo" : "pendiente",
  };
  if (rol === "coach") {
    filaUsuario.codigo = generarCodigoCoach();
    filaUsuario.telefono = telefono || null;
    filaUsuario.tipo_documento = tipoDocumento || null;
    filaUsuario.documento = documento || null;
    filaUsuario.direccion = direccion || null;
  }

  const { error: errorPerfil } = await supabase.from("usuarios").insert(filaUsuario);
  return { data, error: errorPerfil };
}

/**
 * Login por correo y contraseña. Sirve tanto para admin como para coach.
 */
export async function iniciarSesionConCorreo(email, password) {
  return supabase.auth.signInWithPassword({ email, password });
}