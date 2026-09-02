import { useState } from "react";
import { iniciarSesionConCorreo } from "../supabaseClient";
import Registro from "./Registro";

export default function Login({ mensajeError = "" }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(mensajeError);
  const [verRegistro, setVerRegistro] = useState(false);
  const [cargando, setCargando] = useState(false);

  if (verRegistro) return <Registro onVolver={() => setVerRegistro(false)} />;

  // Sirve tanto para admin como para coaches: ambos se registran y entran
  // por correo/contraseña. App.jsx decide qué pantalla mostrar después
  // según el rol y estado guardados en la fila de `usuarios`.
  const handleLogin = async () => {
    setError("");
    if (!email || !password) {
      setError("Completa todos los campos");
      return;
    }
    setCargando(true);
    const { error } = await iniciarSesionConCorreo(email, password);
    setCargando(false);
    if (error) setError("Correo o contraseña incorrectos");
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0B0B0B", display: "flex" }}>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "60px 80px" }}>

        <div style={{ marginBottom: "60px" }}>
          <span style={{ fontSize: "28px", fontWeight: "900", color: "#FFFFFF", letterSpacing: "-1px" }}>
            Smart<span style={{ color: "#FFC800" }}>fit</span>
          </span>
        </div>

        <h1 style={{ fontSize: "48px", fontWeight: "900", color: "#FFFFFF", lineHeight: 1.1, marginBottom: "12px" }}>
          GESTIONA TU<br />
          <span style={{ color: "#FFC800" }}>GIMNASIO</span>
        </h1>
        <p style={{ color: "#888", fontSize: "15px", marginBottom: "48px" }}>
          La plataforma de gestión para entrenadores y administradores.
        </p>

        <div style={{ background: "#1A1A1A", border: "0.5px solid #2C2C2C", borderRadius: "12px", padding: "32px" }}>

          <input type="email" placeholder="Correo electrónico" value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              width: "100%", background: "#2C2C2C", border: "0.5px solid #3C3C3C",
              borderRadius: "8px", padding: "14px", color: "#FFFFFF", fontSize: "14px",
              marginBottom: "10px", outline: "none", display: "block"
            }} />
          <input type="password" placeholder="Contraseña" value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              width: "100%", background: "#2C2C2C", border: "0.5px solid #3C3C3C",
              borderRadius: "8px", padding: "14px", color: "#FFFFFF", fontSize: "14px",
              marginBottom: "16px", outline: "none", display: "block"
            }} />

          {error && <p style={{ color: "#FF4444", fontSize: "13px", marginBottom: "12px" }}>{error}</p>}

          <button onClick={handleLogin} disabled={cargando} style={{
            width: "100%", background: "#FFC800", color: "#0B0B0B", fontWeight: "900",
            fontSize: "14px", padding: "14px", borderRadius: "8px", border: "none",
            cursor: cargando ? "default" : "pointer", letterSpacing: "0.5px", opacity: cargando ? 0.7 : 1
          }}>
            {cargando ? "INGRESANDO..." : "INICIAR SESION"}
          </button>

          <p onClick={() => setVerRegistro(true)} style={{
            color: "#888", fontSize: "13px", marginTop: "20px",
            textAlign: "center", cursor: "pointer"
          }}>
            ¿No tienes cuenta? <span style={{ color: "#FFC800", fontWeight: "700" }}>Regístrate</span>
          </p>
        </div>
      </div>

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
            Gestiona entrenadores, clientes y rutinas desde un solo lugar.
          </p>
        </div>
      </div>

    </div>
  );
}