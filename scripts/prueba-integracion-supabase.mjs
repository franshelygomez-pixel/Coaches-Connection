import { createClient } from "@supabase/supabase-js";
import { performance } from "node:perf_hooks";

const url = process.env.VITE_SUPABASE_URL;
const claveAnonima = process.env.VITE_SUPABASE_ANON_KEY;
const maximoMs = Number(process.env.INTEGRATION_MAX_MS || 3000);

const configuraciones = [
  {
    rol: "admin",
    email: process.env.INTEGRATION_ADMIN_EMAIL,
    password: process.env.INTEGRATION_ADMIN_PASSWORD,
  },
  {
    rol: "coach",
    email: process.env.INTEGRATION_COACH_EMAIL,
    password: process.env.INTEGRATION_COACH_PASSWORD,
  },
  {
    rol: "cliente",
    email: process.env.INTEGRATION_CLIENT_EMAIL,
    password: process.env.INTEGRATION_CLIENT_PASSWORD,
  },
];

const resultados = [];

function exigir(condicion, mensaje) {
  if (!condicion) throw new Error(mensaje);
}

function versionCumple(actual, requerida = "1.4.0") {
  const convertir = (valor) => `${valor || ""}`.split(".").map((parte) => Number(parte) || 0);
  const a = convertir(actual);
  const r = convertir(requerida);
  const longitud = Math.max(a.length, r.length);
  for (let indice = 0; indice < longitud; indice += 1) {
    if ((a[indice] || 0) > (r[indice] || 0)) return true;
    if ((a[indice] || 0) < (r[indice] || 0)) return false;
  }
  return true;
}

async function comprobar(nombre, accion, { rendimiento = false } = {}) {
  const inicio = performance.now();
  try {
    await accion();
    const duracion = Math.round(performance.now() - inicio);
    if (rendimiento) exigir(duracion <= maximoMs, `La consulta tardó ${duracion} ms; máximo ${maximoMs} ms`);
    resultados.push({ prueba: nombre, resultado: "APROBADA", milisegundos: duracion });
  } catch (error) {
    resultados.push({ prueba: nombre, resultado: "FALLIDA", milisegundos: Math.round(performance.now() - inicio), detalle: error.message });
  }
}

