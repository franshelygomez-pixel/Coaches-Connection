import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

// Página pública a la que lleva el enlace "darme de baja" de los correos.
export default function BajaCorreos({ token }) {
  const [estado, setEstado] = useState("procesando"); // procesando | listo | invalido | error

  useEffect(() => {
    let vigente = true;
    (async () => {
      const { data, error } = await supabase.rpc("dar_baja_correos", { p_token: token });
      if (!vigente) return;
      if (error) setEstado("error");
      else setEstado(data ? "listo" : "invalido");
    })();
    return () => { vigente = false; };
  }, [token]);

  const mensajes = {
    procesando: ["Procesando tu solicitud...", "Un momento."],
    listo: ["Listo, no recibirás más correos", "Ya no te enviaremos mensajes de recordatorio. Si cambias de opinión, escríbele a tu gimnasio."],
    invalido: ["Este enlace ya no es válido", "Puede que ya te hayas dado de baja antes."],
    error: ["No pudimos procesar tu solicitud", "Inténtalo de nuevo más tarde."],
  };
  const [titulo, texto] = mensajes[estado];

  return (
    <div style={{ alignItems: "center", background: "#F5F5F5", display: "flex", justifyContent: "center", minHeight: "100vh", padding: "16px" }}>
      <div style={{ background: "#FFFFFF", border: "0.5px solid #E5E5E5", borderRadius: "12px", boxSizing: "border-box", maxWidth: "440px", padding: "40px", textAlign: "center", width: "100%" }}>
        <p style={{ fontSize: "22px", fontWeight: "900", margin: "0 0 20px" }}>
          <span style={{ color: "#0B0B0B" }}>Fit</span><span style={{ color: "#E11D2E" }}>trainer</span>
        </p>
        <h1 style={{ color: "#0B0B0B", fontSize: "20px", fontWeight: "900", margin: "0 0 10px" }}>{titulo}</h1>
        <p style={{ color: "#666", fontSize: "14px", lineHeight: 1.6, margin: "0 0 24px" }}>{texto}</p>
        {estado !== "procesando" && (
          <button type="button" onClick={() => { window.location.hash = "#/"; window.location.reload(); }} style={{ background: "#0B0B0B", border: "none", borderRadius: "999px", color: "#FFFFFF", cursor: "pointer", fontSize: "13px", fontWeight: "800", padding: "12px 22px" }}>
            Ir a Fittrainer
          </button>
        )}
      </div>
    </div>
  );
}