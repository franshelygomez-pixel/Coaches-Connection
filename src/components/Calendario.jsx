import { useEffect, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import esLocale from "@fullcalendar/core/locales/es";
import { db, auth } from "../firebase";
import { collection, addDoc, query, where, getDocs } from "firebase/firestore";

export default function Calendario() {
  const [eventos, setEventos] = useState([]);
  const [eventosDia, setEventosDia] = useState([]);
  const [diaSeleccionado, setDiaSeleccionado] = useState(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [nuevoEvento, setNuevoEvento] = useState({ titulo: "", fecha: "", hora: "", descripcion: "" });
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  const token = localStorage.getItem("googleCalendarToken");
  const coachId = auth.currentUser?.uid;

  const cargarEventos = async () => {
    try {
      // Cargar desde Firestore
      const q = query(collection(db, "eventos"), where("coachId", "==", coachId));
      const snap = await getDocs(q);
      const eventosFirestore = snap.docs.map(d => ({
        id: d.id,
        title: d.data().titulo,
        start: d.data().inicio,
        end: d.data().fin,
        description: d.data().descripcion || "",
        fuente: "firestore"
      }));

      // Cargar desde Google Calendar si hay token
      if (token) {
        try {
          const res = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=100&singleEvents=true&orderBy=startTime`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          const data = await res.json();
          if (!data.error) {
            const eventosGoogle = (data.items || []).map(e => ({
              id: e.id,
              title: e.summary || "Sin título",
              start: e.start?.dateTime || e.start?.date,
              end: e.end?.dateTime || e.end?.date,
              description: e.description || "",
              fuente: "google"
            }));
            // Combinar ambas fuentes evitando duplicados
            const idsFirestore = new Set(eventosFirestore.map(e => e.title + e.start));
            const eventosUnicos = [
              ...eventosFirestore,
              ...eventosGoogle.filter(e => !idsFirestore.has(e.title + e.start))
            ];
            setEventos(eventosUnicos);
            return;
          }
        } catch { }
      }
      setEventos(eventosFirestore);
    } catch (e) {
      setError("Error al cargar eventos.");
    }
  };

  const crearEvento = async () => {
    if (!nuevoEvento.titulo || !nuevoEvento.fecha || !nuevoEvento.hora) {
      setError("Completa título, fecha y hora");
      return;
    }
    setCargando(true);
    const inicio = new Date(`${nuevoEvento.fecha}T${nuevoEvento.hora}:00`);
    const fin = new Date(inicio.getTime() + 60 * 60 * 1000);

    try {
      // Guardar en Firestore siempre
      await addDoc(collection(db, "eventos"), {
        titulo: nuevoEvento.titulo,
        descripcion: nuevoEvento.descripcion,
        inicio: inicio.toISOString(),
        fin: fin.toISOString(),
        fecha: nuevoEvento.fecha,
        coachId,
        creadoEn: new Date(),
      });

      // Intentar guardar en Google Calendar si hay token
      if (token) {
        try {
          await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
            method: "POST",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              summary: nuevoEvento.titulo,
              description: nuevoEvento.descripcion,
              start: { dateTime: inicio.toISOString(), timeZone: "America/Santo_Domingo" },
              end: { dateTime: fin.toISOString(), timeZone: "America/Santo_Domingo" },
            }),
          });
        } catch { }
      }

      setMostrarForm(false);
      setNuevoEvento({ titulo: "", fecha: "", hora: "", descripcion: "" });
      setError("");
      cargarEventos();
    } catch (e) {
      setError("Error al crear el evento.");
    }
    setCargando(false);
  };

  const handleDiaClick = (info) => {
    const fecha = info.dateStr;
    setDiaSeleccionado(fecha);
    const delDia = eventos.filter(e => e.start?.startsWith(fecha));
    setEventosDia(delDia);
  };

  useEffect(() => { cargarEventos(); }, []);

  const estiloInput = {
    width: "100%", border: "0.5px solid #E5E5E5", borderRadius: "8px",
    padding: "12px", fontSize: "14px", marginBottom: "10px",
    outline: "none", display: "block", background: "#FAFAFA"
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
        <div>
          <h3 style={{ fontSize: "20px", fontWeight: "900", color: "#0B0B0B", margin: 0 }}>Mi Calendario</h3>
          <p style={{ fontSize: "13px", color: "#888", margin: "4px 0 0" }}>
            {token ? "Sincronizado con Google Calendar" : "Calendario local — inicia sesión con Google para sincronizar"}
          </p>
        </div>
        <button onClick={() => setMostrarForm(!mostrarForm)} style={{
          background: "#FFC800", color: "#0B0B0B", fontWeight: "700",
          fontSize: "14px", padding: "10px 18px", borderRadius: "8px",
          border: "none", cursor: "pointer"
        }}>
          + Nuevo evento
        </button>
      </div>

      {error && (
        <div style={{ background: "#FFF0F0", border: "0.5px solid #FFCCCC", borderRadius: "8px", padding: "12px 16px", marginBottom: "16px" }}>
          <p style={{ color: "#CC0000", fontSize: "13px", margin: 0 }}>{error}</p>
        </div>
      )}

      {/* Formulario */}
      {mostrarForm && (
        <div style={{ background: "#FFFFFF", border: "0.5px solid #E5E5E5", borderRadius: "12px", padding: "24px", marginBottom: "20px" }}>
          <h4 style={{ fontSize: "15px", fontWeight: "900", color: "#0B0B0B", marginBottom: "16px" }}>Crear nuevo evento</h4>
          <input placeholder="Título del evento *" value={nuevoEvento.titulo}
            onChange={e => setNuevoEvento({ ...nuevoEvento, titulo: e.target.value })}
            style={estiloInput} />
          <div style={{ display: "flex", gap: "10px" }}>
            <input type="date" value={nuevoEvento.fecha}
              onChange={e => setNuevoEvento({ ...nuevoEvento, fecha: e.target.value })}
              style={{ ...estiloInput, flex: 1 }} />
            <input type="time" value={nuevoEvento.hora}
              onChange={e => setNuevoEvento({ ...nuevoEvento, hora: e.target.value })}
              style={{ ...estiloInput, flex: 1 }} />
          </div>
          <input placeholder="Descripción (opcional)" value={nuevoEvento.descripcion}
            onChange={e => setNuevoEvento({ ...nuevoEvento, descripcion: e.target.value })}
            style={estiloInput} />
          <div style={{ display: "flex", gap: "10px" }}>
            <button onClick={crearEvento} disabled={cargando} style={{
              flex: 1, background: "#FFC800", color: "#0B0B0B", fontWeight: "700",
              fontSize: "14px", padding: "12px", borderRadius: "8px", border: "none", cursor: "pointer"
            }}>
              {cargando ? "Guardando..." : "Crear evento"}
            </button>
            <button onClick={() => { setMostrarForm(false); setError(""); }} style={{
              flex: 1, background: "#F5F5F5", color: "#555", fontWeight: "700",
              fontSize: "14px", padding: "12px", borderRadius: "8px", border: "none", cursor: "pointer"
            }}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: "20px" }}>
        {/* Calendario */}
        <div style={{ flex: 1, background: "#FFFFFF", border: "0.5px solid #E5E5E5", borderRadius: "12px", padding: "16px" }}>
          <FullCalendar
            plugins={[dayGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            locale={esLocale}
            events={eventos}
            dateClick={handleDiaClick}
            headerToolbar={{ left: "prev,next today", center: "title", right: "" }}
            height="auto"
            eventColor="#FFC800"
            eventTextColor="#0B0B0B"
          />
        </div>

        {/* Panel lateral */}
        {diaSeleccionado && (
          <div style={{ width: "280px", background: "#FFFFFF", border: "0.5px solid #E5E5E5", borderRadius: "12px", padding: "20px", height: "fit-content" }}>
            <h4 style={{ fontSize: "14px", fontWeight: "900", color: "#0B0B0B", marginBottom: "4px" }}>
              {new Date(diaSeleccionado + "T00:00:00").toLocaleDateString("es-DO", { weekday: "long", day: "numeric", month: "long" })}
            </h4>
            <p style={{ fontSize: "12px", color: "#888", marginBottom: "16px" }}>
              {eventosDia.length} evento{eventosDia.length !== 1 ? "s" : ""}
            </p>
            {eventosDia.length === 0 ? (
              <p style={{ color: "#888", fontSize: "13px" }}>No hay eventos este día</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {eventosDia.map(e => (
                  <div key={e.id} style={{ borderLeft: "3px solid #FFC800", paddingLeft: "12px" }}>
                    <p style={{ fontWeight: "700", fontSize: "13px", color: "#0B0B0B", margin: 0 }}>{e.title}</p>
                    {e.start?.includes("T") && (
                      <p style={{ fontSize: "11px", color: "#888", margin: "2px 0 0" }}>
                        {new Date(e.start).toLocaleTimeString("es-DO", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    )}
                    {e.description && <p style={{ fontSize: "11px", color: "#888", margin: "2px 0 0" }}>{e.description}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}