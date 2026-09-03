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
 * PASO 1 del registro: crea el usuario en Supabase Auth y envía el
 * correo de confirmación. NO crea todavía la fila en `usuarios` — sin
 * sesión activa (el correo aún no está confirmado), la política de RLS
 * de `usuarios_insert_propio` (auth.uid() = id) bloquearía el insert.
 *
 * Todos los datos del formulario se guardan en `user_metadata`, que
 * queda asociado al usuario de Auth independientemente de si confirma
 * el correo hoy o en una semana, y se recuperan en el PASO 2.
 *
 * El error "ya está registrado" lo entrega el propio signUp de Supabase
 * (auth.users es la fuente de verdad), no hace falta un pre-chequeo
 * aparte — un pre-chequeo contra `usuarios` con el cliente anónimo no
 * funcionaría de todas formas: RLS bloquea esa lectura sin sesión.
 */
export async function registrarConCorreo({
  nombre, apellido, email, password, rol, codigoAdmin,
  telefono, tipoDocumento, documento, direccion,
}) {
  if (rol === "admin" && codigoAdmin !== ADMIN_CODE) {
    return { error: { message: "El código de administrador no es válido" } };
  }

  const metadata = {
    full_name: `${nombre} ${apellido || ""}`.trim(),
    nombre,
    apellido: apellido || "",
    rol,
  };
  if (rol === "coach") {
    metadata.codigo = generarCodigoCoach();
    metadata.telefono = telefono || null;
    metadata.tipo_documento = tipoDocumento || null;
    metadata.documento = documento || null;
    metadata.direccion = direccion || null;
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: window.location.origin,
      data: metadata,
    },
  });

  return { data, error };
}

/**
 * PASO 2 del registro: se llama desde App.jsx apenas se detecta una
 * sesión activa (la persona ya confirmó su correo y volvió a la app).
 * Si todavía no existe su fila en `usuarios`, la crea leyendo los datos
 * que quedaron guardados en user_metadata durante el signUp.
 */
export async function crearPerfilDesdeMetadata(user) {
  const meta = user.user_metadata || {};
  const rol = meta.rol || "coach";

  const filaUsuario = {
    id: user.id,
    nombre: meta.nombre || "Usuario",
    apellido: meta.apellido || "",
    email: user.email,
    rol,
    estado: rol === "admin" ? "activo" : "pendiente",
  };
  if (rol === "coach") {
    filaUsuario.codigo = meta.codigo || null;
    filaUsuario.telefono = meta.telefono || null;
    filaUsuario.tipo_documento = meta.tipo_documento || null;
    filaUsuario.documento = meta.documento || null;
    filaUsuario.direccion = meta.direccion || null;
  }

  const { data, error } = await supabase
    .from("usuarios")
    .insert(filaUsuario)
    .select()
    .single();

  return { perfil: data, error };
}

/**
 * Login por correo y contraseña. Sirve tanto para admin como para coach.
 * Si el correo aún no fue confirmado, Supabase devuelve un error propio
 * ("Email not confirmed").
 */
export async function iniciarSesionConCorreo(email, password) {
  return supabase.auth.signInWithPassword({ email, password });
}