function nuevoCliente() {
  return createClient(url, claveAnonima, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

async function autenticar(configuracion) {
  const cliente = nuevoCliente();
  const { data, error } = await cliente.auth.signInWithPassword({
    email: configuracion.email,
    password: configuracion.password,
  });
  exigir(!error, `No se pudo iniciar sesión como ${configuracion.rol}: ${error?.message || "error desconocido"}`);
  exigir(data.user?.id, `Supabase no devolvió el usuario ${configuracion.rol}`);

  if (configuracion.rol === "cliente") {
    const { data: perfil, error: errorPerfil } = await cliente.rpc("obtener_mi_perfil_cliente");
    exigir(!errorPerfil && perfil?.cliente_id, "La cuenta cliente no tiene un perfil de portal válido");
    exigir(perfil.rol === "cliente" && perfil.estado === "activo", "El portal cliente no está activo");
    return { cliente, usuario: data.user, perfil };
  }

  const { data: perfil, error: errorPerfil } = await cliente
    .from("usuarios")
    .select("id,rol,estado")
    .eq("id", data.user.id)
    .single();
  exigir(!errorPerfil && perfil, `No se pudo consultar el perfil ${configuracion.rol}`);
  exigir(perfil.rol === configuracion.rol && perfil.estado === "activo", `El perfil ${configuracion.rol} no está activo o tiene otro rol`);
  return { cliente, usuario: data.user, perfil };
}

if (!url || !claveAnonima) {
  console.error("Faltan VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en .env.test.integration");
  process.exit(1);
}
if (configuraciones.some(({ email, password }) => !email || !password)) {
  console.error("Completa las tres cuentas de prueba en .env.test.integration");
  process.exit(1);
}
if (!Number.isFinite(maximoMs) || maximoMs < 100) {
  console.error("INTEGRATION_MAX_MS debe ser un número igual o mayor que 100");
  process.exit(1);
}

const anonimo = nuevoCliente();
let sesiones = {};

await comprobar("Contrato y versión del backend", async () => {
  const { data, error } = await anonimo.rpc("estado_backend");
  exigir(!error && data?.configurado, `Backend no configurado: ${error?.message || "sin respuesta"}`);
  exigir(versionCumple(data.version), `Se requiere backend 1.4.0 o superior; actual ${data.version || "desconocida"}`);
}, { rendimiento: true });

for (const configuracion of configuraciones) {
  await comprobar(`Autenticación y perfil ${configuracion.rol}`, async () => {
    sesiones[configuracion.rol] = await autenticar(configuracion);
  }, { rendimiento: true });
}

if (sesiones.admin) {
  await comprobar("Administrador consulta usuarios autorizados", async () => {
    const { data, error } = await sesiones.admin.cliente.from("usuarios").select("id,rol,estado").limit(100);
    exigir(!error, error?.message || "Consulta administrativa rechazada");
    exigir(data.some((fila) => fila.id === sesiones.admin.usuario.id), "El administrador no puede consultar su propio perfil");
  }, { rendimiento: true });

  await comprobar("Administrador consulta el resumen operativo", async () => {
    const hoy = new Date();
    const hasta = hoy.toISOString().slice(0, 10);
    hoy.setUTCDate(hoy.getUTCDate() - 30);
    const desde = hoy.toISOString().slice(0, 10);
    const { data, error } = await sesiones.admin.cliente.rpc("reporte_resumen_operativo", {
      p_desde: desde,
      p_hasta: hasta,
      p_coach_id: null,
    });
    exigir(!error && typeof data?.clientes_total === "number", error?.message || "Resumen administrativo inválido");
  }, { rendimiento: true });
}

if (sesiones.coach) {
  await comprobar("RLS del entrenador limita los clientes", async () => {
    const { data, error } = await sesiones.coach.cliente.from("clientes").select("id,coach_id").limit(1000);
    exigir(!error, error?.message || "No se pudieron consultar clientes");
    exigir(data.every((fila) => fila.coach_id === sesiones.coach.usuario.id), "RLS expuso clientes de otro entrenador");
  }, { rendimiento: true });

  await comprobar("Entrenador no accede a la comparación administrativa", async () => {
    const hasta = new Date().toISOString().slice(0, 10);
    const { error } = await sesiones.coach.cliente.rpc("reporte_entrenadores_paginado", {
      p_desde: hasta,
      p_hasta: hasta,
      p_pagina: 1,
      p_por_pagina: 20,
    });
    exigir(Boolean(error), "El entrenador obtuvo un reporte exclusivo del administrador");
  });
}

if (sesiones.cliente) {
  await comprobar("RLS del portal limita las sesiones del cliente", async () => {
    const { data, error } = await sesiones.cliente.cliente
      .from("sesiones_entrenamiento")
      .select("id,cliente_id")
      .limit(1000);
    exigir(!error, error?.message || "No se pudieron consultar las sesiones del portal");
    exigir(data.every((fila) => fila.cliente_id === sesiones.cliente.perfil.cliente_id), "RLS expuso sesiones de otro cliente");
  }, { rendimiento: true });

  await comprobar("Cliente no accede a reportes internos", async () => {
    const hoy = new Date().toISOString().slice(0, 10);
    const { error } = await sesiones.cliente.cliente.rpc("reporte_resumen_operativo", {
      p_desde: hoy,
      p_hasta: hoy,
      p_coach_id: null,
    });
    exigir(Boolean(error), "El cliente obtuvo un reporte interno");
  });
}

for (const sesion of Object.values(sesiones)) {
  await sesion.cliente.auth.signOut();
}

console.table(resultados);
const fallidas = resultados.filter((resultado) => resultado.resultado === "FALLIDA");
if (fallidas.length > 0) {
  console.error(`${fallidas.length} prueba(s) de integración fallaron.`);
  process.exit(1);
}
console.log(`${resultados.length} pruebas de integración aprobadas.`);
