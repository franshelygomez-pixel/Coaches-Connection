// Edge Function: invitar-usuario
// Solo un administrador activo puede llamarla. Crea la invitación y envía el
// correo con el enlace (inviteUserByEmail). El correo del cliente se toma de
// la ficha del cliente: nadie lo escribe a mano.
//
// Cuerpo (JSON):
//   { "rol": "cliente", "cliente_id": "<uuid>" }
//   { "rol": "coach" | "admin", "email": "...", "nombre": "...", "apellido": "..." }
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const responder = (cuerpo: unknown, status = 200) =>
  new Response(JSON.stringify(cuerpo), { status, headers: { ...cors, "Content-Type": "application/json" } });

const CORREO = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const VIGENCIA_DIAS = 7;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return responder({ error: "Método no permitido" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const servicio = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sitio = (Deno.env.get("SITE_URL") || "").replace(/\/$/, "");
  if (!sitio) return responder({ error: "Falta configurar SITE_URL" }, 500);

  // 1. Quién llama
  const token = req.headers.get("Authorization") ?? "";
  const cliente = createClient(url, anon, { global: { headers: { Authorization: token } } });
  const { data: { user }, error: errorUsuario } = await cliente.auth.getUser();
  if (errorUsuario || !user) return responder({ error: "Sesión no válida" }, 401);

  const admin = createClient(url, servicio, { auth: { persistSession: false } });
  const { data: esAdmin } = await admin
    .from("administradores").select("id").eq("id", user.id).eq("estado", "activo").maybeSingle();
  if (!esAdmin) return responder({ error: "Solo un administrador activo puede invitar" }, 403);

  // 2. Datos de la invitación
  let cuerpo: Record<string, string>;
  try { cuerpo = await req.json(); } catch { return responder({ error: "Cuerpo inválido" }, 400); }
  const rol = String(cuerpo.rol || "");
  if (!["cliente", "coach", "admin"].includes(rol)) return responder({ error: "Rol no permitido" }, 400);

  let email = "";
  let clienteId: string | null = null;
  let datos: Record<string, string> = {};

  if (rol === "cliente") {
    clienteId = String(cuerpo.cliente_id || "");
    const { data: ficha } = await admin
      .from("clientes").select("id,email,nombre,apellido").eq("id", clienteId).maybeSingle();
    if (!ficha) return responder({ error: "El cliente no existe" }, 404);
    const { data: cuenta } = await admin
      .from("cuentas_clientes").select("id").eq("cliente_id", clienteId).maybeSingle();
    if (cuenta) return responder({ error: "El cliente ya tiene acceso al portal" }, 409);
    email = String(ficha.email || "").trim().toLowerCase();
    datos = { nombre: ficha.nombre ?? "", apellido: ficha.apellido ?? "" };
  } else {
    email = String(cuerpo.email || "").trim().toLowerCase();
    datos = { nombre: String(cuerpo.nombre || "").trim(), apellido: String(cuerpo.apellido || "").trim() };
    if (!datos.nombre) return responder({ error: "El nombre es obligatorio" }, 400);
  }
  if (!CORREO.test(email)) return responder({ error: "El correo no es válido" }, 400);

  // 3. Si ya hay una cuenta con ese correo: se reemplaza solo si nunca fue confirmada
  const { data: lista } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const existente = lista?.users.find((u) => (u.email || "").toLowerCase() === email);
  if (existente) {
    if (existente.email_confirmed_at) {
      return responder({ error: "Ese correo ya tiene una cuenta activa" }, 409);
    }
    await admin.auth.admin.deleteUser(existente.id);
  }

  // 4. Cerrar invitaciones anteriores y crear la nueva
  await admin.from("invitaciones_acceso")
    .update({ estado: "vencida" }).eq("estado", "pendiente").lte("vence_en", new Date().toISOString());
  await admin.from("invitaciones_acceso")
    .update({ estado: "revocada", revocado_en: new Date().toISOString() })
    .eq("estado", "pendiente").or(`email.ilike.${email}${clienteId ? `,cliente_id.eq.${clienteId}` : ""}`);

  const vence = new Date(Date.now() + VIGENCIA_DIAS * 86400000).toISOString();
  const { data: invitacion, error: errorInvitacion } = await admin
    .from("invitaciones_acceso")
    .insert({ email, rol, cliente_id: clienteId, datos, creado_por: user.id, vence_en: vence })
    .select("id").single();
  if (errorInvitacion) return responder({ error: errorInvitacion.message }, 400);

  // 5. Enviar el correo (el trigger crea el perfil al crearse la cuenta)
  const { error: errorEnvio } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo: sitio });
  if (errorEnvio) {
    await admin.from("invitaciones_acceso")
      .update({ estado: "revocada", revocado_en: new Date().toISOString() }).eq("id", invitacion.id);
    return responder({ error: `No se pudo enviar el correo: ${errorEnvio.message}` }, 502);
  }

  return responder({ ok: true, invitacion_id: invitacion.id, email, vence_en: vence });
});