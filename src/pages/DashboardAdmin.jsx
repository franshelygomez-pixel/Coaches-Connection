import { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, query, where, getDocs, doc, updateDoc } from "firebase/firestore";

export default function DashboardAdmin({ seccion }) {
  const [pendientes, setPendientes] = useState([]);
  const [activos, setActivos] = useState([]);
  const [inactivos, setInactivos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [coachSeleccionado, setCoachSeleccionado] = useState(null);

  const cargarCoaches = async () => {
    setCargando(true);
    const snap = await getDocs(query(collection(db, "usuarios"), where("rol", "==", "coach")));
    const coaches = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    setPendientes(coaches.filter((c) => c.estado === "pendiente"));
    setActivos(coaches.filter((c) => c.estado === "activo"));
    setInactivos(coaches.filter((c) => c.estado === "inactivo"));
    setCargando(false);
  };

  const cambiarEstado = async (coachId, nuevoEstado) => {
    await updateDoc(doc(db, "usuarios", coachId), { estado: nuevoEstado });
    setCoachSeleccionado(null);
    cargarCoaches();
  };

  useEffect(() => { cargarCoaches(); }, [seccion]);

  if (cargando) return <p style={{ color: "#888" }}>Cargando...</p>;

  const CardCoach = ({ coach }) => (
    <div onClick={() => setCoachSeleccionado(coach)} style={{
      background: "#FFFFFF", border: "0.5px solid #E5E5E5", borderRadius: "12px",
      padding: "16px 20px", display: "flex", alignItems: "center",
      justifyContent: "space-between", cursor: "pointer", marginBottom: "8px",
      transition: "border-color 0.15s"
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <div style={{
          width: "40px", height: "40px", borderRadius: "50%", background: "#0B0B0B",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#FFC800", fontWeight: "900", fontSize: "14px"
        }}>
          {coach.nombre?.[0]?.toUpperCase()}
        </div>
        <div>
          <p style={{ fontWeight: "700", fontSize: "14px", color: "#0B0B0B", margin: 0 }}>
            {coach.nombre} {coach.apellido}
          </p>
          <p style={{ fontSize: "12px", color: "#888", margin: "2px 0 0" }}>{coach.email}</p>
        </div>
      </div>
      <span style={{ fontSize: "12px", color: "#888" }}>Ver perfil →</span>
    </div>
  );

  if (coachSeleccionado) return (
    <div style={{ maxWidth: "480px" }}>
      <button onClick={() => setCoachSeleccionado(null)} style={{
        background: "none", border: "none", cursor: "pointer",
        color: "#888", fontSize: "13px", marginBottom: "24px", display: "flex", alignItems: "center", gap: "6px"
      }}>
        ← Volver
      </button>
      <div style={{ background: "#FFFFFF", border: "0.5px solid #E5E5E5", borderRadius: "12px", padding: "28px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "24px" }}>
          <div style={{
            width: "60px", height: "60px", borderRadius: "50%", background: "#0B0B0B",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#FFC800", fontWeight: "900", fontSize: "22px"
          }}>
            {coachSeleccionado.nombre?.[0]?.toUpperCase()}
          </div>
          <div>
            <h2 style={{ fontSize: "18px", fontWeight: "900", color: "#0B0B0B", margin: 0 }}>
              {coachSeleccionado.nombre} {coachSeleccionado.apellido}
            </h2>
            <p style={{ fontSize: "13px", color: "#888", margin: "4px 0 0" }}>{coachSeleccionado.email}</p>
            <span style={{
              display: "inline-block", marginTop: "6px", fontSize: "11px", fontWeight: "700",
              padding: "3px 10px", borderRadius: "20px", letterSpacing: "1px",
              background: coachSeleccionado.estado === "pendiente" ? "#FFF8E1" :
                coachSeleccionado.estado === "activo" ? "#E1F5EE" : "#F5F5F5",
              color: coachSeleccionado.estado === "pendiente" ? "#B8860B" :
                coachSeleccionado.estado === "activo" ? "#085041" : "#555"
            }}>
              {coachSeleccionado.estado?.toUpperCase()}
            </span>
          </div>
        </div>

        <div style={{ borderTop: "0.5px solid #F0F0F0", paddingTop: "16px", marginBottom: "24px" }}>
          <p style={{ fontSize: "12px", color: "#888", marginBottom: "4px" }}>Correo electrónico</p>
          <p style={{ fontSize: "14px", color: "#0B0B0B", margin: "0 0 16px" }}>{coachSeleccionado.email}</p>
          <p style={{ fontSize: "12px", color: "#888", marginBottom: "4px" }}>Fecha de registro</p>
          <p style={{ fontSize: "14px", color: "#0B0B0B", margin: 0 }}>
            {coachSeleccionado.creadoEn?.toDate?.().toLocaleDateString("es-DO") || "N/A"}
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          {coachSeleccionado.estado === "pendiente" && <>
            <button onClick={() => cambiarEstado(coachSeleccionado.id, "activo")} style={{
              flex: 1, background: "#FFC800", color: "#0B0B0B", fontWeight: "700",
              fontSize: "14px", padding: "12px", borderRadius: "8px", border: "none", cursor: "pointer"
            }}>Aprobar</button>
            <button onClick={() => cambiarEstado(coachSeleccionado.id, "rechazado")} style={{
              flex: 1, background: "#F5F5F5", color: "#CC0000", fontWeight: "700",
              fontSize: "14px", padding: "12px", borderRadius: "8px", border: "none", cursor: "pointer"
            }}>Rechazar</button>
          </>}
          {coachSeleccionado.estado === "activo" &&
            <button onClick={() => cambiarEstado(coachSeleccionado.id, "inactivo")} style={{
              flex: 1, background: "#F5F5F5", color: "#555", fontWeight: "700",
              fontSize: "14px", padding: "12px", borderRadius: "8px", border: "none", cursor: "pointer"
            }}>Desactivar</button>
          }
          {(coachSeleccionado.estado === "inactivo" || coachSeleccionado.estado === "rechazado") &&
            <button onClick={() => cambiarEstado(coachSeleccionado.id, "activo")} style={{
              flex: 1, background: "#FFC800", color: "#0B0B0B", fontWeight: "700",
              fontSize: "14px", padding: "12px", borderRadius: "8px", border: "none", cursor: "pointer"
            }}>Activar</button>
          }
        </div>
      </div>
    </div>
  );

  if (seccion === "Solicitudes") return (
    <div>
      <h3 style={{ fontSize: "20px", fontWeight: "900", color: "#0B0B0B", marginBottom: "20px" }}>
        Solicitudes pendientes ({pendientes.length})
      </h3>
      {pendientes.length === 0 ? (
        <div style={{ background: "#FFFFFF", border: "0.5px solid #E5E5E5", borderRadius: "12px", padding: "60px", textAlign: "center" }}>
          <p style={{ color: "#888" }}>No hay solicitudes pendientes</p>
        </div>
      ) : pendientes.map((c) => <CardCoach key={c.id} coach={c} />)}
    </div>
  );

  if (seccion === "Entrenadores") return (
    <div>
      <h3 style={{ fontSize: "20px", fontWeight: "900", color: "#0B0B0B", marginBottom: "20px" }}>
        Entrenadores activos ({activos.length})
      </h3>
      {activos.length === 0 ? (
        <div style={{ background: "#FFFFFF", border: "0.5px solid #E5E5E5", borderRadius: "12px", padding: "60px", textAlign: "center" }}>
          <p style={{ color: "#888" }}>No hay entrenadores activos</p>
        </div>
      ) : activos.map((c) => <CardCoach key={c.id} coach={c} />)}
      {inactivos.length > 0 && <>
        <h3 style={{ fontSize: "20px", fontWeight: "900", color: "#0B0B0B", margin: "32px 0 20px" }}>
          Inactivos ({inactivos.length})
        </h3>
        {inactivos.map((c) => <CardCoach key={c.id} coach={c} />)}
      </>}
    </div>
  );

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "32px" }}>
        {[
          { label: "Solicitudes pendientes", valor: pendientes.length, color: "#FFC800" },
          { label: "Entrenadores activos", valor: activos.length, color: "#1D9E75" },
          { label: "Entrenadores inactivos", valor: inactivos.length, color: "#888" },
        ].map((card) => (
          <div key={card.label} style={{
            background: "#FFFFFF", border: "0.5px solid #E5E5E5",
            borderRadius: "12px", padding: "20px 24px"
          }}>
            <p style={{ fontSize: "12px", color: "#888", marginBottom: "8px" }}>{card.label}</p>
            <p style={{ fontSize: "32px", fontWeight: "900", color: card.color, margin: 0 }}>{card.valor}</p>
          </div>
        ))}
      </div>
      {pendientes.length > 0 && (
        <div>
          <h3 style={{ fontSize: "16px", fontWeight: "700", color: "#0B0B0B", marginBottom: "16px" }}>Solicitudes recientes</h3>
          {pendientes.map((c) => <CardCoach key={c.id} coach={c} />)}
        </div>
      )}
    </div>
  );
}