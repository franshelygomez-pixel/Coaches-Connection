import { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

export default function InicioEntrenador({ usuario, datosUsuario }) {
  const [clientes, setClientes] = useState([]);
  const [eventosFirestore, setEventosFirestore] = useState([]);
  const [eventosGoogle, setEventosGoogle] = useState([]);
  const [cargando, setCargando] = useState(true);

  const nombreEntrenador = datosUsuario?.nombre || usuario?.displayName?.split(" ")[0] || "Entrenador";
  const coachId = usuario?.uid;

  const hoy = new Date();
  const hora = hoy.getHours();
  const saludo = hora < 12 ? "Buenos días" : hora < 18 ? "Buenas tardes" : "Buenas noches";

  const token = localStorage.getItem("googleCalendarToken");

  // --- Fecha LOCAL de hoy correcta (evita el desfase de toISOString() en UTC-4) ---
  const hoyStr = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;

  // Cargar clientes del coach
  useEffect(() => {
    const cargarClientes = async () => {
      if (!coachId) {
        setCargando(false);
        return;
      }
      try {
        const q = query(collection(db, "clientes"), where("coachId", "==", coachId));
        const snap = await getDocs(q);
        setClientes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.error("Error cargando clientes:", e);
      } finally {
        setCargando(false);
      }
    };
    cargarClientes();
  }, [coachId]);

  // Cargar eventos internos (Firestore)
  useEffect(() => {
    const cargarEventosFirestore = async () => {
      if (!coachId) return;
      try {
        const q = query(
          collection(db, "eventos"),
          where("coachId", "==", coachId),
          where("fecha", "==", hoyStr)
        );
        const snap = await getDocs(q);
        setEventosFirestore(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.error("Error cargando eventos Firestore:", e);
      }
    };
    cargarEventosFirestore();
  }, [coachId, hoyStr]);

  // Cargar eventos de Google Calendar
  useEffect(() => {
    const cargarEventosGoogle = async () => {
      if (!token) return;
      try {
        // Límites del día LOCAL (UTC-4), no del día UTC
        const inicio = `${hoyStr}T00:00:00-04:00`;
        const fin = `${hoyStr}T23:59:59-04:00`;
        const res = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${inicio}&timeMax=${fin}&singleEvents=true&orderBy=startTime`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await res.json();
        setEventosGoogle(data.items || []);
      } catch (e) {
        console.error("Error cargando eventos Google:", e);
      }
    };
    cargarEventosGoogle();
  }, [token, hoyStr]);

  // Unificamos las dos fuentes de eventos en un solo array para pintar la UI
  const eventos = [
    ...eventosFirestore.map(e => ({
      id: e.id,
      titulo: e.titulo,
      descripcion: e.descripcion,
      inicio: e.inicio,
    })),
    ...eventosGoogle.map(e => ({
      id: e.id,
      titulo: e.summary,
      descripcion: e.description,
      inicio: e.start?.dateTime || e.start?.date,
    })),
  ];

  const activos = clientes.filter(c => c.estado === "Activo" || c.estado === "activo");
  const enEvaluacion = clientes.filter(c => c.estado === "En Evaluación");

  const estiloCard = {
    background: "#FFFFFF", border: "0.5px solid #E5E5E5",
    borderRadius: "12px", padding: "20px 24px"
  };

  if (cargando) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "200px" }}>
      <p style={{ color: "#888" }}>Cargando...</p>
    </div>
  );

  return (
    <div>
      {/* Saludo */}
      <div style={{ marginBottom: "28px" }}>
        <p style={{ fontSize: "13px", color: "#888", margin: "0 0 4px" }}>
          {hoy.toLocaleDateString("es-DO", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
        <h2 style={{ fontSize: "26px", fontWeight: "900", color: "#0B0B0B", margin: 0 }}>
          {saludo}, <span style={{ color: "#FFC800" }}>{nombreEntrenador}</span>
        </h2>
        <p style={{ fontSize: "14px", color: "#888", marginTop: "6px" }}>
          Aquí está el resumen de tu actividad de hoy.
        </p>
      </div>

      {/* Cards resumen */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px", marginBottom: "32px" }}>
        {[
          { label: "Total clientes", valor: clientes.length, color: "#FFC800" },
          { label: "Clientes activos", valor: activos.length, color: "#1D9E75" },
          { label: "En evaluación", valor: enEvaluacion.length, color: "#378ADD" },
          { label: "Sin rutina", valor: clientes.filter(c => !c.rutinaAsignada || c.rutinaAsignada === "Sin Asignar").length, color: "#E24B4A" },
        ].map(card => (
          <div key={card.label} style={estiloCard}>
            <p style={{ fontSize: "12px", color: "#888", marginBottom: "8px" }}>{card.label}</p>
            <p style={{ fontSize: "36px", fontWeight: "900", color: card.color, margin: 0 }}>{card.valor}</p>
          </div>
        ))}
      </div>

      {/* Citas de hoy */}
      <div style={{ ...estiloCard, marginBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
          <h3 style={{ fontSize: "15px", fontWeight: "900", color: "#0B0B0B", margin: 0 }}>
            Programa de actividades de hoy
          </h3>
          <span style={{ fontSize: "13px", color: "#888" }}>
            {hoy.toLocaleDateString("es-DO", { weekday: "long", day: "numeric", month: "long" })}
          </span>
        </div>

        {!token && eventosFirestore.length === 0 ? (
          <div style={{ background: "#FFF8E1", borderRadius: "8px", padding: "16px", textAlign: "center" }}>
            <p style={{ color: "#B8860B", fontSize: "13px", margin: 0 }}>
              Inicia sesión con Google para ver tus citas del calendario
            </p>
          </div>
        ) : eventos.length === 0 ? (
          <div style={{ background: "#F5F5F5", borderRadius: "8px", padding: "24px", textAlign: "center" }}>
            <p style={{ color: "#888", fontSize: "13px", margin: 0 }}>No tienes citas programadas para hoy</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {eventos.map(evento => {
              const inicio = evento.inicio
                ? new Date(evento.inicio).toLocaleTimeString("es-DO", { hour: "2-digit", minute: "2-digit" })
                : "Todo el día";
              return (
                <div key={evento.id} style={{
                  display: "flex", alignItems: "center", gap: "16px",
                  background: "#F5F5F5", borderRadius: "10px", padding: "14px 16px"
                }}>
                  <div style={{
                    background: "#FFF8E1", color: "#0B0B0B", fontWeight: "900",
                    fontSize: "12px", padding: "8px 12px", borderRadius: "8px",
                    flexShrink: 0, whiteSpace: "nowrap", border: "1px solid #FFC800"
                  }}>
                    {inicio}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: "700", fontSize: "14px", color: "#0B0B0B", margin: 0 }}>
                      {evento.titulo || "Sin título"}
                    </p>
                    {evento.descripcion && (
                      <p style={{ fontSize: "12px", color: "#888", margin: "2px 0 0" }}>{evento.descripcion}</p>
                    )}
                  </div>
                  <span style={{
                    fontSize: "11px", fontWeight: "700", padding: "4px 12px",
                    borderRadius: "20px", background: "#FFC800", color: "#0B0B0B", flexShrink: 0
                  }}>
                    PENDIENTE
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>

        {/* Clientes recientes */}
        <div style={estiloCard}>
          <h3 style={{ fontSize: "15px", fontWeight: "900", color: "#0B0B0B", marginBottom: "16px" }}>
            Mis clientes
          </h3>
          {clientes.length === 0 ? (
            <p style={{ color: "#888", fontSize: "13px" }}>No tienes clientes asignados aún</p>
          ) : clientes.slice(0, 5).map(c => (
            <div key={c.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{
                  width: "36px", height: "36px", borderRadius: "50%", background: "#F5F5F5",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#0B0B0B", fontWeight: "900", fontSize: "13px", flexShrink: 0
                }}>
                  {c.nombre?.[0]?.toUpperCase()}
                </div>
                <div>
                  <p style={{ fontSize: "13px", fontWeight: "700", color: "#0B0B0B", margin: 0 }}>{c.nombre} {c.apellido}</p>
                  <p style={{ fontSize: "11px", color: "#888", margin: 0 }}>{c.objetivo || "Sin objetivo"}</p>
                </div>
              </div>
              <span style={{
                fontSize: "11px", fontWeight: "700", padding: "3px 10px", borderRadius: "20px",
                background: (c.estado === "Activo" || c.estado === "activo") ? "#E1F5EE" :
                  c.estado === "En Evaluación" ? "#FFF8E1" : "#F5F5F5",
                color: (c.estado === "Activo" || c.estado === "activo") ? "#085041" :
                  c.estado === "En Evaluación" ? "#B8860B" : "#555"
              }}>
                {c.estado}
              </span>
            </div>
          ))}
        </div>

        {/* Acciones rápidas */}
        <div style={estiloCard}>
          <h3 style={{ fontSize: "15px", fontWeight: "900", color: "#0B0B0B", marginBottom: "16px" }}>
            Acciones rápidas
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {[
              { label: "Ver mis clientes", desc: "Consulta el directorio completo" },
              { label: "Ir al calendario", desc: "Revisa tu agenda de hoy" },
              { label: "Biblioteca de rutinas", desc: "Gestiona y asigna rutinas" },
            ].map(acc => (
              <div key={acc.label} style={{
                background: "#F5F5F5", borderRadius: "10px", padding: "14px 16px",
                cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center"
              }}>
                <div>
                  <p style={{ fontSize: "13px", fontWeight: "700", color: "#0B0B0B", margin: 0 }}>{acc.label}</p>
                  <p style={{ fontSize: "11px", color: "#555", margin: "2px 0 0" }}>{acc.desc}</p>
                </div>
                <span style={{ color: "#0B0B0B", fontSize: "16px" }}>→</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}