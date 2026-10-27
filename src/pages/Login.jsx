import { useState } from "react";
import {
  enviarRecuperacionContrasena,
  iniciarSesionConCorreo,
  traducirErrorSupabase,
} from "../supabaseClient";

export default function Login({ mensajeError = "" }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(mensajeError);
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState("");

  // Sirve para todos los roles; las cuentas se crean por invitación.
  // Se entra por correo/contraseña. App.jsx decide qué pantalla mostrar después
  // según el rol y estado guardados en la fila de `usuarios`.
  const handleLogin = async () => {
    setError("");
    setMensaje("");
    if (!email || !password) {
      setError("Completa todos los campos");
      return;
    }
    setCargando(true);
    const { error } = await iniciarSesionConCorreo(email, password);
    setCargando(false);
    if (error) setError(traducirErrorSupabase(error, "login"));
  };

  const recuperarContrasena = async () => {
    setError("");
    setMensaje("");
    if (!email.trim()) {
      setError("Escribe tu correo para recuperar la contraseña.");
      return;
    }
    setCargando(true);
    const { error } = await enviarRecuperacionContrasena(email);
    setCargando(false);
    if (error) setError(traducirErrorSupabase(error));
    else setMensaje("Si el correo está registrado, recibirás un enlace para cambiar la contraseña.");
  };

  return (
    <main className="auth-shell" style={{ minHeight: "100vh", background: "#0B0B0B", display: "flex" }}>

      <section className="auth-main" style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "60px 80px" }}>

        <div style={{ marginBottom: "60px" }}>
          <span style={{ fontSize: "28px", fontWeight: "900", color: "#FFFFFF", letterSpacing: "-1px" }}>
            Fit<span style={{ color: "#FF5A64" }}>trainer</span>
          </span>
        </div>

        <h1 style={{ fontSize: "48px", fontWeight: "900", color: "#FFFFFF", lineHeight: 1.1, marginBottom: "12px" }}>
          GESTIONA TU<br />
          <span style={{ color: "#FF5A64" }}>GIMNASIO</span>
        </h1>
        <p style={{ color: "#888", fontSize: "15px", marginBottom: "48px" }}>
          La plataforma de gestión para entrenadores y administradores.
        </p>

        <form onSubmit={(evento) => { evento.preventDefault(); void handleLogin(); }} style={{ background: "#1A1A1A", border: "0.5px solid #2C2C2C", borderRadius: "12px", padding: "32px" }}>

          <label htmlFor="correo-login" style={{ color: "#CCC", display: "block", fontSize: "12px", marginBottom: "6px" }}>Correo electrónico</label>
          <input id="correo-login" type="email" autoComplete="email" placeholder="Correo electrónico" value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              width: "100%", background: "#2C2C2C", border: "0.5px solid #3C3C3C",
              borderRadius: "8px", padding: "14px", color: "#FFFFFF", fontSize: "14px",
              marginBottom: "10px", outline: "none", display: "block"
            }} />
          <label htmlFor="password-login" style={{ color: "#CCC", display: "block", fontSize: "12px", marginBottom: "6px" }}>Contraseña</label>
          <input id="password-login" type="password" autoComplete="current-password" placeholder="Contraseña" value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              width: "100%", background: "#2C2C2C", border: "0.5px solid #3C3C3C",
              borderRadius: "8px", padding: "14px", color: "#FFFFFF", fontSize: "14px",
              marginBottom: "16px", outline: "none", display: "block"
            }} />

          {error && <p role="alert" style={{ color: "#FF6666", fontSize: "13px", marginBottom: "12px" }}>{error}</p>}
          {mensaje && <p role="status" style={{ color: "#BDEBC9", fontSize: "13px", marginBottom: "12px" }}>{mensaje}</p>}

          <button type="submit" disabled={cargando} style={{
            width: "100%", background: "#FFFFFF", color: "#0B0B0B", fontWeight: "900",
            fontSize: "14px", padding: "14px", borderRadius: "8px", border: "none",
            cursor: cargando ? "default" : "pointer", letterSpacing: "0.5px", opacity: cargando ? 0.7 : 1
          }}>
            {cargando ? "INGRESANDO..." : "INICIAR SESION"}
          </button>

          <button type="button" disabled={cargando} onClick={() => void recuperarContrasena()} style={{
            width: "100%", background: "none", border: 0, color: "#FF5A64", fontSize: "12px", marginTop: "14px", cursor: "pointer"
          }}>
            ¿Olvidaste tu contraseña?
          </button>

          <p style={{ color: "#888", fontSize: "12px", lineHeight: 1.5, marginTop: "20px", textAlign: "center" }}>
            Las cuentas se crean por invitación. Si aún no tienes acceso, solicítalo al administrador.
          </p>
        </form>
      </section>

      <aside className="auth-aside" style={{
        width: "420px", background: "#E11D2E", display: "flex",
        flexDirection: "column", justifyContent: "center", alignItems: "center",
        padding: "60px 40px", flexShrink: 0
      }}>
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
