import { useState, useEffect } from "react";
import { auth, db, provider } from "../firebase";
import { createUserWithEmailAndPassword, signInWithRedirect, updateProfile, getRedirectResult } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";

const CODIGO_ADMIN = "SF-ADMIN-2026";

function generarCodigo() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let codigo = "COACH-";
  for (let i = 0; i < 4; i++) codigo += chars[Math.floor(Math.random() * chars.length)];
  return codigo;
}

export default function Registro({ onVolver }) {
  const [form, setForm] = useState({ nombre: "", apellido: "", correo: "", password: "", codigoAdmin: "" });
  const [esAdmin, setEsAdmin] = useState(false);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const registrar = async (nombre, apellido, correo, uid, rol) => {
    const datos = {
      nombre, apellido, email: correo,
      rol, creadoEn: new Date(),
    };
    if (rol === "coach") {
      datos.estado = "pendiente";
      datos.codigo = generarCodigo();
    }
    if (rol === "admin") {
      datos.estado = "activo";
    }
    await setDoc(doc(db, "usuarios", uid), datos);
  };

  useEffect(() => {
    getRedirectResult(auth).then(async (result) => {
      if (result?.user) {
        const user = result.user;
        const nombreCompleto = user.displayName?.split(" ") || ["", ""];
        await registrar(nombreCompleto[0], nombreCompleto.slice(1).join(" "), user.email, user.uid, "coach");
      }
    }).catch(() => {});
  }, []);

  const handleRegistro = async () => {
    setError("");
    if (!form.nombre || !form.correo || !form.password) {
      setError("Por favor completa todos los campos obligatorios");
      return;
    }
    if (form.password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }
    if (esAdmin && form.codigoAdmin !== CODIGO_ADMIN) {
      setError("El código de administrador no es válido");
      return;
    }
    setCargando(true);
    try {
      const rol = esAdmin ? "admin" : "coach";
      const cred = await createUserWithEmailAndPassword(auth, form.correo, form.password);
      await updateProfile(cred.user, { displayName: `${form.nombre} ${form.apellido}` });
      await registrar(form.nombre, form.apellido, form.correo, cred.user.uid, rol);
    } catch (e) {
      if (e.code === "auth/email-already-in-use") setError("Este correo ya está registrado");
      else if (e.code === "auth/invalid-email") setError("El correo no es válido");
      else setError("Error al registrarse. Intenta de nuevo.");
      setCargando(false);
    }
  };

  const handleGoogle = async () => {
    try {
      await signInWithRedirect(auth, provider);
    } catch (e) {
      setError("Error al continuar con Google");
    }
  };

  const inputStyle = {
    width: "100%", background: "#2C2C2C", border: "0.5px solid #3C3C3C",
    borderRadius: "8px", padding: "14px", color: "#FFFFFF", fontSize: "14px",
    marginBottom: "10px", outline: "none", display: "block"
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0B0B0B", display: "flex" }}>

      {/* Panel izquierdo */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "60px 80px" }}>

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

          {/* Solo coaches pueden usar Google */}
          {!esAdmin && (
            <>
              <button onClick={handleGoogle} style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: "center",
                gap: "10px", background: "#FFFFFF", color: "#0B0B0B", fontWeight: "700",
                fontSize: "14px", padding: "14px", borderRadius: "8px", border: "none",
                cursor: "pointer", marginBottom: "24px"
              }}>
                <img src="https://www.google.com/favicon.ico" alt="Google" style={{ width: "18px", height: "18px" }} />
                Registrarse con Google
              </button>

              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
                <div style={{ flex: 1, height: "0.5px", background: "#2C2C2C" }} />
                <span style={{ color: "#555", fontSize: "12px" }}>o regístrate con correo</span>
                <div style={{ flex: 1, height: "0.5px", background: "#2C2C2C" }} />
              </div>
            </>
          )}

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

          <div style={{ display: "flex", gap: "10px" }}>
            <input name="nombre" placeholder="Nombre *" value={form.nombre} onChange={handleChange} style={inputStyle} />
            <input name="apellido" placeholder="Apellido" value={form.apellido} onChange={handleChange} style={inputStyle} />
          </div>
          <input name="correo" type="email" placeholder="Correo electrónico *" value={form.correo} onChange={handleChange} style={inputStyle} />
          <input name="password" type="password" placeholder="Contraseña (mínimo 6 caracteres) *" value={form.password} onChange={handleChange} style={inputStyle} />

          {esAdmin && (
            <input name="codigoAdmin" placeholder="Código de administrador *" value={form.codigoAdmin} onChange={handleChange} style={{ ...inputStyle, borderColor: "#FFC800" }} />
          )}

          {error && <p style={{ color: "#FF4444", fontSize: "13px", marginBottom: "12px" }}>{error}</p>}

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
            Únete a la plataforma que conecta entrenadores con su gimnasio.
          </p>
        </div>
      </div>

    </div>
  );
}