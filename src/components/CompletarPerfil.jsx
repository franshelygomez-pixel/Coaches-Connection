import { useState } from "react";
import { supabase, traducirErrorSupabase } from "../supabaseClient";

const estiloCampo = { background: "#2C2C2C", border: "0.5px solid #3C3C3C", borderRadius: "8px", boxSizing: "border-box", colorScheme: "dark", color: "#FFFFFF", display: "block", fontSize: "14px", outline: "none", padding: "14px", width: "100%" };
const etiqueta = { color: "#CCC", display: "block", fontSize: "12px", marginBottom: "6px" };

const formatearCedula = (valor) => {
  const d = valor.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 10) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 10)}-${d.slice(10)}`;
};

const hoy = () => new Date().toISOString().slice(0, 10);

// Se muestra una sola vez, después de aceptar la invitación, a clientes, entrenadores y administradores.
export default function CompletarPerfil({ nombre, telefonoInicial, onListo }) {
  const [formulario, setFormulario] = useState({
    telefono: `${telefonoInicial || ""}`.replace(/\D/g, "").slice(0, 10),
    direccion: "",
    fechaNacimiento: "",
    tipoDocumento: "cedula",
    documento: "",
  });
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const cambiar = (campo, valor) => setFormulario((actual) => ({ ...actual, [campo]: valor }));

  const cambiarTipo = (tipo) => setFormulario((actual) => ({ ...actual, tipoDocumento: tipo, documento: "" }));

  const guardar = async (evento) => {
    evento.preventDefault();
    setError("");
    if (formulario.telefono.length !== 10) { setError("El teléfono debe tener 10 dígitos."); return; }
    if (formulario.direccion.trim().length < 5) { setError("Escribe tu dirección completa."); return; }
    if (!formulario.fechaNacimiento || formulario.fechaNacimiento > hoy()) { setError("Escribe una fecha de nacimiento válida."); return; }
    const soloCedula = formulario.documento.replace(/\D/g, "");
    if (formulario.tipoDocumento === "cedula" && soloCedula.length !== 11) { setError("La cédula debe tener 11 dígitos."); return; }
    if (formulario.tipoDocumento === "pasaporte" && formulario.documento.length < 6) { setError("El pasaporte debe tener al menos 6 caracteres."); return; }

    setGuardando(true);
    const { error: errorGuardado } = await supabase.rpc("completar_mi_perfil", {
      p_telefono: formulario.telefono,
      p_direccion: formulario.direccion.trim(),
      p_fecha_nacimiento: formulario.fechaNacimiento,
      p_tipo_documento: formulario.tipoDocumento,
      p_documento: formulario.documento,
    });
    setGuardando(false);
    if (errorGuardado) {
      console.error("No se pudo guardar el perfil:", errorGuardado);
      setError(errorGuardado.message?.length < 120 && !errorGuardado.code?.startsWith("PGRST") ? errorGuardado.message : traducirErrorSupabase(errorGuardado));
      return;
    }
    onListo();
  };

  return (
    <main style={{ alignItems: "center", background: "#0B0B0B", display: "flex", justifyContent: "center", minHeight: "100vh", padding: "24px" }}>
      <div style={{ width: "100%", maxWidth: "560px" }}>
        <div style={{ marginBottom: "28px", textAlign: "center" }}>
          <span style={{ color: "#FFFFFF", fontSize: "28px", fontWeight: "900", letterSpacing: "-1px" }}>
            Fit<span style={{ color: "#FF5A64" }}>trainer</span>
          </span>
        </div>
        <form onSubmit={guardar} style={{ background: "#1A1A1A", border: "0.5px solid #2C2C2C", borderRadius: "12px", padding: "32px" }}>
          <h1 style={{ color: "#FFFFFF", fontSize: "24px", fontWeight: "900", margin: "0 0 8px" }}>
            Completa tu perfil{nombre ? `, ${nombre}` : ""}
          </h1>
          <p style={{ color: "#888", fontSize: "13px", lineHeight: 1.6, margin: "0 0 24px" }}>
            Necesitamos unos datos más para terminar de crear tu cuenta. Solo los administradores del gimnasio pueden verlos.
          </p>

          <div style={{ display: "grid", gap: "14px", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
            <div>
              <label htmlFor="perfil-telefono" style={etiqueta}>Teléfono *</label>
              <input id="perfil-telefono" inputMode="numeric" maxLength={10} placeholder="10 dígitos" autoComplete="tel" value={formulario.telefono}
                onChange={(e) => cambiar("telefono", e.target.value.replace(/\D/g, ""))} style={estiloCampo} />
            </div>
            <div>
              <label htmlFor="perfil-nacimiento" style={etiqueta}>Fecha de nacimiento *</label>
              <input id="perfil-nacimiento" type="date" min="1900-01-01" max={hoy()} autoComplete="bday" value={formulario.fechaNacimiento}
                onChange={(e) => cambiar("fechaNacimiento", e.target.value)} style={estiloCampo} />
            </div>
          </div>

          <label htmlFor="perfil-direccion" style={{ ...etiqueta, marginTop: "14px" }}>Dirección *</label>
          <input id="perfil-direccion" placeholder="Calle, número, sector y ciudad" autoComplete="street-address" value={formulario.direccion}
            onChange={(e) => cambiar("direccion", e.target.value)} style={estiloCampo} />

          <p style={{ ...etiqueta, margin: "14px 0 6px" }}>Documento de identidad *</p>
          <div role="group" aria-label="Tipo de documento" style={{ background: "#2C2C2C", borderRadius: "999px", display: "inline-flex", gap: "4px", marginBottom: "10px", padding: "4px" }}>
            {[["cedula", "Cédula"], ["pasaporte", "Pasaporte"]].map(([valor, texto]) => {
              const activo = formulario.tipoDocumento === valor;
              return (
                <button key={valor} type="button" aria-pressed={activo} onClick={() => cambiarTipo(valor)}
                  style={{ background: activo ? "#FFFFFF" : "transparent", border: "none", borderRadius: "999px", color: activo ? "#0B0B0B" : "#BBB", cursor: "pointer", fontSize: "13px", fontWeight: activo ? "800" : "600", padding: "8px 18px" }}>
                  {texto}
                </button>
              );
            })}
          </div>
          <input aria-label={formulario.tipoDocumento === "cedula" ? "Número de cédula" : "Número de pasaporte"}
            inputMode={formulario.tipoDocumento === "cedula" ? "numeric" : "text"}
            placeholder={formulario.tipoDocumento === "cedula" ? "000-0000000-0" : "Número de pasaporte"}
            maxLength={formulario.tipoDocumento === "cedula" ? 13 : 20}
            value={formulario.documento}
            onChange={(e) => cambiar("documento", formulario.tipoDocumento === "cedula"
              ? formatearCedula(e.target.value)
              : e.target.value.replace(/[^A-Za-z0-9]/g, "").toUpperCase())}
            style={estiloCampo} />

          {error && <p role="alert" style={{ color: "#FF6666", fontSize: "13px", margin: "16px 0 0" }}>{error}</p>}

          <button type="submit" disabled={guardando}
            style={{ background: "#FFFFFF", border: "none", borderRadius: "8px", color: "#0B0B0B", cursor: guardando ? "default" : "pointer", fontSize: "14px", fontWeight: "900", letterSpacing: "0.5px", marginTop: "22px", opacity: guardando ? 0.7 : 1, padding: "14px", width: "100%" }}>
            {guardando ? "GUARDANDO..." : "GUARDAR Y ENTRAR"}
          </button>
          <button type="button" onClick={() => supabase.auth.signOut()}
            style={{ background: "none", border: 0, color: "#888", cursor: "pointer", fontSize: "12px", marginTop: "14px", width: "100%" }}>
            Cerrar sesión
          </button>
        </form>
      </div>
    </main>
  );
}