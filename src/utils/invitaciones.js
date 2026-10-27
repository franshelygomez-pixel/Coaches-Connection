import { supabase } from "../supabaseClient";

// Envía la invitación por correo mediante la Edge Function "invitar-usuario".
// Solo funciona con una sesión de administrador activo (se valida en el servidor).
// payload: { rol: "cliente", clienteId } | { rol: "admin" | "coach", email, nombre?, apellido? }
export async function invitarUsuario({ rol, clienteId, email, nombre, apellido }) {
  const { data, error } = await supabase.functions.invoke("invitar-usuario", {
    body: { rol, cliente_id: clienteId, email, nombre, apellido },
  });
  if (error) {
    let detalle = "";
    try {
      const cuerpo = await error.context?.json?.();
      detalle = cuerpo?.error || "";
    } catch { /* sin detalle adicional */ }
    return { data: null, error: detalle || "No se pudo enviar la invitación. Inténtalo de nuevo." };
  }
  if (data?.error) return { data: null, error: data.error };
  return { data, error: null };
}