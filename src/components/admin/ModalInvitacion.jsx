import { useState } from "react";
import { invitarUsuario } from "../../utils/invitaciones";
import { normalizarCorreo } from "../../utils/validaciones";

const estiloCampo = { background: "#FAFAFA", border: "1px solid #E5E5E5", borderRadius: "10px", boxSizing: "border-box", color: "#0B0B0B", fontSize: "14px", outline: "none", padding: "12px 14px", width: "100%" };
const etiquetaCampo = { color: "#666", display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "6px" };
const etiquetaSeccion = { color: "#E11D2E", fontSize: "11px", fontWeight: "800", letterSpacing: "1.5px", margin: "22px 0 12px", textTransform: "uppercase" };
const resaltar = (evento) => { evento.target.style.borderColor = "#E11D2E"; };
const atenuar = (evento) => { evento.target.style.borderColor = "#E5E5E5"; };

const TEXTOS = {
  coach: { titulo: "Nuevo entrenador", persona: "el entrenador" },
  admin: { titulo: "Nuevo administrador", persona: "el administrador" },
};

// Mismo diseño que "Nuevo cliente": se completan los datos y se envía la invitación por correo.
export default function ModalInvitacion({ rol, onCerrar, onEnviada }) {
  const textos = TEXTOS[rol] || TEXTOS.coach;
  const [formulario, setFormulario] = useState({ nombre: "", apellido: "", email: "" });
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const cambiar = (campo) => (evento) => setFormulario((actual) => ({ ...actual, [campo]: evento.target.value }));

  const enviar = async (evento) => {
    evento.preventDefault();
    setError("");
    const email = normalizarCorreo(formulario.email);
    if (!formulario.nombre.trim()) {
      setError("Escribe el nombre.");
      return;
    }
    if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) {
      setError("Escribe un correo válido.");
      return;
    }
    setEnviando(true);
    const { error: errorInvitacion } = await invitarUsuario({
      rol, email, nombre: formulario.nombre.trim(), apellido: formulario.apellido.trim(),
    });
    setEnviando(false);
    if (errorInvitacion) {
      setError(errorInvitacion);
      return;
    }
    onEnviada?.(email);
  };

  return (
    <div role="dialog" aria-modal="true" aria-label={textos.titulo} style={{ alignItems: "center", background: "rgba(11,11,11,0.45)", display: "flex", inset: 0, justifyContent: "center", padding: "16px", position: "fixed", zIndex: 80 }}>
      <form onSubmit={enviar} style={{ background: "#FFFFFF", border: "0.5px solid #E5E5E5", borderRadius: "12px", boxSizing: "border-box", maxHeight: "90vh", maxWidth: "640px", overflowY: "auto", padding: "28px", width: "100%" }}>
        <p style={etiquetaSeccion}>Registro</p>
        <h4 style={{ color: "#0B0B0B", fontSize: "22px", fontWeight: "900", margin: "0 0 4px" }}>{textos.titulo}</h4>
        <p style={{ color: "#888", fontSize: "13px", margin: "0 0 4px" }}>Completa los datos y se le enviará la invitación.</p>

        <p style={etiquetaSeccion}>Datos personales</p>
        <div style={{ display: "grid", gap: "14px", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
          <div>
            <label htmlFor="invitado-nombre" style={etiquetaCampo}>Nombre *</label>
            <input id="invitado-nombre" required placeholder="Nombre" value={formulario.nombre} onChange={cambiar("nombre")} onFocus={resaltar} onBlur={atenuar} style={estiloCampo} />
          </div>
          <div>
            <label htmlFor="invitado-apellido" style={etiquetaCampo}>Apellido</label>
            <input id="invitado-apellido" placeholder="Apellido" value={formulario.apellido} onChange={cambiar("apellido")} onFocus={resaltar} onBlur={atenuar} style={estiloCampo} />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label htmlFor="invitado-correo" style={etiquetaCampo}>Correo electrónico *</label>
            <input id="invitado-correo" required type="email" placeholder="nombre@correo.com" value={formulario.email} onChange={cambiar("email")} onFocus={resaltar} onBlur={atenuar} style={estiloCampo} />
          </div>
        </div>

        <p style={etiquetaSeccion}>Acceso</p>
        <div style={{ background: "#FAFAFA", border: "0.5px solid #E5E5E5", borderRadius: "12px", padding: "14px 16px" }}>
          <p style={{ color: "#888", fontSize: "12px", lineHeight: 1.5, margin: 0 }}>
            Se enviará un correo a {formulario.email.trim() || `${textos.persona}`} con un enlace para crear su contraseña. La invitación vence a los 7 días.
          </p>
        </div>

        {error && <p role="alert" style={{ background: "#FFF0F0", borderRadius: "8px", color: "#B00020", fontSize: "13px", margin: "18px 0 0", padding: "12px" }}>{error}</p>}

        <div style={{ borderTop: "0.5px solid #E5E5E5", display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "24px", paddingTop: "18px" }}>
          <button type="button" onClick={onCerrar} style={{ background: "#FFFFFF", border: "1px solid #D5D5D5", borderRadius: "999px", color: "#333", cursor: "pointer", fontSize: "13px", fontWeight: "800", padding: "11px 22px" }}>Cancelar</button>
          <button type="submit" disabled={enviando} style={{ background: "#0B0B0B", border: 0, borderRadius: "999px", color: "#FFFFFF", cursor: "pointer", fontSize: "13px", fontWeight: "800", opacity: enviando ? 0.6 : 1, padding: "11px 26px" }}>{enviando ? "Enviando..." : "Enviar invitación"}</button>
        </div>
      </form>
    </div>
  );
}
