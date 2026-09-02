import { useState } from "react";
import {
  registrarConCorreo,
  ADMIN_CODE,
  validarCedulaDominicana,
  formatearCedula,
} from "../supabaseClient";

// Estilo compartido para los inputs
const inputStyle = {
  width: "100%", border: "0.5px solid #2C2C2C", borderRadius: "8px",
  padding: "12px", fontSize: "14px", marginBottom: "12px",
  outline: "none", display: "block", background: "#0B0B0B", color: "#FFFFFF"
};

const labelStyle = {
  fontSize: "11px", fontWeight: "700", color: "#888",
  textTransform: "uppercase", letterSpacing: "0.03em",
  marginBottom: "4px", display: "block"
};

export default function Registro({ onVolver }) {
  const [form, setForm] = useState({
    nombre: "", apellido: "", correo: "", password: "", codigoAdmin: "",
    telefono: "", tipoDocumento: "cedula", documento: "", direccion: "",
  });
  const [esAdmin, setEsAdmin] = useState(false);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleDocumentoChange = (e) => {
    const valor = form.tipoDocumento === "cedula"
      ? formatearCedula(e.target.value)
      : e.target.value;
    setForm({ ...form, documento: valor });
  };

  const handleRegistro = async () => {
    setError("");

    if (!form.nombre || !form.correo || !form.password) {
      setError("Por favor completa todos los campos obligatorios");
      return;
    }

    const soloLetras = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;
    if (!soloLetras.test(form.nombre)) {
      setError("El nombre solo puede contener letras");
      return;
    }
    if (form.apellido && !soloLetras.test(form.apellido)) {
      setError("El apellido solo puede contener letras");
      return;
    }

    const formatoCorreo = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!formatoCorreo.test(form.correo)) {
      setError("El formato del correo no es válido");
      return;
    }

    if (form.password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    if (esAdmin && form.codigoAdmin !== ADMIN_CODE) {
      setError("El código de administrador no es válido");
      return;
    }

    // Campos obligatorios solo para entrenadores
    if (!esAdmin) {
      if (!form.telefono || form.telefono.length !== 10) {
        setError("El teléfono debe tener exactamente 10 dígitos");
        return;
      }
      if (!form.direccion.trim()) {
        setError("La dirección es obligatoria");
        return;
      }
      if (!form.documento.trim()) {
        setError(form.tipoDocumento === "cedula" ? "La cédula es obligatoria" : "El pasaporte es obligatorio");
        return;
      }
      if (form.tipoDocumento === "cedula" && !validarCedulaDominicana(form.documento)) {
        setError("La cédula ingresada no es válida (revisa el número, el dígito verificador no coincide)");
        return;
      }
    }

    setCargando(true);
    const { error: errorRegistro } = await registrarConCorreo({
      nombre: form.nombre,
      apellido: form.apellido,
      email: form.correo,
      password: form.password,
      rol: esAdmin ? "admin" : "coach",
      codigoAdmin: form.codigoAdmin,
      telefono: form.telefono,
      tipoDocumento: form.tipoDocumento,
      documento: form.documento,
      direccion: form.direccion,
    });
    setCargando(false);

    if (errorRegistro) {
      const msg = errorRegistro.message || "";
      if (msg.includes("ya está registrado")) {
        setError(msg);
      } else if (msg.toLowerCase().includes("already registered") || msg.toLowerCase().includes("already exists")) {
        setError("Este correo ya está registrado. Intenta iniciar sesión.");
      } else if (msg.toLowerCase().includes("password")) {
        setError("La contraseña debe tener al menos 6 caracteres");
      } else if (msg.includes("código de administrador")) {
        setError(msg);
      } else if (msg.includes("duplicate key") && msg.includes("documento")) {
        setError("Ya existe un entrenador registrado con ese documento de identidad");
      } else {
        setError("Error al registrarse. Intenta de nuevo.");
      }
    }
    // Si no hay error, onAuthStateChange en App.jsx toma el control:
    // para coach mostrará la pantalla de "pendiente de aprobación",
    // para admin entrará directo (estado ya queda 'activo').
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0B0B0B", display: "flex" }}>

      {/* Panel izquierdo */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "60px 80px", overflowY: "auto" }}>

        <div style={{ marginBottom: "48px" }}>
          <span style={{ fontSize: "28px", fontWeight: "900", color: "#FFFFFF", letterSpacing: "-1px" }}>
            Smart<span style={{ color: "#FFC800" }}>fit</span>
          </span>
        </div>

        <h1 style={{ fontSize: "40px", fontWeight: "900", color: "#FFFFFF", lineHeight: 1.1, marginBottom: "8px" }}>
          CREA TU<br /><span style={{ color: "#FFC800" }}>CUENTA</span>
        </h1>
        <p style={{ color: "#888", fontSize: "15px", marginBottom: "40px" }}>
          Regístrate y conecta con tu gimnasio.
        </p>

        <div style={{ background: "#1A1A1A", border: "0.5px solid #2C2C2C", borderRadius: "12px", padding: "32px" }}>

          {/* Selector de rol */}
          <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
            <button onClick={() => setEsAdmin(false)} style={{
              flex: 1, padding: "10px", borderRadius: "8px", border: "none", cursor: "pointer",
              fontWeight: "700", fontSize: "13px",
              background: !esAdmin ? "#FFC800" : "#2C2C2C",
              color: !esAdmin ? "#0B0B0B" : "#888"
            }}>
              ENTRENADOR
            </button>
            <button onClick={() => setEsAdmin(true)} style={{
              flex: 1, padding: "10px", borderRadius: "8px", border: "none", cursor: "pointer",
              fontWeight: "700", fontSize: "13px",
              background: esAdmin ? "#FFC800" : "#2C2C2C",
              color: esAdmin ? "#0B0B0B" : "#888"
            }}>
              ADMINISTRADOR
            </button>
          </div>

          <p style={{ ...labelStyle, marginBottom: "12px" }}>Datos básicos</p>
          <div style={{ display: "flex", gap: "10px" }}>
            <input name="nombre" placeholder="Nombre *" value={form.nombre}
              onChange={e => {
                const val = e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, "");
                setForm({ ...form, nombre: val });
              }}
              style={{ ...inputStyle }}
            />
            <input name="apellido" placeholder="Apellido" value={form.apellido}
              onChange={e => {
                const val = e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, "");
                setForm({ ...form, apellido: val });
              }}
              style={{ ...inputStyle }}
            />
          </div>
          <input name="correo" type="email" placeholder="Correo electrónico *" value={form.correo} onChange={handleChange} style={inputStyle} />
          <input name="password" type="password" placeholder="Contraseña (mínimo 6 caracteres) *" value={form.password} onChange={handleChange} style={inputStyle} />

          {esAdmin && (
            <input name="codigoAdmin" placeholder="Código de administrador *" value={form.codigoAdmin} onChange={handleChange} style={{ ...inputStyle, borderColor: "#FFC800" }} />
          )}

          {/* Solo para entrenadores */}
          {!esAdmin && (
            <>
              <p style={{ ...labelStyle, marginTop: "8px", marginBottom: "12px" }}>Datos de contacto y verificación</p>

              <input
                name="telefono"
                placeholder="Teléfono * (10 dígitos)"
                value={form.telefono}
                onChange={e => {
                  const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                  setForm({ ...form, telefono: val });
                }}
                style={inputStyle}
              />

              <input
                name="direccion"
                placeholder="Dirección *"
                value={form.direccion}
                onChange={handleChange}
                style={inputStyle}
              />

              <div style={{ display: "flex", gap: "10px" }}>
                <select
                  name="tipoDocumento"
                  value={form.tipoDocumento}
                  onChange={e => setForm({ ...form, tipoDocumento: e.target.value, documento: "" })}
                  style={{ ...inputStyle, flex: "0 0 140px" }}
                >
                  <option value="cedula">Cédula</option>
                  <option value="pasaporte">Pasaporte</option>
                </select>
                <input
                  name="documento"
                  placeholder={form.tipoDocumento === "cedula" ? "001-1234567-8 *" : "Número de pasaporte *"}
                  value={form.documento}
                  onChange={handleDocumentoChange}
                  maxLength={form.tipoDocumento === "cedula" ? 13 : 20}
                  style={{ ...inputStyle, flex: 1 }}
                />
              </div>
              {form.tipoDocumento === "cedula" && (
                <p style={{ color: "#666", fontSize: "11px", marginTop: "-6px", marginBottom: "12px" }}>
                  Se valida el dígito verificador de la cédula dominicana.
                </p>
              )}
            </>
          )}

          {error && (
            <div style={{
              background: "#FFF0F0", border: "0.5px solid #FFCCCC",
              borderRadius: "8px", padding: "12px 16px",
              marginBottom: "16px", display: "flex", alignItems: "flex-start", gap: "10px"
            }}>
              <span style={{ color: "#CC0000", fontSize: "16px", flexShrink: 0 }}>!</span>
              <p style={{ color: "#CC0000", fontSize: "13px", margin: 0, lineHeight: 1.5 }}>{error}</p>
            </div>
          )}

          <button onClick={handleRegistro} disabled={cargando} style={{
            width: "100%", background: "#FFC800", color: "#0B0B0B", fontWeight: "900",
            fontSize: "14px", padding: "14px", borderRadius: "8px", border: "none",
            cursor: "pointer", letterSpacing: "0.5px", opacity: cargando ? 0.6 : 1
          }}>
            {cargando ? "CREANDO CUENTA..." : "CREAR CUENTA"}
          </button>

          <p onClick={onVolver} style={{
            color: "#888", fontSize: "13px", marginTop: "20px",
            textAlign: "center", cursor: "pointer"
          }}>
            ¿Ya tienes cuenta? <span style={{ color: "#FFC800", fontWeight: "700" }}>Inicia sesión</span>
          </p>
        </div>
      </div>

      {/* Panel derecho */}
      <div style={{
        width: "420px", background: "#FFC800", display: "flex",
        flexDirection: "column", justifyContent: "center", alignItems: "center",
        padding: "60px 40px", flexShrink: 0
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{
            width: "120px", height: "120px", background: "#0B0B0B",
            borderRadius: "50%", margin: "0 auto 32px", display: "flex",
            alignItems: "center", justifyContent: "center"
          }}>
            <span style={{ fontSize: "40px", fontWeight: "900", color: "#FFC800" }}>SF</span>
          </div>
          <h2 style={{ fontSize: "32px", fontWeight: "900", color: "#0B0B0B", marginBottom: "16px", lineHeight: 1.1 }}>
            EL GIMNASIO<br />INTELIGENTE.
          </h2>
          <p style={{ color: "#1A1A1A", fontSize: "15px", lineHeight: 1.6 }}>
            Únete a la plataforma que conecta entrenadores.
          </p>
        </div>
      </div>

    </div>
  );
}