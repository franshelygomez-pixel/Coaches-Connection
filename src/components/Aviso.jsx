import { useEffect } from "react";

// Aviso de confirmación o error con el estilo de la app (blanco, borde fino y acento negro o rojo).
// Los avisos de éxito se cierran solos a los 7 segundos.
export default function Aviso({ tipo = "ok", children, onCerrar }) {
  const esError = tipo === "error";

  useEffect(() => {
    if (esError || !onCerrar) return undefined;
    const temporizador = window.setTimeout(onCerrar, 7000);
    return () => window.clearTimeout(temporizador);
  }, [children, esError, onCerrar]);

  if (!children) return null;

  return (
    <div
      role={esError ? "alert" : "status"}
      style={{
        alignItems: "center", background: "#FFFFFF", border: "0.5px solid #E5E5E5",
        borderLeft: `4px solid ${esError ? "#E11D2E" : "#0B0B0B"}`, borderRadius: "12px",
        boxSizing: "border-box", display: "flex", gap: "14px", marginBottom: "16px", padding: "14px 18px",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          alignItems: "center", background: esError ? "#E11D2E" : "#0B0B0B", borderRadius: "50%", color: "#FFFFFF",
          display: "flex", flexShrink: 0, fontSize: "13px", fontWeight: "900", height: "28px", justifyContent: "center", width: "28px",
        }}
      >
        {esError ? (
          "!"
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
        )}
      </span>
      <p style={{ color: "#0B0B0B", flex: 1, fontSize: "14px", fontWeight: "600", lineHeight: 1.5, margin: 0, overflowWrap: "anywhere" }}>{children}</p>
      {onCerrar && (
        <button
          type="button"
          onClick={onCerrar}
          style={{ background: "#F5F5F5", border: "none", borderRadius: "999px", color: "#555", cursor: "pointer", flexShrink: 0, fontSize: "12px", fontWeight: "700", padding: "7px 14px" }}
        >
          Cerrar
        </button>
      )}
    </div>
  );
}