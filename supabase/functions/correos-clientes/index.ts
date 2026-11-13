// Correos automáticos para clientes inactivos (Fittrainer)
// - POST { tipo: "despedida", cliente_id }   -> "Lamentamos que te vayas" (lo dispara la base al inactivar)
// - POST { tipo: "mensual", forzar?: true }  -> "Te extrañamos" (pg_cron, el día 30 de cada mes)
//   ("semanal" se acepta como alias para no romper el cron anterior)
// - GET  ?baja=<token>                       -> el cliente deja de recibir estos correos
// Envío gratuito por Gmail (puerto 465). Secretos: GMAIL_USER, GMAIL_APP_PASSWORD,
// CORREOS_SECRETO y, opcional, CORREO_CONTACTO.
import { createClient } from "npm:@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GMAIL_USER = Deno.env.get("GMAIL_USER")!;
const GMAIL_APP_PASSWORD = (Deno.env.get("GMAIL_APP_PASSWORD") || "").replace(/\s/g, "");
const SECRETO = Deno.env.get("CORREOS_SECRETO")!;
const CONTACTO = Deno.env.get("CORREO_CONTACTO") ?? "";
const MAX_MENSUALES = 6; // deja de insistir después de 6 meses
const INTERVALO_MIN = 20 * 24 * 60 * 60 * 1000; // al menos 20 días desde el último correo

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

type Cliente = {
  id: string;
  nombre: string | null;
  email: string | null;
  estado: string | null;
  inactivo_desde: string | null;
  ultimo_correo_reactivacion: string | null;
  correos_reactivacion_enviados: number;
  acepta_correos_marketing: boolean;
  token_baja: string;
};

const COLUMNAS =
  "id,nombre,email,estado,inactivo_desde,ultimo_correo_reactivacion,correos_reactivacion_enviados,acepta_correos_marketing,token_baja";

