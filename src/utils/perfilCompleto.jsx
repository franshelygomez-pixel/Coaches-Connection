const CAMPOS = [["telefono", "teléfono"], ["direccion", "dirección"], ["fecha_nacimiento", "fecha de nacimiento"], ["documento", "cédula/pasaporte"]];

export const faltantesPerfil = (p) => CAMPOS.filter(([k]) => !p[k] || !String(p[k]).trim()).map(([, e]) => e);

export function InsigniaPerfil({ persona }) {
  const completo = Boolean(persona.perfil_completado_en);
  const faltan = faltantesPerfil(persona);
  return (
    <span title={completo ? "Completó su perfil" : faltan.length ? `Falta: ${faltan.join(", ")}` : "Aún no confirma su perfil"}
      style={{ background: completo ? "#E1F5EE" : "#FFF4E5", borderRadius: "20px", color: completo ? "#085041" : "#9A5B00", fontSize: "11px", fontWeight: "700", padding: "3px 10px", whiteSpace: "nowrap" }}>
      {completo ? "PERFIL COMPLETO" : "PERFIL PENDIENTE"}
    </span>
  );
}

export function FaltanPerfil({ persona }) {
  if (persona.perfil_completado_en) return null;
  const faltan = faltantesPerfil(persona);
  return (
    <p style={{ color: "#9A5B00", fontSize: "12px", margin: "2px 0 0" }}>
      {faltan.length ? `Falta: ${faltan.join(", ")}` : "Aún no ha confirmado su perfil"}
    </p>
  );
}

// Trae los datos de perfil de las tablas reales (la vista usuarios no los incluye) y los une por id.
export async function datosPerfil(supabase) {
  const cols = "id,telefono,direccion,fecha_nacimiento,documento,perfil_completado_en";
  const [a, e] = await Promise.all([
    supabase.from("administradores").select(cols),
    supabase.from("entrenadores").select(cols),
  ]);
  const mapa = {};
  [...(a.data || []), ...(e.data || [])].forEach((r) => { mapa[r.id] = r; });
  return mapa;
}