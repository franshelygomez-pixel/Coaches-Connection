import { useState } from "react";
import {
  formatearCedula,
  registrarConCorreo,
  traducirErrorSupabase,
  validarCedulaDominicana,
} from "../supabaseClient";
import { normalizarRol } from "../utils/permisos";
import { normalizarCodigoCliente, normalizarCodigoInvitacion } from "../utils/seguridad";

const campo = {
  width: "100%", background: "#2C2C2C", border: "0.5px solid #3C3C3C",
  borderRadius: "10px", boxSizing: "border-box", color: "#FFF", display: "block",
  fontSize: "14px", outline: "none", padding: "13px 14px",
};

const resaltar = (evento) => { evento.target.style.borderColor = "#E11D2E"; };
const atenuar = (evento) => { evento.target.style.borderColor = "#3C3C3C"; };

const Seccion = ({ titulo }) => (
  <p style={{ color: "#FF5A64", fontSize: "11px", fontWeight: "800", letterSpacing: "1.5px", margin: "22px 0 12px", textTransform: "uppercase" }}>{titulo}</p>
);

const Etiqueta = ({ htmlFor, texto, obligatorio = false }) => (
  <label htmlFor={htmlFor} style={{ color: "#BBB", display: "block", fontSize: "12px", marginBottom: "6px" }}>
    {texto}{obligatorio && <span aria-hidden="true" style={{ color: "#FF5A64" }}> *</span>}
  </label>
);

const OPCIONES_ROL = [
  ["coach", "Entrenador"],
  ["cliente", "Cliente"],
  ["admin", "Administrador"],
];

const inicial = {
  nombre: "", apellido: "", correo: "", password: "", telefono: "",
  rol: "coach", tipoDocumento: "cedula", documento: "", direccion: "",
  codigoInvitacionAdmin: "", codigoInvitacionCliente: "",
};