// ---------- Plantilla HTML ----------
function plantilla(opciones: { titulo: string; parrafos: string[]; boton: string; enlaceBoton: string; urlBaja: string }) {
  const { titulo, parrafos, boton, enlaceBoton, urlBaja } = opciones;
  return `<!doctype html>
<html lang="es"><body style="margin:0;background:#F5F5F5;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F5F5F5;padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border-radius:12px;overflow:hidden;border:1px solid #E5E5E5;">
        <tr><td style="background:#0B0B0B;padding:22px 28px;">
          <span style="color:#FFFFFF;font-size:22px;font-weight:900;">Fit</span><span style="color:#E11D2E;font-size:22px;font-weight:900;">trainer</span>
        </td></tr>
        <tr><td style="padding:32px 28px 8px;">
          <h1 style="margin:0 0 16px;color:#0B0B0B;font-size:24px;font-weight:900;">${titulo}</h1>
          ${parrafos.map((p) => `<p style="margin:0 0 14px;color:#444;font-size:15px;line-height:1.6;">${p}</p>`).join("")}
        </td></tr>
        <tr><td style="padding:8px 28px 32px;">
          <a href="${enlaceBoton}" style="display:inline-block;background:#0B0B0B;color:#FFFFFF;text-decoration:none;font-weight:800;font-size:14px;padding:13px 24px;border-radius:8px;">${boton}</a>
        </td></tr>
        <tr><td style="padding:18px 28px;border-top:1px solid #EEEEEE;">
          <p style="margin:0;color:#999;font-size:12px;line-height:1.6;">
            Horario: lunes a viernes de 5:00 a. m. a 10:00 p. m. y sábados de 6:00 a. m. a 5:00 p. m.<br>
            Si no deseas recibir más estos correos, <a href="${urlBaja}" style="color:#999;">date de baja aquí</a>.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

const enlaceContacto = (asunto: string) =>
  CONTACTO ? `mailto:${CONTACTO}?subject=${encodeURIComponent(asunto)}` : `mailto:${GMAIL_USER}?subject=${encodeURIComponent(asunto)}`;
const urlBajaDe = (c: Cliente) => `${SUPABASE_URL}/functions/v1/correos-clientes?baja=${c.token_baja}`;
const nombreDe = (c: Cliente) => (c.nombre || "").trim().split(" ")[0] || "";

function correoDespedida(c: Cliente) {
  const nombre = nombreDe(c);
  return {
    asunto: `Lamentamos que te vayas${nombre ? `, ${nombre}` : ""}`,
    html: plantilla({
      titulo: `Lamentamos que te vayas${nombre ? `, ${nombre}` : ""}`,
      parrafos: [
        "Gracias por entrenar con nosotros. Cada sesión que completaste cuenta, y fue un gusto acompañarte en tu proceso.",
        "Tu historial, tus rutinas y tus mediciones quedan guardados. Si decides volver, retomamos justo donde lo dejaste.",
        "Las puertas de Fittrainer siguen abiertas para ti cuando estés listo.",
      ],
      boton: "Quiero volver",
      enlaceBoton: enlaceContacto("Quiero volver a entrenar"),
      urlBaja: urlBajaDe(c),
    }),
  };
}

const VARIANTES_MENSUALES = [
  {
    asunto: (n: string) => `Te extrañamos${n ? `, ${n}` : ""}`,
    titulo: "Te extrañamos",
    parrafos: [
      "Ha pasado un tiempo desde tu último entrenamiento y lo notamos.",
      "Tu entrenador y tu rutina siguen disponibles. Un solo entrenamiento basta para retomar el ritmo.",
    ],
  },
  {
    asunto: () => "Tu rutina te está esperando",
    titulo: "Tu rutina sigue aquí",
    parrafos: [
      "Todo tu progreso está guardado: tus mediciones, tu historial y tu última rutina.",
      "Volver es más fácil cuando no empiezas de cero. Escríbenos y te ayudamos a reactivar tu plan.",
    ],
  },
  {
    asunto: () => "Volver es más fácil de lo que crees",
    titulo: "Volver es más fácil de lo que crees",
    parrafos: [
      "No hace falta esperar al lunes ni al próximo mes. El mejor momento para retomar es hoy.",
      "Nuestro horario se adapta a ti, desde temprano en la mañana hasta la noche.",
    ],
  },
  {
    asunto: (n: string) => `${n ? `${n}, ` : ""}¿retomamos juntos?`,
    titulo: "¿Retomamos juntos?",
    parrafos: [
      "Cada mes es una nueva oportunidad para acercarte a tu objetivo.",
      "Tu lugar en Fittrainer sigue disponible. Responde este correo o escríbenos y coordinamos tu regreso.",
    ],
  },
];

function correoMensual(c: Cliente) {
  const nombre = nombreDe(c);
  const v = VARIANTES_MENSUALES[c.correos_reactivacion_enviados % VARIANTES_MENSUALES.length];
  return {
    asunto: v.asunto(nombre),
    html: plantilla({
      titulo: v.titulo,
      parrafos: v.parrafos,
      boton: "Quiero volver",
      enlaceBoton: enlaceContacto("Quiero volver a entrenar"),
      urlBaja: urlBajaDe(c),
    }),
  };
}

// ---------- Envío (Gmail SMTP) ----------
function conectar() {
  return new SMTPClient({
    connection: { hostname: "smtp.gmail.com", port: 465, tls: true, auth: { username: GMAIL_USER, password: GMAIL_APP_PASSWORD } },
  });
}

async function enviar(smtp: SMTPClient, para: string, asunto: string, html: string) {
  await smtp.send({
    from: `Fittrainer <${GMAIL_USER}>`,
    to: para,
    replyTo: CONTACTO || GMAIL_USER,
    subject: asunto,
    html,
    content: "Mensaje de Fittrainer",
  });
}

const esInactivo = (c: Cliente) => `${c.estado || ""}`.toLowerCase() === "inactivo";
const puedeRecibir = (c: Cliente) => esInactivo(c) && c.acepta_correos_marketing && !!c.email;

async function procesarDespedida(clienteId: string) {
  const { data: c, error } = await supabase.from("clientes").select(COLUMNAS).eq("id", clienteId).maybeSingle<Cliente>();
  if (error) throw error;
  if (!c || !puedeRecibir(c)) return { enviados: 0 };
  const smtp = conectar();
  try {
    const { asunto, html } = correoDespedida(c);
    await enviar(smtp, c.email!, asunto, html);
  } finally {
    await smtp.close();
  }
  // El primer "te extrañamos" sale en el siguiente día 30, siempre que hayan pasado 20 días
  await supabase.from("clientes").update({ ultimo_correo_reactivacion: new Date().toISOString() }).eq("id", c.id);
  return { enviados: 1 };
}

async function procesarMensual(forzar = false) {
  const { data, error } = await supabase
    .from("clientes")
    .select(COLUMNAS)
    .eq("estado", "Inactivo")
    .eq("acepta_correos_marketing", true)
    .not("email", "is", null)
    .lt("correos_reactivacion_enviados", MAX_MENSUALES);
  if (error) throw error;

  const ahora = Date.now();
  const pendientes = (data as Cliente[]).filter((c) => {
    if (forzar) return true;
    const referencia = c.ultimo_correo_reactivacion || c.inactivo_desde;
    return referencia ? ahora - new Date(referencia).getTime() >= INTERVALO_MIN : false;
  });
  if (pendientes.length === 0) return { enviados: 0, errores: [] as string[] };

  const smtp = conectar();
  let enviados = 0;
  const errores: string[] = [];
  try {
    for (const c of pendientes) {
      try {
        const { asunto, html } = correoMensual(c);
        await enviar(smtp, c.email!, asunto, html);
        await supabase.from("clientes").update({
          ultimo_correo_reactivacion: new Date().toISOString(),
          correos_reactivacion_enviados: c.correos_reactivacion_enviados + 1,
        }).eq("id", c.id);
        enviados++;
      } catch (e) {
        errores.push(`${c.id}: ${(e as Error).message}`);
      }
    }
  } finally {
    await smtp.close();
  }
  return { enviados, errores };
}

// ---------- Servidor ----------
Deno.serve(async (req) => {
  const url = new URL(req.url);
  const texto = (cuerpo: string, status = 200) =>
    new Response(cuerpo, { status, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  const json = (cuerpo: unknown, status = 200) =>
    new Response(JSON.stringify(cuerpo), { status, headers: { "Content-Type": "application/json" } });

  // Darse de baja desde el enlace del correo
  if (req.method === "GET" && url.searchParams.get("baja")) {
    const { error } = await supabase
      .from("clientes")
      .update({ acepta_correos_marketing: false })
      .eq("token_baja", url.searchParams.get("baja"));
    return error
      ? texto("No pudimos procesar tu solicitud. Intenta más tarde.", 500)
      : texto("Listo. Ya no recibirás estos correos de Fittrainer.");
  }

  if (req.method !== "POST") return texto("Método no permitido", 405);
  if (req.headers.get("x-correos-secreto") !== SECRETO) return texto("No autorizado", 401);
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) return json({ error: "Faltan los secretos GMAIL_USER o GMAIL_APP_PASSWORD" }, 500);

  try {
    const cuerpo = await req.json();
    if (cuerpo.tipo === "despedida" && cuerpo.cliente_id) return json(await procesarDespedida(cuerpo.cliente_id));
    if (cuerpo.tipo === "mensual" || cuerpo.tipo === "semanal") return json(await procesarMensual(Boolean(cuerpo.forzar)));
    return json({ error: "Tipo no válido" }, 400);
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message }, 500);
  }
});