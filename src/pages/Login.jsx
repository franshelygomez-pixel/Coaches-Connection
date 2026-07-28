import { useState } from "react";
import { auth, provider } from "../firebase";
import { signInWithPopup, signInWithEmailAndPassword, GoogleAuthProvider } from "firebase/auth";
import Registro from "./Registro";

const ADMIN_EMAIL = "franshelygomez@gmail.com";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [verRegistro, setVerRegistro] = useState(false);

  if (verRegistro) return <Registro onVolver={() => setVerRegistro(false)} />;

  const handleGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      if (result.user.email === ADMIN_EMAIL) {
        const { signOut } = await import("firebase/auth");
        await signOut(auth);
        setError("Usa correo y contraseña para acceder como administrador");
        return;
      }
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        localStorage.setItem("googleCalendarToken", credential.accessToken);
      }
    } catch (e) {
      if (e.code !== "auth/cancelled-popup-request") {
        setError("Error al iniciar sesión con Google");
      }
    }
  };

  const handleLogin = async () => {
    setError("");
    if (!email || !password) { setError("Completa todos los campos"); return; }
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (e) {
      setError("Correo o contraseña incorrectos");
    }
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

          <button onClick={handleGoogle} style={{
            width: "100%", display: "flex", alignItems: "center", justifyContent: "center",
            gap: "10px", background: "#FFFFFF", color: "#0B0B0B", fontWeight: "700",
            fontSize: "14px", padding: "14px", borderRadius: "8px", border: "none",
            cursor: "pointer", marginBottom: "24px"
          }}>
            <img src="https://www.google.com/favicon.ico" alt="Google" style={{ width: "18px", height: "18px" }} />
            Continuar con Google
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
            <div style={{ flex: 1, height: "0.5px", background: "#2C2C2C" }} />
            <span style={{ color: "#555", fontSize: "12px" }}>o continúa con correo</span>
            <div style={{ flex: 1, height: "0.5px", background: "#2C2C2C" }} />
          </div>

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

          <button onClick={handleLogin} style={{
            width: "100%", background: "#FFC800", color: "#0B0B0B", fontWeight: "900",
            fontSize: "14px", padding: "14px", borderRadius: "8px", border: "none",
            cursor: "pointer", letterSpacing: "0.5px"
          }}>
            INICIAR SESION
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
            TU EQUIPO.<br />TU RENDIMIENTO.
          </h2>
          <p style={{ color: "#1A1A1A", fontSize: "15px", lineHeight: 1.6 }}>
            Gestiona entrenadores, clientes y rutinas desde un solo lugar.
          </p>
        </div>
      </div>

    </div>
  );
}