export default function Registro({ onVolver }) {
  const [form, setForm] = useState(inicial);
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");
  const [cargando, setCargando] = useState(false);
  const modoAdmin = form.rol === "admin";
  const modoCliente = form.rol === "cliente";

  const cambiar = ({ target: { name, value } }) => {
    setForm((actual) => ({ ...actual, [name]: value }));
  };

  const validar = () => {
    const soloLetras = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/;
    const correoValido = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    if (!form.correo.trim() || !form.password || (!modoCliente && !form.nombre.trim())) {
      return "Completa todos los campos obligatorios.";
    }
    if (!normalizarRol(form.rol)) return "Selecciona un tipo de cuenta válido.";
    if (form.rol === "admin" && !form.codigoInvitacionAdmin.trim()) {
      return "Escribe el código de invitación administrativa.";
    }
    if (form.rol === "cliente" && !form.codigoInvitacionCliente.trim()) {
      return "Escribe el código de invitación de cliente.";
    }
    if (!correoValido.test(form.correo.trim())) return "El correo no tiene un formato válido.";
    if (form.password.length < 8) return "La contraseña debe tener al menos 8 caracteres.";
    if (modoCliente) return "";
    if (!soloLetras.test(form.nombre.trim())) return "El nombre solamente puede contener letras.";
    if (form.apellido.trim() && !soloLetras.test(form.apellido.trim())) return "El apellido solamente puede contener letras.";
    if (form.telefono.length !== 10) return "El teléfono debe tener exactamente 10 dígitos.";
    if (!form.direccion.trim()) return "La dirección es obligatoria.";
    if (!form.documento.trim()) return "El documento de identidad es obligatorio.";
    if (form.tipoDocumento === "cedula" && !validarCedulaDominicana(form.documento)) {
      return "La cédula ingresada no es válida.";
    }
    return "";
  };

  const enviar = async (evento) => {
    evento.preventDefault();
    setError("");
    setExito("");

    const errorFormulario = validar();
    if (errorFormulario) {
      setError(errorFormulario);
      return;
    }

    setCargando(true);
    const { data, error: errorRegistro } = await registrarConCorreo({
      nombre: form.nombre,
      apellido: form.apellido,
      email: form.correo,
      password: form.password,
      rol: form.rol,
      telefono: form.telefono,
      tipoDocumento: form.tipoDocumento,
      documento: form.documento,
      direccion: form.direccion,
      codigoInvitacionAdmin: form.codigoInvitacionAdmin,
      codigoInvitacionCliente: normalizarCodigoCliente(form.codigoInvitacionCliente),
    });
    setCargando(false);

    if (errorRegistro) {
      setError(traducirErrorSupabase(errorRegistro, "registro"));
      return;
    }

    const tipoCuenta = form.rol === "admin" ? "administrador" : form.rol === "cliente" ? "cliente" : "entrenador";
    setExito(data?.session
      ? form.rol === "cliente"
        ? "Cuenta de cliente creada. Ya puedes acceder al portal."
        : `Solicitud de ${tipoCuenta} creada. Espera la aprobación institucional.`
      : `Cuenta de ${tipoCuenta} creada. Confirma tu correo antes de iniciar sesión.`
    );
    setForm({ ...inicial, rol: form.rol });
  };

  const rejilla = { display: "grid", gap: "14px", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" };

  return (
    <main className="auth-shell" style={{ minHeight: "100vh", background: "#0B0B0B", display: "flex" }}>
      <section className="auth-main" style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: "48px clamp(20px, 5vw, 64px)" }}>
        <div style={{ maxWidth: "760px", width: "100%" }}>
        <div style={{ marginBottom: "36px" }}>
          <span style={{ fontSize: "28px", fontWeight: "900", color: "#FFF", letterSpacing: "-1px" }}>
            Fit<span style={{ color: "#FF5A64" }}>trainer</span>
          </span>
        </div>
        <h1 style={{ color: "#FFF", fontSize: "44px", fontWeight: "900", lineHeight: 1.1, margin: "0 0 10px" }}>
          CREA TU <span style={{ color: "#FF5A64" }}>CUENTA</span>
        </h1>
        <p style={{ color: "#888", fontSize: "15px", margin: "0 0 28px" }}>
          {modoAdmin
            ? "Registra una cuenta administrativa mediante una invitación institucional."
            : modoCliente
              ? "Activa el portal usando el código enviado por el administrador."
              : "Envía tu solicitud de acceso como entrenador."}
        </p>

        <form onSubmit={enviar} style={{ background: "#1A1A1A", border: "0.5px solid #2C2C2C", borderRadius: "12px", maxWidth: "760px", padding: "clamp(20px, 4vw, 32px)", width: "100%", boxSizing: "border-box" }}>
          <div role="group" aria-label="Seleccionar tipo de cuenta" style={{ background: "#0B0B0B", border: "0.5px solid #333", borderRadius: "999px", display: "flex", flexWrap: "wrap", gap: "4px", marginBottom: "16px", padding: "4px" }}>
            {OPCIONES_ROL.map(([valor, etiqueta]) => {
              const activo = form.rol === valor;
              return (
                <button
                  key={valor}
                  type="button"
                  aria-pressed={activo}
                  onClick={() => {
                    setError("");
                    setExito("");
                    setForm((actual) => ({ ...actual, rol: valor, codigoInvitacionAdmin: "", codigoInvitacionCliente: "" }));
                  }}
                  style={{
                    background: activo ? "#E11D2E" : "transparent", border: "none", borderRadius: "999px",
                    color: activo ? "#FFFFFF" : "#BBB", cursor: "pointer", flex: "1 1 140px",
                    fontSize: "13px", fontWeight: activo ? "800" : "600", padding: "11px 14px",
                  }}
                >
                  {etiqueta}
                </button>
              );
            })}
          </div>

          <p style={{ background: "rgba(225, 29, 46, 0.1)", borderLeft: "3px solid #E11D2E", borderRadius: "0 8px 8px 0", color: "#FFB3BA", fontSize: "12px", lineHeight: 1.5, margin: 0, padding: "11px 14px" }}>
            {modoAdmin
              ? "El código debe haber sido generado por un administrador activo y corresponder a este correo."
              : modoCliente
                ? "Utiliza exactamente el mismo correo registrado por el administrador."
                : "Las solicitudes de entrenadores deben ser aprobadas por la institución antes de acceder."}
          </p>

          {modoAdmin && (
            <>
              <Seccion titulo="Invitación" />
              <Etiqueta htmlFor="registro-codigo-admin" texto="Código de invitación administrativa" obligatorio />
              <input id="registro-codigo-admin" aria-label="Código de invitación administrativa" name="codigoInvitacionAdmin" autoComplete="one-time-code" placeholder="Pega aquí el código" value={form.codigoInvitacionAdmin}
                onChange={(evento) => setForm((actual) => ({ ...actual, codigoInvitacionAdmin: normalizarCodigoInvitacion(evento.target.value) }))}
                onFocus={resaltar} onBlur={atenuar} style={campo} />
            </>
          )}
          {modoCliente && (
            <>
              <Seccion titulo="Invitación" />
              <Etiqueta htmlFor="registro-codigo-cliente" texto="Código de invitación del cliente" obligatorio />
              <input id="registro-codigo-cliente" aria-label="Código de invitación de cliente" name="codigoInvitacionCliente" autoComplete="one-time-code" placeholder="CLI-XXXXXX" value={form.codigoInvitacionCliente}
                onChange={(evento) => setForm((actual) => ({ ...actual, codigoInvitacionCliente: evento.target.value.replace(/[^a-zA-Z0-9-]/g, "").toUpperCase().slice(0, 20) }))}
                onFocus={resaltar} onBlur={atenuar} style={campo} />
            </>
          )}

          {!modoCliente && (
            <>
              <Seccion titulo="Datos personales" />
              <div style={rejilla}>
                <div>
                  <Etiqueta htmlFor="registro-nombre" texto="Nombre" obligatorio />
                  <input id="registro-nombre" aria-label="Nombre" name="nombre" autoComplete="given-name" value={form.nombre} onChange={cambiar} onFocus={resaltar} onBlur={atenuar} style={campo} />
                </div>
                <div>
                  <Etiqueta htmlFor="registro-apellido" texto="Apellido" />
                  <input id="registro-apellido" aria-label="Apellido" name="apellido" autoComplete="family-name" value={form.apellido} onChange={cambiar} onFocus={resaltar} onBlur={atenuar} style={campo} />
                </div>
                <div>
                  <Etiqueta htmlFor="registro-telefono" texto="Teléfono (10 dígitos)" obligatorio />
                  <input id="registro-telefono" aria-label="Teléfono" name="telefono" inputMode="numeric" autoComplete="tel" placeholder="8090000000" value={form.telefono}
                    onChange={(evento) => setForm((actual) => ({ ...actual, telefono: evento.target.value.replace(/\D/g, "").slice(0, 10) }))}
                    onFocus={resaltar} onBlur={atenuar} style={campo} />
                </div>
                <div>
                  <Etiqueta htmlFor="registro-direccion" texto="Dirección" obligatorio />
                  <input id="registro-direccion" aria-label="Dirección" name="direccion" autoComplete="street-address" value={form.direccion} onChange={cambiar} onFocus={resaltar} onBlur={atenuar} style={campo} />
                </div>
              </div>
            </>
          )}

          <Seccion titulo="Acceso a la cuenta" />
          <div style={rejilla}>
            <div>
              <Etiqueta htmlFor="registro-correo" texto="Correo electrónico" obligatorio />
              <input id="registro-correo" aria-label="Correo electrónico" name="correo" type="email" autoComplete="email" placeholder="nombre@correo.com" value={form.correo} onChange={cambiar} onFocus={resaltar} onBlur={atenuar} style={campo} />
            </div>
            <div>
              <Etiqueta htmlFor="registro-password" texto="Contraseña (mínimo 8 caracteres)" obligatorio />
              <input id="registro-password" aria-label="Contraseña" name="password" type="password" minLength={8} autoComplete="new-password" value={form.password} onChange={cambiar} onFocus={resaltar} onBlur={atenuar} style={campo} />
            </div>
          </div>

          {!modoCliente && (
            <>
              <Seccion titulo="Documento de identidad" />
              <div role="group" aria-label="Tipo de documento" style={{ background: "#0B0B0B", border: "0.5px solid #333", borderRadius: "999px", display: "inline-flex", gap: "4px", marginBottom: "14px", padding: "4px" }}>
                {[["cedula", "Cédula"], ["pasaporte", "Pasaporte"]].map(([valor, etiqueta]) => {
                  const activo = form.tipoDocumento === valor;
                  return (
                    <button key={valor} type="button" aria-pressed={activo}
                      onClick={() => setForm((actual) => ({ ...actual, tipoDocumento: valor, documento: "" }))}
                      style={{ background: activo ? "#E11D2E" : "transparent", border: "none", borderRadius: "999px", color: activo ? "#FFFFFF" : "#BBB", cursor: "pointer", fontSize: "13px", fontWeight: activo ? "800" : "600", padding: "8px 18px" }}>
                      {etiqueta}
                    </button>
                  );
                })}
              </div>
              <Etiqueta htmlFor="registro-documento" texto={form.tipoDocumento === "cedula" ? "Número de cédula" : "Número de pasaporte"} obligatorio />
              <input id="registro-documento" aria-label="Documento de identidad" name="documento" value={form.documento}
                placeholder={form.tipoDocumento === "cedula" ? "001-1234567-8" : "Pasaporte"}
                onChange={(evento) => setForm((actual) => ({ ...actual, documento: form.tipoDocumento === "cedula" ? formatearCedula(evento.target.value) : evento.target.value.slice(0, 20) }))}
                onFocus={resaltar} onBlur={atenuar} style={campo} />
            </>
          )}

          {error && <p role="alert" style={{ background: "rgba(255, 107, 107, 0.1)", border: "1px solid rgba(255, 107, 107, 0.35)", borderRadius: "8px", color: "#FF8A8A", fontSize: "13px", margin: "18px 0 0", padding: "11px 14px" }}>{error}</p>}
          {exito && <p role="status" style={{ background: "#EEFFF3", borderRadius: "8px", color: "#126B2D", fontSize: "13px", margin: "18px 0 0", padding: "11px 14px" }}>{exito}</p>}

          <button type="submit" disabled={cargando} style={{ width: "100%", background: "#E11D2E", border: 0, borderRadius: "8px", color: "#FFFFFF", cursor: cargando ? "default" : "pointer", fontSize: "14px", fontWeight: "900", letterSpacing: "0.5px", marginTop: "24px", opacity: cargando ? 0.65 : 1, padding: "14px" }}>
            {cargando ? "CREANDO CUENTA..." : "CREAR CUENTA"}
          </button>
          <button type="button" onClick={onVolver} style={{ width: "100%", background: "none", border: 0, color: "#888", cursor: "pointer", fontSize: "13px", marginTop: "18px", textAlign: "center" }}>
            ¿Ya tienes cuenta? <span style={{ color: "#FF5A64", fontWeight: "700" }}>Inicia sesión</span>
          </button>
        </form>
        </div>
      </section>

      <aside className="auth-aside" style={{ width: "420px", background: "#E11D2E", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: "60px 40px", flexShrink: 0 }}>
        <div style={{ textAlign: "center" }}>
          <img src={`${import.meta.env.BASE_URL}logo.png`} alt="Logo de Fittrainer" width="150" height="150" style={{ display: "block", height: "150px", margin: "0 auto 32px", width: "150px" }} />
          <h2 style={{ fontSize: "32px", fontWeight: "900", color: "#FFFFFF", marginBottom: "16px", lineHeight: 1.1 }}>
            EL GIMNASIO<br />INTELIGENTE.
          </h2>
          <p style={{ color: "#FFFFFF", fontSize: "15px", lineHeight: 1.6 }}>
            Gestiona entrenadores, clientes y rutinas desde un solo lugar.
          </p>
        </div>
      </aside>
    </main>
  );
}